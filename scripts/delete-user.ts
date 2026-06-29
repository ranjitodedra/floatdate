import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function deleteUser(email: string) {
    try {
        console.log(`Looking for user with email: ${email}`);

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, email: true, name: true },
        });

        if (!user) {
            console.log(`User with email ${email} not found.`);
            return;
        }

        console.log(`Found user: ${user.name} (${user.email})`);
        console.log(`Deleting user and all related records...`);

        await prisma.$transaction(async (tx) => {
            const scheduled = await tx.floatLiveScheduledDate.deleteMany({
                where: {
                    OR: [{ creatorId: user.id }, { joinerId: user.id }],
                },
            });
            console.log(`Deleted ${scheduled.count} scheduled date(s)`);

            const referrals = await tx.referral.deleteMany({
                where: {
                    OR: [{ referrerUserId: user.id }, { referredUserId: user.id }],
                },
            });
            console.log(`Deleted ${referrals.count} referral(s)`);

            const participants = await tx.floatLiveParticipant.findMany({
                where: { userId: user.id },
                select: { id: true },
            });
            const participantIds = participants.map((p) => p.id);

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
                const roomParticipants = await tx.floatLiveRoomParticipant.deleteMany({
                    where: { roomId: { in: roomIds } },
                });
                console.log(`Deleted ${roomParticipants.count} room participant(s)`);

                const messages = await tx.floatLiveChatMessage.deleteMany({
                    where: { chatRoomId: { in: roomIds } },
                });
                console.log(`Deleted ${messages.count} chat message(s)`);

                const transcripts = await tx.floatLiveVoiceTranscript.deleteMany({
                    where: { chatRoomId: { in: roomIds } },
                });
                console.log(`Deleted ${transcripts.count} voice transcript(s)`);

                const reports = await tx.floatLiveReport.deleteMany({
                    where: { chatRoomId: { in: roomIds } },
                });
                console.log(`Deleted ${reports.count} report(s)`);

                const roomsDeleted = await tx.floatLiveChatRoom.deleteMany({
                    where: { id: { in: roomIds } },
                });
                console.log(`Deleted ${roomsDeleted.count} chat room(s)`);
            }

            const floatLiveParticipants = await tx.floatLiveParticipant.deleteMany({
                where: { userId: user.id },
            });
            console.log(`Deleted ${floatLiveParticipants.count} Float Live participant(s)`);

            const feedback = await tx.matchFeedback.deleteMany({
                where: { userId: user.id },
            });
            console.log(`Deleted ${feedback.count} match feedback record(s)`);

            const attempts = await tx.matchAttempt.deleteMany({
                where: { userId: user.id },
            });
            console.log(`Deleted ${attempts.count} match attempt(s)`);

            const emailLogs = await tx.emailLog.deleteMany({
                where: { userId: user.id },
            });
            console.log(`Deleted ${emailLogs.count} email log(s)`);

            const matches = await tx.match.deleteMany({
                where: {
                    OR: [{ userAId: user.id }, { userBId: user.id }],
                },
            });
            console.log(`Deleted ${matches.count} match(es)`);

            const optIns = await tx.weeklyOptIn.deleteMany({
                where: { userId: user.id },
            });
            console.log(`Deleted ${optIns.count} weekly opt-in(s)`);

            const answers = await tx.answer.deleteMany({
                where: { userId: user.id },
            });
            console.log(`Deleted ${answers.count} answer(s)`);

            await tx.user.delete({
                where: { id: user.id },
            });
            console.log(`Deleted user: ${user.email}`);
        });

        console.log(`\nSuccessfully deleted user ${email} and all related records.`);
    } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

const email = process.argv[2];

if (!email) {
    console.error("Please provide an email address as an argument.");
    console.error("Usage: tsx scripts/delete-user.ts <email>");
    process.exit(1);
}

deleteUser(email)
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error("Failed to delete user:", error);
        process.exit(1);
    });
