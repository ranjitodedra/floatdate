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

        const count = await prisma.floatLiveParticipant.count({
            where: {
                sessionId,
                isOnline: true,
            },
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error("Float Live online-count error:", error);
        return NextResponse.json({ error: "Failed to get count" }, { status: 500 });
    }
}
