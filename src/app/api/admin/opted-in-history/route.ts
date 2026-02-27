import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch ALL opt-in records grouped by weekStart
        const allOptIns = await prisma.weeklyOptIn.findMany({
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

        // Group by weekStart
        const weekMap = new Map<
            string,
            {
                weekStart: Date;
                users: {
                    id: string;
                    name: string;
                    email: string;
                    city: string;
                    gender: string;
                    genderPref: string;
                    completedSetup: boolean;
                    optedInAt: Date;
                }[];
            }
        >();

        for (const optIn of allOptIns) {
            const key = optIn.weekStart.toISOString();
            if (!weekMap.has(key)) {
                weekMap.set(key, {
                    weekStart: optIn.weekStart,
                    users: [],
                });
            }
            weekMap.get(key)!.users.push({
                id: optIn.user.id,
                name: optIn.user.name,
                email: optIn.user.email,
                city: optIn.user.city,
                gender: optIn.user.gender,
                genderPref: optIn.user.genderPref,
                completedSetup: optIn.user.completedSetup,
                optedInAt: optIn.optedInAt,
            });
        }

        // Sort weeks chronologically (oldest first) and number them
        const sortedWeeks = Array.from(weekMap.values()).sort(
            (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
        );

        const weeks = sortedWeeks.map((week, index) => ({
            weekNumber: index + 1,
            weekStart: week.weekStart.toISOString(),
            weekEnd: new Date(
                week.weekStart.getTime() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
            totalOptedIn: week.users.length,
            users: week.users.map((u) => ({
                ...u,
                optedInAt: u.optedInAt.toISOString(),
            })),
        }));

        const grandTotal = weeks.reduce((sum, w) => sum + w.totalOptedIn, 0);

        return NextResponse.json({ weeks, grandTotal });
    } catch (error) {
        console.error("Admin opted-in-history error:", error);
        return NextResponse.json(
            { error: "Failed to fetch opted-in history" },
            { status: 500 }
        );
    }
}
