#!/usr/bin/env tsx
/**
 * Deployment Setup Script
 * 
 * This script helps set up the database for deployment.
 * 
 * Usage:
 *   DATABASE_URL="your-supabase-connection-string" npx tsx scripts/deploy-setup.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { execSync } from "child_process";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL environment variable is required.");
    console.error("\nUsage:");
    console.error('  DATABASE_URL="postgresql://..." npx tsx scripts/deploy-setup.ts');
    process.exit(1);
}

async function main() {
    console.log("🚀 Starting deployment setup...\n");

    try {
        // Step 1: Apply pending migrations to database
        console.log("📦 Step 1: Applying Prisma migrations to database...");
        execSync("npx prisma migrate deploy", {
            stdio: "inherit",
            env: { ...process.env, DATABASE_URL },
        });
        console.log("✅ Migrations applied successfully\n");

        // Step 2: Seed questions
        console.log("🌱 Step 2: Seeding questions...");
        execSync("npx tsx prisma/seed.ts", {
            stdio: "inherit",
            env: { ...process.env, DATABASE_URL },
        });
        console.log("✅ Questions seeded successfully\n");

        // Step 3: Verify connection
        console.log("🔍 Step 3: Verifying database connection...");
        const pool = new pg.Pool({ connectionString: DATABASE_URL });
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });

        const questionCount = await prisma.question.count();
        const userCount = await prisma.user.count();

        console.log(`   - Questions in database: ${questionCount}`);
        console.log(`   - Users in database: ${userCount}`);
        console.log("✅ Database connection verified\n");

        await prisma.$disconnect();
        await pool.end();

        console.log("✨ Deployment setup complete!");
        console.log("\nNext steps:");
        console.log("1. Add DATABASE_URL and other environment variables to Vercel");
        console.log("2. Deploy your app on Vercel");
        console.log("3. Verify the app works end-to-end");

    } catch (error) {
        console.error("❌ Deployment setup failed:", error);
        process.exit(1);
    }
}

main();
