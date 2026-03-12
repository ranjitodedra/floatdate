import "dotenv/config";
import readline from "readline";
import { prisma } from "../src/lib/db";

/**
 * One-time data fix script.
 *
 * Problem: Due to the incomplete deleteMany condition in trigger-matching.ts,
 * some users may have TWO Match records for the same weekStart — a stale one
 * from a previous run and the correct one from the latest run.
 *
 * This script:
 *  1. Finds all users who appear in more than one match for any single weekStart
 *  2. For each duplicate set, keeps the NEWEST match (by createdAt) and marks the older ones for deletion
 *  3. Shows a preview and asks for confirmation before deleting
 *  4. Only deletes the specific stale records identified — no other data is touched
 */

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

async function main() {
    try {
        console.log("\n══════════════════════════════════════════");
        console.log("  🔍 SCANNING FOR DUPLICATE MATCHES");
        console.log("══════════════════════════════════════════\n");

        // Fetch ALL matches, ordered by weekStart desc then createdAt desc
        const allMatches = await prisma.match.findMany({
            orderBy: [{ weekStart: "desc" }, { createdAt: "desc" }],
            include: {
                userA: { select: { name: true, email: true } },
                userB: { select: { name: true, email: true } },
            },
        });

        console.log(`  Total matches in database: ${allMatches.length}\n`);

        // Group matches by weekStart
        const byWeek = new Map<string, typeof allMatches>();
        for (const m of allMatches) {
            const key = m.weekStart.toISOString();
            if (!byWeek.has(key)) byWeek.set(key, []);
            byWeek.get(key)!.push(m);
        }

        // For each week, find users who appear in multiple matches
        const staleMatchIds: string[] = [];
        const staleDetails: {
            id: string;
            weekStart: string;
            userA: string;
            userB: string;
            createdAt: Date;
            reason: string;
        }[] = [];

        for (const [weekKey, weekMatches] of byWeek.entries()) {
            // Build a map: userId → list of matches they appear in
            const userMatchMap = new Map<string, typeof weekMatches>();

            for (const m of weekMatches) {
                for (const uid of [m.userAId, m.userBId]) {
                    if (!userMatchMap.has(uid)) userMatchMap.set(uid, []);
                    userMatchMap.get(uid)!.push(m);
                }
            }

            // Find users with duplicates
            for (const [userId, userMatches] of userMatchMap.entries()) {
                if (userMatches.length <= 1) continue;

                // Sort by createdAt descending — keep the newest, mark the rest as stale
                const sorted = [...userMatches].sort(
                    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
                );

                const newest = sorted[0];
                for (let i = 1; i < sorted.length; i++) {
                    const stale = sorted[i];
                    if (!staleMatchIds.includes(stale.id)) {
                        staleMatchIds.push(stale.id);
                        const userEmail =
                            stale.userAId === userId
                                ? stale.userA.email
                                : stale.userB.email;
                        staleDetails.push({
                            id: stale.id,
                            weekStart: weekKey,
                            userA: `${stale.userA.name} (${stale.userA.email})`,
                            userB: `${stale.userB.name} (${stale.userB.email})`,
                            createdAt: stale.createdAt,
                            reason: `User ${userEmail} already has a newer match (${newest.id.slice(0, 8)}...) for this week`,
                        });
                    }
                }
            }
        }

        if (staleDetails.length === 0) {
            console.log("  ✅ No duplicate matches found. Database is clean!\n");
            return;
        }

        console.log("══════════════════════════════════════════");
        console.log("  ⚠️  STALE DUPLICATES FOUND");
        console.log("══════════════════════════════════════════\n");

        for (const d of staleDetails) {
            console.log(`  Match ID: ${d.id}`);
            console.log(`    Week:      ${d.weekStart}`);
            console.log(`    Pair:      ${d.userA} ↔ ${d.userB}`);
            console.log(`    Created:   ${d.createdAt.toISOString()}`);
            console.log(`    Reason:    ${d.reason}`);
            console.log();
        }

        console.log(`  📊 Total stale matches to remove: ${staleDetails.length}\n`);

        const proceed = await askConfirmation(
            "Delete these stale matches? This will NOT affect any correct/current matches. (y/n): "
        );

        if (!proceed) {
            console.log("\n❌ Aborted. No changes were made.\n");
            return;
        }

        // Delete only the identified stale matches by their specific IDs
        const result = await prisma.match.deleteMany({
            where: {
                id: { in: staleMatchIds },
            },
        });

        console.log(`\n✅ Deleted ${result.count} stale match(es). Database is now clean.\n`);
    } catch (error) {
        console.error("❌ Error:", error);
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
