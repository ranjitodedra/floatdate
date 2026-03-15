import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessionId = req.nextUrl.searchParams.get("sessionId");
        if (!sessionId) {
            return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }

        // Get participant
        const participant = await prisma.floatLiveParticipant.findUnique({
            where: {
                userId_sessionId: {
                    userId: authSession.userId,
                    sessionId,
                },
            },
        });

        if (!participant) {
            return NextResponse.json({ status: "not_joined" });
        }

        // Check for active chat room
        const chatRoom = await prisma.floatLiveChatRoom.findFirst({
            where: {
                isActive: true,
                sessionId,
                OR: [
                    { participantAId: participant.id },
                    { participantBId: participant.id },
                ],
            },
            include: {
                participantA: { select: { gender: true, character: true, userId: true } },
                participantB: { select: { gender: true, character: true, userId: true } },
            },
        });

        if (chatRoom) {
            // Determine the partner
            const isA = chatRoom.participantAId === participant.id;
            const partner = isA ? chatRoom.participantB : chatRoom.participantA;

            return NextResponse.json({
                status: "matched",
                chatRoomId: chatRoom.id,
                partnerGender: partner.gender,
                partnerCharacter: partner.character || "A",
                userCharacter: (isA ? chatRoom.participantA : chatRoom.participantB).character || "A",
                intention: chatRoom.intention,
            });
        }

        return NextResponse.json({ status: "waiting" });
    } catch (error) {
        console.error("Float Live match-status error:", error);
        return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
    }
}
