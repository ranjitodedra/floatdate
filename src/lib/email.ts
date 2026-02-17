import nodemailer from "nodemailer";

// ─── Gmail SMTP Transporter ──────────────────────────────────
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const FROM_ADDRESS = `"${process.env.EMAIL_FROM_NAME || "FloatDate Team"}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;

// ─── Generic Send ─────────────────────────────────────────────

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
}

interface SendEmailResult {
    success: boolean;
    messageId?: string;
}

export async function sendEmail({
    to,
    subject,
    html,
    text,
    replyTo,
}: SendEmailOptions): Promise<SendEmailResult> {
    try {
        const info = await transporter.sendMail({
            from: FROM_ADDRESS,
            to,
            subject,
            html,
            text,
            replyTo,
        });

        console.log(`[EMAIL] Sent to ${to} — messageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        // Never log EMAIL_PASS — only log the error message
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[EMAIL] Failed to send to ${to} — ${message}`);
        return { success: false };
    }
}
