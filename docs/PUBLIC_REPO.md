# Public Portfolio Repo (Dual-Repo Workflow)

FloatDate uses **two GitHub repositories**:

| Repo | Remote | Purpose |
|------|--------|---------|
| **Private** | `origin` → `floatdate` (existing) | Production, Vercel, full git history |
| **Public** | `float-date` | Portfolio for recruiters — **no private history** |

**Never run `git push origin main` from the private repo to the public remote.** That would upload your entire commit history (secrets, PII, old admin emails).

Instead, sync by **copying the current file tree** into a separate public clone.

---

## One-Time Setup

### 1. Create empty public repo on GitHub

`https://github.com/ranjitodedra/float-date` — no README, no license (this repo supplies those).

### 2. Clone and seed from private repo

From the private repo root:

```powershell
.\scripts\sync-public.ps1 -Initialize -Commit -Push
```

This will:

1. Clone `float-date` into `..\floatdate-public` (sibling folder)
2. Mirror files from private → public (excludes `.git`, `.env`, `node_modules`, backups)
3. Remove `docs/RECRUITER_READY_REPORT.md` from the public copy
4. Run safety checks (no `.env`, no `.dump`, no hex secrets in docs)
5. Commit and push the first public snapshot

### 3. Optional: add public as a named remote (reference only)

```bash
git remote add public https://github.com/ranjitodedra/float-date.git
```

Do **not** push branches from private to this remote with normal `git push`.

---

## Keeping Public Up to Date

After you merge work on private `main`:

```powershell
# Copy latest files + safety check (review before pushing)
.\scripts\sync-public.ps1

cd ..\floatdate-public
git status

# When ready:
.\scripts\sync-public.ps1 -Commit -Push
```

Each public commit is a **new snapshot** — recruiters see current code, not private git ancestry.

---

## What Gets Excluded from Public Sync

| Excluded | Why |
|----------|-----|
| `.git/` | Public clone keeps its own history |
| `.env`, `.env.local` | Secrets |
| `node_modules/`, `.next/`, `.vercel/` | Build artifacts |
| `.cursor/` | Editor/debug logs (may contain PII) |
| `docs/RECRUITER_READY_REPORT.md` | Internal rotation/history notes |
| `docs/PUBLIC_REPO.md` | Dual-repo owner workflow (private only) |
| `*.dump` | Database backups (may exist in private root — **never sync**) |

---

## Safety Check

`scripts/verify-public-safe.ps1` runs automatically before commit. It fails if:

- Any `.env` file (except `.env.example`) exists in the public tree
- Any `*.dump` or `*backup*` file is present
- `JWT_SECRET` / `CRON_SECRET` look like 64-char hex literals in text files

Run manually:

```powershell
.\scripts\verify-public-safe.ps1 -TargetPath ..\floatdate-public
```

---

## Environment Overrides

```powershell
$env:FLOATDATE_PUBLIC_PATH = "D:\repos\floatdate-public"
$env:FLOATDATE_PUBLIC_REMOTE = "https://github.com/ranjitodedra/float-date.git"
.\scripts\sync-public.ps1 -Commit -Push
```

---

## Production (Private Repo)

- Vercel stays connected to **private** `floatdate`
- Rotate `JWT_SECRET` and `CRON_SECRET` in Vercel if they were ever in git history
- Set `ADMIN_EMAILS` and `NEXT_PUBLIC_ADMIN_EMAILS` in Vercel env vars
- Database backups (`npm run db:dump`) — store **outside** both repos (you may have `floatdate_backup_*.dump` in the private project root; they are gitignored but robocopy will skip `*.dump`)

---

## Folder Layout

```
C:\Users\ranji\Videos\
├── floatdate\           ← private (this repo)
└── floatdate-public\    ← public portfolio clone (created by -Initialize)
```
