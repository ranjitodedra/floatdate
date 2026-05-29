import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GRACE_S, QUEUE_STALE_S } from "@/lib/float-live-presence";
import { endChatRoom } from "@/lib/float-live-room";

/**
 * Safety-net cleanup for stale queue entries and abandoned rooms.
 * Call via Vercel cron with Authorization: Bearer CRON_SECRET
 */
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            return NextResponse.json(
                { error: "CRON_SECRET not configured" },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        const queueStaleBefore = new Date(now.getTime() - QUEUE_STALE_S * 1000);
        const graceBefore = new Date(now.getTime() - GRACE_S * 1000);

        const expiredQueue = await prisma.floatLiveParticipant.updateMany({
            where: {
                status: "waiting",
                OR: [
                    { lastSeenAt: null },
                    { lastSeenAt: { lt: queueStaleBefore } },
                ],
                chatRoomsAsA: { none: { isActive: true } },
                chatRoomsAsB: { none: { isActive: true } },
            },
            data: {
                status: "idle",
                isOnline: false,
            },
        });

        const activeRooms = await prisma.floatLiveChatRoom.findMany({
            where: { isActive: true, status: "active" },
            include: { roomParticipants: true },
        });

        let roomsEnded = 0;

        for (const room of activeRooms) {
            if (room.roomParticipants.length === 0) continue;

            const allTimedOut = room.roomParticipants.every((rp) => {
                const seen = rp.lastSeenAt;
                return !seen || seen < graceBefore;
            });

            if (allTimedOut) {
                await prisma.$transaction(async (tx) => {
                    await endChatRoom(tx, room.id, "timeout");
                });
                roomsEnded++;
            }
        }

        return NextResponse.json({
            ok: true,
            expiredQueue: expiredQueue.count,
            roomsEnded,
        });
    } catch (error) {
        console.error("Float Live cleanup error:", error);
        return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
    }
}
