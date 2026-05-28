import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isMissingTableError } from "@/lib/prisma-errors";

const HOW_IT_WENT_OPTIONS = [
    "never_started",
    "chatted",
    "great_conversation",
    "met_in_person",
    "keep_seeing",
    "faded",
    "felt_off",
    "ghosted",
    "figuring_out",
] as const;

const feedbackSchema = z.object({
    matchId: z.string().min(1),
    howItWent: z.enum(HOW_IT_WENT_OPTIONS),
    feedbackText: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = feedbackSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const { matchId, howItWent, feedbackText } = result.data;

        // Verify the match exists and belongs to the user
        const match = await prisma.match.findFirst({
            where: {
                id: matchId,
                OR: [
                    { userAId: session.userId },
                    { userBId: session.userId },
                ],
            },
            select: { id: true },
        });

        if (!match) {
            return NextResponse.json(
                { error: "Match not found" },
                { status: 404 }
            );
        }

        // Upsert: create or update if they resubmit
        const feedback = await prisma.matchFeedback.upsert({
            where: {
                matchId_userId: {
                    matchId,
                    userId: session.userId,
                },
            },
            update: {
                howItWent,
                feedbackText: feedbackText || null,
            },
            create: {
                matchId,
                userId: session.userId,
                howItWent,
                feedbackText: feedbackText || null,
            },
            select: {
                id: true,
                howItWent: true,
                feedbackText: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ feedback });
    } catch (error) {
        if (isMissingTableError(error)) {
            return NextResponse.json(
                { error: "Feedback storage is not available yet" },
                { status: 503 }
            );
        }

        console.error("Match feedback error:", error);
        return NextResponse.json(
            { error: "Failed to save feedback" },
            { status: 500 }
        );
    }
}
