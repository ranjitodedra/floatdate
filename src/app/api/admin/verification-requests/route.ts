import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { createSignedDocUrl } from "@/lib/supabase-admin";
import { VERIFICATION_STATUS } from "@/lib/verification";

export async function GET(req: NextRequest) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const status =
            req.nextUrl.searchParams.get("status") || VERIFICATION_STATUS.PENDING;

        const users = await prisma.user.findMany({
            where: {
                verificationMethod: "document",
                verificationStatus: status,
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                verificationStatus: true,
                verificationDocPath: true,
                verificationNotes: true,
                verificationReviewedAt: true,
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

        const requests = await Promise.all(
            users.map(async (user) => {
                const { referralReceived, ...rest } = user;
                return {
                    ...rest,
                    referredBy: referralReceived?.referrer ?? null,
                    documentUrl: await createSignedDocUrl(user.verificationDocPath),
                };
            })
        );

        return NextResponse.json({ requests });
    } catch (error) {
        console.error("Admin verification requests list error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
