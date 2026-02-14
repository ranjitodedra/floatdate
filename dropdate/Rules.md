

# DropDate MVP — Full Build Plan (7 Days)

---

## A. Recommended Tech Stack

| Layer | Choice | Justification |
|---|---|---|
| **Framework** | **Next.js 14 (App Router)** | Full-stack in one repo; API routes + SSR + static pages; deploys free on Vercel. |
| **Database** | **Supabase (Postgres + Auth)** | Free tier: 500MB DB, 50k MAU auth, row-level security built-in; eliminates separate auth service. |
| **ORM** | **Prisma** | Type-safe DB access, easy migrations, works perfectly with Supabase Postgres. |
| **Email** | **Resend** | 3,000 emails/mo free; great DX, built by Vercel alumni; React Email templates. |
| **Hosting** | **Vercel (Hobby)** | Zero-config Next.js deploy; free tier covers this MVP easily. |
| **Cron/Scheduler** | **Vercel Cron** | Free on Hobby plan (1 cron job); triggers weekly match + email pipeline. |
| **Styling** | **Tailwind CSS** | Ships with Next.js; fast to build decent UI without a component library. |
| **Language** | **TypeScript** | End-to-end type safety; catches bugs at build time. |

**Setup commands:**
```bash
npx create-next-app@latest dropdate --typescript --tailwind --app --src-dir
cd dropdate
npm install prisma @prisma/client @supabase/supabase-js resend
npx prisma init
```

> **Free-tier alternatives if needed:** Neon (Postgres) instead of Supabase DB, Clerk instead of Supabase Auth (10k MAU free), SendGrid (100 emails/day free) instead of Resend.

---

## B. Data Models

```prisma name=prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id             String       @id @default(uuid())
  email          String       @unique
  name           String
  age            Int
  gender         String       // "male" | "female" | "nonbinary"
  genderPref     String       // "male" | "female" | "any"
  city           String
  bio            String?
  passwordHash   String
  completedSetup Boolean      @default(false)
  createdAt      DateTime     @default(now())

  answers        Answer[]
  optIns         WeeklyOptIn[]
  matchesA       Match[]      @relation("matchUserA")
  matchesB       Match[]      @relation("matchUserB")
  emailLogs      EmailLog[]
}

model Question {
  id              String   @id @default(uuid())
  orderIndex      Int      @unique       // 1–60
  questionText    String
  type            String                  // "likert" | "multiple_choice" | "ranking" | "binary"
  options         Json                    // ["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"]
  weightDimension String                  // e.g. "attachment", "values", "lifestyle", "communication", "interests"
  weight          Float    @default(1.0)  // importance multiplier within dimension

  answers         Answer[]
}

model Answer {
  id         String   @id @default(uuid())
  userId     String
  questionId String
  value      Json     // numeric for likert/binary, string for MC, array for ranking
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id])
  question   Question @relation(fields: [questionId], references: [id])

  @@unique([userId, questionId])
}

model WeeklyOptIn {
  id        String   @id @default(uuid())
  userId    String
  weekStart DateTime // Monday 00:00 UTC of that week
  optedInAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])

  @@unique([userId, weekStart])
}

model Match {
  id              String   @id @default(uuid())
  userAId         String
  userBId         String
  weekStart       DateTime
  similarityScore Float
  explanation     String   // "You both value deep conversations and share lifestyle preferences."
  createdAt       DateTime @default(now())

  userA           User     @relation("matchUserA", fields: [userAId], references: [id])
  userB           User     @relation("matchUserB", fields: [userBId], references: [id])

  @@unique([userAId, weekStart])
  @@unique([userBId, weekStart])
}

model EmailLog {
  id        String   @id @default(uuid())
  userId    String
  matchId   String
  sentAt    DateTime @default(now())
  status    String   // "sent" | "failed" | "bounced"
  resendId  String?

  user      User     @relation(fields: [userId], references: [id])
}
```

**Example question JSON (seeded):**
```json name=example-question.json
{
  "id": "q-001",
  "orderIndex": 1,
  "questionText": "I feel comfortable being emotionally vulnerable with a partner.",
  "type": "likert",
  "options": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
  "weightDimension": "attachment",
  "weight": 1.5
}
```

---

## C. Matching Algorithm

### Mathematical Definition

**Dimensions** (5 for MVP):
`D = {attachment, values, lifestyle, communication, interests}`

**User vector construction:**
For each user *u*, build a dimension vector by aggregating normalized answers:

$$
V_u^{(d)} = \frac{1}{\sum_{q \in Q_d} w_q} \sum_{q \in Q_d} w_q \cdot \text{normalize}(a_{u,q})
$$

Where:
- `Q_d` = questions belonging to dimension *d*
- `w_q` = question weight
- `normalize()` maps the raw answer to `[0, 1]` (e.g., likert 1–5 → 0, 0.25, 0.5, 0.75, 1.0)
- Binary: 0 or 1; Multiple choice: index / (num_options - 1); Ranking: Spearman-style

**Similarity between user A and user B:**

$$
\text{similarity}(A, B) = 1 - \frac{\sum_{d \in D} W_d \cdot |V_A^{(d)} - V_B^{(d)}|}{\sum_{d \in D} W_d}
$$

Weighted Manhattan distance (L1), inverted to a 0–1 similarity score.

**Dimension weights** (tunable constants):
```
W = { attachment: 2.0, values: 2.0, lifestyle: 1.5, communication: 1.5, interests: 1.0 }
```

### Filtering constraints (hard filters applied BEFORE scoring):
1. Gender preference match (mutual)
2. Same city (MVP — no distance calc)
3. Not previously matched
4. Both opted-in this week

### Pseudocode

```python name=matching_algorithm_pseudocode.py
# Run once per week (Sunday night or Monday 00:00 UTC)

def run_weekly_matching(week_start):
    opted_in_users = get_opted_in_users(week_start)
    all_vectors = {u.id: build_vector(u) for u in opted_in_users}
    already_matched = get_all_past_match_pairs()
    matches = []
    matched_ids = set()

    # Sort users by signup date (fairness: older users get priority)
    sorted_users = sorted(opted_in_users, key=lambda u: u.created_at)

    for user in sorted_users:
        if user.id in matched_ids:
            continue

        candidates = [
            c for c in opted_in_users
            if c.id != user.id
            and c.id not in matched_ids
            and passes_hard_filters(user, c)
            and (user.id, c.id) not in already_matched
        ]

        if not candidates:
            continue

        scored = [
            (c, compute_similarity(all_vectors[user.id], all_vectors[c.id]))
            for c in candidates
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        best_match, score = scored[0]

        explanation = generate_explanation(all_vectors[user.id], all_vectors[best_match.id])

        matches.append({
            "userA": user.id,
            "userB": best_match.id,
            "score": score,
            "explanation": explanation,
            "weekStart": week_start
        })
        matched_ids.add(user.id)
        matched_ids.add(best_match.id)

    save_matches(matches)
    send_match_emails(matches)


def build_vector(user):
    """Returns {dimension: float} dict, values in [0,1]"""
    answers = get_user_answers(user.id)
    dims = {}
    for dim in DIMENSIONS:
        q_in_dim = [q for q in QUESTIONS if q.weight_dimension == dim]
        total_weight = sum(q.weight for q in q_in_dim)
        weighted_sum = 0
        for q in q_in_dim:
            a = answers.get(q.id)
            if a is None:
                continue
            weighted_sum += q.weight * normalize(a.value, q)
        dims[dim] = weighted_sum / total_weight if total_weight > 0 else 0.5
    return dims


def compute_similarity(vec_a, vec_b):
    """Weighted L1 similarity, returns float in [0,1]"""
    total_w = sum(DIMENSION_WEIGHTS.values())
    dist = sum(
        DIMENSION_WEIGHTS[d] * abs(vec_a[d] - vec_b[d])
        for d in DIMENSIONS
    )
    return 1 - (dist / total_w)


def generate_explanation(vec_a, vec_b):
    """Picks the top-2 closest dimensions for the 'why you match' blurb"""
    diffs = {d: abs(vec_a[d] - vec_b[d]) for d in DIMENSIONS}
    top2 = sorted(diffs, key=diffs.get)[:2]
    templates = {
        "attachment": "similar emotional openness",
        "values": "aligned core values",
        "lifestyle": "compatible lifestyle preferences",
        "communication": "matching communication styles",
        "interests": "shared interests",
    }
    parts = [templates[d] for d in top2]
    return f"You were matched because of your {parts[0]} and {parts[1]}."
```

### Implementation (TypeScript — production version)

```typescript name=src/lib/matching.ts
type DimensionVec = Record<string, number>;

const DIMENSION_WEIGHTS: DimensionVec = {
  attachment: 2.0,
  values: 2.0,
  lifestyle: 1.5,
  communication: 1.5,
  interests: 1.0,
};

const DIMENSIONS = Object.keys(DIMENSION_WEIGHTS);

export function normalizeAnswer(
  value: any,
  type: string,
  options: any[]
): number {
  switch (type) {
    case "likert":
      return (Number(value) - 1) / 4; // 1-5 → 0-1
    case "binary":
      return value ? 1 : 0;
    case "multiple_choice":
      return options.indexOf(value) / (options.length - 1);
    case "ranking":
      // Kendall tau distance could go here; MVP: hash to position similarity
      return 0.5;
    default:
      return 0.5;
  }
}

export function buildVector(
  answers: { questionId: string; value: any }[],
  questions: {
    id: string;
    weightDimension: string;
    weight: number;
    type: string;
    options: any[];
  }[]
): DimensionVec {
  const vec: DimensionVec = {};
  for (const dim of DIMENSIONS) {
    const qs = questions.filter((q) => q.weightDimension === dim);
    const totalW = qs.reduce((s, q) => s + q.weight, 0);
    let wSum = 0;
    for (const q of qs) {
      const a = answers.find((a) => a.questionId === q.id);
      if (!a) continue;
      wSum += q.weight * normalizeAnswer(a.value, q.type, q.options);
    }
    vec[dim] = totalW > 0 ? wSum / totalW : 0.5;
  }
  return vec;
}

export function similarity(a: DimensionVec, b: DimensionVec): number {
  const totalW = DIMENSIONS.reduce((s, d) => s + DIMENSION_WEIGHTS[d], 0);
  const dist = DIMENSIONS.reduce(
    (s, d) => s + DIMENSION_WEIGHTS[d] * Math.abs(a[d] - b[d]),
    0
  );
  return 1 - dist / totalW;
}

export function explain(a: DimensionVec, b: DimensionVec): string {
  const labels: Record<string, string> = {
    attachment: "similar emotional openness",
    values: "aligned core values",
    lifestyle: "compatible lifestyle preferences",
    communication: "matching communication styles",
    interests: "shared interests",
  };
  const sorted = DIMENSIONS.slice().sort(
    (x, y) => Math.abs(a[x] - b[x]) - Math.abs(a[y] - b[y])
  );
  return `You were matched because of your ${labels[sorted[0]]} and ${labels[sorted[1]]}.`;
}
```

---

## D. API Endpoints & Frontend Routes

### API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/signup` | Create account |
| `POST` | `/api/auth/login` | Login, return session |
| `POST` | `/api/auth/logout` | Clear session |
| `GET` | `/api/questions` | Get all questions (ordered) |
| `POST` | `/api/answers` | Submit all answers (batch upsert) |
| `POST` | `/api/optin` | Opt-in to current week |
| `GET` | `/api/optin/status` | Check if opted in this week |
| `GET` | `/api/match/current` | Get this week's match (if any) |
| `POST` | `/api/admin/run-matching` | Trigger matching (cron or manual) |

### Frontend Routes

| Route | Page |
|---|---|
| `/` | Landing page + CTA |
| `/signup` | Signup form |
| `/login` | Login form |
| `/questions` | Question flow (stepper, 40–60 questions) |
| `/dashboard` | Opt-in toggle + current match display |
| `/profile/[id]` | Minimal match profile view (name, bio, dimension summary) |

### Request/Response Examples

**POST `/api/answers`**
```json name=example-answers-request.json
{
  "answers": [
    { "questionId": "q-001", "value": 4 },
    { "questionId": "q-002", "value": "Adventure travel" },
    { "questionId": "q-003", "value": true }
  ]
}
// Response: { "success": true, "answered": 42 }
```

**GET `/api/match/current`**
```json name=example-match-response.json
{
  "match": {
    "id": "m-abc123",
    "matchedUser": {
      "name": "Jordan",
      "bio": "Coffee snob. Dog person. Reads too much sci-fi.",
      "city": "Austin"
    },
    "similarityScore": 0.87,
    "explanation": "You were matched because of your aligned core values and compatible lifestyle preferences.",
    "weekStart": "2026-02-09T00:00:00Z"
  }
}
```

**cURL for match endpoint:**
```bash
curl -X GET https://dropdate.vercel.app/api/match/current \
  -H "Cookie: session=<your-session-cookie>" \
  -H "Content-Type: application/json"
```

**POST `/api/admin/run-matching`** (cron-triggered):
```bash
curl -X POST https://dropdate.vercel.app/api/admin/run-matching \
  -H "Authorization: Bearer $CRON_SECRET"
# Response: { "matched": 14, "unmatched": 3, "emails_sent": 28 }
```

---

## E. Email Sending Plan

### Provider: **Resend** (primary)
- **Free tier:** 3,000 emails/month, 100/day
- **Signup:** [resend.com](https://resend.com) — requires domain verification (add DNS TXT + DKIM records)
- ⚠️ **Quota flag:** At 100 emails/day, you can match up to 50 pairs/day. For MVP this is plenty. Paid plan is $20/mo for 50k emails if you outgrow it.

**Fallback:** SendGrid (100/day free) or Postmark (100/mo free for testing).

### Deliverability Tips
1. **Verify your sending domain** — add SPF, DKIM, and DMARC DNS records (Resend walks you through this).
2. **Use a subdomain** like `mail.dropdate.app` to protect your root domain reputation.
3. **Set `Reply-To`** to a real monitored inbox.
4. **Keep emails short** — long emails with lots of links trigger spam filters.
5. **Include an unsubscribe link** (CAN-SPAM requirement).
6. **Send from a human-looking address:** `hey@mail.dropdate.app`

### Email Template

```tsx name=src/emails/match-email.tsx
// Using React Email with Resend
import { Html, Head, Body, Text, Link, Hr } from "@react-email/components";

interface MatchEmailProps {
  recipientName: string;
  matchName: string;
  matchEmail: string;
  matchBio: string;
  explanation: string;
  weekOf: string;
}

export default function MatchEmail({
  recipientName,
  matchName,
  matchEmail,
  matchBio,
  explanation,
}: MatchEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", padding: "20px" }}>
        <Text>Hey {recipientName} 👋</Text>
        <Text>
          Your DropDate match this week is <strong>{matchName}</strong>.
        </Text>
        <Text style={{ color: "#666", fontStyle: "italic" }}>
          "{explanation}"
        </Text>
        <Hr />
        <Text>
          <strong>About {matchName}:</strong> {matchBio}
        </Text>
        <Text>
          Reach out to them at:{" "}
          <Link href={`mailto:${matchEmail}`}>{matchEmail}</Link>
        </Text>
        <Text style={{ fontSize: "12px", color: "#999", marginTop: "30px" }}>
          You received this because you opted in on DropDate.
          <br />
          <Link href="{{unsubscribe_url}}">Unsubscribe</Link>
        </Text>
      </Body>
    </Html>
  );
}
```

### Throttling & Safety Rules
- **Rate limit:** Max 2 emails per second (Resend's free tier limit).
- **Dedup:** Never send two match emails to the same user in the same week (enforce via `@@unique` on Match).
- **Bounce handling:** Log `status: "bounced"` in EmailLog; skip bounced users in future weeks.
- **Consent gate:** Only email users who have explicitly opted in for the current week.
- **Kill switch:** Environment variable `EMAILS_ENABLED=true|false` to disable sending instantly.

```typescript name=src/lib/send-match-email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMatchEmail(
  to: string,
  recipientName: string,
  matchName: string,
  matchEmail: string,
  matchBio: string,
  explanation: string
) {
  if (process.env.EMAILS_ENABLED !== "true") {
    console.log(`[EMAIL DISABLED] Would send to ${to}`);
    return { status: "skipped" };
  }

  const { data, error } = await resend.emails.send({
    from: "DropDate <hey@mail.dropdate.app>",
    to,
    subject: `Your DropDate match is here 💜`,
    // In production, use the React Email component rendered to HTML
    html: `
      <p>Hey ${recipientName} 👋</p>
      <p>Your match this week is <strong>${matchName}</strong>.</p>
      <p><em>"${explanation}"</em></p>
      <hr/>
      <p><strong>About ${matchName}:</strong> ${matchBio}</p>
      <p>Reach out: <a href="mailto:${matchEmail}">${matchEmail}</a></p>
      <p style="font-size:12px;color:#999;">You opted in on DropDate. Reply STOP to unsubscribe.</p>
    `,
    replyTo: "support@dropdate.app",
  });

  if (error) {
    console.error("Email send failed:", error);
    return { status: "failed", error };
  }
  return { status: "sent", resendId: data?.id };
}
```

---

## F. Storage & Hosting Plan

### Exact Free-Tier Combo

| Service | Tier | Limits | Purpose |
|---|---|---|---|
| **Vercel** | Hobby (free) | 100GB bandwidth, 1 cron job, serverless functions | Hosting + cron |
| **Supabase** | Free | 500MB DB, 1GB file storage, 50k MAU auth | Postgres + Auth |
| **Resend** | Free | 3,000 emails/mo, 100/day | Transactional email |
| **GitHub** | Free | Unlimited private repos | Source control |

### Deployment Commands

```bash
# 1. Initialize repo
git init && git add . && git commit -m "init"
gh repo create dropdate --private --source=. --push

# 2. Set up Supabase
# Go to https://supabase.com/dashboard → New Project → copy connection strings
# Add to .env.local:
# DATABASE_URL=postgresql://postgres.[ref]:[pw]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
# DIRECT_URL=postgresql://postgres.[ref]:[pw]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# 3. Run Prisma migrations
npx prisma migrate dev --name init
npx prisma db seed   # seed questions

# 4. Deploy to Vercel
npm i -g vercel
vercel --prod
# Set env vars in Vercel dashboard: DATABASE_URL, DIRECT_URL, RESEND_API_KEY,
# CRON_SECRET, EMAILS_ENABLED, NEXTAUTH_SECRET

# 5. Set up cron (vercel.json)
```

```json name=vercel.json
{
  "crons": [
    {
      "path": "/api/admin/run-matching",
      "schedule": "0 0 * * 1"
    }
  ]
}
```
> This fires every Monday at 00:00 UTC. The endpoint verifies `Authorization: Bearer $CRON_SECRET`.

---

## G. Security & Privacy Checklist

### ✅ DO
- [x] Hash passwords with `bcrypt` (cost factor 12+) — or use Supabase Auth and avoid storing passwords yourself
- [x] Store session tokens in `httpOnly`, `secure`, `sameSite=strict` cookies
- [x] Validate all inputs server-side (zod schemas on every API route)
- [x] Use Prisma parameterized queries (SQL injection protection by default)
- [x] Require explicit opt-in consent before sending any email
- [x] Add a "Delete my account and data" button (GDPR Art. 17)
- [x] Log email sends but do NOT log email content long-term
- [x] Rate-limit auth endpoints (e.g., 5 login attempts per minute per IP)
- [x] Use HTTPS everywhere (Vercel provides this by default)
- [x] Add `<meta name="robots" content="noindex">` on profile pages
- [x] Encrypt `DATABASE_URL` and all secrets via Vercel environment variables (never commit `.env`)

### ❌ AVOID
- [ ] Storing raw passwords
- [ ] Exposing other users' emails in the client-side API response (only reveal email via the email itself)
- [ ] Returning full user lists from any endpoint
- [ ] Storing gender/sexuality data in analytics or logs
- [ ] Sending emails without an unsubscribe mechanism

### GDPR Minimal Compliance
- Add a **privacy policy page** (`/privacy`) stating what data you collect, why, and how long you keep it
- Add a **consent checkbox** at signup: "I agree to receive weekly match emails"
- Implement **data export** (JSON dump of user's own data) — can be a manual process for MVP
- Implement **data deletion** — hard delete user + cascade answers, matches

---

## H. 7-Day Execution Plan

### Day 1 (Monday) — Foundation `~6h`
**Branch:** `feature/auth`

| Task | Hours |
|---|---|
| Create Next.js project, install deps, configure Tailwind | 0.5 |
| Set up Supabase project, copy connection strings | 0.5 |
| Write Prisma schema (all 6 models), run `migrate dev` | 1.0 |
| Implement signup/login API routes with Supabase Auth (or NextAuth + bcrypt) | 2.0 |
| Build signup and login pages (minimal forms) | 1.5 |
| Deploy to Vercel, verify DB connection in prod | 0.5 |

**Acceptance Criteria:**
- User can sign up, log in, and see a blank dashboard
- DB has all 6 tables created
- Prod deploy works at `dropdate.vercel.app`

**Smoke Tests:**
1. `POST /api/auth/signup` with valid data → 201 + session cookie
2. `POST /api/auth/login` with wrong password → 401
3. Visit `/dashboard` without session → redirect to `/login`

---

### Day 2 (Tuesday) — Questions `~6h`
**Branch:** `feature/questions`

| Task | Hours |
|---|---|
| Write seed script with 45 questions (9 per dimension × 5 dimensions) | 1.5 |
| Build `GET /api/questions` endpoint | 0.5 |
| Build `POST /api/answers` batch upsert endpoint with Zod validation | 1.0 |
| Build question flow UI (stepper: 5 pages × ~9 questions each, progress bar) | 2.5 |
| Mark user `completedSetup = true` after submission | 0.5 |

**Acceptance Criteria:**
- User completes all questions in a stepper UI
- Answers persist in DB (verify via Supabase dashboard)
- User is redirected to dashboard after completion

**Smoke Tests:**
1. `GET /api/questions` → returns 45 ordered questions with correct types
2. Submit partial answers → proper validation error
3. Complete flow → `completedSetup` flips to `true` in DB

> **LLM shortcut:** Use ChatGPT to generate 45 research-backed questions across the 5 dimensions. Prompt: *"Generate 9 dating compatibility questions for [dimension], with type, options, and weight. Use established relationship psychology (Gottman, attachment theory, Big Five)."*

---

### Day 3 (Wednesday) — Dashboard + Opt-in `~5h`
**Branch:** `feature/dashboard`

| Task | Hours |
|---|---|
| Build dashboard page showing user status (setup complete? opted in?) | 1.5 |
| Build `POST /api/optin` and `GET /api/optin/status` endpoints | 1.0 |
| Add opt-in button + countdown to next Monday 00:00 UTC | 1.0 |
| Build minimal profile page `/profile/[id]` (name, bio, city, top dimensions) | 1.0 |
| Add "Edit my answers" link (re-enter question flow) | 0.5 |

**Acceptance Criteria:**
- Dashboard shows opt-in status and countdown
- User can opt-in; double opt-in is idempotent
- Profile page renders match info (even if no match yet)

**Smoke Tests:**
1. `POST /api/optin` → creates WeeklyOptIn row; second call → no duplicate
2. `GET /api/optin/status` → `{ optedIn: true, weekStart: "2026-02-09T00:00:00Z" }`
3. `/profile/[id]` with invalid ID → 404 page

---

### Day 4 (Thursday) — Matching Engine `~7h`
**Branch:** `feature/matching`

| Task | Hours |
|---|---|
| Implement `buildVector()`, `similarity()`, `explain()` in `src/lib/matching.ts` | 2.0 |
| Implement full matching pipeline: fetch opted-in users → filter → score → pair → save | 2.5 |
| Build `POST /api/admin/run-matching` endpoint (auth with CRON_SECRET) | 0.5 |
| Build `GET /api/match/current` endpoint | 0.5 |
| Write unit tests for matching functions (3–5 test cases) | 1.0 |
| Manually test with 4–6 seed users | 0.5 |

**Acceptance Criteria:**
- Running matching on 6 seed users produces 3 valid pairs
- No user is matched twice in the same week
- Gender preference filters work correctly
- `GET /api/match/current` returns the match with explanation

**Smoke Tests:**
1. Run matching with 2 compatible users → 1 match, score > 0.5
2. Run matching with incompatible gender prefs → 0 matches
3. Run matching twice for same week → no duplicate matches

---

### Day 5 (Friday) — Email Pipeline `~6h`
**Branch:** `feature/email`

| Task | Hours |
|---|---|
| Set up Resend account, verify domain DNS | 1.0 |
| Build email template (React Email or raw HTML) | 1.0 |
| Implement `sendMatchEmail()` utility | 1.0 |
| Wire email sending into matching pipeline (after matches are saved) | 1.0 |
| Build EmailLog writes (track sent/failed status) | 0.5 |
| Add EMAILS_ENABLED kill switch + test with personal email | 1.0 |
| Add Vercel cron config (`vercel.json`) | 0.5 |

**Acceptance Criteria:**
- Match email arrives in personal inbox (not spam)
- EmailLog row created with `status: "sent"` and Resend ID
- Kill switch prevents sending when disabled

**Smoke Tests:**
1. Trigger matching → email arrives in inbox within 60 seconds
2. Set `EMAILS_ENABLED=false` → no email sent, log says "skipped"
3. Check email renders correctly in Gmail and Apple Mail

---

### Day 6 (Saturday) — Polish + Edge Cases `~6h`
**Branch:** `feature/polish`

| Task | Hours |
|---|---|
| Landing page with CTA (hero section, 3-step explanation, signup button) | 1.5 |
| Add Zod validation to all API routes (if not already done) | 1.0 |
| Handle edge cases: user with no match this week → "No match yet" UI | 0.5 |
| Add loading states, error toasts, mobile responsiveness | 1.0 |
| Privacy policy page (`/privacy`) — use LLM to draft | 0.5 |
| Rate limiting on auth endpoints (simple in-memory or Vercel KV) | 0.5 |
| Account deletion endpoint (`DELETE /api/account`) | 0.5 |
| Final deploy, test full flow end-to-end on production | 0.5 |

**Acceptance Criteria:**
- Full flow works on mobile Chrome
- Landing page looks presentable
- Edge cases don't crash the app

**Smoke Tests:**
1. Full signup → questions → opt-in → trigger match → receive email (production)
2. Delete account → all user data gone from DB
3. Visit all pages on mobile → no horizontal scroll, nothing broken

---

### Day 7 (Sunday) — Testing + Launch `~4h`
**Branch:** `main` (merge all features)

| Task | Hours |
|---|---|
| Merge all feature branches into main | 0.5 |
| Run full testing checklist (Section I) | 1.5 |
| Fix any bugs found | 1.0 |
| Set up custom domain (if purchased) | 0.5 |
| Write launch post / tell 10 friends / seed initial users | 0.5 |

**Acceptance Criteria:**
- All smoke tests pass on production
- Cron job is verified (trigger manually once)
- At least 2 real signups (yourself + 1 friend)

**What to postpone if time runs short:**
1. ~~Custom domain~~ — use `dropdate.vercel.app`
2. ~~Account deletion~~ — handle manually via Supabase dashboard
3. ~~Rate limiting~~ — acceptable risk at MVP scale
4. ~~Mobile polish~~ — desktop-first is fine for week 1
5. ~~Edit answers~~ — users can re-submit the full question flow

---

## I. Minimal Testing & Launch Checklists

### Testing Checklist
- [ ] **Auth:** Sign up → log in → log out → log back in
- [ ] **Auth edge:** Duplicate email signup → error; wrong password → error
- [ ] **Questions:** Complete all 45 questions → `completedSetup: true`
- [ ] **Questions edge:** Submit with missing required answer → validation error
- [ ] **Opt-in:** Opt in → status shows opted in; double opt-in → idempotent
- [ ] **Matching:** Seed 6 users (3M seeking F, 3F seeking M, same city) → 3 matches
- [ ] **Matching edge:** User with no compatible candidates → gracefully unmatched
- [ ] **Matching edge:** Re-run matching for same week → no duplicate matches
- [ ] **Email:** Match email arrives, not in spam, links work, unsubscribe link present
- [ ] **Email edge:** `EMAILS_ENABLED=false` → no emails sent
- [ ] **Profile:** Match profile page loads with correct info
- [ ] **Privacy:** `/privacy` page loads
- [ ] **Mobile:** Full flow works on iPhone Safari
- [ ] **Cron:** Manually trigger `POST /api/admin/run-matching` on production → works

### Launch Checklist
- [ ] All env vars set in Vercel (DATABASE_URL, DIRECT_URL, RESEND_API_KEY, CRON_SECRET, NEXTAUTH_SECRET, EMAILS_ENABLED)
- [ ] Domain DNS configured (if custom domain)
- [ ] Resend domain verified (SPF, DKIM, DMARC)
- [ ] SMTP test: send 1 test email to Gmail, Outlook, Yahoo — lands in inbox
- [ ] Vercel cron job visible in dashboard and next run time is correct
- [ ] Supabase RLS policies enabled (or at minimum, API routes validate auth)
- [ ] `EMAILS_ENABLED` set to `true`
- [ ] Privacy policy page live at `/privacy`
- [ ] 1st-week ops plan: Monitor Resend dashboard Monday after cron runs; check EmailLog for failures

---

## J. Cost Estimate

| Service | MVP Cost | When You'd Pay |
|---|---|---|
| Vercel Hobby | **$0** | >100GB bandwidth/mo → Pro $20/mo |
| Supabase Free | **$0** | >500MB DB or >50k MAU → Pro $25/mo |
| Resend Free | **$0** | >3,000 emails/mo → Pro $20/mo |
| Domain (.app) | **~$12/yr** | Optional; can use vercel.app subdomain |
| GitHub | **$0** | Always free for private repos |
| **Total MVP** | **$0–$12** | |

**When paid tiers kick in (estimates):**
- **100 users, 50 matches/week:** Still comfortably free tier everywhere.
- **500 users, 250 matches/week:** Resend free tier limit hit (~2,000 emails/mo for matches alone). Upgrade Resend to $20/mo.
- **2,000+ users:** Supabase DB approaches 500MB. Upgrade to $25/mo.
- **Realistic first 3 months:** $0–$12 total (just the domain).

⚠️ **Quota flags:**
- Resend: 100 emails/day limit on free tier. If you hit >50 matches in a single Monday run, you'll need to stagger sends or upgrade.
- Supabase: 500MB storage. 45 answers × 2,000 users ≈ ~5MB. You're fine for a long time.
- Vercel: 1 cron job on free tier. You only need 1. ✅

---

## 🚀 First-Hour Checklist (Do These RIGHT NOW)

1. **Run `npx create-next-app@latest dropdate --typescript --tailwind --app --src-dir`** and push to a new private GitHub repo.

2. **Create a Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard) — copy the connection strings into `.env.local`.

3. **Create a Resend account** at [resend.com](https://resend.com) — grab the API key (you'll verify the domain on Day 5, but get the account now).

4. **Copy the Prisma schema from Section B** into `prisma/schema.prisma`, run `npx prisma migrate dev --name init`, and verify tables exist in Supabase.

5. **Open ChatGPT and generate your 45 questions** — prompt: *"Generate 9 research-backed dating compatibility questions for each of these 5 dimensions: attachment, values, lifestyle, communication, interests. For each question output JSON with fields: questionText, type (likert|binary|multiple_choice), options (array), weight (1.0–2.0). Base questions on Gottman, attachment theory, and Big Five personality research."* — save the output as `prisma/seed.ts`.

**Go build. Ship Monday. Iterate Tuesday.** 🚢