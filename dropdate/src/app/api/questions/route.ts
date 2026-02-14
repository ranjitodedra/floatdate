import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const questions = await prisma.question.findMany({
            orderBy: { orderIndex: "asc" },
            select: {
                id: true,
                orderIndex: true,
                questionText: true,
                type: true,
                options: true,
                weightDimension: true,
            },
        });

        return NextResponse.json({ questions });
    } catch (error) {
        console.error("Questions fetch error:", error);
        return NextResponse.json(
            { error: "Failed to load questions" },
            { status: 500 }
        );
    }
}
