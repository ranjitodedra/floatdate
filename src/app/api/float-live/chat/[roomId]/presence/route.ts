import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFloatLiveActive } from "@/lib/float-live-time";
import {
    derivePresence,
    isRoomActive,
    secondsSince,
    GRACE_S,
    type DerivedPresence,
    type PresenceStatus,
} from "@/lib/float-live-presence";
import { endChatRoom } from "@/lib/float-live-room";

/**
 * Partner presence that respects an EXPLICIT away signal (tab hidden) in
 * addition to heartbeat staleness. Explicit away is shown immediately and the
 * 8-minute grace counts from when they stepped away.
 */
function computePartnerPresence(
    partnerRow: { lastSeenAt: Date; status: string; awaySince: Date | null } | undefined,
    now: Date
): DerivedPresence {
    const bySeen = derivePresence(partnerRow?.lastSeenAt ?? null, now);
    // Hard timeout from a fully silent heartbeat always wins.
    if (bySeen.status === "timeout") return bySeen;

    if (partnerRow && partnerRow.status === "away" && partnerRow.awaySince) {
        const awayGap = secondsSince(partnerRow.awaySince, now);
        if (awayGap > GRACE_S) {
            return { status: "timeout", awaySeconds: awayGap, graceSecondsLeft: 0 };
        }
        return {
            status: "away",
            awaySeconds: awayGap,
            graceSecondsLeft: Math.max(0, GRACE_S - awayGap),
        };
    }

    return bySeen;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { roomId } = await params;
        const body = await req.json().catch(() => ({}));
        const connectionId =
            typeof body.connectionId === "string" ? body.connectionId : undefined;
        const iAmAway = body.away === true;

        const chatRoom = await prisma.floatLiveChatRoom.findUnique({
            where: { id: roomId },
            include: {
                participantA: { select: { id: true, userId: true } },
                participantB: { select: { id: true, userId: true } },
                roomParticipants: true,
            },
        });

        if (!chatRoom) {
            return NextResponse.json({ error: "Chat room not found" }, { status: 404 });
        }

        const isA = chatRoom.participantA.userId === authSession.userId;
        const isB = chatRoom.participantB.userId === authSession.userId;
        if (!isA && !isB) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        const myParticipant = isA ? chatRoom.participantA : chatRoom.participantB;
        const partnerParticipant = isA ? chatRoom.participantB : chatRoom.participantA;
        const myRole = isA ? "A" : "B";

        const now = new Date();

        const myExistingRow = chatRoom.roomParticipants.find(
            (r) => r.userId === authSession.userId
        );
        // Preserve the original awaySince so grace counts from the first time
        // I stepped away, not from each subsequent background heartbeat.
        const myAwaySince = iAmAway ? myExistingRow?.awaySince ?? now : null;

        // Upsert my room presence row
        const myRoomRow = await prisma.floatLiveRoomParticipant.upsert({
            where: {
                roomId_userId: { roomId, userId: authSession.userId },
            },
            create: {
                roomId,
                participantId: myParticipant.id,
                userId: authSession.userId,
                role: myRole,
                status: iAmAway ? "away" : "online",
                awaySince: myAwaySince,
                lastSeenAt: now,
                ...(connectionId ? { connectionId } : {}),
            },
            update: {
                lastSeenAt: now,
                status: iAmAway ? "away" : "online",
                awaySince: myAwaySince,
                ...(connectionId ? { connectionId } : {}),
            },
        });

        await prisma.floatLiveParticipant.update({
            where: { id: myParticipant.id },
            data: { lastSeenAt: now, isOnline: true },
        });

        let roomStatus = chatRoom.status ?? (chatRoom.isActive ? "active" : "ended");
        let endedReason = chatRoom.endedReason;

        const partnerRow = chatRoom.roomParticipants.find(
            (r) => r.userId === partnerParticipant.userId
        );

        // Honors both an explicit "away" (tab hidden) signal and heartbeat
        // staleness. The partner owns its own row, so we only READ it here.
        let partnerPresence = computePartnerPresence(partnerRow, now);
        let partnerStatus: PresenceStatus = partnerPresence.status;

        const { active: sessionActive } = await isFloatLiveActive();

        const shouldEndForTimeout =
            isRoomActive(chatRoom) && partnerPresence.status === "timeout";
        const shouldEndForSession = isRoomActive(chatRoom) && !sessionActive;

        if (shouldEndForTimeout || shouldEndForSession) {
            const reason = shouldEndForSession ? "session_end" : "timeout";
            await prisma.$transaction(async (tx) => {
                await endChatRoom(tx, roomId, reason);
            });
            roomStatus = "ended";
            endedReason = reason;
            partnerStatus = "timeout";
            partnerPresence = computePartnerPresence(partnerRow, now);
        }

        const roomEnded = roomStatus === "ended" || !chatRoom.isActive;

        return NextResponse.json({
            ok: true,
            roomStatus: roomEnded ? "ended" : "active",
            endedReason: roomEnded ? endedReason : null,
            my: {
                status: "online",
                lastSeenAt: myRoomRow.lastSeenAt,
            },
            partner: {
                status: partnerStatus,
                awaySeconds: partnerPresence.awaySeconds,
                graceSecondsLeft: partnerPresence.graceSecondsLeft,
            },
        });
    } catch (error) {
        console.error("Float Live presence error:", error);
        return NextResponse.json({ error: "Presence update failed" }, { status: 500 });
    }
}
