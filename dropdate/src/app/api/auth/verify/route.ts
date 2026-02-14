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

        const user = await prisma.user.findUnique({
            where: { verifyToken: token },
        });

        if (!user) {
            return NextResponse.redirect(
                new URL("/verify-email?error=invalid-token", req.url)
            );
        }

        if (user.verifyTokenExpiry && user.verifyTokenExpiry < new Date()) {
            return NextResponse.redirect(
                new URL("/verify-email?error=expired-token", req.url)
            );
        }

        // Mark email as verified, clear the token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verifyToken: null,
                verifyTokenExpiry: null,
            },
        });

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
