import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getDisplayReasonsFromExplanation } from "@/lib/match-explanation";
import { isMissingTableError } from "@/lib/prisma-errors";
import { getWeekStart } from "@/lib/week-cycle";

export async function GET() {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentWeekStart = getWeekStart();

        // First check for a match attempt for the current week
        const latestAttempt = await prisma.matchAttempt.findFirst({
            where: { 
                userId: session.userId,
                weekStart: currentWeekStart 
            },
            include: {
                match: {
                    include: {
                        userA: {
                            select: { id: true, name: true, email: true, bio: true, city: true },
                        },
                        userB: {
                            select: { id: true, name: true, email: true, bio: true, city: true },
                        },
                    },
                },
            },
        }).catch((error) => {
            if (isMissingTableError(error)) return null;
            throw error;
        });

        if (latestAttempt) {
            const match = latestAttempt.match;
            const attempt = {
                id: latestAttempt.id,
                status: latestAttempt.status,
                feedback: latestAttempt.feedback,
                feedbackAt: latestAttempt.feedbackAt?.toISOString() ?? null,
                weekStart: latestAttempt.weekStart.toISOString(),
                createdAt: latestAttempt.createdAt.toISOString(),
            };

            if (!match) {
                return NextResponse.json({ match: null, attempt });
            }

            const matchedUser =
                match.userAId === session.userId ? match.userB : match.userA;
            const reasons = getDisplayReasonsFromExplanation(match.explanation);

            return NextResponse.json({
                match: {
                    id: match.id,
                    matchedUser: {
                        name: matchedUser.name,
                        email: matchedUser.email,
                        bio: matchedUser.bio,
                        city: matchedUser.city,
                    },
                    similarityScore: match.similarityScore,
                    reasons,
                    explanation: JSON.stringify(reasons),
                    weekStart: match.weekStart.toISOString(),
                },
                attempt,
            });
        }

        // Check if there is a match created manually or somehow else for the CURRENT week
        const match = await prisma.match.findFirst({
            where: {
                weekStart: currentWeekStart,
                OR: [
                    { userAId: session.userId },
                    { userBId: session.userId },
                ],
            },
            include: {
                userA: {
                    select: { id: true, name: true, email: true, bio: true, city: true },
                },
                userB: {
                    select: { id: true, name: true, email: true, bio: true, city: true },
                },
            },
        });

        if (!match) {
            return NextResponse.json({ match: null, attempt: null });
        }

        const matchedUser =
            match.userAId === session.userId ? match.userB : match.userA;
        const reasons = getDisplayReasonsFromExplanation(match.explanation);

        return NextResponse.json({
            match: {
                id: match.id,
                matchedUser: {
                    name: matchedUser.name,
                    email: matchedUser.email,
                    bio: matchedUser.bio,
                    city: matchedUser.city,
                },
                similarityScore: match.similarityScore,
                reasons,
                explanation: JSON.stringify(reasons),
                weekStart: match.weekStart.toISOString(),
            },
            attempt: null,
        });
    } catch (error) {
        console.error("Match fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch match" },
            { status: 500 }
        );
    }
}
