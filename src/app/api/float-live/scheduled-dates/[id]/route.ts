import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const date = await prisma.floatLiveScheduledDate.findUnique({
            where: { id },
        });

        if (!date) {
            return NextResponse.json({ error: "Scheduled date not found" }, { status: 404 });
        }

        if (date.creatorId !== authSession.userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (date.status !== "open") {
            return NextResponse.json(
                { error: "Only open scheduled dates can be cancelled" },
                { status: 400 }
            );
        }

        await prisma.floatLiveScheduledDate.update({
            where: { id },
            data: { status: "cancelled" },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Float Live scheduled-dates DELETE error:", error);
        return NextResponse.json({ error: "Failed to cancel scheduled date" }, { status: 500 });
    }
}
