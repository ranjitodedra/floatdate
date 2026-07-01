import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isRoomActive } from "@/lib/float-live-presence";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeStoredContent } from "@/lib/sanitize-content";

const MAX_MESSAGE_LENGTH = 500;

export async function POST(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rateLimited = await checkRateLimit("chat_message", authSession.userId);
        if (rateLimited) return rateLimited;

        const body = await req.json();
        const { chatRoomId, content } = body;

        if (!chatRoomId || !content) {
            return NextResponse.json({ error: "chatRoomId and content required" }, { status: 400 });
        }

        const sanitizedContent = sanitizeStoredContent(content, MAX_MESSAGE_LENGTH);

        if (sanitizedContent.length === 0) {
            return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
        }

        // Verify user is a participant in this chat room
        const chatRoom = await prisma.floatLiveChatRoom.findUnique({
            where: { id: chatRoomId },
            include: {
                participantA: { select: { userId: true } },
                participantB: { select: { userId: true } },
            },
        });

        if (!chatRoom || !isRoomActive(chatRoom)) {
            return NextResponse.json({ error: "Chat room not found or inactive" }, { status: 404 });
        }

        const isParticipant =
            chatRoom.participantA.userId === authSession.userId ||
            chatRoom.participantB.userId === authSession.userId;

        if (!isParticipant) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        const message = await prisma.floatLiveChatMessage.create({
            data: {
                chatRoomId,
                senderId: authSession.userId,
                content: sanitizedContent,
            },
        });

        return NextResponse.json({ message });
    } catch (error) {
        console.error("Float Live send error:", error);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
}
