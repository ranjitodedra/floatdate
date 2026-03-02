import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

        // Close the chat room
        await prisma.floatLiveChatRoom.update({
            where: { id: roomId },
            data: {
                isActive: false,
                endedAt: new Date(),
            },
        });

        // Soft-delete messages from UI
        await prisma.floatLiveChatMessage.updateMany({
            where: { chatRoomId: roomId },
            data: { isDeleted: true },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Float Live exit error:", error);
        return NextResponse.json({ error: "Failed to exit chat" }, { status: 500 });
    }
}
