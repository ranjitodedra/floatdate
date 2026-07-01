import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QUEUE_STALE_S } from "@/lib/float-live-presence";

export async function POST(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { sessionId, connectionId } = body as {
            sessionId?: string;
            connectionId?: string;
        };

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }

        const now = new Date();
        const staleBefore = new Date(now.getTime() - QUEUE_STALE_S * 1000);

        // Expire ghost queue entries (waiting but no recent heartbeat) — same session only
        await prisma.floatLiveParticipant.updateMany({
            where: {
                sessionId,
                status: "waiting",
                OR: [
                    { lastSeenAt: null },
                    { lastSeenAt: { lt: staleBefore } },
                ],
                chatRoomsAsA: { none: { isActive: true } },
                chatRoomsAsB: { none: { isActive: true } },
            },
            data: {
                status: "idle",
                isOnline: false,
            },
        });

        const participant = await prisma.floatLiveParticipant.findUnique({
            where: {
                userId_sessionId: {
                    userId: authSession.userId,
                    sessionId,
                },
            },
        });

        if (!participant || !participant.acceptedTerms) {
            return NextResponse.json({ error: "Join lobby first" }, { status: 400 });
        }

        // Do not pull matched users back into the queue
        const inActiveRoom = await prisma.floatLiveChatRoom.findFirst({
            where: {
                isActive: true,
                sessionId,
                OR: [
                    { participantAId: participant.id },
                    { participantBId: participant.id },
                ],
            },
            select: { id: true },
        });

        if (inActiveRoom) {
            return NextResponse.json({
                ok: true,
                status: "matched",
                chatRoomId: inActiveRoom.id,
            });
        }

        await prisma.floatLiveParticipant.update({
            where: { id: participant.id },
            data: {
                lastSeenAt: now,
                status: "waiting",
                isOnline: true,
                leftAt: null,
                ...(connectionId ? { connectionId } : {}),
            },
        });

        return NextResponse.json({ ok: true, status: "waiting" });
    } catch (error) {
        console.error("Float Live heartbeat error:", error);
        return NextResponse.json({ error: "Heartbeat failed" }, { status: 500 });
    }
}
