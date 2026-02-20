import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const resetSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = resetSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const { token, password } = result.data;

        // Find the token
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
        });

        if (!resetToken || resetToken.used) {
            return NextResponse.json(
                { error: "invalid-token" },
                { status: 400 }
            );
        }

        if (resetToken.expiresAt < new Date()) {
            return NextResponse.json(
                { error: "expired-token" },
                { status: 400 }
            );
        }

        // Hash new password and update user in a transaction
        const passwordHash = await hashPassword(password);

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { email: resetToken.email },
                data: { passwordHash },
            });

            // Mark token as used
            await tx.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            });
        });

        return NextResponse.json({
            success: true,
            message: "Password reset successfully. You can now log in.",
        });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
