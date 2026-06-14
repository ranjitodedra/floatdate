-- ADDITIVE MIGRATION: Float Live university-level matching
-- Adds universityId to FloatLiveParticipant, backfills from User, deprecates campus column.

ALTER TABLE "FloatLiveParticipant" ADD COLUMN IF NOT EXISTS "universityId" TEXT;

UPDATE "FloatLiveParticipant" p
SET "universityId" = u."universityId"
FROM "User" u
WHERE p."userId" = u."id" AND p."universityId" IS NULL;

ALTER TABLE "FloatLiveParticipant" ALTER COLUMN "universityId" SET NOT NULL;

ALTER TABLE "FloatLiveParticipant"
  ADD CONSTRAINT "FloatLiveParticipant_universityId_fkey"
  FOREIGN KEY ("universityId") REFERENCES "University"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "FLP_session_university_status_idx"
  ON "FloatLiveParticipant"("sessionId", "universityId", "status", "lastSeenAt");

ALTER TABLE "FloatLiveParticipant" ALTER COLUMN "campus" DROP NOT NULL;
