import "dotenv/config";
import readline from "readline";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "../src/lib/db";
import {
    buildVector,
    buildMatchExplanationForPair,
    findOptimalPairs,
} from "../src/lib/matching";
import { getDisplayReasonsFromExplanation } from "../src/lib/match-explanation";
import { sendMatchEmails, sendNoMatchEmail } from "../src/lib/send-match-email";
import { getWeekStart, getPreviousWeekStart } from "../src/lib/week-cycle";
import { isMissingTableError } from "../src/lib/prisma-errors";

const TORONTO_TZ = "America/Toronto";

// ---------- Interactive Prompt ----------
function askConfirmation(question: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase() === "y");
        });
    });
}

// ---------- Types for preview ----------
interface PreviewMatch {
    userA: { id: string; name: string; email: string; city: string };
    userB: { id: string; name: string; email: string; city: string };
    similarityScore: number;
    reasons: string[];
    explanation: string;
}

interface UnmatchedUser {
    id: string;
    name: string;
    email: string;
    city: string;
}

// ---------- Main ----------
async function main() {
    try {
        // ═══════════════════════════════════════════════════════════
        // STEP 0: Fetch all universities
        // ═══════════════════════════════════════════════════════════
        const universities = await prisma.university.findMany({
            orderBy: { name: "asc" },
        });

        if (universities.length === 0) {
            console.log("\n❌ No universities found in the database. Run the migration first.\n");
            return;
        }

        console.log(`\n📚 Found ${universities.length} university(ies): ${universities.map(u => u.name).join(", ")}\n`);

        // ═══════════════════════════════════════════════════════════
        // STEP 1: Display week info
        // ═══════════════════════════════════════════════════════════
        const weekStart = getPreviousWeekStart();
        const weekEnd = getWeekStart();

        const weekStartFormatted = formatInTimeZone(weekStart, TORONTO_TZ, "MMM d, h:mm a");
        const weekEndFormatted = formatInTimeZone(weekEnd, TORONTO_TZ, "MMM d, h:mm a");

        console.log("══════════════════════════════════════════");
        console.log("  🗓️  MATCHING WEEK");
        console.log("══════════════════════════════════════════");
        console.log(`  ${weekStartFormatted} → ${weekEndFormatted}`);
        console.log("══════════════════════════════════════════\n");

        // Get all past match pairs (global — to avoid re-matching across transfers)
        const allMatches = await prisma.match.findMany({
            select: { userAId: true, userBId: true, weekStart: true, explanation: true },
        });
        const pastPairs = new Set(
            allMatches.flatMap((m) => [
                `${m.userAId}-${m.userBId}`,
                `${m.userBId}-${m.userAId}`,
            ])
        );

        // Get all questions (shared across universities)
        const questions = await prisma.question.findMany();

        // Carry-forward priority data (global)
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

        // ═══════════════════════════════════════════════════════════
        // STEP 2: Loop over each university — preview matches
        // ═══════════════════════════════════════════════════════════
        const allPreviewMatches: { university: typeof universities[0]; matches: PreviewMatch[]; unmatched: UnmatchedUser[]; optIns: typeof uniOptIns }[] = [];
        let totalOptedIn = 0;

        // We'll declare uniOptIns type here for reference
        type OptInWithUser = Awaited<ReturnType<typeof prisma.weeklyOptIn.findMany<{
            where: { weekStart: Date; user: { universityId: string } };
            include: { user: { select: { id: true; name: true; email: true; gender: true; genderPref: true; city: true; universityId: true; createdAt: true; completedSetup: true; emailVerified: true } } };
        }>>>;
        let uniOptIns: OptInWithUser;

        for (const uni of universities) {
            // Get opted-in users for this week for this university
            uniOptIns = await prisma.weeklyOptIn.findMany({
                where: {
                    weekStart,
                    user: { universityId: uni.id },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            gender: true,
                            genderPref: true,
                            city: true,
                            universityId: true,
                            createdAt: true,
                            completedSetup: true,
                            emailVerified: true,
                        },
                    },
                },
            });

            // Deduplicate and filter
            const userMap = new Map<string, typeof uniOptIns[0]["user"]>();
            for (const o of uniOptIns) {
                if (o.user.completedSetup && !userMap.has(o.user.id)) {
                    userMap.set(o.user.id, o.user);
                }
            }
            const users = Array.from(userMap.values());
            totalOptedIn += users.length;

            if (users.length === 0) continue; // Skip universities with no opt-ins

            // Build vectors
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

            // Sort: priority users first, then by signup date
            const sortedUsers = users.sort((a, b) => {
                const aPri = priorityUserIds.has(a.id) ? 0 : 1;
                const bPri = priorityUserIds.has(b.id) ? 0 : 1;
                if (aPri !== bPri) return aPri - bPri;
                return a.createdAt.getTime() - b.createdAt.getTime();
            });

            // Run matching
            const optimalPairs = findOptimalPairs(sortedUsers, vectors, pastPairs);

            const previewMatches: PreviewMatch[] = [];
            const matchedIds = new Set<string>();

            for (const pair of optimalPairs) {
                const userA = users.find((u) => u.id === pair.userAId)!;
                const userB = users.find((u) => u.id === pair.userBId)!;

                const pairHistory = allMatches.filter(
                    (match) =>
                        match.weekStart.getTime() < weekStart.getTime() &&
                        (match.userAId === pair.userAId ||
                            match.userBId === pair.userAId ||
                            match.userAId === pair.userBId ||
                            match.userBId === pair.userBId)
                );
                const explanation = buildMatchExplanationForPair({
                    answersA: allAnswers[pair.userAId],
                    answersB: allAnswers[pair.userBId],
                    questions,
                    vecA: vectors[pair.userAId],
                    vecB: vectors[pair.userBId],
                    similarityScore: pair.score,
                    weekStart,
                    historicalMatches: pairHistory,
                    pairKey: `${pair.userAId}:${pair.userBId}:${weekStart.toISOString()}`,
                });
                const reasons = getDisplayReasonsFromExplanation(explanation);

                previewMatches.push({
                    userA: { id: userA.id, name: userA.name, email: userA.email, city: userA.city },
                    userB: { id: userB.id, name: userB.name, email: userB.email, city: userB.city },
                    similarityScore: pair.score,
                    reasons,
                    explanation,
                });

                matchedIds.add(pair.userAId);
                matchedIds.add(pair.userBId);
            }

            const unmatchedUsers: UnmatchedUser[] = sortedUsers
                .filter((u) => !matchedIds.has(u.id))
                .map((u) => ({ id: u.id, name: u.name, email: u.email, city: u.city }));

            allPreviewMatches.push({ university: uni, matches: previewMatches, unmatched: unmatchedUsers, optIns: uniOptIns });
        }

        // ═══════════════════════════════════════════════════════════
        // Display all previews
        // ═══════════════════════════════════════════════════════════
        console.log(`  👥 Total people opted in this week: ${totalOptedIn}\n`);

        for (const entry of allPreviewMatches) {
            console.log("══════════════════════════════════════════");
            console.log(`  🏫 ${entry.university.name} (${entry.university.slug})`);
            console.log("══════════════════════════════════════════\n");

            if (entry.matches.length === 0) {
                console.log("  (no matches found)\n");
            } else {
                for (let i = 0; i < entry.matches.length; i++) {
                    const m = entry.matches[i];
                    const scorePercent = (m.similarityScore * 100).toFixed(1);
                    console.log(`  Match ${i + 1}: ${m.userA.name} ↔ ${m.userB.name}`);
                    console.log(`    📧 ${m.userA.email} ↔ ${m.userB.email}`);
                    console.log(`    📍 ${m.userA.city}`);
                    console.log(`    🎯 ${scorePercent}% compatibility`);
                    console.log();
                }
            }

            if (entry.unmatched.length > 0) {
                console.log("  ❌ Unmatched:");
                for (const u of entry.unmatched) {
                    console.log(`    • ${u.name} (${u.email}) — ${u.city}`);
                }
                console.log();
            }

            console.log(`  📊 ${entry.matches.length} match(es), ${entry.unmatched.length} unmatched\n`);
        }

        if (allPreviewMatches.length === 0) {
            console.log("  (no universities have opted-in users this week)\n");
            return;
        }

        const proceed = await askConfirmation("Proceed to save matches and send emails? (y/n): ");
        if (!proceed) {
            console.log("\n❌ Aborted. No matches were saved and no emails were sent.\n");
            return;
        }

        // ═══════════════════════════════════════════════════════════
        // STEP 3: Save matches & send emails — per university
        // ═══════════════════════════════════════════════════════════
        console.log("\n⏳ Saving matches to database...\n");

        let totalMatchesSaved = 0;
        let totalEmailsSent = 0;
        let totalNoMatchEmails = 0;

        for (const entry of allPreviewMatches) {
            console.log(`\n🏫 ${entry.university.name}:`);

            const savedMatches: {
                id: string;
                userAId: string;
                userBId: string;
                similarityScore: number;
                explanation: string;
                weekStart: Date;
            }[] = [];

            const matchedIds = new Set<string>();

            for (const pm of entry.matches) {
                const explanationStr = pm.explanation;

                await prisma.match.deleteMany({
                    where: {
                        weekStart,
                        OR: [
                            { userAId: pm.userA.id },
                            { userBId: pm.userB.id },
                        ],
                    },
                });

                const createdMatch = await prisma.match.create({
                    data: {
                        userAId: pm.userA.id,
                        userBId: pm.userB.id,
                        similarityScore: pm.similarityScore,
                        explanation: explanationStr,
                        weekStart,
                    },
                });

                savedMatches.push({
                    id: createdMatch.id,
                    userAId: pm.userA.id,
                    userBId: pm.userB.id,
                    similarityScore: pm.similarityScore,
                    explanation: explanationStr,
                    weekStart,
                });

                matchedIds.add(pm.userA.id);
                matchedIds.add(pm.userB.id);

                console.log(`  💾 Saved: ${pm.userA.name} ↔ ${pm.userB.name}`);
            }

            totalMatchesSaved += savedMatches.length;

            const attemptedUsers = Array.from(
                new Map(
                    entry.optIns
                        .filter((optIn) => optIn.user.completedSetup)
                        .map((optIn) => [optIn.user.id, optIn.user])
                ).values()
            );
            const matchIdByUserId = new Map<string, string>();
            for (const match of savedMatches) {
                matchIdByUserId.set(match.userAId, match.id);
                matchIdByUserId.set(match.userBId, match.id);
            }

            try {
                const run = await prisma.matchRun.create({
                    data: {
                        weekStart,
                        universityId: entry.university.id,
                        source: "manual",
                        matchedCount: savedMatches.length * 2,
                        unmatchedCount: attemptedUsers.length - savedMatches.length * 2,
                    },
                });

                if (attemptedUsers.length > 0) {
                    await prisma.matchAttempt.createMany({
                        data: attemptedUsers.map((user) => {
                            const matchId = matchIdByUserId.get(user.id);
                            return {
                                runId: run.id,
                                userId: user.id,
                                matchId: matchId ?? null,
                                weekStart,
                                status: matchId ? "matched" : "no_match",
                            };
                        }),
                    });
                }
            } catch (attemptError) {
                if (!isMissingTableError(attemptError)) throw attemptError;
            }

            // Send match emails
            try {
                const matchEmailsSent = await sendMatchEmails(savedMatches);
                totalEmailsSent += matchEmailsSent;
                console.log(`  ✅ Sent ${matchEmailsSent} match email(s)`);
            } catch (emailError) {
                console.error(`  ❌ Match email sending failed:`, emailError);
            }

            // Send no-match emails
            try {
                for (const optIn of entry.optIns) {
                    if (
                        optIn.user.completedSetup &&
                        optIn.user.emailVerified &&
                        !matchedIds.has(optIn.user.id)
                    ) {
                        const emailResult = await sendNoMatchEmail(
                            optIn.user.email,
                            optIn.user.name
                        );
                        if (emailResult.status === "sent") {
                            totalNoMatchEmails++;
                        }
                        await new Promise((r) => setTimeout(r, 500));
                    }
                }
            } catch (noMatchError) {
                console.error(`  ❌ No-match email sending failed:`, noMatchError);
            }
        }

        // ═══════════════════════════════════════════════════════════
        // FINAL SUMMARY
        // ═══════════════════════════════════════════════════════════
        console.log("\n══════════════════════════════════════════");
        console.log("  📊 FINAL SUMMARY");
        console.log("══════════════════════════════════════════");
        console.log(`  Universities processed: ${allPreviewMatches.length}`);
        console.log(`  Matched pairs: ${totalMatchesSaved}`);
        console.log(`  Match emails sent: ${totalEmailsSent}`);
        console.log(`  No-match emails sent: ${totalNoMatchEmails}`);
        console.log("══════════════════════════════════════════");
        console.log("\n✨ Matching process complete!\n");

    } catch (error) {
        console.error("❌ Matching error:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
