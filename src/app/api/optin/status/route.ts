import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getWeekStart, getPreviousWeekStart } from "@/lib/week-cycle";

export async function GET() {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const weekStart = getWeekStart();

        const optIn = await prisma.weeklyOptIn.findUnique({
            where: {
                userId_weekStart: {
                    userId: session.userId,
                    weekStart,
                },
            },
        });

        // Determine the user's latest visible cycle context first.
        // Priority:
        // 1) current cycle (if they have either a current match or match attempt)
        // 2) most recent historical cycle from matches/attempts
        // Feedback target is one cycle before this context.
        const [currentCycleMatch, currentCycleAttempt, latestHistoricalMatch, latestHistoricalAttempt] =
            await Promise.all([
                prisma.match.findFirst({
                    where: {
                        weekStart,
                        OR: [{ userAId: session.userId }, { userBId: session.userId }],
                    },
                    select: { weekStart: true },
                }),
                prisma.matchAttempt.findFirst({
                    where: { userId: session.userId, weekStart },
                    select: { weekStart: true },
                }),
                prisma.match.findFirst({
                    where: {
                        OR: [{ userAId: session.userId }, { userBId: session.userId }],
                    },
                    orderBy: { weekStart: "desc" },
                    select: { weekStart: true },
                }),
                prisma.matchAttempt.findFirst({
                    where: { userId: session.userId },
                    orderBy: { weekStart: "desc" },
                    select: { weekStart: true },
                }),
            ]);

        let latestVisibleCycleStart: Date | null = null;
        if (currentCycleMatch || currentCycleAttempt) {
            latestVisibleCycleStart = weekStart;
        } else {
            const candidateWeekStarts = [
                latestHistoricalMatch?.weekStart,
                latestHistoricalAttempt?.weekStart,
            ].filter((d): d is Date => !!d);

            if (candidateWeekStarts.length > 0) {
                latestVisibleCycleStart = candidateWeekStarts.reduce((latest, candidate) =>
                    candidate.getTime() > latest.getTime() ? candidate : latest
                );
            }
        }

        const feedbackTargetWeekStart = latestVisibleCycleStart
            ? getPreviousWeekStart(new Date(latestVisibleCycleStart.getTime() + 60_000))
            : getPreviousWeekStart();

        const previousMatch = await prisma.match.findFirst({
            where: {
                weekStart: feedbackTargetWeekStart,
                OR: [
                    { userAId: session.userId },
                    { userBId: session.userId },
                ],
            },
            include: {
                userA: { select: { id: true, name: true } },
                userB: { select: { id: true, name: true } },
                feedbacks: {
                    where: { userId: session.userId },
                    select: { id: true },
                },
            },
        });

        let previousMatchInfo = null;
        if (previousMatch) {
            const partner =
                previousMatch.userAId === session.userId
                    ? previousMatch.userB
                    : previousMatch.userA;
            const feedbackAlreadySubmitted = previousMatch.feedbacks.length > 0;

            previousMatchInfo = {
                matchId: previousMatch.id,
                partnerName: partner.name,
                feedbackSubmitted: feedbackAlreadySubmitted,
            };
        }

        return NextResponse.json({
            optedIn: !!optIn,
            weekStart: weekStart.toISOString(),
            previousMatch: previousMatchInfo,
        });
    } catch (error) {
        console.error("Opt-in status error:", error);
        return NextResponse.json(
            { error: "Failed to check opt-in status" },
            { status: 500 }
        );
    }
}
