import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

        // Set participant offline
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

        // Close any active chat rooms for this participant
        const participant = await prisma.floatLiveParticipant.findUnique({
            where: {
                userId_sessionId: {
                    userId: authSession.userId,
                    sessionId,
                },
            },
        });

        if (participant) {
            await prisma.floatLiveChatRoom.updateMany({
                where: {
                    isActive: true,
                    OR: [
                        { participantAId: participant.id },
                        { participantBId: participant.id },
                    ],
                },
                data: {
                    isActive: false,
                    status: "ended",
                    endedReason: "user_exit",
                    endedAt: new Date(),
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Float Live leave error:", error);
        return NextResponse.json({ error: "Failed to leave" }, { status: 500 });
    }
}
