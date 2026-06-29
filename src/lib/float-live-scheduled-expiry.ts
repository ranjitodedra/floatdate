import { prisma } from "@/lib/db";
import { isJoinWindowPast } from "@/lib/float-live-scheduled";

export async function expirePastScheduledDates(now: Date = new Date()): Promise<{
    expiredOpen: number;
    expiredClaimed: number;
    completed: number;
}> {
    const openDates = await prisma.floatLiveScheduledDate.findMany({
        where: { status: "open" },
        select: { id: true, scheduledAt: true, durationMinutes: true },
    });

    const openToExpire = openDates.filter((d) =>
        isJoinWindowPast(d.scheduledAt, d.durationMinutes, now)
    );

    if (openToExpire.length > 0) {
        await prisma.floatLiveScheduledDate.updateMany({
            where: { id: { in: openToExpire.map((d) => d.id) } },
            data: { status: "expired" },
        });
    }

    const claimedDates = await prisma.floatLiveScheduledDate.findMany({
        where: { status: "claimed" },
        select: { id: true, scheduledAt: true, durationMinutes: true },
    });

    const claimedToExpire = claimedDates.filter((d) =>
        isJoinWindowPast(d.scheduledAt, d.durationMinutes, now)
    );

    if (claimedToExpire.length > 0) {
        await prisma.floatLiveScheduledDate.updateMany({
            where: { id: { in: claimedToExpire.map((d) => d.id) } },
            data: { status: "expired" },
        });
    }

    const inProgressPast = await prisma.floatLiveScheduledDate.findMany({
        where: { status: "in_progress", chatRoomId: { not: null } },
        select: { id: true, chatRoomId: true, scheduledAt: true, durationMinutes: true },
    });

    let completed = 0;
    for (const d of inProgressPast) {
        if (!isJoinWindowPast(d.scheduledAt, d.durationMinutes, now)) continue;

        const room = await prisma.floatLiveChatRoom.findUnique({
            where: { id: d.chatRoomId! },
            select: { isActive: true },
        });

        if (room && !room.isActive) {
            await prisma.floatLiveScheduledDate.update({
                where: { id: d.id },
                data: { status: "completed" },
            });
            completed++;
        } else if (isJoinWindowPast(d.scheduledAt, d.durationMinutes, now)) {
            await prisma.floatLiveScheduledDate.update({
                where: { id: d.id },
                data: { status: "completed" },
            });
            completed++;
        }
    }

    return {
        expiredOpen: openToExpire.length,
        expiredClaimed: claimedToExpire.length,
        completed,
    };
}
