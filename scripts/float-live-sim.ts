/**
 * Staging-only Float Live presence / match smoke test.
 *
 * Usage (requires DATABASE_URL in env):
 *   npx tsx scripts/float-live-sim.ts
 *
 * Does NOT send emails. Only reads/writes FloatLive* tables.
 */

import { prisma } from "../src/lib/db";
import {
    derivePresence,
    GRACE_S,
    ONLINE_WINDOW_S,
    QUEUE_STALE_S,
} from "../src/lib/float-live-presence";

async function main() {
    console.log("Float Live sim — constants check");
    console.log({ ONLINE_WINDOW_S, GRACE_S, QUEUE_STALE_S });

    const now = new Date();
    const online = derivePresence(new Date(now.getTime() - 10_000), now);
    const away = derivePresence(new Date(now.getTime() - 60_000), now);
    const timeout = derivePresence(new Date(now.getTime() - (GRACE_S + 10) * 1000), now);

    console.log("derivePresence samples:", { online, away, timeout });

    const session = await prisma.floatLiveSession.findFirst({
        orderBy: { createdAt: "desc" },
    });

    if (!session) {
        console.log("No FloatLiveSession rows — create one via /float-live in staging first.");
        return;
    }

    const waiting = await prisma.floatLiveParticipant.count({
        where: { sessionId: session.id, status: "waiting" },
    });

    const activeRooms = await prisma.floatLiveChatRoom.count({
        where: { sessionId: session.id, isActive: true, status: "active" },
    });

    const roomParticipants = await prisma.floatLiveRoomParticipant.count();

    console.log("DB snapshot:", {
        sessionId: session.id,
        waitingParticipants: waiting,
        activeRooms,
        roomParticipantRows: roomParticipants,
    });

    console.log("\nManual two-browser checklist:");
    console.log("1. User A in chat — close tab → B sees stepped away + countdown");
    console.log("2. A reopens same room URL → B sees 'Your partner is back!'");
    console.log("3. A away > 8 min → room ends with timeout message");
    console.log("4. Parallel join from 4 users → no duplicate active rooms");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
