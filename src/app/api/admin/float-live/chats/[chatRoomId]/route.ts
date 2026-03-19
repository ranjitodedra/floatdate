import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

// DELETE /api/admin/float-live/chats/[chatRoomId] — Delete a single chat room
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ chatRoomId: string }> }
) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { chatRoomId } = await params;

        // Verify chat room exists
        const chatRoom = await prisma.floatLiveChatRoom.findUnique({
            where: { id: chatRoomId },
        });

        if (!chatRoom) {
            return NextResponse.json({ error: "Chat room not found" }, { status: 404 });
        }

        // Delete in correct FK order: messages → reports → chatRoom
        await prisma.floatLiveChatMessage.deleteMany({
            where: { chatRoomId },
        });

        await prisma.floatLiveReport.deleteMany({
            where: { chatRoomId },
        });

        await prisma.floatLiveChatRoom.delete({
            where: { id: chatRoomId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin delete chat room error:", error);
        return NextResponse.json({ error: "Failed to delete chat room" }, { status: 500 });
    }
}
