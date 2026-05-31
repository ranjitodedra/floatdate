import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { endChatRoom } from "@/lib/float-live-room";

export async function POST(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }

        const participant = await prisma.floatLiveParticipant.findUnique({
            where: {
                userId_sessionId: {
                    userId: authSession.userId,
                    sessionId,
                },
            },
        });

        // End any active chat rooms for this participant. endChatRoom also
        // reconciles BOTH participants' queue state so the partner is not left
        // stuck in "matched".
        if (participant) {
            const activeRooms = await prisma.floatLiveChatRoom.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { participantAId: participant.id },
                        { participantBId: participant.id },
                    ],
                },
                select: { id: true },
            });

            for (const room of activeRooms) {
                await prisma.$transaction(async (tx) => {
                    await endChatRoom(tx, room.id, "user_exit");
                });
            }
        }

        // Mark the leaver offline/left last so it isn't reset back to "idle"
        // by endChatRoom's reconciliation above.
        await prisma.floatLiveParticipant.updateMany({
            where: {
                userId: authSession.userId,
                sessionId,
            },
            data: {
                isOnline: false,
                leftAt: new Date(),
                status: "left",
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Float Live leave error:", error);
        return NextResponse.json({ error: "Failed to leave" }, { status: 500 });
    }
}
