import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { VERIFICATION_METHOD, VERIFICATION_STATUS } from "@/lib/verification";

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

        const existingUser = await prisma.user.findUnique({
            where: { email: pending.email },
        });

        if (existingUser) {
            await prisma.$transaction(async (tx) => {
                await tx.pendingSignup.delete({ where: { id: pending.id } });
            });
            await createSession(existingUser.id);
            return NextResponse.json({
                success: true,
                redirect: "/dashboard",
            });
        }

        const isDocumentVerification =
            pending.verificationMethod === VERIFICATION_METHOD.DOCUMENT;

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
                    verificationMethod: pending.verificationMethod,
                    verificationStatus: isDocumentVerification
                        ? VERIFICATION_STATUS.PENDING
                        : VERIFICATION_STATUS.APPROVED,
                    verificationDocPath: isDocumentVerification
                        ? pending.verificationDocPath
                        : null,
                    verifiedAt: isDocumentVerification ? null : new Date(),
                },
            });

            await tx.pendingSignup.delete({ where: { id: pending.id } });

            return newUser;
        });

        await createSession(user.id);

        return NextResponse.json({
            success: true,
            redirect: "/dashboard",
        });
    } catch (error) {
        console.error("Verify error:", error);
        return NextResponse.json(
            { error: "server-error" },
            { status: 500 }
        );
    }
}
