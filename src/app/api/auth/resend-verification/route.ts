import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/send-match-email";
import { randomUUID } from "crypto";

export async function POST() {
    try {
        // Try to get session first (for logged-in but unverified users)
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { error: "Not authenticated. Please sign up or log in first." },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { id: true, email: true, name: true, emailVerified: true },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        if (user.emailVerified) {
            return NextResponse.json(
                { error: "Email is already verified" },
                { status: 400 }
            );
        }

        // Generate new token
        const verifyToken = randomUUID();
        const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: { verifyToken, verifyTokenExpiry },
        });

        const result = await sendVerificationEmail(user.email, user.name, verifyToken);

        if (result.status === "sent" || result.status === "skipped") {
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
