-- Remove duplicate show applications (keep earliest per user)
DELETE FROM "CampusShowApplication" AS a
USING "CampusShowApplication" AS b
WHERE a."userId" IS NOT NULL
  AND b."userId" IS NOT NULL
  AND a."userId" = b."userId"
  AND a."createdAt" > b."createdAt";

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorUserId_createdAt_idx" ON "AdminAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetUserId_createdAt_idx" ON "AdminAuditLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- CreateIndex (one application per user)
CREATE UNIQUE INDEX "CampusShowApplication_userId_key" ON "CampusShowApplication"("userId");
