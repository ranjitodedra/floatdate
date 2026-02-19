import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function updateUserPref() {
    try {
        // Update all users to have "any" preference for testing
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, gender: true, genderPref: true },
        });

        if (users.length === 0) {
            console.log("No users found.");
            return;
        }

        console.log(`Updating ${users.length} user(s) to have "any" gender preference for testing:\n`);

        for (const user of users) {
            console.log(`Updating: ${user.name} (${user.email})`);
            console.log(`  Current: Gender=${user.gender}, Preference=${user.genderPref}`);
            
            await prisma.user.update({
                where: { id: user.id },
                data: { genderPref: "any" },
            });

            console.log(`  ✅ Updated preference to: any\n`);
        }

        console.log(`All users can now match with anyone for testing purposes.`);
    } catch (error) {
        console.error("Error updating users:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

updateUserPref()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error("Failed to update user:", error);
        process.exit(1);
    });
