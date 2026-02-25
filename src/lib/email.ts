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

// ─── PrivateMail SMTP Transporter (for verification emails) ──
const verifyTransporter = nodemailer.createTransport({
    host: process.env.VERIFY_EMAIL_HOST || "mail.privateemail.com",
    port: parseInt(process.env.VERIFY_EMAIL_PORT || "465"),
    secure: true,
    auth: {
        user: process.env.VERIFY_EMAIL_USER,
        pass: process.env.VERIFY_EMAIL_PASS,
    },
});

const VERIFY_FROM_ADDRESS = `"FloatDate" <verify@floatdate.com>`;

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

// ─── Verification Email Send (via PrivateMail) ────────────────

export async function sendVerifyEmail({
    to,
    subject,
    html,
    text,
    replyTo,
}: SendEmailOptions): Promise<SendEmailResult> {
    try {
        const info = await verifyTransporter.sendMail({
            from: VERIFY_FROM_ADDRESS,
            to,
            subject,
            html,
            text,
            replyTo,
        });

        console.log(`[VERIFY EMAIL] Sent to ${to} — messageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        // Never log VERIFY_EMAIL_PASS — only log the error message
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[VERIFY EMAIL] Failed to send to ${to} — ${message}`);
        return { success: false };
    }
}
