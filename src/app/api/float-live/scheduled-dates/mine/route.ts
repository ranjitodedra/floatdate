import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expirePastScheduledDates } from "@/lib/float-live-scheduled-expiry";
import {
    buildCreatorMatchBanner,
    buildJoinerMatchBanner,
    formatScheduledAtLabel,
    isWithinJoinWindow,
} from "@/lib/float-live-scheduled";

export async function GET() {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await expirePastScheduledDates();

        const now = new Date();
        const dates = await prisma.floatLiveScheduledDate.findMany({
            where: {
                status: { in: ["open", "claimed", "in_progress"] },
                OR: [
                    { creatorId: authSession.userId },
                    { joinerId: authSession.userId },
                ],
            },
            include: {
                university: { select: { name: true } },
            },
            orderBy: { scheduledAt: "asc" },
        });

        const items = dates.map((date) => {
            const isCreator = date.creatorId === authSession.userId;
            const isJoiner = date.joinerId === authSession.userId;
            const canJoin =
                date.status === "claimed" &&
                isWithinJoinWindow(date.scheduledAt, date.durationMinutes, now);

            let banner: string | null = null;
            if (date.status === "claimed") {
                if (isCreator) {
                    banner = buildCreatorMatchBanner(date.scheduledAt);
                } else if (isJoiner) {
                    banner = buildJoinerMatchBanner(date.scheduledAt);
                }
            }

            return {
                id: date.id,
                scheduledAt: date.scheduledAt.toISOString(),
                scheduledAtLabel: formatScheduledAtLabel(date.scheduledAt),
                durationMinutes: date.durationMinutes,
                intention: date.intention,
                status: date.status,
                role: isCreator ? "creator" : "joiner",
                expectations: date.expectations,
                universityName: date.university.name,
                banner,
                canJoin,
                chatRoomId: date.chatRoomId,
            };
        });

        return NextResponse.json({ dates: items });
    } catch (error) {
        console.error("Float Live scheduled-dates mine GET error:", error);
        return NextResponse.json({ error: "Failed to load your scheduled dates" }, { status: 500 });
    }
}
