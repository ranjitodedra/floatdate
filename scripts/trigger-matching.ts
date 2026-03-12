import "dotenv/config";
import readline from "readline";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "../src/lib/db";
import {
    buildVector,
    explainDetailed,
    findOptimalPairs,
} from "../src/lib/matching";
import { sendMatchEmails, sendNoMatchEmail } from "../src/lib/send-match-email";
import { getWeekStart, getPreviousWeekStart } from "../src/lib/week-cycle";

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
        // STEP 1: Display week info and opted-in count
        // ═══════════════════════════════════════════════════════════
        // At 9 PM Wednesday, the week has just rolled forward.
        // We want the PREVIOUS cycle (the one that just ended).
        // This matches the cron job behavior in run-matching/route.ts.
        const weekStart = getPreviousWeekStart();
        const weekEnd = getWeekStart(); // current week start = previous week end

        const weekStartFormatted = formatInTimeZone(weekStart, TORONTO_TZ, "MMM d, h:mm a");
        const weekEndFormatted = formatInTimeZone(weekEnd, TORONTO_TZ, "MMM d, h:mm a");

        console.log("\n══════════════════════════════════════════");
        console.log("  🗓️  MATCHING WEEK");
        console.log("══════════════════════════════════════════");
        console.log(`  ${weekStartFormatted} → ${weekEndFormatted}`);
        console.log("══════════════════════════════════════════\n");

        // Get opted-in users for this week
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
                        emailVerified: true,
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

        console.log(`  👥 People opted in this week: ${users.length}\n`);

        const proceed1 = await askConfirmation("Does this look correct? Proceed? (y/n): ");
        if (!proceed1) {
            console.log("\n❌ Aborted. No changes were made.\n");
            return;
        }

        // ═══════════════════════════════════════════════════════════
        // STEP 2: Preview matches (dry-run — NO DB writes)
        // ═══════════════════════════════════════════════════════════
        console.log("\n⏳ Running matching algorithm (preview only)...\n");

        // Get all past match pairs to avoid re-matching
        const allMatches = await prisma.match.findMany({
            select: { userAId: true, userBId: true },
        });
        const pastPairs = new Set(
            allMatches.flatMap((m) => [
                `${m.userAId}-${m.userBId}`,
                `${m.userBId}-${m.userAId}`,
            ])
        );

        // Build vectors for all users
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

        // Determine carry-forward priority (unmatched from previous cycle)
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

        // Run optimal matching (Blossom algorithm) — this does NOT write to DB
        const optimalPairs = findOptimalPairs(sortedUsers, vectors, pastPairs);

        // Build preview matches with explanations
        const previewMatches: PreviewMatch[] = [];
        const matchedIds = new Set<string>();

        for (const pair of optimalPairs) {
            const userA = users.find((u) => u.id === pair.userAId)!;
            const userB = users.find((u) => u.id === pair.userBId)!;

            const reasons = explainDetailed(
                allAnswers[pair.userAId],
                allAnswers[pair.userBId],
                questions,
                vectors[pair.userAId],
                vectors[pair.userBId]
            );

            previewMatches.push({
                userA: { id: userA.id, name: userA.name, email: userA.email, city: userA.city },
                userB: { id: userB.id, name: userB.name, email: userB.email, city: userB.city },
                similarityScore: pair.score,
                reasons,
            });

            matchedIds.add(pair.userAId);
            matchedIds.add(pair.userBId);
        }

        // Collect unmatched users
        const unmatchedUsers: UnmatchedUser[] = sortedUsers
            .filter((u) => !matchedIds.has(u.id))
            .map((u) => ({ id: u.id, name: u.name, email: u.email, city: u.city }));

        // Print matches
        console.log("══════════════════════════════════════════");
        console.log("  ✅ MATCHED PAIRS");
        console.log("══════════════════════════════════════════\n");

        if (previewMatches.length === 0) {
            console.log("  (no matches found)\n");
        } else {
            for (let i = 0; i < previewMatches.length; i++) {
                const m = previewMatches[i];
                const scorePercent = (m.similarityScore * 100).toFixed(1);
                console.log(`  Match ${i + 1}: ${m.userA.name} ↔ ${m.userB.name}`);
                console.log(`    📧 ${m.userA.email} ↔ ${m.userB.email}`);
                console.log(`    📍 ${m.userA.city}`);
                console.log(`    🎯 ${scorePercent}% compatibility`);
                console.log();
            }
        }

        console.log("══════════════════════════════════════════");
        console.log("  ❌ UNMATCHED");
        console.log("══════════════════════════════════════════\n");

        if (unmatchedUsers.length === 0) {
            console.log("  (everyone was matched!)\n");
        } else {
            for (const u of unmatchedUsers) {
                console.log(`  • ${u.name} (${u.email}) — ${u.city}`);
            }
            console.log();
        }

        console.log(`  📊 Summary: ${previewMatches.length} match(es), ${unmatchedUsers.length} unmatched\n`);

        const proceed2 = await askConfirmation("Proceed to save matches and send emails? (y/n): ");
        if (!proceed2) {
            console.log("\n❌ Aborted. No matches were saved and no emails were sent.\n");
            return;
        }

        // ═══════════════════════════════════════════════════════════
        // STEP 3: Save matches to DB
        // ═══════════════════════════════════════════════════════════
        console.log("\n⏳ Saving matches to database...\n");

        const savedMatches: {
            userAId: string;
            userBId: string;
            similarityScore: number;
            explanation: string;
        }[] = [];

        for (const pm of previewMatches) {
            const explanationStr = JSON.stringify(pm.reasons);

            // The Match model has TWO unique constraints:
            //   @@unique([userAId, weekStart])
            //   @@unique([userBId, weekStart])
            // A simple upsert on one constraint can still violate the other.
            // To handle reruns safely, delete any stale rows that would conflict,
            // then create the fresh record.
            await prisma.match.deleteMany({
                where: {
                    weekStart,
                    OR: [
                        { userAId: pm.userA.id },
                        { userBId: pm.userB.id },
                    ],
                },
            });

            await prisma.match.create({
                data: {
                    userAId: pm.userA.id,
                    userBId: pm.userB.id,
                    similarityScore: pm.similarityScore,
                    explanation: explanationStr,
                    weekStart,
                },
            });

            savedMatches.push({
                userAId: pm.userA.id,
                userBId: pm.userB.id,
                similarityScore: pm.similarityScore,
                explanation: explanationStr,
            });

            console.log(`  💾 Saved: ${pm.userA.name} ↔ ${pm.userB.name}`);
        }

        console.log(`\n✅ ${savedMatches.length} match(es) saved to database.\n`);

        // ═══════════════════════════════════════════════════════════
        // STEP 4: Send emails
        // ═══════════════════════════════════════════════════════════
        console.log("══════════════════════════════════════════");
        console.log("  📧 SENDING EMAILS");
        console.log("══════════════════════════════════════════\n");

        let totalEmailsSent = 0;

        // Send match emails
        console.log("📨 Sending match emails...\n");
        try {
            const matchEmailsSent = await sendMatchEmails(savedMatches);
            totalEmailsSent += matchEmailsSent;
            console.log(`\n✅ Sent ${matchEmailsSent} match email(s)\n`);
        } catch (emailError) {
            console.error("❌ Match email sending failed:", emailError);
        }

        // Send no-match emails to unmatched users
        let noMatchEmailsSent = 0;
        console.log("📨 Sending no-match emails...\n");
        try {
            for (const optIn of optIns) {
                if (
                    optIn.user.completedSetup &&
                    optIn.user.emailVerified &&
                    !matchedIds.has(optIn.user.id)
                ) {
                    console.log(`  📧 Sending no-match email to: ${optIn.user.name} (${optIn.user.email})`);
                    const emailResult = await sendNoMatchEmail(
                        optIn.user.email,
                        optIn.user.name
                    );
                    if (emailResult.status === "sent") {
                        noMatchEmailsSent++;
                        console.log(`     ✅ Sent`);
                    } else if (emailResult.status === "skipped") {
                        console.log(`     ⏭️  Skipped (EMAILS_ENABLED not set to 'true')`);
                    } else {
                        console.log(`     ❌ Failed: ${emailResult.status}`);
                    }
                    // Rate limiting
                    await new Promise((r) => setTimeout(r, 500));
                } else {
                    if (!optIn.user.completedSetup) {
                        console.log(`  ⏭️  Skipped ${optIn.user.name} — setup not completed`);
                    } else if (!optIn.user.emailVerified) {
                        console.log(`  ⏭️  Skipped ${optIn.user.name} — email not verified`);
                    } else if (matchedIds.has(optIn.user.id)) {
                        // Already matched, no need to log
                    }
                }
            }
            totalEmailsSent += noMatchEmailsSent;
            console.log(`\n✅ Sent ${noMatchEmailsSent} no-match email(s)\n`);
        } catch (noMatchError) {
            console.error("❌ No-match email sending failed:", noMatchError);
        }

        // ═══════════════════════════════════════════════════════════
        // FINAL SUMMARY
        // ═══════════════════════════════════════════════════════════
        console.log("══════════════════════════════════════════");
        console.log("  📊 FINAL SUMMARY");
        console.log("══════════════════════════════════════════");
        console.log(`  Matched pairs: ${previewMatches.length}`);
        console.log(`  Unmatched users: ${unmatchedUsers.length}`);
        console.log(`  Total emails sent: ${totalEmailsSent}`);
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
