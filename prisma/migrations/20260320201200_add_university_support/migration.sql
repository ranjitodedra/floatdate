-- ============================================================
-- ADDITIVE MIGRATION: Multi-University Support
-- This migration ONLY adds new tables/columns. No data is deleted.
-- ============================================================

-- CreateTable: University
CREATE TABLE "University" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emailDomain" TEXT NOT NULL,
    "campuses" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "University_slug_key" ON "University"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "University_emailDomain_key" ON "University"("emailDomain");

-- Seed universities (using deterministic UUIDs for backfill reference)
INSERT INTO "University" ("id", "slug", "name", "emailDomain", "campuses") VALUES
  ('uni_laurier_000000000000', 'laurier', 'Wilfrid Laurier University', 'mylaurier.ca', '["Waterloo","Brantford","Milton"]'),
  ('uni_waterloo_00000000000', 'waterloo', 'University of Waterloo', 'uwaterloo.ca', '["Main Campus"]'),
  ('uni_uoft_0000000000000000', 'uoft', 'University of Toronto', 'mail.utoronto.ca', '["St. George","Scarborough","Mississauga"]'),
  ('uni_western_000000000000', 'western', 'Western University', 'uwo.ca', '["Main Campus"]'),
  ('uni_mcmaster_00000000000', 'mcmaster', 'McMaster University', 'mcmaster.ca', '["Main Campus"]'),
  ('uni_uottawa_00000000000', 'uottawa', 'University of Ottawa', 'uottawa.ca', '["Main Campus"]'),
  ('uni_queens_0000000000000', 'queens', 'Queen''s University', 'queensu.ca', '["Main Campus"]');

-- Step 1: Add universityId as NULLABLE first (so existing rows don't fail)
ALTER TABLE "User" ADD COLUMN "universityId" TEXT;
ALTER TABLE "PendingSignup" ADD COLUMN "universityId" TEXT;

-- Step 2: Backfill ALL existing users with Laurier university
-- (all current users signed up with @mylaurier.ca emails)
UPDATE "User" SET "universityId" = 'uni_laurier_000000000000' WHERE "universityId" IS NULL;
UPDATE "PendingSignup" SET "universityId" = 'uni_laurier_000000000000' WHERE "universityId" IS NULL;

-- Step 3: Now make the column NOT NULL (safe because all rows have been backfilled)
ALTER TABLE "User" ALTER COLUMN "universityId" SET NOT NULL;
ALTER TABLE "PendingSignup" ALTER COLUMN "universityId" SET NOT NULL;

-- Step 4: Add foreign key constraints
ALTER TABLE "User" ADD CONSTRAINT "User_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PendingSignup" ADD CONSTRAINT "PendingSignup_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
