import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QUEUE_STALE_S } from "@/lib/float-live-presence";

export async function GET(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessionId = req.nextUrl.searchParams.get("sessionId");
        if (!sessionId) {
            return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }

        // Get current user's university
        const currentUser = await prisma.user.findUnique({
            where: { id: authSession.userId },
            select: { universityId: true },
        });

        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const staleThreshold = new Date(Date.now() - QUEUE_STALE_S * 1000);

        // Reap ghost queue rows (still flagged waiting/online but no recent
        // heartbeat) so the DB stays clean and the count can't include them.
        await prisma.floatLiveParticipant.updateMany({
            where: {
                sessionId,
                status: "waiting",
                OR: [
                    { lastSeenAt: null },
                    { lastSeenAt: { lt: staleThreshold } },
                ],
                chatRoomsAsA: { none: { isActive: true } },
                chatRoomsAsB: { none: { isActive: true } },
            },
            data: {
                status: "idle",
                isOnline: false,
            },
        });

        // Count other available users (exclude self so the lobby doesn't count
        // the viewer as an online match candidate).
        const count = await prisma.floatLiveParticipant.count({
            where: {
                sessionId,
                isOnline: true,
                acceptedTerms: true,
                leftAt: null,
                status: "waiting",
                lastSeenAt: { gte: staleThreshold },
                userId: { not: authSession.userId },
                user: { universityId: currentUser.universityId },
                chatRoomsAsA: { none: { isActive: true } },
                chatRoomsAsB: { none: { isActive: true } },
            },
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error("Float Live online-count error:", error);
        return NextResponse.json({ error: "Failed to get count" }, { status: 500 });
    }
}
