-- Additive columns for admin review workflow (nullable — existing rows unaffected)
ALTER TABLE "CampusShowApplication" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "CampusShowApplication" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;
ALTER TABLE "CampusShowApplication" ADD COLUMN IF NOT EXISTS "statusUpdatedAt" TIMESTAMP(3);
