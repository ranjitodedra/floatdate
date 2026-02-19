import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function listUsers() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true },
            orderBy: { createdAt: "asc" },
        });

        if (users.length === 0) {
            console.log("No users found in the database.");
            return;
        }

        console.log(`Found ${users.length} user(s):\n`);
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email})`);
        });

        return users;
    } catch (error) {
        console.error("Error listing users:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

listUsers()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error("Failed to list users:", error);
        process.exit(1);
    });
