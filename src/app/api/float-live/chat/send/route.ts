import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFloatLiveActive } from "@/lib/float-live-time";

const MAX_MESSAGE_LENGTH = 500;

// Simple in-memory rate limiter (per-process; sufficient for MVP)
const lastMessageTime = new Map<string, number>();

export async function POST(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { active } = isFloatLiveActive();
        if (!active) {
            return NextResponse.json(
                { error: "Float Live is only available 5-6 PM ET" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { chatRoomId, content } = body;

        if (!chatRoomId || !content) {
            return NextResponse.json({ error: "chatRoomId and content required" }, { status: 400 });
        }

        // Sanitize content
        const sanitizedContent = content
            .toString()
            .slice(0, MAX_MESSAGE_LENGTH)
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        if (sanitizedContent.trim().length === 0) {
            return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
        }

        // Rate limit: max 1 message per second
        const now = Date.now();
        const lastTime = lastMessageTime.get(authSession.userId) || 0;
        if (now - lastTime < 1000) {
            return NextResponse.json({ error: "Sending too fast" }, { status: 429 });
        }
        lastMessageTime.set(authSession.userId, now);

        // Verify user is a participant in this chat room
        const chatRoom = await prisma.floatLiveChatRoom.findUnique({
            where: { id: chatRoomId },
            include: {
                participantA: { select: { userId: true } },
                participantB: { select: { userId: true } },
            },
        });

        if (!chatRoom || !chatRoom.isActive) {
            return NextResponse.json({ error: "Chat room not found or inactive" }, { status: 404 });
        }

        const isParticipant =
            chatRoom.participantA.userId === authSession.userId ||
            chatRoom.participantB.userId === authSession.userId;

        if (!isParticipant) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        // Insert message
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
