-- Additive verification fields for User (existing rows default to approved/email_domain)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationMethod" TEXT NOT NULL DEFAULT 'email_domain';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationDocPath" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationReviewedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationNotes" TEXT;

-- Additive verification fields for PendingSignup
ALTER TABLE "PendingSignup" ADD COLUMN IF NOT EXISTS "verificationMethod" TEXT NOT NULL DEFAULT 'email_domain';
ALTER TABLE "PendingSignup" ADD COLUMN IF NOT EXISTS "verificationDocPath" TEXT;

-- University request submissions from signup flow
CREATE TABLE IF NOT EXISTS "UniversityRequest" (
    "id" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "universityName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "UniversityRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UniversityRequest_status_idx" ON "UniversityRequest"("status");
CREATE INDEX IF NOT EXISTS "UniversityRequest_createdAt_idx" ON "UniversityRequest"("createdAt");
