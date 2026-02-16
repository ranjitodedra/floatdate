import { Resend } from "resend";
import { prisma } from "./db";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "FloatDate <onboarding@resend.dev>";

// ─── Verification Email ───────────────────────────────────────

export async function sendVerificationEmail(
    to: string,
    name: string,
    token: string
): Promise<{ status: string; resendId?: string }> {
    if (process.env.EMAILS_ENABLED !== "true") {
        console.log(`[EMAIL DISABLED] Would send verification to ${to}`);
        return { status: "skipped" };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/api/auth/verify?token=${token}`;

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: "Verify your FloatDate account ✉️",
            html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background: #0f0f0f; color: #e4e4e7;">
          <h1 style="font-size: 28px; background: linear-gradient(to right, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">FloatDate</h1>
          <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 24px;">Email Verification</p>

          <p>Hey ${name} 👋</p>
          <p>Welcome to FloatDate! Please verify your email address to get started.</p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(to right, #a855f7, #ec4899); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">Verify My Email</a>
          </div>

          <p style="color: #a1a1aa; font-size: 13px;">Or copy and paste this link into your browser:</p>
          <p style="color: #a855f7; font-size: 13px; word-break: break-all;">${verifyUrl}</p>

          <p style="color: #52525b; font-size: 12px; margin-top: 32px;">This link expires in 24 hours. If you didn't create an account on FloatDate, you can safely ignore this email.</p>
        </div>
      `,
            replyTo: "support@dropdate.app",
        });

        if (error) {
            console.error("Verification email failed:", error);
            return { status: "failed" };
        }

        return { status: "sent", resendId: data?.id };
    } catch (error) {
        console.error("Verification email error:", error);
        return { status: "failed" };
    }
}

// ─── Match Email (with compatibility score) ───────────────────

export async function sendMatchEmail(
    to: string,
    recipientName: string,
    matchName: string,
    matchEmail: string,
    matchBio: string | null,
    explanation: string,
    similarityScore: number
): Promise<{ status: string; resendId?: string }> {
    if (process.env.EMAILS_ENABLED !== "true") {
        console.log(`[EMAIL DISABLED] Would send to ${to}`);
        return { status: "skipped" };
    }

    const scorePercent = Math.round(similarityScore * 100);

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: "Your FloatDate match is here 💜",
            html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background: #0f0f0f; color: #e4e4e7;">
          <h1 style="font-size: 28px; background: linear-gradient(to right, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">FloatDate</h1>
          <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 24px;">Your weekly match</p>
          
          <p>Hey ${recipientName} 👋</p>
          <p>Your match this week is <strong style="color: #a855f7;">${matchName}</strong>.</p>

          <div style="text-align: center; margin: 24px 0; padding: 20px; background: rgba(168, 85, 247, 0.1); border-radius: 16px; border: 1px solid rgba(168, 85, 247, 0.2);">
            <p style="font-size: 36px; font-weight: 700; background: linear-gradient(to right, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">${scorePercent}%</p>
            <p style="color: #a1a1aa; font-size: 13px; margin: 4px 0 0 0;">Compatibility Score</p>
          </div>

          <p style="color: #a1a1aa; font-style: italic; padding: 16px; background: rgba(168, 85, 247, 0.1); border-radius: 12px; border-left: 3px solid #a855f7;">"${explanation}"</p>
          
          <hr style="border: none; border-top: 1px solid #27272a; margin: 24px 0;" />
          
          <p><strong>About ${matchName}:</strong> ${matchBio || "No bio yet."}</p>
          <p>Reach out to them at: <a href="mailto:${matchEmail}" style="color: #a855f7;">${matchEmail}</a></p>
          
          <p style="font-size: 12px; color: #52525b; margin-top: 32px;">
            You received this because you opted in on FloatDate.
            Reply STOP to unsubscribe.
          </p>
        </div>
      `,
            replyTo: "support@dropdate.app",
        });

        if (error) {
            console.error("Email send failed:", error);
            return { status: "failed" };
        }

        return { status: "sent", resendId: data?.id };
    } catch (error) {
        console.error("Email error:", error);
        return { status: "failed" };
    }
}

// ─── No-Match Email ───────────────────────────────────────────

export async function sendNoMatchEmail(
    to: string,
    recipientName: string
): Promise<{ status: string; resendId?: string }> {
    if (process.env.EMAILS_ENABLED !== "true") {
        console.log(`[EMAIL DISABLED] Would send no-match to ${to}`);
        return { status: "skipped" };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: "FloatDate update for this week 💛",
            html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background: #0f0f0f; color: #e4e4e7;">
          <h1 style="font-size: 28px; background: linear-gradient(to right, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">FloatDate</h1>
          <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 24px;">Weekly update</p>
          
          <p>Hey ${recipientName} 👋</p>
          <p>We weren't able to find your perfect match this week — but don't worry! We're still growing our community and finding more amazing people like you.</p>
          
          <div style="padding: 20px; background: rgba(168, 85, 247, 0.1); border-radius: 12px; border-left: 3px solid #a855f7; margin: 24px 0;">
            <p style="color: #a1a1aa; margin: 0;">💡 <strong style="color: #e4e4e7;">Stay opted in</strong> for next week — your match could be just around the corner!</p>
          </div>

          <p>In the meantime, make sure your profile and answers are up-to-date to improve your chances.</p>
          
          <p style="font-size: 12px; color: #52525b; margin-top: 32px;">
            You received this because you opted in on FloatDate.
            Reply STOP to unsubscribe.
          </p>
        </div>
      `,
            replyTo: "support@dropdate.app",
        });

        if (error) {
            console.error("No-match email failed:", error);
            return { status: "failed" };
        }

        return { status: "sent", resendId: data?.id };
    } catch (error) {
        console.error("No-match email error:", error);
        return { status: "failed" };
    }
}

// ─── Batch Send Match Emails ──────────────────────────────────

export async function sendMatchEmails(
    matches: {
        userAId: string;
        userBId: string;
        similarityScore: number;
        explanation: string;
    }[]
): Promise<number> {
    let sent = 0;

    for (const match of matches) {
        const [userA, userB] = await Promise.all([
            prisma.user.findUnique({
                where: { id: match.userAId },
                select: { email: true, name: true, bio: true },
            }),
            prisma.user.findUnique({
                where: { id: match.userBId },
                select: { email: true, name: true, bio: true },
            }),
        ]);

        if (!userA || !userB) continue;

        const dbMatch = await prisma.match.findFirst({
            where: {
                userAId: match.userAId,
                userBId: match.userBId,
            },
            orderBy: { createdAt: "desc" },
        });

        const matchId = dbMatch?.id || "unknown";

        // Send to User A
        const resultA = await sendMatchEmail(
            userA.email,
            userA.name,
            userB.name,
            userB.email,
            userB.bio,
            match.explanation,
            match.similarityScore
        );

        await prisma.emailLog.create({
            data: {
                userId: match.userAId,
                matchId,
                status: resultA.status,
                resendId: resultA.resendId || null,
            },
        });

        if (resultA.status === "sent") sent++;
        await new Promise((r) => setTimeout(r, 500));

        // Send to User B
        const resultB = await sendMatchEmail(
            userB.email,
            userB.name,
            userA.name,
            userA.email,
            userA.bio,
            match.explanation,
            match.similarityScore
        );

        await prisma.emailLog.create({
            data: {
                userId: match.userBId,
                matchId,
                status: resultB.status,
                resendId: resultB.resendId || null,
            },
        });

        if (resultB.status === "sent") sent++;
        await new Promise((r) => setTimeout(r, 500));
    }

    return sent;
}
