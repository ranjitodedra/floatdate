import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { sendPasswordResetEmail } from "@/lib/send-match-email";

const forgotSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = forgotSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const email = result.data.email.toLowerCase();

        // Always return success to prevent email enumeration attacks
        const successResponse = NextResponse.json({
            success: true,
            message:
                "If an account with that email exists, we've sent a password reset link.",
        });

        // Look up user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return successResponse; // Don't reveal that email doesn't exist
        }

        // Rate limit: don't send if a valid token was created in the last 2 minutes
        const recentToken = await prisma.passwordResetToken.findFirst({
            where: {
                email,
                createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
                used: false,
            },
        });

        if (recentToken) {
            return successResponse; // Silently skip to prevent spam
        }

        // Invalidate any existing unused tokens for this email
        await prisma.passwordResetToken.updateMany({
            where: { email, used: false },
            data: { used: true },
        });

        // Create new token (expires in 1 hour)
        const token = randomUUID();
        await prisma.passwordResetToken.create({
            data: {
                email,
                token,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            },
        });

        // Send email
        await sendPasswordResetEmail(email, user.name, token);

        return successResponse;
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
