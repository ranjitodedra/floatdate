import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Find latest match (most recent weekStart) where user is either userA or userB
        const match = await prisma.match.findFirst({
            where: {
                OR: [
                    { userAId: session.userId },
                    { userBId: session.userId },
                ],
            },
            orderBy: { weekStart: "desc" },
            include: {
                userA: {
                    select: { id: true, name: true, email: true, bio: true, city: true },
                },
                userB: {
                    select: { id: true, name: true, email: true, bio: true, city: true },
                },
            },
        });

        if (!match) {
            return NextResponse.json({ match: null });
        }

        // Determine the matched user (not the current user)
        const matchedUser =
            match.userAId === session.userId ? match.userB : match.userA;

        return NextResponse.json({
            match: {
                id: match.id,
                matchedUser: {
                    name: matchedUser.name,
                    email: matchedUser.email,
                    bio: matchedUser.bio,
                    city: matchedUser.city,
                },
                similarityScore: match.similarityScore,
                explanation: match.explanation,
                weekStart: match.weekStart.toISOString(),
            },
        });
    } catch (error) {
        console.error("Match fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch match" },
            { status: 500 }
        );
    }
}
