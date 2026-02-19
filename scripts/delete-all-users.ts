import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function deleteAllUsers() {
    try {
        console.log("Fetching all users...");
        
        // Get all users
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true },
        });

        if (users.length === 0) {
            console.log("No users found in the database.");
            await prisma.$disconnect();
            return;
        }

        console.log(`Found ${users.length} user(s) to delete:`);
        users.forEach((user) => {
            console.log(`  - ${user.name} (${user.email})`);
        });

        console.log("\nDeleting all users and related records...");

        // Delete all users and their related records in a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Delete all EmailLogs
            const emailLogsCount = await tx.emailLog.deleteMany({});
            console.log(`Deleted ${emailLogsCount.count} email log(s)`);

            // 2. Delete all Matches
            const matchesCount = await tx.match.deleteMany({});
            console.log(`Deleted ${matchesCount.count} match(es)`);

            // 3. Delete all WeeklyOptIns
            const optInsCount = await tx.weeklyOptIn.deleteMany({});
            console.log(`Deleted ${optInsCount.count} weekly opt-in(s)`);

            // 4. Delete all Answers
            const answersCount = await tx.answer.deleteMany({});
            console.log(`Deleted ${answersCount.count} answer(s)`);

            // 5. Delete all PendingSignups (optional, but good to clean up)
            const pendingCount = await tx.pendingSignup.deleteMany({});
            console.log(`Deleted ${pendingCount.count} pending signup(s)`);

            // 6. Finally, delete all Users
            const usersCount = await tx.user.deleteMany({});
            console.log(`Deleted ${usersCount.count} user(s)`);
        });

        console.log("\n✅ Successfully deleted all users and related records.");
    } catch (error) {
        console.error("Error deleting users:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

deleteAllUsers()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error("Failed to delete users:", error);
        process.exit(1);
    });
