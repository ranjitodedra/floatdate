import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const universities = await prisma.university.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true },
        });

        return NextResponse.json({ universities });
    } catch (error) {
        console.error("Universities list error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
