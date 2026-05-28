import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { createImpersonationSession, clearImpersonationSession } from "@/lib/auth";

const impersonateSchema = z.object({
    email: z.string().email(),
});

export async function POST(req: NextRequest) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const parsed = impersonateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
                { status: 400 }
            );
        }

        const email = parsed.data.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (user.id === admin.id) {
            await clearImpersonationSession();
            return NextResponse.json({
                success: true,
                redirectTo: "/dashboard",
                impersonating: null,
            });
        }

        await createImpersonationSession(admin.id, user.id);

        return NextResponse.json({
            success: true,
            redirectTo: "/dashboard",
            impersonating: {
                userId: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error("Admin impersonate error:", error);
        return NextResponse.json(
            { error: "Failed to start impersonation session" },
            { status: 500 }
        );
    }
}
