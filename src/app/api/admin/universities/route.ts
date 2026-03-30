import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const universities = await prisma.university.findMany({
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                slug: true,
                emailDomain: true,
            },
        });

        return NextResponse.json({ universities });
    } catch (error) {
        console.error("Admin universities error:", error);
        return NextResponse.json(
            { error: "Failed to fetch universities" },
            { status: 500 }
        );
    }
}
