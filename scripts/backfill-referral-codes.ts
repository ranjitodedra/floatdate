import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { generateReferralCode } from "../src/lib/referral";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function backfillReferralCodes() {
    const users = await prisma.user.findMany({
        where: { referralCode: null },
        select: { id: true, email: true },
        orderBy: { createdAt: "asc" },
    });

    if (users.length === 0) {
        console.log("All users already have referral codes.");
        return;
    }

    console.log(`Backfilling referral codes for ${users.length} user(s)...`);

    let assigned = 0;
    for (const user of users) {
        for (let attempt = 0; attempt < 12; attempt++) {
            const code = generateReferralCode();
            try {
                const result = await prisma.user.updateMany({
                    where: { id: user.id, referralCode: null },
                    data: { referralCode: code },
                });
                if (result.count > 0) {
                    assigned++;
                    console.log(`  ${user.email} → ${code}`);
                    break;
                }
            } catch {
                continue;
            }
        }
    }

    console.log(`Done. Assigned ${assigned} referral code(s).`);
}

backfillReferralCodes()
    .catch((error) => {
        console.error("Backfill failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
