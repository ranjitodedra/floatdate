import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const report = await prisma.floatLiveReport.findUnique({
            where: { id },
            include: {
                chatRoom: {
                    include: {
                        messages: {
                            orderBy: { createdAt: "asc" },
                            select: {
                                id: true,
                                senderId: true,
                                content: true,
                                createdAt: true,
                            },
                        },
                    },
                },
            },
        });

        if (!report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        // Fetch reporter and reported user details
        const [reporter, reported] = await Promise.all([
            prisma.user.findUnique({
                where: { id: report.reporterId },
                select: { email: true, name: true },
            }),
            prisma.user.findUnique({
                where: { id: report.reportedId },
                select: { email: true, name: true },
            }),
        ]);

        return NextResponse.json({
            report: {
                ...report,
                reporter: reporter || { email: "unknown", name: "Unknown" },
                reported: reported || { email: "unknown", name: "Unknown" },
            },
        });
    } catch (error) {
        console.error("Admin report detail error:", error);
        return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
    }
}

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
        const { status, adminNotes } = body;

        const validStatuses = ["pending", "reviewed", "action_taken", "dismissed"];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const updated = await prisma.floatLiveReport.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(adminNotes !== undefined && { adminNotes }),
                reviewedAt: new Date(),
            },
        });

        return NextResponse.json({ report: updated });
    } catch (error) {
        console.error("Admin report update error:", error);
        return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
    }
}
