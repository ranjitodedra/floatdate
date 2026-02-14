import { NextRequest, NextResponse } from "next/server";
import { runWeeklyMatching } from "@/lib/matching";
import { sendMatchEmails } from "@/lib/send-match-email";

function getWeekStart(): Date {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
}

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

        const weekStart = getWeekStart();

        // Run matching
        const result = await runWeeklyMatching(weekStart);

        // Send emails
        let emailsSent = 0;
        try {
            emailsSent = await sendMatchEmails(result.matches);
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
        }

        return NextResponse.json({
            matched: result.matched,
            unmatched: result.unmatched,
            emails_sent: emailsSent,
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
