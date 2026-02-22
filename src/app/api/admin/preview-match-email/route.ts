import { NextRequest, NextResponse } from "next/server";
import { buildMatchEmailHtml } from "@/lib/send-match-email";

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
        const matchName = searchParams.get("matchName") || "Bob";
        const matchEmail = searchParams.get("matchEmail") || "bob@example.com";
        const matchBio = searchParams.get("matchBio") || "Coffee snob. Dog person. Reads too much sci-fi.";
        const explanationParam = searchParams.get("explanation");
        let explanation: string[];
        if (explanationParam) {
            try {
                explanation = JSON.parse(explanationParam);
                if (!Array.isArray(explanation)) {
                    explanation = [explanationParam];
                }
            } catch {
                explanation = [explanationParam];
            }
        } else {
            // All defaults are real entries from the QUESTION_INSIGHTS map in matching.ts
            explanation = [
                "Neither of you stresses easily about relationship issues",
                "You both believe relationships require work and compromise to succeed",
                "You'd both give space after a disagreement without worry",
                "You both feel comfortable opening up and relying on romantic partners",
                "You both take time to process emotions before speaking or acting",
            ];
        }
        const scoreParam = searchParams.get("score");
        const similarityScore = scoreParam ? parseFloat(scoreParam) : 0.993;

        // Validate similarity score
        if (isNaN(similarityScore) || similarityScore < 0 || similarityScore > 1) {
            return NextResponse.json(
                { error: "Invalid score. Must be between 0 and 1." },
                { status: 400 }
            );
        }

        // Build the HTML
        const html = buildMatchEmailHtml(
            recipientName,
            matchName,
            matchEmail,
            matchBio,
            explanation,
            similarityScore
        );

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
