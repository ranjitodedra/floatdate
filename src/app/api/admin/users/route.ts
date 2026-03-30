import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const universityId = req.nextUrl.searchParams.get("universityId");

        const users = await prisma.user.findMany({
            where: universityId ? { universityId } : undefined,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                city: true,
                gender: true,
                genderPref: true,
                completedSetup: true,
                createdAt: true,
                universityId: true,
                university: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });

        return NextResponse.json({
            users: users.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                city: u.city,
                gender: u.gender,
                genderPref: u.genderPref,
                completedSetup: u.completedSetup,
                createdAt: u.createdAt.toISOString(),
                universityId: u.universityId,
                universityName: u.university.name,
            })),
        });
    } catch (error) {
        console.error("Admin users error:", error);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}
