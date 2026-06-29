import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

const deleteUserSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export async function POST(req: NextRequest) {
    try {
        // Two ways to authenticate:
        //  1. Admin session (admin clicking "Delete" in the UI)
        //  2. Bearer CRON_SECRET (automation / scripts)
        const admin = await requireAdmin();

        if (!admin) {
            const authHeader = req.headers.get("authorization");
            const cronSecret = process.env.CRON_SECRET;

            if (!cronSecret) {
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 401 }
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

        // Delete related records in the correct FK order using a transaction.
        // Float Live data is the deepest tree: room participants/messages/reports
        // must go before the rooms, which go before the participants.
        await prisma.$transaction(async (tx) => {
            await tx.floatLiveScheduledDate.deleteMany({
                where: {
                    OR: [{ creatorId: user.id }, { joinerId: user.id }],
                },
            });

            await tx.referral.deleteMany({
                where: {
                    OR: [{ referrerUserId: user.id }, { referredUserId: user.id }],
                },
            });

            // Every Float Live participant row this user owns.
            const participants = await tx.floatLiveParticipant.findMany({
                where: { userId: user.id },
                select: { id: true },
            });
            const participantIds = participants.map((p) => p.id);

            // Every chat room this user took part in (as A or B).
            let roomIds: string[] = [];
            if (participantIds.length > 0) {
                const rooms = await tx.floatLiveChatRoom.findMany({
                    where: {
                        OR: [
                            { participantAId: { in: participantIds } },
                            { participantBId: { in: participantIds } },
                        ],
                    },
                    select: { id: true },
                });
                roomIds = rooms.map((r) => r.id);
            }

            if (roomIds.length > 0) {
                // 1. Room participants (BOTH people in each room)
                await tx.floatLiveRoomParticipant.deleteMany({
                    where: { roomId: { in: roomIds } },
                });

                // 2. Chat messages in those rooms
                await tx.floatLiveChatMessage.deleteMany({
                    where: { chatRoomId: { in: roomIds } },
                });

                // 3. Voice transcripts in those rooms
                await tx.floatLiveVoiceTranscript.deleteMany({
                    where: { chatRoomId: { in: roomIds } },
                });

                // 4. Reports tied to those rooms
                await tx.floatLiveReport.deleteMany({
                    where: { chatRoomId: { in: roomIds } },
                });

                // 5. The rooms themselves
                await tx.floatLiveChatRoom.deleteMany({
                    where: { id: { in: roomIds } },
                });
            }

            await tx.floatLiveParticipant.deleteMany({
                where: { userId: user.id },
            });

            await tx.matchFeedback.deleteMany({
                where: { userId: user.id },
            });

            await tx.matchAttempt.deleteMany({
                where: { userId: user.id },
            });

            await tx.emailLog.deleteMany({
                where: { userId: user.id },
            });

            await tx.match.deleteMany({
                where: {
                    OR: [{ userAId: user.id }, { userBId: user.id }],
                },
            });

            await tx.weeklyOptIn.deleteMany({
                where: { userId: user.id },
            });

            await tx.answer.deleteMany({
                where: { userId: user.id },
            });

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
