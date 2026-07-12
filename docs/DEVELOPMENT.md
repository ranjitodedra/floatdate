# Development Guide

Owner reference for local development, testing, and operational scripts. This is **not** a contribution guide — the project license does not permit external contributions.

For the **private + public dual-repo workflow**, see [PUBLIC_REPO.md](./PUBLIC_REPO.md).

---

## Environment Setup

1. Copy the template:

```bash
cp .env.example .env
```

2. Fill in required values. Minimum for local dev:

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Supabase pooler or local Postgres |
| `JWT_SECRET` | Any string for dev (≥32 chars recommended) |
| `CRON_SECRET` | Any string for dev |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `ADMIN_EMAILS` | Your admin email |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Same as `ADMIN_EMAILS` (needed for client-side admin UI) |
| `EMAILS_ENABLED` | `false` to skip SMTP in dev |

3. Optional but needed for full feature testing:

| Variable | Feature |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` + keys | Float Live realtime + doc uploads |
| `EMAIL_USER` / `EMAIL_PASS` | Match emails |
| `VERIFY_EMAIL_*` | Verification and reset emails |
| `UPSTASH_REDIS_REST_*` | Rate limiting |

**Important:** keep `.env` at the project root only. Delete `src/app/.env` if it exists locally (accidental placement).

---

## Database

### Initial setup

```bash
npx tsx scripts/deploy-setup.ts
```

This runs `prisma db push` and seeds 60 questions from `prisma/seed-data/questions.json`.

### Migrations

Migrations live in `prisma/migrations/`. For production, prefer `prisma migrate deploy`. Local dev uses `db push` via the deploy script.

### Backup

```bash
npm run db:dump -- backup_filename.dump
```

Uses `DIRECT_URL` if set (preferred for `pg_dump`), otherwise `DATABASE_URL`.

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build (runs `prisma generate` via postinstall) |
| `npm run start` | Serve production build |
| `npm run test` | Vitest unit tests (`src/lib/__tests__/`) |
| `npm run lint` | ESLint |
| `npm run trigger-matching` | Run weekly matching locally |
| `npm run delete-user` | Delete a user by email (interactive) |
| `npm run db:dump` | PostgreSQL backup |

---

## Scripts Catalog

### Safe for routine use

| Script | Purpose |
|--------|---------|
| `scripts/deploy-setup.ts` | Migrate + seed |
| `scripts/trigger-matching.ts` | Run matching algorithm |
| `scripts/check-users.ts` | List user count |
| `scripts/check-cities.ts` | Audit city distribution |
| `scripts/list-users.ts` | List users |
| `scripts/backfill-referral-codes.ts` | Generate missing referral codes |
| `scripts/fix-duplicate-matches.ts` | Repair duplicate match records |
| `scripts/inject-sample-feedback.ts` | Create sample match feedback (needs `ADMIN_EMAILS`) |
| `scripts/float-live-sim.ts` | Simulate Float Live participants |

### Destructive — use with caution

| Script | Warning |
|--------|---------|
| `scripts/delete-user.ts` | Permanently deletes one user and all related data |
| `scripts/delete-all-users.ts` | Deletes **all** users |
| `scripts/update-user-pref.ts` | Modifies user preferences directly |

### Dev tooling (`scripts/dev/`)

| Script | Purpose |
|--------|---------|
| `preview-email.ps1` | Fetch match email HTML preview (requires `CRON_SECRET`) |
| `preview-simple.ps1` | Quick match email preview |
| `preview.html`, `preview-no-match.html` | Generated preview output (gitignored in practice) |

Usage:

```powershell
$env:CRON_SECRET = "your-local-secret"
.\scripts\dev\preview-email.ps1
```

---

## Design Capture Routes

`/design` and `/design/landing` are available **only in development** (`NODE_ENV !== "production"`). They render static component clones for Figma import via `src/components/design/Static*.tsx`.

Do not remove the production guard in `src/app/design/layout.tsx`.

---

## Conventions

### Path alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

### API routes

- Return `NextResponse.json()` with appropriate HTTP status codes
- Use `getCurrentUser()` for authenticated endpoints
- Use `requireAdmin()` for admin endpoints
- Use `checkRateLimit(bucket, identifier)` before mutating operations

### Auth

- Session cookie: `floatdate_session`
- Impersonation cookie: `floatdate_impersonation`
- Dev JWT fallback (when `JWT_SECRET` unset): `dev-secret-local-only-not-for-production`

### Styling

- Tailwind CSS v4 with `@theme` tokens in `src/app/globals.css`
- Shared UI classes in `src/lib/ui-classes.ts` (`glassInputClass`, `btnPrimaryClass`, etc.)

### Testing

Tests use Vitest with no custom config file. Run a single file:

```bash
npx vitest run src/lib/__tests__/matching.test.ts
```

---

## Admin Local Setup

To access `/admin` locally:

1. Set `ADMIN_EMAILS=your@email.com` in `.env`
2. Set `NEXT_PUBLIC_ADMIN_EMAILS=your@email.com` (for signup form and dashboard link)
3. Sign up with that email (Gmail admin accounts bypass university domain check)
4. Navigate to `/admin` or use the Admin link on the dashboard

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Prisma client not found | Run `npx prisma generate` |
| DB connection refused | Check `DATABASE_URL`; use Supabase pooler URL |
| Session invalid after login (dev) | Ensure `JWT_SECRET` is set in `.env` (middleware and auth must agree) |
| Emails not sending | Set `EMAILS_ENABLED=true` and configure SMTP vars |
| Rate limits not working | Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` |
| Float Live chat not syncing | Configure `NEXT_PUBLIC_SUPABASE_URL` and anon key |

---

## Internal Planning Docs

Archived specifications live in `docs/archive/`:

- `FloatLive.md` — original Float Live feature spec
- `Rules.md` — early MVP planning (partially stale)
- `matching_analysis.md` — matching algorithm analysis
- `float_balloon.md` — design notes

These are kept for owner reference and are not part of the public-facing documentation.
