import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/send-match-email";
import { randomUUID } from "crypto";

const resendSchema = z.object({
    email: z.string().email(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const result = resendSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: "Please provide a valid email address" },
                { status: 400 }
            );
        }

        const { email } = result.data;
        const normalizedEmail = email.toLowerCase();

        // Check if already verified as a real User
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "This email is already verified. Please log in." },
                { status: 400 }
            );
        }

        // Look up pending signup
        const pending = await prisma.pendingSignup.findUnique({
            where: { email: normalizedEmail },
        });

        if (!pending) {
            return NextResponse.json(
                { error: "No pending signup found for this email. Please sign up first." },
                { status: 404 }
            );
        }

        // Generate a fresh token
        const verifyToken = randomUUID();
        const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.pendingSignup.update({
            where: { id: pending.id },
            data: { verifyToken, verifyTokenExpiry },
        });

        const emailResult = await sendVerificationEmail(pending.email, pending.name, verifyToken);

        if (emailResult.status === "sent" || emailResult.status === "skipped") {
            return NextResponse.json({
                success: true,
                message: "Verification email sent. Check your inbox.",
            });
        }

        return NextResponse.json(
            { error: "Failed to send verification email. Please try again." },
            { status: 500 }
        );
    } catch (error) {
        console.error("Resend verification error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
