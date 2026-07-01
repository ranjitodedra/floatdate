import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { deleteVerificationDoc, createSignedDocUrl } from "@/lib/supabase-admin";
import { VERIFICATION_STATUS } from "@/lib/verification";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId } = await params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                verificationStatus: true,
                verificationMethod: true,
                verificationDocPath: true,
                verificationNotes: true,
                verificationReviewedAt: true,
                verifiedAt: true,
                university: {
                    select: { id: true, name: true },
                },
                referralReceived: {
                    select: {
                        referrer: {
                            select: { name: true, email: true, referralCode: true },
                        },
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { referralReceived, ...rest } = user;
        const documentUrl = await createSignedDocUrl(user.verificationDocPath);

        return NextResponse.json({
            request: {
                ...rest,
                referredBy: referralReceived?.referrer ?? null,
                documentUrl,
            },
        });
    } catch (error) {
        console.error("Admin verification request detail error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId } = await params;
        const body = await req.json();
        const { action, adminNotes } = body as {
            action?: string;
            adminNotes?: string;
        };

        if (action !== "approve" && action !== "reject") {
            return NextResponse.json(
                { error: "Invalid action. Use approve or reject." },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                verificationDocPath: true,
                verificationStatus: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const docPath = user.verificationDocPath;
        const now = new Date();

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                verificationStatus:
                    action === "approve"
                        ? VERIFICATION_STATUS.APPROVED
                        : VERIFICATION_STATUS.REJECTED,
                verifiedAt: action === "approve" ? now : null,
                verificationReviewedAt: now,
                verificationNotes: adminNotes ?? null,
                verificationDocPath: null,
            },
            select: {
                id: true,
                email: true,
                name: true,
                verificationStatus: true,
                verificationReviewedAt: true,
                verifiedAt: true,
                verificationNotes: true,
            },
        });

        await deleteVerificationDoc(docPath);

        return NextResponse.json({ request: updated });
    } catch (error) {
        console.error("Admin verification request update error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
