import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { getWeekStart } from "@/lib/week-cycle";

/**
 * GET /api/admin/view-as-user?email=...
 * 
 * Read-only endpoint for admin to view a user's dashboard data.
 * Returns user profile, opt-in status, and current match info.
 * No data is modified — all queries are SELECT only.
 */
export async function GET(req: NextRequest) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
        if (!email) {
            return NextResponse.json(
                { error: "Email parameter is required" },
                { status: 400 }
            );
        }

        // Look up the target user (read-only)
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                bio: true,
                city: true,
                age: true,
                gender: true,
                genderPref: true,
                completedSetup: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const weekStart = getWeekStart();

        // Check opt-in status (read-only)
        const optIn = await prisma.weeklyOptIn.findUnique({
            where: {
                userId_weekStart: {
                    userId: user.id,
                    weekStart,
                },
            },
        });

        // Find latest match (most recent weekStart) — read-only
        const match = await prisma.match.findFirst({
            where: {
                OR: [
                    { userAId: user.id },
                    { userBId: user.id },
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

        // Build match response (same shape as /api/match/current)
        let matchData = null;
        if (match) {
            const matchedUser =
                match.userAId === user.id ? match.userB : match.userA;
            matchData = {
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
            };
        }

        return NextResponse.json({
            user: {
                name: user.name,
                email: user.email,
                bio: user.bio,
                city: user.city,
                age: user.age,
                gender: user.gender,
                genderPref: user.genderPref,
                completedSetup: user.completedSetup,
                createdAt: user.createdAt.toISOString(),
            },
            optedIn: !!optIn,
            weekStart: weekStart.toISOString(),
            match: matchData,
        });
    } catch (error) {
        console.error("Admin view-as-user error:", error);
        return NextResponse.json(
            { error: "Failed to fetch user dashboard data" },
            { status: 500 }
        );
    }
}
