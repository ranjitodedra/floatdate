import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_REASONS = ["harassment", "spam", "inappropriate", "other"];

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
        const body = await req.json();
        const { reason, details } = body;

        if (!reason || !VALID_REASONS.includes(reason)) {
            return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
        }

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

        const isA = chatRoom.participantA.userId === authSession.userId;
        const isB = chatRoom.participantB.userId === authSession.userId;

        if (!isA && !isB) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        const reportedId = isA
            ? chatRoom.participantB.userId
            : chatRoom.participantA.userId;

        const report = await prisma.floatLiveReport.create({
            data: {
                chatRoomId: roomId,
                reporterId: authSession.userId,
                reportedId,
                reason,
                details: details?.toString().slice(0, 1000) || null,
            },
        });

        return NextResponse.json({ report: { id: report.id } });
    } catch (error) {
        console.error("Float Live report error:", error);
        return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }
}
