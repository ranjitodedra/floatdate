import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const deleteUserSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export async function POST(req: NextRequest) {
    try {
        // Verify CRON_SECRET or allow in development
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        // In production, require authentication
        if (process.env.NODE_ENV === "production") {
            if (!cronSecret) {
                return NextResponse.json(
                    { error: "CRON_SECRET not configured" },
                    { status: 500 }
                );
            }

            if (authHeader !== `Bearer ${cronSecret}`) {
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 401 }
                );
            }
        }

        const body = await req.json();
        const result = deleteUserSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const { email } = result.data;

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, email: true },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Delete related records in the correct order using a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Delete EmailLogs
            await tx.emailLog.deleteMany({
                where: { userId: user.id },
            });

            // 2. Delete Matches (where user is either userA or userB)
            await tx.match.deleteMany({
                where: {
                    OR: [
                        { userAId: user.id },
                        { userBId: user.id },
                    ],
                },
            });

            // 3. Delete WeeklyOptIns
            await tx.weeklyOptIn.deleteMany({
                where: { userId: user.id },
            });

            // 4. Delete Answers
            await tx.answer.deleteMany({
                where: { userId: user.id },
            });

            // 5. Finally, delete the User
            await tx.user.delete({
                where: { id: user.id },
            });
        });

        return NextResponse.json({
            success: true,
            message: `User ${email} and all related records have been deleted.`,
        });
    } catch (error) {
        console.error("Delete user error:", error);
        return NextResponse.json(
            { error: "Failed to delete user. Please try again." },
            { status: 500 }
        );
    }
}
