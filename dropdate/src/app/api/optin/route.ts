import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function getWeekStart(): Date {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
}

export async function POST() {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const weekStart = getWeekStart();

        await prisma.weeklyOptIn.upsert({
            where: {
                userId_weekStart: {
                    userId: session.userId,
                    weekStart,
                },
            },
            update: {},
            create: {
                userId: session.userId,
                weekStart,
            },
        });

        return NextResponse.json({ success: true, weekStart: weekStart.toISOString() });
    } catch (error) {
        console.error("Opt-in error:", error);
        return NextResponse.json(
            { error: "Failed to opt in" },
            { status: 500 }
        );
    }
}
