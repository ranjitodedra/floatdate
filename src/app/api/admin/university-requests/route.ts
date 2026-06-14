import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const status = req.nextUrl.searchParams.get("status") || undefined;

        const requests = await prisma.universityRequest.findMany({
            where: status ? { status } : undefined,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ requests });
    } catch (error) {
        console.error("Admin university requests list error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
