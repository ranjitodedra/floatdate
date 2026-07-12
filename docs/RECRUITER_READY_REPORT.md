# Recruiter-Ready Summary Report

Branch: `recruiter-ready` (local only — not pushed)

Date: 2026-07-11

---

## Files Moved

| From | To | Why |
|------|----|-----|
| `questions.json` | `prisma/seed-data/questions.json` | Colocate seed data with Prisma |
| `FloatLive.md` | `docs/archive/FloatLive.md` | Internal planning spec — not recruiter-facing |
| `Rules.md` | `docs/archive/Rules.md` | Stale MVP planning doc |
| `matching_analysis.md` | `docs/archive/matching_analysis.md` | Internal analysis |
| `float_balloon.md` | `docs/archive/float_balloon.md` | Design notes |
| `preview-email.ps1` | `scripts/dev/preview-email.ps1` | Dev-only tooling |
| `preview.html` | `scripts/dev/preview.html` | Generated preview output |
| `preview-no-match.html` | `scripts/dev/preview-no-match.html` | Generated preview output |

## Files Removed from Git

| File | Why |
|------|-----|
| `DEPLOYMENT.md` | Contained real `JWT_SECRET` and `CRON_SECRET`; content merged into README + docs/DEVELOPMENT.md |
| `preview-simple.ps1` (root) | Contained hardcoded `CRON_SECRET`; replaced by `scripts/dev/preview-simple.ps1` using `$env:CRON_SECRET` |
| `TODO.md` | Informal sample chat copy unsuitable for public repo |
| `.cursor/debug-60daf5.log` | Contained real user PII (`oded6890@mylaurier.ca`, user ID) |

## Files Added

| File | Purpose |
|------|---------|
| `.env.example` | Complete env var template with placeholders and comments |
| `LICENSE` | Proprietary all-rights-reserved license |
| `README.md` | Recruiter-facing project overview (replaced create-next-app default) |
| `docs/ARCHITECTURE.md` | Deep technical architecture reference |
| `docs/SECURITY.md` | Implemented security practices |
| `docs/DEVELOPMENT.md` | Owner development reference |
| `scripts/dev/preview-simple.ps1` | Safe email preview script (env-based secret) |
| `src/lib/admin-emails.ts` | Centralized admin email allowlist parsing |

## Code Changes (no behavior change intended)

| Change | Files |
|--------|-------|
| Removed hardcoded admin email fallbacks | `admin-auth.ts`, `auth.ts`, `supabase-admin.ts`, `signup/route.ts`, `signup/page.tsx`, `dashboard/page.tsx`, `inject-sample-feedback.ts` |
| Added `isAdmin` to `/api/auth/me` | `auth/me/route.ts`, `dashboard/page.tsx` |
| Aligned JWT dev fallback in middleware | `middleware.ts` → same string as `auth.ts` |
| Updated seed data path | `prisma/seed.ts` |
| Removed debug `console.log` with user emails | `signup/route.ts`, `run-matching/route.ts` |
| Added `.cursor/` to `.gitignore` | `.gitignore` |

---

## Secrets Found and Fixed (Working Tree)

| Secret / PII | Location | Action |
|--------------|----------|--------|
| `JWT_SECRET` (64-char hex) | `DEPLOYMENT.md` | File deleted; placeholders in `.env.example` |
| `CRON_SECRET` (64-char hex) | `DEPLOYMENT.md`, `preview-simple.ps1` | Files deleted/replaced |
| Real user email + UUID | `.cursor/debug-60daf5.log` | Removed from git; `.cursor/` gitignored |
| Hardcoded admin Gmail | 6+ source files | Replaced with `ADMIN_EMAILS` / `NEXT_PUBLIC_ADMIN_EMAILS` env vars |
| Local `.env` files | Project root + `src/app/.env` | Already gitignored; **delete `src/app/.env` locally** if still present |

### Git History — Still Requires Rotation

**Do not assume deleting files removes secrets from history.**

| Commit | Content |
|--------|---------|
| `b08dd39` | First commit of literal `JWT_SECRET` and `CRON_SECRET` in `DEPLOYMENT.md` |
| `daf7e28` | `CRON_SECRET` in `preview-simple.ps1` |
| All descendants through current HEAD | Secrets remain recoverable via `git log -p` |

**Action required before going public:**
1. Rotate `JWT_SECRET` in Vercel/local (invalidates all existing sessions)
2. Rotate `CRON_SECRET` in Vercel/local
3. If repo was ever public, consider `git filter-repo` or BFG to purge history

**Confirmed clean:** `.env` was never committed. No real `DATABASE_URL`, Supabase keys, or API keys (`sk-`, `re_`) found in history.

---

## User Data Review

| Item | Status |
|------|--------|
| Database dumps (`.dump`) | None in repo (gitignored pattern `*.dump`) |
| `questions.json` | Questionnaire content only — no user PII |
| `prisma/seed.ts` | Seeds questions only |
| Migration SQL | University reference data (public names/domains) — no user rows |
| `TODO.md` | Removed (informal chat samples) |
| Debug log | Removed (contained real Laurier student email) |

---

## Documentation Added

- **README.md** — overview, features, stack, architecture diagram, data flows, decisions, setup, deployment, capacity, roadmap
- **docs/ARCHITECTURE.md** — route map, schema, matching/Float Live pipelines
- **docs/SECURITY.md** — auth, authorization, rate limits, secrets, known gaps
- **docs/DEVELOPMENT.md** — env setup, scripts catalog, conventions, troubleshooting
- **LICENSE** — proprietary, `Copyright (c) 2026 [Your Name]`

---

## Verification (Measured)

| Check | Result |
|-------|--------|
| `npm run test` | **Passed** — 7 files, 76 tests |
| `npm run build` | **Passed** — Next.js 16.1.6 production build, 83 routes |
| `npm run lint` | **Failed** — 15 errors, 14 warnings (all pre-existing; none introduced by this pass) |

Lint failures are in files not modified by this pass (`float-live-chats/page.tsx`, `useSpeechTranscription.ts`, `AppShell.tsx`, etc.). Not fixed per scope constraint (no behavior changes).

---

## Capacity Estimates (Estimated — not load-tested)

| Metric | Estimate | Basis |
|--------|----------|-------|
| Concurrent browsing users | ~50–200 | `pg.Pool` default max 10/instance; Vercel serverless; Supabase pooler limits |
| Float Live concurrent chatters | ~20–50 | Supabase Realtime limits; 1 msg/sec rate limit |
| API throughput | ~100–500 req/min | No caching; direct Postgres per route |
| Weekly matching batch | ~500 users/university; degrades ~2k+ | O(n²) similarity + blossom; sync SMTP |
| Bottlenecks | DB pool, matching CPU, sync email, serverless cold starts | Code inspection |

---

## Bugs / Risks Noted (Not Fixed)

| Issue | Severity | Notes |
|-------|----------|-------|
| Rate limiting disabled without Upstash | Medium | Graceful degradation by design; must configure in prod |
| `VERIFY_FROM_ADDRESS` hardcoded in `email.ts` | Low | Should be env var |
| Matching + email synchronous in one API call | Medium | Serverless timeout risk on large batches |
| No Postgres RLS | Medium | App-layer auth only |
| Partial admin audit logging | Low | TODOs on show-application routes |
| ESLint errors (15) | Low | Pre-existing; see lint output |
| `src/app/.env` exists locally | Low | Unusual location; should use root `.env` only |

---

## Assumptions

- Copyright holder left as `[Your Name]` placeholder in LICENSE
- Internal planning docs archived to `docs/archive/` rather than deleted
- `src/app/design/` dev routes kept (production-gated)
- Admin preview API routes kept (CRON_SECRET protected)
- `NEXT_PUBLIC_ADMIN_EMAILS` added as client-side mirror of `ADMIN_EMAILS` for signup/dashboard UI
- Repository not pushed; visibility unchanged

---

## Next Steps for Owner

1. Review branch locally: `git checkout recruiter-ready`
2. Set `ADMIN_EMAILS` and `NEXT_PUBLIC_ADMIN_EMAILS` in `.env`
3. **Rotate `JWT_SECRET` and `CRON_SECRET`** in production
4. Replace `[Your Name]` in LICENSE
5. Delete local `src/app/.env` if present
6. Review and merge when satisfied; do not push until secrets are rotated
