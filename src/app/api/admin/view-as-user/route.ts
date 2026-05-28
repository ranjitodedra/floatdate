import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { getWeekStart, getPreviousWeekStart } from "@/lib/week-cycle";
import { parseMatchExplanation } from "@/lib/match-explanation";
import { isMissingTableError } from "@/lib/prisma-errors";

/**
 * GET /api/admin/view-as-user?email=...
 * 
 * Read-only endpoint for admin to view a user's dashboard data.
 * Returns user profile, opt-in status, current match info,
 * previous match info, and any submitted feedback.
 * No data is modified — all queries are SELECT only.
 */
export async function GET(req: NextRequest) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
        if (!email) {
            return NextResponse.json(
                { error: "Email parameter is required" },
                { status: 400 }
            );
        }

        // Look up the target user (read-only)
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                bio: true,
                city: true,
                age: true,
                gender: true,
                genderPref: true,
                completedSetup: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const currentWeekStart = getWeekStart();
        const previousWeekStart = getPreviousWeekStart();

        // Check opt-in status (read-only)
        const optIn = await prisma.weeklyOptIn.findUnique({
            where: {
                userId_weekStart: {
                    userId: user.id,
                    weekStart: currentWeekStart,
                },
            },
        });

        // ──────────────────────────────────────────────
        // CURRENT CYCLE match (what they see in "Latest Match")
        // ──────────────────────────────────────────────
        const latestAttempt = await prisma.matchAttempt.findFirst({
            where: { userId: user.id, weekStart: currentWeekStart },
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

        const attemptData = latestAttempt
            ? {
                id: latestAttempt.id,
                status: latestAttempt.status,
                feedback: latestAttempt.feedback,
                feedbackAt: latestAttempt.feedbackAt?.toISOString() ?? null,
                weekStart: latestAttempt.weekStart.toISOString(),
                createdAt: latestAttempt.createdAt.toISOString(),
            }
            : null;

        // Also check for a match in the current week even without an attempt
        const currentMatch = latestAttempt?.match ?? await prisma.match.findFirst({
            where: {
                weekStart: currentWeekStart,
                OR: [
                    { userAId: user.id },
                    { userBId: user.id },
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

        // Build match response (same shape as /api/match/current)
        let matchData = null;
        if (currentMatch) {
            const matchedUser =
                currentMatch.userAId === user.id ? currentMatch.userB : currentMatch.userA;
            const parsedExplanation = parseMatchExplanation(currentMatch.explanation);
            matchData = {
                id: currentMatch.id,
                matchedUser: {
                    name: matchedUser.name,
                    email: matchedUser.email,
                    bio: matchedUser.bio,
                    city: matchedUser.city,
                },
                similarityScore: currentMatch.similarityScore,
                explanation: currentMatch.explanation,
                reasons: parsedExplanation.displayReasons,
                explanationDebug: parsedExplanation.v2,
                weekStart: currentMatch.weekStart.toISOString(),
            };
        }

        // ──────────────────────────────────────────────
        // PREVIOUS CYCLE match + feedback (for the feedback form)
        // ──────────────────────────────────────────────
        const previousMatch = await prisma.match.findFirst({
            where: {
                weekStart: previousWeekStart,
                OR: [
                    { userAId: user.id },
                    { userBId: user.id },
                ],
            },
            include: {
                userA: { select: { id: true, name: true } },
                userB: { select: { id: true, name: true } },
                feedbacks: {
                    where: { userId: user.id },
                    select: { id: true, howItWent: true, feedbackText: true, createdAt: true },
                },
            },
        });

        let previousMatchInfo = null;
        if (previousMatch) {
            const partner =
                previousMatch.userAId === user.id
                    ? previousMatch.userB
                    : previousMatch.userA;
            const feedback = previousMatch.feedbacks.length > 0
                ? previousMatch.feedbacks[0]
                : null;

            previousMatchInfo = {
                matchId: previousMatch.id,
                partnerName: partner.name,
                feedbackSubmitted: !!feedback,
                feedback: feedback
                    ? {
                        howItWent: feedback.howItWent,
                        feedbackText: feedback.feedbackText,
                        createdAt: feedback.createdAt.toISOString(),
                    }
                    : null,
            };
        }

        // ──────────────────────────────────────────────
        // ALL feedback history for this user
        // ──────────────────────────────────────────────
        const allFeedbacks = await prisma.matchFeedback.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            include: {
                match: {
                    select: {
                        id: true,
                        weekStart: true,
                        similarityScore: true,
                        userA: { select: { id: true, name: true } },
                        userB: { select: { id: true, name: true } },
                    },
                },
            },
        }).catch(() => []);

        const feedbackHistory = allFeedbacks.map((f) => {
            const partner = f.match.userA.id === user.id ? f.match.userB : f.match.userA;
            return {
                id: f.id,
                howItWent: f.howItWent,
                feedbackText: f.feedbackText,
                createdAt: f.createdAt.toISOString(),
                partnerName: partner.name,
                weekStart: f.match.weekStart.toISOString(),
                matchScore: f.match.similarityScore,
            };
        });

        return NextResponse.json({
            user: {
                name: user.name,
                email: user.email,
                bio: user.bio,
                city: user.city,
                age: user.age,
                gender: user.gender,
                genderPref: user.genderPref,
                completedSetup: user.completedSetup,
                createdAt: user.createdAt.toISOString(),
            },
            optedIn: !!optIn,
            weekStart: currentWeekStart.toISOString(),
            match: matchData,
            attempt: attemptData,
            previousMatch: previousMatchInfo,
            feedbackHistory,
        });
    } catch (error) {
        console.error("Admin view-as-user error:", error);
        return NextResponse.json(
            { error: "Failed to fetch user dashboard data" },
            { status: 500 }
        );
    }
}
