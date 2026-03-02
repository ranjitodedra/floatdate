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

        // Get chat room with participants
        const chatRoom = await prisma.floatLiveChatRoom.findUnique({
            where: { id: roomId },
            include: {
                participantA: { select: { userId: true } },
                participantB: { select: { userId: true } },
            },
        });

        if (!chatRoom || !chatRoom.isActive) {
            return NextResponse.json({ error: "Chat room not found or inactive" }, { status: 404 });
        }

        // Determine which side the user is
        const isA = chatRoom.participantA.userId === authSession.userId;
        const isB = chatRoom.participantB.userId === authSession.userId;

        if (!isA && !isB) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        // Toggle email reveal for the correct side
        const updateData = isA
            ? { emailRevealedByA: true }
            : { emailRevealedByB: true };

        const updated = await prisma.floatLiveChatRoom.update({
            where: { id: roomId },
            data: updateData,
            select: {
                emailRevealedByA: true,
                emailRevealedByB: true,
            },
        });

        const bothRevealed = updated.emailRevealedByA && updated.emailRevealedByB;

        // If both revealed, fetch emails
        let partnerEmail: string | null = null;
        if (bothRevealed) {
            const partnerId = isA
                ? chatRoom.participantB.userId
                : chatRoom.participantA.userId;

            const partner = await prisma.user.findUnique({
                where: { id: partnerId },
                select: { email: true },
            });
            partnerEmail = partner?.email || null;
        }

        return NextResponse.json({
            emailRevealedByA: updated.emailRevealedByA,
            emailRevealedByB: updated.emailRevealedByB,
            bothRevealed,
            partnerEmail,
        });
    } catch (error) {
        console.error("Float Live reveal-email error:", error);
        return NextResponse.json({ error: "Failed to reveal email" }, { status: 500 });
    }
}
