import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/profile — returns user bio + current answers with question details
export async function GET() {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                bio: true,
                answers: {
                    select: {
                        questionId: true,
                        value: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Convert answers array to a Record<questionId, value> for easy lookup
        const answersMap: Record<string, unknown> = {};
        for (const a of user.answers) {
            answersMap[a.questionId] = a.value;
        }

        return NextResponse.json({
            bio: user.bio ?? "",
            answers: answersMap,
        });
    } catch (error) {
        console.error("Profile fetch error:", error);
        return NextResponse.json(
            { error: "Failed to load profile" },
            { status: 500 }
        );
    }
}

const updateBioSchema = z.object({
    bio: z.string().max(300, "Bio must be 300 characters or less"),
});

// PATCH /api/profile — update bio only
export async function PATCH(req: NextRequest) {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = updateBioSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        await prisma.user.update({
            where: { id: session.userId },
            data: { bio: result.data.bio || null },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 }
        );
    }
}
