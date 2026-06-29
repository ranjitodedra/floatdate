-- CreateTable
CREATE TABLE "FloatLiveScheduledDate" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "preference" TEXT NOT NULL,
    "intention" TEXT NOT NULL,
    "expectations" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "joinerId" TEXT,
    "chatRoomId" TEXT,
    "creatorCharacter" TEXT,
    "joinerCharacter" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloatLiveScheduledDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FloatLiveScheduledDate_chatRoomId_key" ON "FloatLiveScheduledDate"("chatRoomId");

-- CreateIndex
CREATE INDEX "FloatLiveScheduledDate_status_scheduledAt_idx" ON "FloatLiveScheduledDate"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "FloatLiveScheduledDate_universityId_status_scheduledAt_idx" ON "FloatLiveScheduledDate"("universityId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "FloatLiveScheduledDate_creatorId_status_idx" ON "FloatLiveScheduledDate"("creatorId", "status");

-- AddForeignKey
ALTER TABLE "FloatLiveScheduledDate" ADD CONSTRAINT "FloatLiveScheduledDate_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloatLiveScheduledDate" ADD CONSTRAINT "FloatLiveScheduledDate_joinerId_fkey" FOREIGN KEY ("joinerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloatLiveScheduledDate" ADD CONSTRAINT "FloatLiveScheduledDate_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloatLiveScheduledDate" ADD CONSTRAINT "FloatLiveScheduledDate_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "FloatLiveChatRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
