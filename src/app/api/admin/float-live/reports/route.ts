import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const status = req.nextUrl.searchParams.get("status") || undefined;

        const reports = await prisma.floatLiveReport.findMany({
            where: status ? { status } : undefined,
            orderBy: { createdAt: "desc" },
            include: {
                chatRoom: {
                    select: {
                        id: true,
                        intention: true,
                        startedAt: true,
                        endedAt: true,
                    },
                },
            },
        });

        // Fetch reporter and reported user emails
        const enrichedReports = await Promise.all(
            reports.map(async (report) => {
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

                return {
                    ...report,
                    reporter: reporter || { email: "unknown", name: "Unknown" },
                    reported: reported || { email: "unknown", name: "Unknown" },
                };
            })
        );

        return NextResponse.json({ reports: enrichedReports });
    } catch (error) {
        console.error("Admin reports list error:", error);
        return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }
}
