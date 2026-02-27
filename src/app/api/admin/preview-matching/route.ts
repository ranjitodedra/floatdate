import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { getWeekStart } from "@/lib/week-cycle";
import {
    buildVector,
    similarity,
    explainDetailed,
    passesHardFilters,
} from "@/lib/matching";

export async function POST() {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const weekStart = getWeekStart();

        // 1. Get opted-in users
        const optIns = await prisma.weeklyOptIn.findMany({
            where: { weekStart },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        gender: true,
                        genderPref: true,
                        city: true,
                        createdAt: true,
                        completedSetup: true,
                    },
                },
            },
        });

        // Deduplicate by user ID and filter to completed setup
        const userMap = new Map<string, typeof optIns[0]["user"]>();
        for (const o of optIns) {
            if (o.user.completedSetup && !userMap.has(o.user.id)) {
                userMap.set(o.user.id, o.user);
            }
        }
        const users = Array.from(userMap.values());

        // 2. Get past match pairs
        const allMatches = await prisma.match.findMany({
            select: { userAId: true, userBId: true },
        });
        const pastPairs = new Set(
            allMatches.flatMap((m) => [
                `${m.userAId}-${m.userBId}`,
                `${m.userBId}-${m.userAId}`,
            ])
        );

        // 3. Build vectors
        const questions = await prisma.question.findMany();
        const vectors: Record<string, Record<string, number>> = {};
        const allAnswers: Record<string, { questionId: string; value: unknown }[]> = {};

        for (const user of users) {
            const answers = await prisma.answer.findMany({
                where: { userId: user.id },
                select: { questionId: true, value: true },
            });
            vectors[user.id] = buildVector(answers, questions);
            allAnswers[user.id] = answers;
        }

        // 4. Determine carry-forward priority (unmatched from previous cycle)
        const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

        const prevOptIns = await prisma.weeklyOptIn.findMany({
            where: { weekStart: prevWeekStart },
            select: { userId: true },
        });

        const prevMatches = await prisma.match.findMany({
            where: { weekStart: prevWeekStart },
            select: { userAId: true, userBId: true },
        });

        const prevMatchedIds = new Set(
            prevMatches.flatMap((m) => [m.userAId, m.userBId])
        );

        const priorityUserIds = new Set(
            prevOptIns
                .filter((o) => !prevMatchedIds.has(o.userId))
                .map((o) => o.userId)
        );

        // Sort: priority users first, then by signup date (older first)
        const sortedUsers = users.sort((a, b) => {
            const aPri = priorityUserIds.has(a.id) ? 0 : 1;
            const bPri = priorityUserIds.has(b.id) ? 0 : 1;
            if (aPri !== bPri) return aPri - bPri;
            return a.createdAt.getTime() - b.createdAt.getTime();
        });

        // 5. Greedy matching (dry run — no DB writes)
        const matchedIds = new Set<string>();
        const matches: {
            userA: { name: string; email: string; city: string };
            userB: { name: string; email: string; city: string };
            similarityScore: number;
            reasons: string[];
        }[] = [];

        for (const user of sortedUsers) {
            if (matchedIds.has(user.id)) continue;

            const candidates = sortedUsers.filter(
                (c) =>
                    c.id !== user.id &&
                    !matchedIds.has(c.id) &&
                    passesHardFilters(user, c) &&
                    !pastPairs.has(`${user.id}-${c.id}`)
            );

            if (candidates.length === 0) continue;

            const scored = candidates.map((c) => ({
                candidate: c,
                score: similarity(vectors[user.id], vectors[c.id]),
            }));
            scored.sort((a, b) => b.score - a.score);

            const best = scored[0];
            const reasons = explainDetailed(
                allAnswers[user.id],
                allAnswers[best.candidate.id],
                questions,
                vectors[user.id],
                vectors[best.candidate.id]
            );

            matches.push({
                userA: { name: user.name, email: user.email, city: user.city },
                userB: {
                    name: best.candidate.name,
                    email: best.candidate.email,
                    city: best.candidate.city,
                },
                similarityScore: best.score,
                reasons,
            });

            matchedIds.add(user.id);
            matchedIds.add(best.candidate.id);
        }

        // 6. Collect unmatched users
        const unmatched = sortedUsers
            .filter((u) => !matchedIds.has(u.id))
            .map((u) => ({ name: u.name, email: u.email, city: u.city }));

        return NextResponse.json({
            weekStart: weekStart.toISOString(),
            totalOptedIn: users.length,
            priorityUsers: users.filter((u) => priorityUserIds.has(u.id)).length,
            matches,
            unmatched,
        });
    } catch (error) {
        console.error("Admin preview-matching error:", error);
        return NextResponse.json(
            { error: "Failed to preview matches" },
            { status: 500 }
        );
    }
}
