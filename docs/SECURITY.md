# Security

This document describes security practices **implemented in FloatDate**. It is written for engineering reviewers evaluating the codebase — not as a public vulnerability disclosure policy.

---

## Authentication

### Session management

- Passwords hashed with **bcrypt** (cost factor 12) via [`src/lib/auth.ts`](../src/lib/auth.ts)
- Sessions stored as **HS256 JWT** in an `httpOnly` cookie (`floatdate_session`)
- Cookie flags: `httpOnly`, `sameSite: lax`, `secure` in production, 7-day TTL
- `JWT_SECRET` required in production (minimum 32 characters); throws on startup if missing or too short
- Middleware ([`src/middleware.ts`](../src/middleware.ts)) verifies JWT on protected routes before page render

### Password reset

- Time-limited tokens stored in `PasswordResetToken` table
- Tokens are single-use (`used` flag) with expiry enforcement
- Reset emails sent via PrivateMail SMTP (separate from match-email Gmail channel)

### Email verification

- Signup creates a `PendingSignup` record with `verifyToken` (UUID) and 24-hour expiry
- `GET /api/auth/verify?token=...` validates token before creating the `User` record
- Login blocked until email is verified

---

## Authorization

### Route protection

| Layer | Mechanism |
|-------|-----------|
| Page routes | `middleware.ts` JWT verification |
| API routes | `getCurrentUser()` / `getSessionContext()` per handler |
| Admin routes | `requireAdmin()` checks email against `ADMIN_EMAILS` env var |
| Cron/admin endpoints | `Authorization: Bearer CRON_SECRET` header |

### Admin access

- Admin allowlist configured via `ADMIN_EMAILS` (comma-separated, server-side)
- Client UI checks use `NEXT_PUBLIC_ADMIN_EMAILS` (mirror of server list) or `isAdmin` from `/api/auth/me`
- No role-based access control beyond admin/non-admin

### Impersonation

- Admin-only feature with separate `floatdate_impersonation` JWT cookie (30-minute TTL)
- `getSessionContext()` distinguishes actor vs. effective user
- Impersonation cookie is `httpOnly` and `secure` in production

---

## Input Validation

- API request bodies validated with **Zod** schemas (e.g., signup, opt-in, chat send)
- Chat messages sanitized via [`src/lib/sanitize-content.ts`](../src/lib/sanitize-content.ts)
- File uploads for verification documents validated by MIME type and size in `supabase-admin.ts`
- University email domain validated against `University.emailDomain` records

---

## Rate Limiting

Implemented in [`src/lib/rate-limit.ts`](../src/lib/rate-limit.ts) using Upstash Redis sliding windows:

| Bucket | Limit | Window |
|--------|-------|--------|
| `chat_message` | 1 | 1 second |
| `voice_transcript` | 1 | 3 seconds |
| `find_match` | 10 | 1 minute |
| `reveal_email` | 5 | 1 minute |
| `report` | 3 | 1 hour |
| `signup` | 5 | 1 hour |
| `application_submit` | 3 | 1 hour |

**Graceful degradation:** if Upstash is not configured or misconfigured, rate limiting is silently disabled and requests are allowed. Production deployments should always configure Upstash.

---

## Secrets Management

| Secret | Storage | Usage |
|--------|---------|-------|
| `JWT_SECRET` | Environment variable | Session signing |
| `CRON_SECRET` | Environment variable | Admin/cron API bearer auth |
| `DATABASE_URL` | Environment variable | Postgres connection |
| `SUPABASE_SERVICE_ROLE_KEY` | Environment variable | Server-side storage operations |
| `EMAIL_PASS` / `VERIFY_EMAIL_PASS` | Environment variable | SMTP credentials |
| `UPSTASH_REDIS_REST_TOKEN` | Environment variable | Rate limit backend |

- `.env*` files are gitignored
- `.env.example` provides placeholders with comments (no real values)
- **Never commit secrets to tracked files** — historical leaks in `DEPLOYMENT.md` and `preview-simple.ps1` were removed; see summary report for rotation guidance

---

## Database Security

- All data access goes through **Prisma** with parameterized queries (no raw SQL in API routes)
- **No Postgres RLS policies** — authorization is enforced at the application layer
- Supabase connection uses SSL (`rejectUnauthorized: false` for pooler compatibility)
- Migrations applied via Prisma (`prisma/migrations/`)

---

## Email Security

- Separate SMTP channels: Gmail for match emails, PrivateMail for verification/reset
- `EMAILS_ENABLED` gate prevents accidental email dispatch in dev/test
- Email sending includes retry logic with delay for transient SMTP failures
- Match emails include `replyTo: support@floatdate.com`

---

## Float Live Safety

- Chat content sanitized before storage
- User reporting via `POST /api/float-live/chat/[roomId]/report` (rate-limited)
- Email reveal is mutual and explicit (both users must consent)
- Admin can review reports and chat logs via `/admin/float-live-chats`
- Session cleanup cron ends stale rooms and marks participants as left

---

## Known Gaps (documented, not fixed in this pass)

| Gap | Risk | Mitigation path |
|-----|------|-----------------|
| Rate limiting disabled without Upstash | Abuse in dev/staging | Require Upstash in production checklist |
| No RLS on Postgres | DB-level bypass if credentials leak | Add RLS policies or restrict DB access |
| `VERIFY_FROM_ADDRESS` hardcoded in `email.ts` | Inflexible sender | Move to env var |
| Partial audit logging on admin actions | Incomplete accountability | Complete TODO audit logs on show-application routes |
| Admin preview endpoints (`preview-match-email`, etc.) | Information disclosure if `CRON_SECRET` leaks | Rotate secret; consider IP allowlist |
| Synchronous matching + email in one API call | Timeout on large batches | Queue-based email dispatch |

---

## Security Checklist for Production

- [ ] Rotate `JWT_SECRET` and `CRON_SECRET` if they were ever committed to git
- [ ] Set strong `JWT_SECRET` (≥32 random characters)
- [ ] Configure `ADMIN_EMAILS` (no hardcoded fallbacks)
- [ ] Enable Upstash Redis for rate limiting
- [ ] Use Supabase pooler URL (port 6543) for `DATABASE_URL`
- [ ] Set `EMAILS_ENABLED=true` only when SMTP is verified
- [ ] Review Supabase Storage bucket policies for verification docs
- [ ] Ensure `.env` is never committed (`.env*` in `.gitignore`)
