import { Resend } from "resend";
import { prisma } from "./db";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMatchEmail(
    to: string,
    recipientName: string,
    matchName: string,
    matchEmail: string,
    matchBio: string | null,
    explanation: string
): Promise<{ status: string; resendId?: string }> {
    if (process.env.EMAILS_ENABLED !== "true") {
        console.log(`[EMAIL DISABLED] Would send to ${to}`);
        return { status: "skipped" };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: "DropDate <hey@mail.dropdate.app>",
            to,
            subject: "Your DropDate match is here 💜",
            html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background: #0f0f0f; color: #e4e4e7;">
          <h1 style="font-size: 28px; background: linear-gradient(to right, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">DropDate</h1>
          <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 24px;">Your weekly match</p>
          
          <p>Hey ${recipientName} 👋</p>
          <p>Your match this week is <strong style="color: #a855f7;">${matchName}</strong>.</p>
          <p style="color: #a1a1aa; font-style: italic; padding: 16px; background: rgba(168, 85, 247, 0.1); border-radius: 12px; border-left: 3px solid #a855f7;">"${explanation}"</p>
          
          <hr style="border: none; border-top: 1px solid #27272a; margin: 24px 0;" />
          
          <p><strong>About ${matchName}:</strong> ${matchBio || "No bio yet."}</p>
          <p>Reach out to them at: <a href="mailto:${matchEmail}" style="color: #a855f7;">${matchEmail}</a></p>
          
          <p style="font-size: 12px; color: #52525b; margin-top: 32px;">
            You received this because you opted in on DropDate.
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

        // Find the match record in DB
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
            match.explanation
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

        // Rate limiting: wait 500ms between emails
        await new Promise((r) => setTimeout(r, 500));

        // Send to User B
        const resultB = await sendMatchEmail(
            userB.email,
            userB.name,
            userA.name,
            userA.email,
            userA.bio,
            match.explanation
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

        // Rate limiting
        await new Promise((r) => setTimeout(r, 500));
    }

    return sent;
}
