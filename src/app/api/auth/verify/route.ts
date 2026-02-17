import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const token = req.nextUrl.searchParams.get("token");

        if (!token) {
            return NextResponse.redirect(
                new URL("/verify-email?error=missing-token", req.url)
            );
        }

        // Look up the pending signup by verification token
        const pending = await prisma.pendingSignup.findUnique({
            where: { verifyToken: token },
        });

        if (!pending) {
            return NextResponse.redirect(
                new URL("/verify-email?error=invalid-token", req.url)
            );
        }

        if (pending.verifyTokenExpiry < new Date()) {
            return NextResponse.redirect(
                new URL("/verify-email?error=expired-token", req.url)
            );
        }

        // Check if a user already exists with this email (edge case: double-click)
        const existingUser = await prisma.user.findUnique({
            where: { email: pending.email },
        });

        if (existingUser) {
            // Already verified — just clean up and log them in
            await prisma.pendingSignup.delete({ where: { id: pending.id } });
            await createSession(existingUser.id);
            return NextResponse.redirect(new URL("/questions", req.url));
        }

        // Create the real User account from the pending signup data
        const user = await prisma.user.create({
            data: {
                email: pending.email,
                name: pending.name,
                age: pending.age,
                gender: pending.gender,
                genderPref: pending.genderPref,
                city: pending.city,
                bio: pending.bio,
                passwordHash: pending.passwordHash,
                emailVerified: true,
            },
        });

        // Delete the pending signup record
        await prisma.pendingSignup.delete({ where: { id: pending.id } });

        // Create session so the user is logged in
        await createSession(user.id);

        // Redirect to questions page
        return NextResponse.redirect(new URL("/questions", req.url));
    } catch (error) {
        console.error("Verify error:", error);
        return NextResponse.redirect(
            new URL("/verify-email?error=server-error", req.url)
        );
    }
}
