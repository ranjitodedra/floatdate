-- Add per-run match attempts and feedback for dashboard follow-up flow.

CREATE TABLE "MatchRun" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "universityId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'weekly',
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "unmatchedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchAttempt" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "feedback" TEXT,
    "feedbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchRun_weekStart_idx" ON "MatchRun"("weekStart");
CREATE INDEX "MatchRun_universityId_idx" ON "MatchRun"("universityId");

CREATE UNIQUE INDEX "MatchAttempt_runId_userId_key" ON "MatchAttempt"("runId", "userId");
CREATE INDEX "MatchAttempt_userId_createdAt_idx" ON "MatchAttempt"("userId", "createdAt");
CREATE INDEX "MatchAttempt_weekStart_idx" ON "MatchAttempt"("weekStart");
CREATE INDEX "MatchAttempt_matchId_idx" ON "MatchAttempt"("matchId");

ALTER TABLE "MatchRun" ADD CONSTRAINT "MatchRun_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MatchAttempt" ADD CONSTRAINT "MatchAttempt_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MatchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchAttempt" ADD CONSTRAINT "MatchAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchAttempt" ADD CONSTRAINT "MatchAttempt_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
