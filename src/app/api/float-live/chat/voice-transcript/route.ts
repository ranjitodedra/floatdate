import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFloatLiveActive } from "@/lib/float-live-time";
import { isRoomActive } from "@/lib/float-live-presence";

// Simple in-memory rate limiter per user
const lastTranscriptTime = new Map<string, number>();

export async function POST(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { active } = await isFloatLiveActive();
        if (!active) {
            return NextResponse.json(
                { error: "Float Live is only available 5-6 PM ET" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { chatRoomId, lines } = body as {
            chatRoomId: string;
            lines: { content: string }[];
        };

        if (!chatRoomId || !lines || !Array.isArray(lines) || lines.length === 0) {
            return NextResponse.json({ error: "chatRoomId and lines required" }, { status: 400 });
        }

        // Rate limit: max 1 request per 3 seconds per user
        const now = Date.now();
        const lastTime = lastTranscriptTime.get(authSession.userId) || 0;
        if (now - lastTime < 3000) {
            return NextResponse.json({ error: "Sending too fast" }, { status: 429 });
        }
        lastTranscriptTime.set(authSession.userId, now);

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

        // Filter and sanitize lines
        const validLines = lines
            .map((line) => line.content?.trim().substring(0, 1000))
            .filter((c) => c && c.length > 0);

        if (validLines.length === 0) {
            return NextResponse.json({ success: true, count: 0 }); // Nothing to save
        }

        // Insert transcripts
        await prisma.floatLiveVoiceTranscript.createMany({
            data: validLines.map((content) => ({
                chatRoomId,
                senderId: authSession.userId,
                content,
            })),
        });

        return NextResponse.json({ success: true, count: validLines.length });
    } catch (error) {
        console.error("Float Live transcript save error:", error);
        return NextResponse.json({ error: "Failed to save transcript" }, { status: 500 });
    }
}
