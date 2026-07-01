import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isRoomActive } from "@/lib/float-live-presence";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeStoredContent } from "@/lib/sanitize-content";

export async function POST(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rateLimited = await checkRateLimit("voice_transcript", authSession.userId);
        if (rateLimited) return rateLimited;

        const body = await req.json();
        const { chatRoomId, lines } = body as {
            chatRoomId: string;
            lines: { content: string }[];
        };

        if (!chatRoomId || !lines || !Array.isArray(lines) || lines.length === 0) {
            return NextResponse.json({ error: "chatRoomId and lines required" }, { status: 400 });
        }

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

        const validLines = lines
            .map((line) => sanitizeStoredContent(line.content ?? ""))
            .filter((c) => c.length > 0);

        if (validLines.length === 0) {
            return NextResponse.json({ success: true, count: 0 });
        }

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
