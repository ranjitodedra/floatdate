import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const answerSchema = z.object({
    questionId: z.string(),
    value: z.union([z.number(), z.string(), z.boolean(), z.array(z.string())]),
});

const batchSchema = z.object({
    answers: z.array(answerSchema).min(1),
});

export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = batchSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const { answers } = result.data;

        // Upsert each answer
        for (const answer of answers) {
            await prisma.answer.upsert({
                where: {
                    userId_questionId: {
                        userId: session.userId,
                        questionId: answer.questionId,
                    },
                },
                update: {
                    value: answer.value as never,
                },
                create: {
                    userId: session.userId,
                    questionId: answer.questionId,
                    value: answer.value as never,
                },
            });
        }

        // Check if all questions answered
        const totalQuestions = await prisma.question.count();
        const totalAnswered = await prisma.answer.count({
            where: { userId: session.userId },
        });

        // If all answered, mark setup complete
        if (totalAnswered >= totalQuestions) {
            await prisma.user.update({
                where: { id: session.userId },
                data: { completedSetup: true },
            });
        }

        return NextResponse.json({
            success: true,
            answered: totalAnswered,
            total: totalQuestions,
            completedSetup: totalAnswered >= totalQuestions,
        });
    } catch (error) {
        console.error("Answer save error:", error);
        return NextResponse.json(
            { error: "Failed to save answers" },
            { status: 500 }
        );
    }
}
