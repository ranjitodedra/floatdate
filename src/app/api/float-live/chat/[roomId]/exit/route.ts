import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { endChatRoom } from "@/lib/float-live-room";

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

        const chatRoom = await prisma.floatLiveChatRoom.findUnique({
            where: { id: roomId },
            include: {
                participantA: { select: { userId: true, id: true } },
                participantB: { select: { userId: true, id: true } },
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

        const myParticipantId =
            chatRoom.participantA.userId === authSession.userId
                ? chatRoom.participantA.id
                : chatRoom.participantB.id;

        await prisma.$transaction(async (tx) => {
            await endChatRoom(tx, roomId, "user_exit");

            await tx.floatLiveParticipant.update({
                where: { id: myParticipantId },
                data: {
                    status: "left",
                    isOnline: false,
                    leftAt: new Date(),
                },
            });

            await tx.floatLiveChatMessage.updateMany({
                where: { chatRoomId: roomId },
                data: { isDeleted: true },
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Float Live exit error:", error);
        return NextResponse.json({ error: "Failed to exit chat" }, { status: 500 });
    }
}
