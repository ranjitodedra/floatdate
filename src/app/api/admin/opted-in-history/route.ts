import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const universityId = req.nextUrl.searchParams.get("universityId");

        const allOptIns = await prisma.weeklyOptIn.findMany({
            where: universityId
                ? { user: { universityId } }
                : undefined,
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
                        universityId: true,
                        university: {
                            select: { name: true },
                        },
                    },
                },
            },
            orderBy: { optedInAt: "desc" },
        });

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
                    universityId: string;
                    universityName: string;
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
                universityId: optIn.user.universityId,
                universityName: optIn.user.university.name,
            });
        }

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
