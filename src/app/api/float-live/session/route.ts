import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTodaySessionTimes } from "@/lib/float-live-time";
import { requireReferralUnlock } from "@/lib/guards";

export async function GET() {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const referralDenied = await requireReferralUnlock(session.userId);
        if (referralDenied) return referralDenied;

        const { date, startTime, endTime } = await getTodaySessionTimes();

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
