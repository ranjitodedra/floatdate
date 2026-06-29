import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expirePastScheduledDates } from "@/lib/float-live-scheduled-expiry";
import {
    VALID_INTENTIONS,
    VALID_PREFERENCES,
    canJoinScheduledDate,
    formatScheduledTimeLabel,
    getGhostFillWindow,
    toPublicScheduledCard,
} from "@/lib/float-live-scheduled";

export async function GET(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const scheduledAtParam = searchParams.get("scheduledAt");
        const preference = searchParams.get("preference");
        const intention = searchParams.get("intention");

        if (!scheduledAtParam || !preference || !intention) {
            return NextResponse.json(
                { error: "scheduledAt, preference, and intention are required" },
                { status: 400 }
            );
        }

        if (!VALID_PREFERENCES.includes(preference as (typeof VALID_PREFERENCES)[number])) {
            return NextResponse.json({ error: "Invalid preference" }, { status: 400 });
        }
        if (!VALID_INTENTIONS.includes(intention as (typeof VALID_INTENTIONS)[number])) {
            return NextResponse.json({ error: "Invalid intention" }, { status: 400 });
        }

        const scheduledAt = new Date(scheduledAtParam);
        if (Number.isNaN(scheduledAt.getTime())) {
            return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
        }

        await expirePastScheduledDates();

        const user = await prisma.user.findUnique({
            where: { id: authSession.userId },
            select: { gender: true, universityId: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { start, end } = getGhostFillWindow(scheduledAt);
        const now = new Date();

        const dates = await prisma.floatLiveScheduledDate.findMany({
            where: {
                status: "open",
                scheduledAt: { gte: start, lte: end, gt: now },
                universityId: user.universityId,
                intention,
                creatorId: { not: authSession.userId },
            },
            include: {
                university: { select: { name: true } },
            },
            orderBy: { scheduledAt: "asc" },
        });

        const joinerProfile = {
            gender: user.gender,
            preference: "any",
            intention,
            universityId: user.universityId,
        };

        const compatible = dates.filter((date) => canJoinScheduledDate(joinerProfile, date));
        const timeLabel = formatScheduledTimeLabel(scheduledAt);

        return NextResponse.json({
            count: compatible.length,
            timeLabel,
            dates: compatible.map((date) => toPublicScheduledCard(date, true)),
        });
    } catch (error) {
        console.error("Float Live ghost-fill GET error:", error);
        return NextResponse.json({ error: "Failed to load ghost fill dates" }, { status: 500 });
    }
}
