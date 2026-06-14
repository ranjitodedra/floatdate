import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFloatLiveActive } from "@/lib/float-live-time";
import {
    canonicalParticipantPair,
    QUEUE_STALE_S,
    REMATCH_COOLDOWN_S,
} from "@/lib/float-live-presence";
import {
    ensureRoomParticipants,
    markParticipantsMatched,
} from "@/lib/float-live-room";
import { isFloatLiveCompatible } from "@/lib/float-live-matching";

async function tryClaimMatch(
    sessionId: string,
    myParticipant: {
        id: string;
        userId: string;
        intention: string;
        gender: string;
        preference: string;
        universityId: string;
    },
    match: {
        id: string;
        userId: string;
        intention: string;
    }
): Promise<string | null> {
    const [participantAId, participantBId] = canonicalParticipantPair(
        myParticipant.id,
        match.id
    );

    const participantARecord =
        participantAId === myParticipant.id ? myParticipant : match;
    const participantBRecord =
        participantBId === myParticipant.id ? myParticipant : match;

    try {
        return await prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<{ id: string }[]>`
                SELECT id FROM "FloatLiveParticipant"
                WHERE id = ${match.id}
                  AND "sessionId" = ${sessionId}
                  AND status = 'waiting'
                  AND "isOnline" = true
                  AND "leftAt" IS NULL
                FOR UPDATE NOWAIT
            `;

            if (locked.length === 0) {
                return null;
            }

            const myRow = await tx.floatLiveParticipant.findUnique({
                where: { id: myParticipant.id },
            });
            if (!myRow || myRow.status !== "waiting") {
                return null;
            }

            const stillFree = await tx.floatLiveChatRoom.findFirst({
                where: {
                    isActive: true,
                    OR: [
                        { participantAId: match.id },
                        { participantBId: match.id },
                        { participantAId: myParticipant.id },
                        { participantBId: myParticipant.id },
                    ],
                },
            });
            if (stillFree) {
                const involvesMe =
                    stillFree.participantAId === myParticipant.id ||
                    stillFree.participantBId === myParticipant.id;
                return involvesMe ? stillFree.id : null;
            }

            const isFriendship = myParticipant.intention === "friendship";
            const chatRoom = await tx.floatLiveChatRoom.create({
                data: {
                    sessionId,
                    participantAId,
                    participantBId,
                    intention: myParticipant.intention,
                    emailRevealedByA: isFriendship,
                    emailRevealedByB: isFriendship,
                    isActive: true,
                    status: "active",
                },
            });

            await markParticipantsMatched(tx, participantAId, participantBId);
            await ensureRoomParticipants(
                tx,
                chatRoom.id,
                participantAId,
                participantBId,
                participantARecord.userId,
                participantBRecord.userId
            );

            return chatRoom.id;
        });
    } catch (err) {
        if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            (err.code === "P2034" || err.message.includes("could not obtain lock"))
        ) {
            return null;
        }
        // Unique violation: the partner pair room was created concurrently by the
        // other client. Treat as "claimed by someone else"; the caller's next
        // poll will pick up the existing active room.
        if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
        ) {
            return null;
        }
        if (err instanceof Error && err.message.includes("55P03")) {
            return null;
        }
        throw err;
    }
}

export async function POST(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { active } = await isFloatLiveActive();
        if (!active) {
            return NextResponse.json(
                { error: "Float Live is only available 5-6 PM ET" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }

        const myParticipant = await prisma.floatLiveParticipant.findUnique({
            where: {
                userId_sessionId: {
                    userId: authSession.userId,
                    sessionId,
                },
            },
        });

        if (!myParticipant) {
            return NextResponse.json({ error: "You must join first" }, { status: 400 });
        }

        const now = new Date();
        await prisma.floatLiveParticipant.update({
            where: { id: myParticipant.id },
            data: { lastSeenAt: now, status: "waiting", isOnline: true },
        });

        const existingRoom = await prisma.floatLiveChatRoom.findFirst({
            where: {
                isActive: true,
                status: "active",
                sessionId,
                OR: [
                    { participantAId: myParticipant.id },
                    { participantBId: myParticipant.id },
                ],
            },
        });

        if (existingRoom) {
            return NextResponse.json({ status: "matched", chatRoomId: existingRoom.id });
        }

        const staleThreshold = new Date(now.getTime() - QUEUE_STALE_S * 1000);

        const candidates = await prisma.floatLiveParticipant.findMany({
            where: {
                sessionId,
                isOnline: true,
                acceptedTerms: true,
                leftAt: null,
                status: "waiting",
                lastSeenAt: { gte: staleThreshold },
                userId: { not: authSession.userId },
                universityId: myParticipant.universityId,
                chatRoomsAsA: { none: { isActive: true } },
                chatRoomsAsB: { none: { isActive: true } },
            },
        });

        const compatible = candidates.filter((c) => isFloatLiveCompatible(myParticipant, c));

        const cooldownThreshold = new Date(now.getTime() - REMATCH_COOLDOWN_S * 1000);

        for (const match of compatible) {
            const existingPairRoom = await prisma.floatLiveChatRoom.findFirst({
                where: {
                    sessionId,
                    isActive: false,
                    OR: [
                        {
                            participantAId: myParticipant.id,
                            participantBId: match.id,
                        },
                        {
                            participantAId: match.id,
                            participantBId: myParticipant.id,
                        },
                    ],
                },
            });

            if (existingPairRoom) {
                // Don't re-pair the same two people immediately after a room
                // between them ended (e.g. one of them just left). Skip this
                // candidate until the cooldown elapses.
                if (
                    !existingPairRoom.endedAt ||
                    existingPairRoom.endedAt > cooldownThreshold
                ) {
                    continue;
                }
                const [participantAId, participantBId] = canonicalParticipantPair(
                    myParticipant.id,
                    match.id
                );
                const isFriendship = myParticipant.intention === "friendship";

                const roomId = await prisma.$transaction(async (tx) => {
                    const locked = await tx.$queryRaw<{ id: string }[]>`
                        SELECT id FROM "FloatLiveParticipant"
                        WHERE id = ${match.id} AND status = 'waiting'
                        FOR UPDATE NOWAIT
                    `;
                    if (locked.length === 0) return null;

                    await tx.floatLiveChatMessage.updateMany({
                        where: { chatRoomId: existingPairRoom.id },
                        data: { isDeleted: true },
                    });

                    const reactivated = await tx.floatLiveChatRoom.update({
                        where: { id: existingPairRoom.id },
                        data: {
                            isActive: true,
                            status: "active",
                            endedAt: null,
                            endedReason: null,
                            intention: myParticipant.intention,
                            emailRevealedByA: isFriendship,
                            emailRevealedByB: isFriendship,
                            participantAId,
                            participantBId,
                        },
                    });

                    await markParticipantsMatched(tx, participantAId, participantBId);

                    const userA =
                        participantAId === myParticipant.id
                            ? myParticipant.userId
                            : match.userId;
                    const userB =
                        participantBId === myParticipant.id
                            ? myParticipant.userId
                            : match.userId;

                    await ensureRoomParticipants(
                        tx,
                        reactivated.id,
                        participantAId,
                        participantBId,
                        userA,
                        userB
                    );

                    return reactivated.id;
                });

                if (roomId) {
                    return NextResponse.json({ status: "matched", chatRoomId: roomId });
                }
                continue;
            }

            const roomId = await tryClaimMatch(sessionId, myParticipant, match);
            if (roomId) {
                return NextResponse.json({ status: "matched", chatRoomId: roomId });
            }
        }

        return NextResponse.json({
            status: "waiting",
            message: "Looking for someone...",
        });
    } catch (error) {
        console.error("Float Live find-match error:", error);
        return NextResponse.json({ error: "Failed to find match" }, { status: 500 });
    }
}
