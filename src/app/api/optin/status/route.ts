import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getWeekStart } from "@/lib/week-cycle";

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
