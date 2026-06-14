import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

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
            status?: string;
            adminNotes?: string;
        };

        const validStatuses = ["pending", "approved", "rejected"];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const existing = await prisma.universityRequest.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        const updated = await prisma.universityRequest.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(adminNotes !== undefined && { adminNotes }),
                reviewedAt: new Date(),
            },
        });

        return NextResponse.json({ request: updated });
    } catch (error) {
        console.error("Admin university request update error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
