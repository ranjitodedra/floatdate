-- Run AFTER float_live_presence_additive.sql
-- Confirms schema exists and core data row counts are unchanged.

-- 1) New columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'FloatLiveParticipant'
  AND column_name IN ('lastSeenAt', 'status', 'connectionId');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'FloatLiveChatRoom'
  AND column_name IN ('status', 'endedReason');

-- 2) New table exists
SELECT COUNT(*) AS room_participant_table_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'FloatLiveRoomParticipant';

-- 3) Core tables unchanged (compare to counts saved BEFORE migration)
SELECT 'User' AS table_name, COUNT(*) AS row_count FROM "User"
UNION ALL SELECT 'Match', COUNT(*) FROM "Match"
UNION ALL SELECT 'Question', COUNT(*) FROM "Question"
UNION ALL SELECT 'Answer', COUNT(*) FROM "Answer"
UNION ALL SELECT 'FloatLiveChatMessage', COUNT(*) FROM "FloatLiveChatMessage";

-- 4) Realtime publication (Supabase): Dashboard → Database → Replication
--    Ensure FloatLiveChatRoom and FloatLiveChatMessage are enabled.
