import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

        const staleThreshold = new Date(Date.now() - 30 * 1000);

        const count = await prisma.floatLiveParticipant.count({
            where: {
                sessionId,
                isOnline: true,
                acceptedTerms: true,
                leftAt: null,
                status: "waiting",
                lastSeenAt: { gte: staleThreshold },
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
