-- Float Live presence & reconnect — ADDITIVE ONLY
-- Run in Supabase SQL Editor AFTER creating a backup.
-- Safe to re-run (IF NOT EXISTS). Does NOT modify or delete existing rows.

-- Presence + queue status on participant
ALTER TABLE "FloatLiveParticipant" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "FloatLiveParticipant" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE "FloatLiveParticipant" ADD COLUMN IF NOT EXISTS "connectionId" TEXT;

-- Explicit room lifecycle (isActive remains source of truth for realtime)
ALTER TABLE "FloatLiveChatRoom" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "FloatLiveChatRoom" ADD COLUMN IF NOT EXISTS "endedReason" TEXT;

-- Per-room presence (one row per user per room)
CREATE TABLE IF NOT EXISTS "FloatLiveRoomParticipant" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'online',
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "awaySince" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "connectionId" TEXT,
  CONSTRAINT "FloatLiveRoomParticipant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FloatLiveRoomParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "FloatLiveChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FloatLiveRoomParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "FloatLiveParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FLRP_room_user_key" ON "FloatLiveRoomParticipant"("roomId", "userId");
CREATE INDEX IF NOT EXISTS "FLRP_room_seen_idx" ON "FloatLiveRoomParticipant"("roomId", "lastSeenAt");
CREATE INDEX IF NOT EXISTS "FLP_session_status_seen_idx" ON "FloatLiveParticipant"("sessionId", "status", "lastSeenAt");

-- Verify core tables unchanged (run before AND after; counts must match):
-- SELECT 'User' AS t, COUNT(*) FROM "User"
-- UNION ALL SELECT 'Match', COUNT(*) FROM "Match"
-- UNION ALL SELECT 'FloatLiveChatMessage', COUNT(*) FROM "FloatLiveChatMessage";
