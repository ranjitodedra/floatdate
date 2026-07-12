import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminAudit } from "@/lib/admin-audit";
import { prisma } from "@/lib/db";
import { VERIFICATION_STATUS } from "@/lib/verification";
import {
    attributeReferral,
    generateUniqueReferralCode,
} from "@/lib/referral";
import { deleteVerificationDoc } from "@/lib/supabase-admin";

const verifyEmailSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export async function POST(req: NextRequest) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = verifyEmailSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const email = result.data.email.toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true },
        });

        if (existingUser) {
            return NextResponse.json({
                success: true,
                alreadyVerified: true,
                message: "This account already exists and can log in.",
                user: {
                    email: existingUser.email,
                    name: existingUser.name,
                },
            });
        }

        const pending = await prisma.pendingSignup.findUnique({
            where: { email },
        });

        if (!pending) {
            return NextResponse.json(
                { error: "No pending signup found for this email." },
                { status: 404 }
            );
        }

        const docPath = pending.verificationDocPath;
        const now = new Date();

        const user = await prisma.$transaction(async (tx) => {
            const referralCode = await generateUniqueReferralCode(tx);

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
                    verificationStatus: VERIFICATION_STATUS.APPROVED,
                    verificationDocPath: null,
                    verifiedAt: now,
                    referralCode,
                },
            });

            await attributeReferral(tx, {
                newUserId: newUser.id,
                newUserEmail: newUser.email,
                newUserReferralCode: referralCode,
                pendingReferralCode: pending.referralCode,
            });

            await tx.pendingSignup.delete({ where: { id: pending.id } });

            return newUser;
        });

        await deleteVerificationDoc(docPath);

        await logAdminAudit({
            actorUserId: admin.id,
            targetUserId: user.id,
            action: "manual_verify",
            metadata: { email: user.email },
        });

        return NextResponse.json({
            success: true,
            message: `${user.name} can now log in with their signup password.`,
            user: {
                email: user.email,
                name: user.name,
            },
        });
    } catch (error) {
        console.error("Admin manual verify error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
