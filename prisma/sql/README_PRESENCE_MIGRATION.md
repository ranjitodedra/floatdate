# Float Live presence migration (manual)

## Before you deploy app code

1. **Backup** in Supabase Dashboard → Settings → Database.
2. Run row-count query and save results:

```sql
SELECT 'User' AS table_name, COUNT(*) AS row_count FROM "User"
UNION ALL SELECT 'Match', COUNT(*) FROM "Match"
UNION ALL SELECT 'FloatLiveChatMessage', COUNT(*) FROM "FloatLiveChatMessage";
```

3. Run [`float_live_presence_additive.sql`](./float_live_presence_additive.sql) in the SQL editor.
4. Run [`verify_float_live_presence.sql`](./verify_float_live_presence.sql) — counts must match step 2.

## Supabase Realtime (no change required if already set)

Dashboard → **Database → Replication** → ensure enabled:

- `FloatLiveChatMessage` (INSERT)
- `FloatLiveChatRoom` (UPDATE)

Presence uses API polling; no new realtime tables.

## RLS note

This app uses custom JWT (not Supabase Auth). Realtime uses the anon key; ensure production policies do not expose other users' rooms. If unsure, test with two rooms in two browsers and confirm cross-room leakage does not occur.

## Deploy order

1. Run SQL above
2. Deploy app (includes heartbeat/presence APIs)
3. Optional: Vercel cron hits `/api/admin/float-live/cleanup` daily (needs `CRON_SECRET`). On the Vercel Hobby plan crons may run at most once per day; call the endpoint manually for more frequent cleanup.
