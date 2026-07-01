import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expirePastScheduledDates } from "@/lib/float-live-scheduled-expiry";
import { requireApprovedUser, requireReferralUnlock } from "@/lib/guards";
import {
    VALID_INTENTIONS,
    VALID_PREFERENCES,
    MAX_CONCURRENT_SCHEDULED_DATES,
    canJoinScheduledDate,
    isValidDuration,
    sanitizeExpectations,
    toPublicScheduledCard,
} from "@/lib/float-live-scheduled";

export async function GET() {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const referralDenied = await requireReferralUnlock(authSession.userId);
        if (referralDenied) return referralDenied;

        await expirePastScheduledDates();

        const user = await prisma.user.findUnique({
            where: { id: authSession.userId },
            select: { gender: true, universityId: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const now = new Date();
        const dates = await prisma.floatLiveScheduledDate.findMany({
            where: {
                status: "open",
                scheduledAt: { gt: now },
                universityId: user.universityId,
                creatorId: { not: authSession.userId },
            },
            include: {
                university: { select: { name: true } },
            },
            orderBy: { scheduledAt: "asc" },
        });

        const joinerBase = {
            gender: user.gender,
            preference: "any",
            universityId: user.universityId,
        };

        const cards = dates.map((date) => {
            const joinerProfile = { ...joinerBase, intention: date.intention };
            const canJoin = canJoinScheduledDate(joinerProfile, date);
            return toPublicScheduledCard(date, canJoin);
        });

        cards.sort((a, b) => {
            if (a.canJoin !== b.canJoin) return a.canJoin ? -1 : 1;
            return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        });

        return NextResponse.json({ dates: cards });
    } catch (error) {
        console.error("Float Live scheduled-dates GET error:", error);
        return NextResponse.json({ error: "Failed to load scheduled dates" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const referralDenied = await requireReferralUnlock(authSession.userId);
        if (referralDenied) return referralDenied;

        const verificationDenied = await requireApprovedUser(authSession.userId);
        if (verificationDenied) return verificationDenied;

        const body = await req.json();
        const { scheduledAt, durationMinutes, preference, intention, expectations } = body;

        if (!scheduledAt || !durationMinutes || !preference || !intention) {
            return NextResponse.json(
                { error: "scheduledAt, durationMinutes, preference, and intention are required" },
                { status: 400 }
            );
        }

        if (!VALID_PREFERENCES.includes(preference)) {
            return NextResponse.json({ error: "Invalid preference" }, { status: 400 });
        }
        if (!VALID_INTENTIONS.includes(intention)) {
            return NextResponse.json({ error: "Invalid intention" }, { status: 400 });
        }
        if (!isValidDuration(Number(durationMinutes))) {
            return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
        }

        const scheduledDate = new Date(scheduledAt);
        if (Number.isNaN(scheduledDate.getTime())) {
            return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
        }

        const now = new Date();
        if (scheduledDate <= now) {
            return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: authSession.userId },
            select: { gender: true, universityId: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const activeCount = await prisma.floatLiveScheduledDate.count({
            where: {
                creatorId: authSession.userId,
                status: { in: ["open", "claimed"] },
            },
        });

        if (activeCount >= MAX_CONCURRENT_SCHEDULED_DATES) {
            return NextResponse.json(
                {
                    error: `You can have at most ${MAX_CONCURRENT_SCHEDULED_DATES} open or claimed dates at a time`,
                },
                { status: 409 }
            );
        }

        const duplicate = await prisma.floatLiveScheduledDate.findFirst({
            where: {
                creatorId: authSession.userId,
                scheduledAt: scheduledDate,
                status: "open",
            },
        });

        if (duplicate) {
            return NextResponse.json(
                { error: "You already have an open date at this time" },
                { status: 409 }
            );
        }

        const created = await prisma.floatLiveScheduledDate.create({
            data: {
                creatorId: authSession.userId,
                universityId: user.universityId,
                scheduledAt: scheduledDate,
                durationMinutes: Number(durationMinutes),
                gender: user.gender,
                preference,
                intention,
                expectations: sanitizeExpectations(expectations),
            },
            include: {
                university: { select: { name: true } },
            },
        });

        return NextResponse.json({ date: toPublicScheduledCard(created, false) }, { status: 201 });
    } catch (error) {
        console.error("Float Live scheduled-dates POST error:", error);
        return NextResponse.json({ error: "Failed to create scheduled date" }, { status: 500 });
    }
}
