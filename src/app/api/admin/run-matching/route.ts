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

        // Fetch all universities
        const universities = await prisma.university.findMany();

        let totalMatched = 0;
        let totalUnmatched = 0;
        let totalEmailsSent = 0;
        let totalNoMatchEmails = 0;

        for (const uni of universities) {
            // Run matching for this university
            const result = await runWeeklyMatching(weekStart, uni.id);

            totalMatched += result.matched;
            totalUnmatched += result.unmatched;

            // Send match emails
            try {
                const sent = await sendMatchEmails(result.matches);
                totalEmailsSent += sent;
            } catch (emailError) {
                console.error(`Email sending failed for ${uni.name}:`, emailError);
            }

            // Send no-match emails to unmatched users of this university
            try {
                const optIns = await prisma.weeklyOptIn.findMany({
                    where: {
                        weekStart,
                        user: { universityId: uni.id },
                    },
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

                const matchedUserIds = new Set<string>();
                for (const match of result.matches) {
                    matchedUserIds.add(match.userAId);
                    matchedUserIds.add(match.userBId);
                }

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
                        if (emailResult.status === "sent") totalNoMatchEmails++;
                        await new Promise((r) => setTimeout(r, 500));
                    }
                }
            } catch (noMatchError) {
                console.error(`No-match email sending failed for ${uni.name}:`, noMatchError);
            }
        }

        return NextResponse.json({
            matched: totalMatched,
            unmatched: totalUnmatched,
            emails_sent: totalEmailsSent,
            no_match_emails_sent: totalNoMatchEmails,
            universities_processed: universities.length,
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
