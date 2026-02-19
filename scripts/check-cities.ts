import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkCities() {
    try {
        const users = await prisma.user.findMany({
            select: { 
                id: true, 
                email: true, 
                name: true, 
                city: true,
                gender: true,
                genderPref: true
            },
            orderBy: { createdAt: "asc" },
        });

        console.log(`Found ${users.length} user(s):\n`);
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email})`);
            console.log(`   City: ${user.city}`);
            console.log(`   Gender: ${user.gender}, Preference: ${user.genderPref}`);
            console.log();
        });

        // Check if cities match
        if (users.length >= 2) {
            const city1 = users[0].city.toLowerCase().trim();
            const city2 = users[1].city.toLowerCase().trim();
            console.log(`City match check: "${city1}" === "${city2}" = ${city1 === city2}`);
        }

        return users;
    } catch (error) {
        console.error("Error checking cities:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

checkCities()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error("Failed to check cities:", error);
        process.exit(1);
    });
