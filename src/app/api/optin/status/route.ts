import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function getWeekStart(): Date {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 3 = Wednesday, ..., 6 = Saturday
    // Calculate days to subtract to get to the most recent Wednesday (day 3)
    // If today is Wednesday or later (3-6), subtract (day - 3)
    // If today is before Wednesday (0-2), subtract (day + 4) to go to previous Wednesday
    const diff = day >= 3 ? day - 3 : day + 4;
    const wednesday = new Date(now);
    wednesday.setUTCDate(now.getUTCDate() - diff);
    wednesday.setUTCHours(0, 0, 0, 0);
    return wednesday;
}

export async function GET() {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const weekStart = getWeekStart();

        const optIn = await prisma.weeklyOptIn.findUnique({
            where: {
                userId_weekStart: {
                    userId: session.userId,
                    weekStart,
                },
            },
        });

        return NextResponse.json({
            optedIn: !!optIn,
            weekStart: weekStart.toISOString(),
        });
    } catch (error) {
        console.error("Opt-in status error:", error);
        return NextResponse.json(
            { error: "Failed to check opt-in status" },
            { status: 500 }
        );
    }
}
