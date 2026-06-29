import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

const VALID_STATUSES = ["pending", "approved", "rejected", "waitlisted"] as const;

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { status, adminNotes } = body as {
            status?: string | null;
            adminNotes?: string | null;
        };

        const existing = await prisma.campusShowApplication.findUnique({
            where: { id },
        });
        if (!existing) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        const data: {
            status?: string | null;
            adminNotes?: string | null;
            statusUpdatedAt?: Date;
        } = {};

        if (status !== undefined) {
            if (status === null || status === "pending") {
                data.status = null;
            } else if (VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
                data.status = status;
            } else {
                return NextResponse.json({ error: "Invalid status" }, { status: 400 });
            }
            data.statusUpdatedAt = new Date();
            // TODO: add audit log for status changes
        }

        if (adminNotes !== undefined) {
            data.adminNotes = adminNotes?.trim() || null;
        }

        const updated = await prisma.campusShowApplication.update({
            where: { id },
            data,
        });

        return NextResponse.json({
            application: {
                ...updated,
                createdAt: updated.createdAt.toISOString(),
                statusUpdatedAt: updated.statusUpdatedAt?.toISOString() ?? null,
            },
        });
    } catch (error) {
        console.error("Admin show application update error:", error);
        return NextResponse.json(
            { error: "Failed to update application" },
            { status: 500 }
        );
    }
}
