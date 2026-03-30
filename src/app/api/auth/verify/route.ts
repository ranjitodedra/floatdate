import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

const verifySchema = z.object({
    token: z.string().min(1, "Token is required"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = verifySchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: "missing-token" },
                { status: 400 }
            );
        }

        const { token } = result.data;

        // Look up the pending signup by verification token
        const pending = await prisma.pendingSignup.findUnique({
            where: { verifyToken: token },
        });

        if (!pending) {
            return NextResponse.json(
                { error: "invalid-token" },
                { status: 400 }
            );
        }

        if (pending.verifyTokenExpiry < new Date()) {
            return NextResponse.json(
                { error: "expired-token" },
                { status: 400 }
            );
        }

        // Check if a user already exists with this email (edge case: double-click or scanner already processed)
        const existingUser = await prisma.user.findUnique({
            where: { email: pending.email },
        });

        if (existingUser) {
            // Already verified — just clean up and log them in
            await prisma.$transaction(async (tx) => {
                await tx.pendingSignup.delete({ where: { id: pending.id } });
            });
            await createSession(existingUser.id);
            return NextResponse.json({
                success: true,
                redirect: "/questions",
            });
        }

        // Create the real User account from the pending signup data and delete pending signup in a transaction
        const user = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email: pending.email,
                    name: pending.name,
                    age: pending.age,
                    gender: pending.gender,
                    genderPref: pending.genderPref,
                    city: pending.city,
                    bio: pending.bio,
                    passwordHash: pending.passwordHash,
                    universityId: pending.universityId,
                    emailVerified: true,
                },
            });

            // Delete the pending signup record
            await tx.pendingSignup.delete({ where: { id: pending.id } });

            return newUser;
        });

        // Create session so the user is logged in
        await createSession(user.id);

        // Return success with redirect path
        return NextResponse.json({
            success: true,
            redirect: "/questions",
        });
    } catch (error) {
        console.error("Verify error:", error);
        return NextResponse.json(
            { error: "server-error" },
            { status: 500 }
        );
    }
}
