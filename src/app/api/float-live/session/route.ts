import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFloatLiveActive, getTodaySessionTimes } from "@/lib/float-live-time";

export async function GET() {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { active } = isFloatLiveActive();
        if (!active) {
            return NextResponse.json(
                { error: "Float Live is only available 5-6 PM ET" },
                { status: 403 }
            );
        }

        const { date, startTime, endTime } = getTodaySessionTimes();

        // Get or create today's session
        const existing = await prisma.floatLiveSession.findFirst({
            where: {
                date: {
                    gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                    lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
                },
            },
        });

        if (existing) {
            return NextResponse.json({ session: existing });
        }

        const newSession = await prisma.floatLiveSession.create({
            data: { date, startTime, endTime },
        });

        return NextResponse.json({ session: newSession });
    } catch (error) {
        console.error("Float Live session error:", error);
        return NextResponse.json({ error: "Failed to get session" }, { status: 500 });
    }
}
