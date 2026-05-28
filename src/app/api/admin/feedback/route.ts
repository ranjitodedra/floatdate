import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const feedbacks = await prisma.matchFeedback.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: { id: true, name: true, email: true, city: true },
                },
                match: {
                    select: {
                        id: true,
                        weekStart: true,
                        similarityScore: true,
                        userA: { select: { id: true, name: true, email: true } },
                        userB: { select: { id: true, name: true, email: true } },
                    },
                },
            },
        });

        const formattedFeedbacks = feedbacks.map(f => {
            const partner = f.match.userA.id === f.user.id ? f.match.userB : f.match.userA;
            return {
                id: f.id,
                howItWent: f.howItWent,
                feedbackText: f.feedbackText,
                createdAt: f.createdAt.toISOString(),
                user: f.user,
                match: {
                    id: f.match.id,
                    weekStart: f.match.weekStart.toISOString(),
                    similarityScore: f.match.similarityScore,
                },
                partner,
            };
        });

        return NextResponse.json({ feedbacks: formattedFeedbacks });
    } catch (error) {
        console.error("Admin feedback fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch feedback" },
            { status: 500 }
        );
    }
}
