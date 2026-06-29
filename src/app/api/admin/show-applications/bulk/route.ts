import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

const VALID_STATUSES = ["pending", "approved", "rejected", "waitlisted"] as const;

export async function POST(req: NextRequest) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { ids, status } = body as { ids?: string[]; status?: string };

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: "ids array is required" },
                { status: 400 }
            );
        }

        if (!status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const statusValue = status === "pending" ? null : status;
        const now = new Date();

        const result = await prisma.campusShowApplication.updateMany({
            where: { id: { in: ids } },
            data: {
                status: statusValue,
                statusUpdatedAt: now,
            },
        });

        // TODO: add audit log for status changes

        return NextResponse.json({
            success: true,
            updated: result.count,
        });
    } catch (error) {
        console.error("Admin show applications bulk update error:", error);
        return NextResponse.json(
            { error: "Failed to bulk update applications" },
            { status: 500 }
        );
    }
}
