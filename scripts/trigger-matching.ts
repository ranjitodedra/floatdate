import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { runWeeklyMatching } from "../src/lib/matching";
import { sendMatchEmails, sendNoMatchEmail } from "../src/lib/send-match-email";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function getWeekStart(): Date {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
}

async function main() {
    try {
        console.log("🚀 Starting matching process...\n");
        
        const weekStart = getWeekStart();
        console.log(`Week start: ${weekStart.toISOString()}\n`);

        // Run matching
        console.log("Running matching algorithm...");
        const result = await runWeeklyMatching(weekStart);
        console.log(`✅ Matching complete:`);
        console.log(`   - Matched: ${result.matched} users`);
        console.log(`   - Unmatched: ${result.unmatched} users`);
        console.log(`   - Total matches: ${result.matches.length}\n`);

        // Send match emails
        let emailsSent = 0;
        try {
            console.log("Sending match emails...");
            emailsSent = await sendMatchEmails(result.matches);
            console.log(`✅ Sent ${emailsSent} match email(s)\n`);
        } catch (emailError) {
            console.error("❌ Email sending failed:", emailError);
        }

        // Send no-match emails to unmatched users
        let noMatchEmailsSent = 0;
        try {
            console.log("Checking for unmatched users...");
            // Get all opted-in users for this week
            const optIns = await prisma.weeklyOptIn.findMany({
                where: { weekStart },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            completedSetup: true,
                            emailVerified: true,
                        },
                    },
                },
            });

            console.log(`Found ${optIns.length} opted-in user(s) for this week\n`);

            // Get matched user IDs
            const matchedUserIds = new Set<string>();
            for (const match of result.matches) {
                matchedUserIds.add(match.userAId);
                matchedUserIds.add(match.userBId);
            }

            // Send no-match emails to unmatched, verified users
            for (const optIn of optIns) {
                if (
                    optIn.user.completedSetup &&
                    optIn.user.emailVerified &&
                    !matchedUserIds.has(optIn.user.id)
                ) {
                    console.log(`📧 Sending no-match email to: ${optIn.user.name} (${optIn.user.email})`);
                    const emailResult = await sendNoMatchEmail(
                        optIn.user.email,
                        optIn.user.name
                    );
                    if (emailResult.status === "sent") {
                        noMatchEmailsSent++;
                        console.log(`   ✅ Email sent successfully`);
                    } else if (emailResult.status === "skipped") {
                        console.log(`   ⏭️  Email skipped (EMAILS_ENABLED not set to 'true')`);
                    } else {
                        console.log(`   ❌ Email failed: ${emailResult.status}`);
                    }
                    // Rate limiting
                    await new Promise((r) => setTimeout(r, 500));
                } else {
                    if (!optIn.user.completedSetup) {
                        console.log(`   ⏭️  Skipped ${optIn.user.name} - setup not completed`);
                    } else if (!optIn.user.emailVerified) {
                        console.log(`   ⏭️  Skipped ${optIn.user.name} - email not verified`);
                    } else if (matchedUserIds.has(optIn.user.id)) {
                        console.log(`   ⏭️  Skipped ${optIn.user.name} - already matched`);
                    }
                }
            }
            console.log(`\n✅ Sent ${noMatchEmailsSent} no-match email(s)\n`);
        } catch (noMatchError) {
            console.error("❌ No-match email sending failed:", noMatchError);
        }

        console.log("\n📊 Summary:");
        console.log(`   - Matched users: ${result.matched}`);
        console.log(`   - Unmatched users: ${result.unmatched}`);
        console.log(`   - Match emails sent: ${emailsSent}`);
        console.log(`   - No-match emails sent: ${noMatchEmailsSent}`);
        console.log(`\n✨ Matching process complete!`);

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
