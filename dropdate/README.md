This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


Implementation Plan
less than a minute ago

Review

Proceed
DropDate MVP — Implementation Plan
Build the complete MVP production flow for DropDate: auth, 74-question stepper, dashboard, weekly matching engine, and email pipeline.

User Review Required
IMPORTANT

Dimension Mapping: The 
questions.json
 uses 11 dimensions (Big Five, Attachment style, Conflict resolution, Emotional regulation, Communication style, Core values, Relationship beliefs, Long-term goals, Socioeconomic, Behavioral lifestyle habits, Time orientation, Social energy, Deal-breakers, Attraction style). The 
Rules.md
 algorithm references only 5 matching dimensions (attachment, values, lifestyle, communication, interests). The plan maps the 11 → 5 during vector construction.

WARNING

Database: The 
.env
 currently points to a local Prisma Postgres dev server (prisma+postgres://localhost:51213). Migrations and seeding require running prisma dev first. Confirm this is working before execution.

IMPORTANT

No Supabase Auth: The project has no @supabase/supabase-js installed and no Supabase Auth configured. The plan implements custom JWT auth with bcrypt + jose (lightweight, no NextAuth dependency). If you prefer Supabase Auth instead, let me know.

Proposed Changes
Foundation & Dependencies
[MODIFY] 
package.json
Install: zod, bcryptjs + @types/bcryptjs, jose (JWT), resend

[NEW] 
db.ts
Prisma client singleton (avoids hot-reload connection exhaustion)

[NEW] 
auth.ts
hashPassword(), verifyPassword() via bcryptjs
createSession() — signs JWT with jose, sets httpOnly cookie
getSession() — reads + verifies JWT from cookie
destroySession() — clears cookie
requireAuth() — helper for API routes, returns userId or 401
Auth System
[NEW] 
route.ts
Zod schema: email (must end @mylaurier.ca), password (min 8), name, age, gender, genderPref, city
Server-side @mylaurier.ca enforcement → 400 if invalid
Hash password, create User, set session cookie → 201
[NEW] 
route.ts
Zod schema: email, password
Lookup user, verify bcrypt hash → set session cookie or 401
[NEW] 
route.ts
Clear session cookie → 200
[NEW] 
page.tsx
Signup form — client-side @mylaurier.ca validation, fields: name, email, password, age, gender, genderPref, city

[NEW] 
page.tsx
Login form — email + password

[NEW] 
middleware.ts
Protect /dashboard, /questions — redirect to /login if no valid session cookie

Questions Flow
[NEW] 
seed.ts
Read 
questions.json
, map each question's dimension to the 5 matching dimensions, upsert into Question table

[NEW] 
route.ts
GET — Return all questions ordered by orderIndex

[NEW] 
route.ts
POST — Batch upsert answers, Zod validated, auto-save per question or batch

[NEW] 
page.tsx
Full question stepper UI:

One question at a time with fade/slide transitions via CSS
Progress bar showing X / 74
Next/Back navigation
Prevent forward without answering
Auto-save after each answer via API call
Renders different input types: likert_5, likert_7, binary, forced_choice, scenario, ranking, multiple_choice, importance_weight, hard_filter
On completion: mark completedSetup = true, redirect to /dashboard
[NEW] 
QuestionCard.tsx
Reusable controlled component that renders the correct input UI based on question input_type

Dashboard + Opt-in
[NEW] 
page.tsx
If completedSetup = false → redirect to /questions
Opt-in button for current week
Countdown timer to next Monday 00:00 UTC
Current match display (name, bio, similarity score, explanation) or "No match this week"
[NEW] 
route.ts
POST — Create WeeklyOptIn for current week (idempotent via upsert)

[NEW] 
route.ts
GET — Return { optedIn: boolean, weekStart: string }

[NEW] 
route.ts
GET — Return current week's match for the logged-in user (no email exposure)

Matching Algorithm
[NEW] 
matching.ts
DIMENSION_MAP — maps 11 question dimensions → 5 matching dimensions
DIMENSION_WEIGHTS — { attachment: 2.0, values: 2.0, lifestyle: 1.5, communication: 1.5, interests: 1.0 }
normalizeAnswer(value, inputType, options, scoringDirection) — handle all input types, reverse-scoring
buildVector(answers, questions) → Record<string, number> (5 dimensions, each [0,1])
similarity(vecA, vecB) → weighted L1 similarity [0,1]
explain(vecA, vecB) → explanation string from top-2 closest dimensions
passesHardFilters(userA, userB) — mutual gender pref, same city
runWeeklyMatching(weekStart) — full pipeline: fetch opted-in users, build vectors, greedy pair, save matches
[NEW] 
route.ts
POST — Protected by Authorization: Bearer $CRON_SECRET, calls runWeeklyMatching()

Email Pipeline
[NEW] 
send-match-email.ts
Checks EMAILS_ENABLED env flag
Sends match email via Resend
Returns status for EmailLog
[NEW] 
vercel.json
Cron config: /api/admin/run-matching every Monday 00:00 UTC

Landing Page
[MODIFY] 
page.tsx
Replace boilerplate with DropDate landing page: hero, 3-step explanation, CTA buttons

[MODIFY] 
layout.tsx
Update metadata title/description to "DropDate"

[MODIFY] 
globals.css
Add custom CSS variables, animations for question transitions, global styling

Verification Plan
Automated Tests
Build check: npm run build — must compile with zero errors
Lint check: npm run lint — no TypeScript or ESLint errors
Manual Verification (Browser)
Steps for manual end-to-end testing:

Start dev server: npm run dev in the dropdate directory
Landing page: Open http://localhost:3000 — confirm DropDate landing page renders with signup/login CTAs
Signup rejection: Try signing up with test@gmail.com — confirm 400 error and client-side validation message
Signup success: Sign up with test@mylaurier.ca — confirm redirect to /questions
Questions flow:
Confirm progress bar shows 1 / 74
Try clicking Next without answering — confirm blocked
Answer and click Next — confirm transition animation, progress updates
Verify Back button works
Dashboard: After completing all 74 questions, confirm redirect to /dashboard
Opt-in: Click opt-in button — confirm "You're opted in" state and countdown timer
Login/Logout: Log out, log back in — confirm session persists questions and setup status


-----------------------------------------


Build Verification
Fixed PrismaClient initialization by adding datasourceUrl: process.env.DATABASE_URL. Verified all auth.ts exports (
requireAuth
, 
getCurrentUser
) exist. Login route returns completedSetup for conditional redirect.

Files Edited
db.ts
schema.prisma
Progress Updates
1
Running npm run build to verify TypeScript compilation

2
Fixing Prisma schema directUrl issue and regenerating client

3
Running prisma generate and npm run build

4
Fixing PrismaClient initialization for Prisma 7 and re-running build

5
Adding missing getCurrentUser function and requireAuth to auth.ts, then re-running build

6
Re-running npm run build after PrismaClient fix