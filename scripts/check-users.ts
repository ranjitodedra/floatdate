import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            select: { 
                id: true, 
                email: true, 
                name: true, 
                gender: true, 
                genderPref: true,
                completedSetup: true,
                emailVerified: true
            },
            orderBy: { createdAt: "asc" },
        });

        if (users.length === 0) {
            console.log("No users found in the database.");
            return;
        }

        console.log(`Found ${users.length} user(s):\n`);
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email})`);
            console.log(`   Gender: ${user.gender}`);
            console.log(`   Gender Preference: ${user.genderPref}`);
            console.log(`   Setup Complete: ${user.completedSetup}`);
            console.log(`   Email Verified: ${user.emailVerified}`);
            console.log();
        });

        return users;
    } catch (error) {
        console.error("Error checking users:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error("Failed to check users:", error);
        process.exit(1);
    });
