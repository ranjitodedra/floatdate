import { sendEmail, sendVerifyEmail } from "./email";
import { prisma } from "./db";
import { getDisplayReasonsFromExplanation } from "./match-explanation";

// ─── Verification Email ───────────────────────────────────────

export async function sendVerificationEmail(
    to: string,
    name: string,
    token: string
): Promise<{ status: string; messageId?: string }> {
    if (process.env.EMAILS_ENABLED !== "true") {
        console.log(`[EMAIL DISABLED] Would send verification to ${to}`);
        return { status: "skipped" };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/verify-email/confirm?token=${token}`;

    const result = await sendVerifyEmail({
        to,
        subject: "Verify your FloatDate account ✉️",
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 24px; background: #fafafa;">
          <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px 24px;">
            <h1 style="font-size: 28px; color: #18181b; margin-bottom: 8px; font-weight: 700;">FloatDate</h1>
            <p style="color: #71717a; font-size: 14px; margin-bottom: 24px;">Email Verification</p>

            <p style="color: #18181b; margin: 0 0 16px 0;">Hey ${name} 👋</p>
            <p style="color: #18181b; margin: 0 0 32px 0;">Welcome to FloatDate! Please verify your email address to get started.</p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: #18181b; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">Verify My Email</a>
            </div>

            <p style="color: #71717a; font-size: 13px; margin: 24px 0 8px 0;">Or copy and paste this link into your browser:</p>
            <p style="color: #18181b; font-size: 13px; word-break: break-all; background: #fafafa; padding: 12px; border-radius: 8px; border: 1px solid #e4e4e7; margin: 0 0 24px 0;">${verifyUrl}</p>

            <p style="color: #71717a; font-size: 12px; margin: 32px 0 0 0; border-top: 1px solid #e4e4e7; padding-top: 24px;">This link expires in 24 hours. If you didn't create an account on FloatDate, you can safely ignore this email.</p>
          </div>
        </div>
      `,
        replyTo: "support@floatdate.com",
    });

    if (!result.success) {
        return { status: "failed" };
    }

    return { status: "sent", messageId: result.messageId };
}

// ─── Password Reset Email ─────────────────────────────────────

export async function sendPasswordResetEmail(
    to: string,
    name: string,
    token: string
): Promise<{ status: string; messageId?: string }> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    if (process.env.EMAILS_ENABLED !== "true") {
        console.log(`[EMAIL DISABLED] Reset link: ${resetUrl}`);
        return { status: "skipped" };
    }

    const result = await sendVerifyEmail({
        to,
        subject: "Reset your FloatDate password 🔑",
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 24px; background: #fafafa;">
          <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px 24px;">
            <h1 style="font-size: 28px; color: #18181b; margin-bottom: 8px; font-weight: 700;">FloatDate</h1>
            <p style="color: #71717a; font-size: 14px; margin-bottom: 24px;">Password Reset</p>

            <p style="color: #18181b; margin: 0 0 16px 0;">Hey ${name} 👋</p>
            <p style="color: #18181b; margin: 0 0 32px 0;">We received a request to reset your password. Click the button below to choose a new one.</p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: #18181b; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">Reset My Password</a>
            </div>

            <p style="color: #71717a; font-size: 13px; margin: 24px 0 8px 0;">Or copy and paste this link into your browser:</p>
            <p style="color: #18181b; font-size: 13px; word-break: break-all; background: #fafafa; padding: 12px; border-radius: 8px; border: 1px solid #e4e4e7; margin: 0 0 24px 0;">${resetUrl}</p>

            <p style="color: #71717a; font-size: 12px; margin: 32px 0 0 0; border-top: 1px solid #e4e4e7; padding-top: 24px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
          </div>
        </div>
      `,
        replyTo: "support@floatdate.com",
    });

    if (!result.success) {
        return { status: "failed" };
    }

    return { status: "sent", messageId: result.messageId };
}

// ─── Match Email (with compatibility score) ───────────────────

export function buildMatchEmailHtml(
    recipientName: string,
    matchName: string,
    matchEmail: string,
    matchBio: string | null,
    explanation: string[],
    similarityScore: number
): string {
    const scorePercent = Math.round(similarityScore * 100);
    const scoreFormatted = scorePercent.toFixed(1);

    const reasonsList = explanation
        .map((reason) => `<li style="color: #18181b; margin: 0 0 12px 0; line-height: 1.6;">${escapeHtml(reason)}</li>`)
        .join("");

    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 24px; background: #fafafa;">
          <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px 24px;">
            <h1 style="font-size: 28px; color: #18181b; margin-bottom: 8px; font-weight: 700;">FloatDate</h1>
            <p style="color: #71717a; font-size: 14px; margin-bottom: 24px;">Your weekly match</p>
            
            <p style="color: #18181b; margin: 0 0 16px 0;">Hey ${recipientName} 👋</p>
            
            <div style="margin: 24px 0;">
              <p style="color: #18181b; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Your match: ${matchName}</p>
              <p style="color: #18181b; margin: 0 0 24px 0;">📧 <a href="mailto:${matchEmail}" style="color: #18181b; text-decoration: underline;">${matchEmail}</a></p>
            </div>

            <div style="text-align: center; margin: 24px 0; padding: 24px; background: #fafafa; border-radius: 16px; border: 1px solid #e4e4e7;">
              <p style="font-size: 36px; font-weight: 700; color: #18181b; margin: 0;">🎯 ${scoreFormatted}%</p>
              <p style="color: #71717a; font-size: 13px; margin: 4px 0 0 0;">compatibility</p>
            </div>

            <div style="margin: 24px 0;">
              <p style="color: #18181b; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Here's why:</p>
              <ul style="margin: 0; padding-left: 20px; list-style: none;">
                ${reasonsList}
              </ul>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
            
            ${matchBio ? `<p style="color: #18181b; margin: 0 0 32px 0;"><strong>About ${matchName}:</strong> ${matchBio}</p>` : ""}
            
            <p style="font-size: 12px; color: #71717a; margin: 32px 0 0 0; border-top: 1px solid #e4e4e7; padding-top: 24px;">
              You received this because you opted in on FloatDate.
              Reply STOP to unsubscribe.
            </p>
          </div>
        </div>
      `;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export async function sendMatchEmail(
    to: string,
    recipientName: string,
    matchName: string,
    matchEmail: string,
    matchBio: string | null,
    explanation: string,
    similarityScore: number
): Promise<{ status: string; messageId?: string }> {
    if (process.env.EMAILS_ENABLED !== "true") {
        console.log(`[EMAIL DISABLED] Would send to ${to}`);
        return { status: "skipped" };
    }

    const reasons = getDisplayReasonsFromExplanation(explanation);

    const html = buildMatchEmailHtml(
        recipientName,
        matchName,
        matchEmail,
        matchBio,
        reasons,
        similarityScore
    );

    const result = await sendEmail({
        to,
        subject: "Your FloatDate match is here 💜",
        html,
        replyTo: "support@floatdate.com",
    });

    if (!result.success) {
        return { status: "failed" };
    }

    return { status: "sent", messageId: result.messageId };
}

// ─── No-Match Email ───────────────────────────────────────────

export function buildNoMatchEmailHtml(recipientName: string): string {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 24px; background: #fafafa;">
          <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px 24px;">
            <h1 style="font-size: 28px; color: #18181b; margin-bottom: 8px; font-weight: 700;">FloatDate</h1>
            <p style="color: #71717a; font-size: 14px; margin-bottom: 24px;">Weekly update</p>
            
            <p style="color: #18181b; margin: 0 0 16px 0;">Hey ${recipientName} 👋</p>
            <p style="color: #18181b; margin: 0 0 16px 0;">We weren't able to find a compatible match for you this week.</p>
            <p style="color: #18181b; margin: 0 0 16px 0;">Matching depends on mutual preferences and balanced participation each round. If filters (like gender preferences) don't align evenly in a given cycle, not everyone receives a match immediately.</p>
            <p style="color: #18181b; margin: 0 0 24px 0;">The good news? We prioritize people who didn't get matched in the next round.</p>
            
            <div style="padding: 20px; background: #fafafa; border-radius: 12px; border-left: 3px solid #18181b; margin: 24px 0;">
              <p style="color: #18181b; margin: 0;">💡 <strong>Make sure to opt in again next week</strong> you'll be prioritized!</p>
            </div>

            <p style="color: #18181b; margin: 0 0 32px 0;">In the meantime, make sure your bio and answers are up-to-date to improve your chances.</p>
            
            <p style="font-size: 12px; color: #71717a; margin: 32px 0 0 0; border-top: 1px solid #e4e4e7; padding-top: 24px;">
              You received this because you opted in on FloatDate.
              Reply STOP to unsubscribe.
            </p>
          </div>
        </div>
      `;
}

export async function sendNoMatchEmail(
    to: string,
    recipientName: string
): Promise<{ status: string; messageId?: string }> {
    if (process.env.EMAILS_ENABLED !== "true") {
        console.log(`[EMAIL DISABLED] Would send no-match to ${to}`);
        return { status: "skipped" };
    }

    const html = buildNoMatchEmailHtml(recipientName);

    const result = await sendEmail({
        to,
        subject: "FloatDate update for this week 💛",
        html,
        replyTo: "support@floatdate.com",
    });

    if (!result.success) {
        return { status: "failed" };
    }

    return { status: "sent", messageId: result.messageId };
}

// ─── Send with Retry ──────────────────────────────────────────

const SEND_DELAY_MS = 3000; // 3 seconds between emails
const RETRY_DELAY_MS = 5000; // 5 seconds before retry

async function sendMatchEmailWithRetry(
    to: string,
    recipientName: string,
    matchName: string,
    matchEmail: string,
    matchBio: string | null,
    explanation: string,
    similarityScore: number
): Promise<{ status: string; messageId?: string }> {
    const result = await sendMatchEmail(
        to, recipientName, matchName, matchEmail, matchBio, explanation, similarityScore
    );

    if (result.status === "sent" || result.status === "skipped") {
        return result;
    }

    // Retry once after a delay
    console.log(`[EMAIL RETRY] First attempt failed for ${to}, retrying in ${RETRY_DELAY_MS / 1000}s...`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));

    const retry = await sendMatchEmail(
        to, recipientName, matchName, matchEmail, matchBio, explanation, similarityScore
    );

    if (retry.status !== "sent") {
        console.error(`[EMAIL RETRY] Second attempt also failed for ${to}`);
    }

    return retry;
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

        // Send to User A (with retry)
        const resultA = await sendMatchEmailWithRetry(
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
                messageId: resultA.messageId || null,
            },
        });

        if (resultA.status === "sent") sent++;
        await new Promise((r) => setTimeout(r, SEND_DELAY_MS));

        // Send to User B (with retry)
        const resultB = await sendMatchEmailWithRetry(
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
                messageId: resultB.messageId || null,
            },
        });

        if (resultB.status === "sent") sent++;
        await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
    }

    return sent;
}
