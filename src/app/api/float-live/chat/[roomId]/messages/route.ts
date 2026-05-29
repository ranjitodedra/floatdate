import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isRoomActive } from "@/lib/float-live-presence";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { roomId } = await params;

        // Verify user is a participant
        const chatRoom = await prisma.floatLiveChatRoom.findUnique({
            where: { id: roomId },
            include: {
                participantA: { select: { userId: true } },
                participantB: { select: { userId: true } },
            },
        });

        if (!chatRoom) {
            return NextResponse.json({ error: "Chat room not found" }, { status: 404 });
        }

        const isParticipant =
            chatRoom.participantA.userId === authSession.userId ||
            chatRoom.participantB.userId === authSession.userId;

        if (!isParticipant) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        // Fetch messages (not soft-deleted for UI)
        const messages = await prisma.floatLiveChatMessage.findMany({
            where: {
                chatRoomId: roomId,
                isDeleted: false,
            },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                senderId: true,
                content: true,
                createdAt: true,
            },
        });

        return NextResponse.json({
            messages,
            roomActive: isRoomActive(chatRoom),
            roomStatus: chatRoom.status ?? (chatRoom.isActive ? "active" : "ended"),
            endedReason: chatRoom.endedReason,
        });
    } catch (error) {
        console.error("Float Live messages error:", error);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}
