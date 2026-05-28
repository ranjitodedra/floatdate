import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { getPreviousWeekStart } from "@/lib/week-cycle";

export async function GET() {
    try {
        const admin = await requireAdmin();
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const previousWeekStart = getPreviousWeekStart();

        const otherUser = await prisma.user.findFirst({
            where: { id: { not: admin.id } }
        });

        if (!otherUser) {
            return NextResponse.json({ error: "No other user found to match with." });
        }

        let match = await prisma.match.findFirst({
            where: {
                weekStart: previousWeekStart,
                OR: [
                    { userAId: admin.id },
                    { userBId: admin.id }
                ]
            }
        });

        if (!match) {
            match = await prisma.match.create({
                data: {
                    weekStart: previousWeekStart,
                    userAId: admin.id,
                    userBId: otherUser.id,
                    similarityScore: 0.95,
                    explanation: JSON.stringify(["You both like movies", "You live close to each other"]),
                }
            });
        }

        let feedback = await prisma.matchFeedback.findFirst({
            where: { matchId: match.id, userId: admin.id }
        });

        if (!feedback) {
            feedback = await prisma.matchFeedback.create({
                data: {
                    matchId: match.id,
                    userId: admin.id,
                    howItWent: "great_conversation",
                    feedbackText: "This is a sample test feedback injected for the admin!",
                }
            });
        } else {
             feedback = await prisma.matchFeedback.update({
                 where: { id: feedback.id },
                 data: {
                     howItWent: "great_conversation",
                     feedbackText: "This is a sample test feedback injected for the admin! (Updated)",
                 }
             });
        }

        return NextResponse.json({ success: true, match, feedback });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
