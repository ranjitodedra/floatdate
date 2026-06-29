import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const applications = await prisma.campusShowApplication.findMany({
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
            applications: applications.map((app) => ({
                ...app,
                createdAt: app.createdAt.toISOString(),
                statusUpdatedAt: app.statusUpdatedAt?.toISOString() ?? null,
            })),
        });
    } catch (error) {
        console.error("Admin show applications list error:", error);
        return NextResponse.json(
            { error: "Failed to fetch applications" },
            { status: 500 }
        );
    }
}
