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

        // Find user by email
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

        // Delete related records in the correct order using a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Delete EmailLogs
            const emailLogsCount = await tx.emailLog.deleteMany({
                where: { userId: user.id },
            });
            console.log(`Deleted ${emailLogsCount.count} email log(s)`);

            // 2. Delete Matches (where user is either userA or userB)
            const matchesCount = await tx.match.deleteMany({
                where: {
                    OR: [
                        { userAId: user.id },
                        { userBId: user.id },
                    ],
                },
            });
            console.log(`Deleted ${matchesCount.count} match(es)`);

            // 3. Delete WeeklyOptIns
            const optInsCount = await tx.weeklyOptIn.deleteMany({
                where: { userId: user.id },
            });
            console.log(`Deleted ${optInsCount.count} weekly opt-in(s)`);

            // 4. Delete Answers
            const answersCount = await tx.answer.deleteMany({
                where: { userId: user.id },
            });
            console.log(`Deleted ${answersCount.count} answer(s)`);

            // 5. Finally, delete the User
            await tx.user.delete({
                where: { id: user.id },
            });
            console.log(`Deleted user: ${user.email}`);
        });

        console.log(`\n✅ Successfully deleted user ${email} and all related records.`);
    } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Get email from command line argument
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
