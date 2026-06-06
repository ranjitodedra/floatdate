import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    // Protect with CRON_SECRET
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const to = body.to;

        if (!to || typeof to !== "string") {
            return NextResponse.json(
                { error: "Missing 'to' email address in request body" },
                { status: 400 }
            );
        }

        const result = await sendEmail({
            to,
            subject: "FloatDate Test Email ✅",
            html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background: #0f0f0f; color: #e4e4e7;">
          <h1 style="font-size: 28px; background: linear-gradient(to right, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">FloatDate</h1>
          <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 24px;">Test Email</p>
          <p>If you're reading this, Gmail SMTP is working! 🎉</p>
          <p style="color: #52525b; font-size: 12px; margin-top: 32px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
            text: "If you're reading this, Gmail SMTP is working!",
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                messageId: result.messageId,
            });
        }

        return NextResponse.json(
            { error: "Failed to send test email" },
            { status: 500 }
        );
    } catch (error) {
        console.error("Test email error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
