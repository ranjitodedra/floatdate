import { NextRequest, NextResponse } from "next/server";
import { buildNoMatchEmailHtml } from "@/lib/send-match-email";

export async function GET(req: NextRequest) {
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

        // Get query parameters with defaults
        const searchParams = req.nextUrl.searchParams;
        const recipientName = searchParams.get("recipientName") || "Alice";

        // Build the HTML
        const html = buildNoMatchEmailHtml(recipientName);

        // Return as HTML
        return new NextResponse(html, {
            status: 200,
            headers: {
                "Content-Type": "text/html",
            },
        });
    } catch (error) {
        console.error("Preview email error:", error);
        return NextResponse.json(
            { error: "Failed to generate preview" },
            { status: 500 }
        );
    }
}
