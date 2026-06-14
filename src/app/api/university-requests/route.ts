import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const universityRequestSchema = z.object({
    requesterEmail: z.string().email("Invalid email address"),
    requesterName: z.string().min(1, "Name is required").max(100),
    universityName: z.string().min(1, "University name is required").max(200),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = universityRequestSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const { requesterEmail, requesterName, universityName } = result.data;

        const request = await prisma.universityRequest.create({
            data: {
                requesterEmail: requesterEmail.toLowerCase(),
                requesterName,
                universityName,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message:
                    "Your university request has been submitted. We'll review it and get back to you.",
                request: { id: request.id },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("University request error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
