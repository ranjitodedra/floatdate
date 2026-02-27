import { NextRequest, NextResponse } from "next/server";
import { runWeeklyMatching } from "@/lib/matching";
import { sendMatchEmails, sendNoMatchEmail } from "@/lib/send-match-email";
import { prisma } from "@/lib/db";
import { getPreviousWeekStart, isMatchingTime } from "@/lib/week-cycle";

export async function POST(req: NextRequest) {
    try {
        // Verify CRON_SECRET
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            return NextResponse.json(
                { error: "CRON_SECRET not configured" },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // DST guard: two cron entries fire at 01:00 and 02:00 UTC Thursday.
        // Only proceed if it's actually Wednesday 9 PM in America/Toronto.
        if (!isMatchingTime()) {
            console.log("Cron fired but it's not 9 PM Wednesday in Toronto. Skipping.");
            return NextResponse.json({
                skipped: true,
                reason: "Not Wednesday 9 PM in America/Toronto (DST guard)",
            });
        }

        // Match the week that just ended — at Wed 9 PM the week rolls forward,
        // so we look back to find users who opted in during the previous cycle.
        const weekStart = getPreviousWeekStart();

        // Run matching
        const result = await runWeeklyMatching(weekStart);

        // Send match emails
        let emailsSent = 0;
        try {
            emailsSent = await sendMatchEmails(result.matches);
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
        }

        // Send no-match emails to unmatched users
        let noMatchEmailsSent = 0;
        try {
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
                    const emailResult = await sendNoMatchEmail(
                        optIn.user.email,
                        optIn.user.name
                    );
                    if (emailResult.status === "sent") noMatchEmailsSent++;
                    // Rate limiting
                    await new Promise((r) => setTimeout(r, 500));
                }
            }
        } catch (noMatchError) {
            console.error("No-match email sending failed:", noMatchError);
        }

        return NextResponse.json({
            matched: result.matched,
            unmatched: result.unmatched,
            emails_sent: emailsSent,
            no_match_emails_sent: noMatchEmailsSent,
            weekStart: weekStart.toISOString(),
        });
    } catch (error) {
        console.error("Matching error:", error);
        return NextResponse.json(
            { error: "Matching failed" },
            { status: 500 }
        );
    }
}
