import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { getWeekStart } from "@/lib/week-cycle";

export async function GET() {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const weekStart = getWeekStart();

        const optIns = await prisma.weeklyOptIn.findMany({
            where: { weekStart },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        city: true,
                        gender: true,
                        genderPref: true,
                        completedSetup: true,
                    },
                },
            },
            orderBy: { optedInAt: "desc" },
        });

        return NextResponse.json({
            weekStart: weekStart.toISOString(),
            users: optIns.map((o) => ({
                id: o.user.id,
                name: o.user.name,
                email: o.user.email,
                city: o.user.city,
                gender: o.user.gender,
                genderPref: o.user.genderPref,
                completedSetup: o.user.completedSetup,
                optedInAt: o.optedInAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("Admin opted-in error:", error);
        return NextResponse.json(
            { error: "Failed to fetch opted-in users" },
            { status: 500 }
        );
    }
}
