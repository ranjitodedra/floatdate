# FloatDate — "Float Live" 2D Pixel-Game Chat Feature — Full Build Rules

> **⚠️ CRITICAL DATA SAFETY RULE:** This feature adds NEW tables and NEW pages only. It MUST NOT modify, drop, rename, or alter any existing database tables (`User`, `Question`, `Answer`, `WeeklyOptIn`, `Match`, `EmailLog`, `PendingSignup`). All new tables are ADDITIVE. Use Prisma's `migrate dev --name add_float_live_tables` to generate a non-destructive migration. Always back up the database before running any migration. Verify the generated SQL contains only `CREATE TABLE` statements—no `ALTER TABLE` or `DROP TABLE` on existing tables.

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Existing Architecture Context](#2-existing-architecture-context)
3. [New Data Models (Prisma — Additive Only)](#3-new-data-models)
4. [Step-by-Step Supabase Setup Guide](#4-supabase-setup-guide)
5. [Supabase Realtime Configuration](#5-supabase-realtime-configuration)
6. [Visual Environment & Pixel Art Specifications](#6-visual-environment)
7. [Character Gender Logic](#7-character-gender-logic)
8. [UI Components Breakdown](#8-ui-components)
9. [Chat Interface Details](#9-chat-interface)
10. [Filters System](#10-filters-system)
11. [Matching & Queueing Logic](#11-matching-queueing)
12. [Intention-Based Logic (Blind Date vs Friendship)](#12-intention-logic)
13. [Time-Gated Access (5 PM – 6 PM Ontario Time)](#13-time-gated-access)
14. [Code of Conduct & Terms Acceptance](#14-code-of-conduct)
15. [Abuse Reporting & Admin Dashboard](#15-abuse-reporting)
16. [Chat Persistence & Soft Delete](#16-chat-persistence)
17. [API Endpoints](#17-api-endpoints)
18. [Frontend Routes & Components](#18-frontend-routes)
19. [Implementation Workflow (Step-by-Step)](#19-implementation-workflow)
20. [Security Considerations](#20-security)
21. [Testing Checklist](#21-testing-checklist)

---

## 1. Feature Overview

"Float Live" is a time-gated, real-time anonymous chat mode accessible from the FloatDate dashboard. Users enter a 2D pixel-art scene where two characters sit at a table. They can chat with a randomly matched partner based on filters (gender, preference, intention, campus). The entire experience is only available **daily between 5:00 PM and 6:00 PM Eastern Time (Ontario)**.

### Key Characteristics
- **Retro pixel-game aesthetic** — all assets generated via Nano Banana model (Antigravity system)
- **Real-time chat** powered by Supabase Realtime (Postgres changes / websockets)
- **Time-gated** — only active 5:00 PM – 6:00 PM ET daily
- **Anonymous by default** in "blind date" mode; emails revealed only by mutual consent
- **Messages soft-deleted** from UI after session ends but permanently stored in DB for admin review
- **Abuse reporting** with admin dashboard for investigation

---

## 2. Existing Architecture Context

The Opus model must understand the current codebase before making changes:

### Current Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) — `src/app/` directory |
| Database | Supabase Postgres |
| ORM | Prisma (with `@prisma/adapter-pg`) |
| Auth | Custom JWT (jose) + bcryptjs — session cookies |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Hosting | Vercel |

### Current File Structure
```
floatdate/
├── prisma/
│   ├── schema.prisma          # ← ADD new models here (DO NOT modify existing ones)
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── about/
│   │   ├── admin/             # ← Extend with abuse review pages
│   │   ├── api/               # ← Add new API routes here
│   │   ├── dashboard/         # ← Add "Float Live" button here
│   │   ├── forgot-password/
│   │   ├── login/
│   │   ├── privacy/
│   │   ├── questions/
│   │   ├── reset-password/
│   │   ├── signup/
│   │   ├── verify-email/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── lib/
│   │   ├── admin-auth.ts
│   │   ├── auth.ts            # ← Use existing auth for Float Live
│   │   ├── db.ts              # ← Use existing Prisma client
│   │   ├── email.ts
│   │   ├── matching.ts
│   │   ├── send-match-email.ts
│   │   └── week-cycle.ts
│   └── middleware.ts
├── package.json
└── Rules.md                   # ← Existing build plan (DO NOT modify)
```

### Existing Database Models (DO NOT MODIFY)
- `User` — id, email, name, age, gender, genderPref, city, bio, passwordHash, completedSetup, emailVerified, createdAt
- `Question` — id, orderIndex, questionText, type, options, weightDimension, weight
- `Answer` — id, userId, questionId, value, createdAt
- `WeeklyOptIn` — id, userId, weekStart, optedInAt
- `Match` — id, userAId, userBId, weekStart, similarityScore, explanation, createdAt
- `EmailLog` — id, userId, matchId, sentAt, status, messageId
- `PendingSignup` — id, email, name, age, gender, genderPref, city, ...

### Existing User.gender values: `"male"` | `"female"` | `"nonbinary"`
### Existing User.genderPref values: `"male"` | `"female"` | `"any"`

---

## 3. New Data Models (Prisma — Additive Only)

Add these models to `prisma/schema.prisma` **below** the existing models. Do NOT modify any existing model.

```prisma
// ============================================
// FLOAT LIVE — New models (additive migration)
// ============================================

model FloatLiveSession {
  id             String   @id @default(uuid())
  date           DateTime // The date of the live session (date only, no time)
  startTime      DateTime // 5:00 PM ET converted to UTC
  endTime        DateTime // 6:00 PM ET converted to UTC
  createdAt      DateTime @default(now())

  participants   FloatLiveParticipant[]
  chatRooms      FloatLiveChatRoom[]
}

model FloatLiveParticipant {
  id             String   @id @default(uuid())
  userId         String
  sessionId      String
  gender         String   // "male" | "female" | "nonbinary" — copied from User at join time
  preference     String   // "male" | "female" | "nonbinary" | "any" — who they want to chat with
  intention      String   // "blind_date" | "friendship"
  campus         String   // Campus filter value
  isOnline       Boolean  @default(true)
  acceptedTerms  Boolean  @default(false)
  joinedAt       DateTime @default(now())
  leftAt         DateTime?

  user           User     @relation(fields: [userId], references: [id])
  session        FloatLiveSession @relation(fields: [sessionId], references: [id])

  chatRoomsAsA   FloatLiveChatRoom[] @relation("chatParticipantA")
  chatRoomsAsB   FloatLiveChatRoom[] @relation("chatParticipantB")

  @@unique([userId, sessionId])
}

model FloatLiveChatRoom {
  id                String   @id @default(uuid())
  sessionId         String
  participantAId    String
  participantBId    String
  intention         String   // "blind_date" | "friendship"
  emailRevealedByA  Boolean  @default(false)
  emailRevealedByB  Boolean  @default(false)
  isActive          Boolean  @default(true)
  startedAt         DateTime @default(now())
  endedAt           DateTime?

  session        FloatLiveSession @relation(fields: [sessionId], references: [id])
  participantA   FloatLiveParticipant @relation("chatParticipantA", fields: [participantAId], references: [id])
  participantB   FloatLiveParticipant @relation("chatParticipantB", fields: [participantBId], references: [id])

  messages       FloatLiveChatMessage[]
  reports        FloatLiveReport[]

  @@unique([participantAId, participantBId, sessionId])
}

model FloatLiveChatMessage {
  id           String   @id @default(uuid())
  chatRoomId   String
  senderId     String   // References User.id
  content      String
  isDeleted    Boolean  @default(false)  // Soft delete — hidden from UI, kept in DB
  createdAt    DateTime @default(now())

  chatRoom     FloatLiveChatRoom @relation(fields: [chatRoomId], references: [id])
}

model FloatLiveReport {
  id            String   @id @default(uuid())
  chatRoomId    String
  reporterId    String   // User who reported
  reportedId    String   // User who was reported
  reason        String   // "harassment" | "spam" | "inappropriate" | "other"
  details       String?  // Optional free-text details
  status        String   @default("pending") // "pending" | "reviewed" | "action_taken" | "dismissed"
  adminNotes    String?
  createdAt     DateTime @default(now())
  reviewedAt    DateTime?

  chatRoom      FloatLiveChatRoom @relation(fields: [chatRoomId], references: [id])
}
```

**Also add this relation to the existing User model** (the ONLY change to existing models — adding a relation field which does NOT alter the database table structure):

```prisma
// In the User model, ADD this line (relation only — no DB column change):
  floatLiveParticipations FloatLiveParticipant[]
```

> **Why this is safe:** Adding a relation field (without `@relation(fields:..., references:...)`) on the User side does NOT create a new column. It's a Prisma-level virtual relation. The foreign key lives on `FloatLiveParticipant.userId`.

### Migration Command
```bash
# ALWAYS back up first
# In Supabase dashboard: Settings → Database → Create backup

# Then run the migration
npx prisma migrate dev --name add_float_live_tables

# Verify the generated SQL ONLY contains CREATE TABLE statements
# Check: prisma/migrations/[timestamp]_add_float_live_tables/migration.sql
```

---

## 4. Supabase Setup Guide (Step-by-Step for Developer)

### Step 4.1 — Back Up Current Data
1. Go to **Supabase Dashboard → Project → Settings → Database**
2. Click **"Create a backup"** or use the SQL editor to export:
   ```sql
   -- Run in Supabase SQL Editor to verify current row counts
   SELECT 'User' as table_name, COUNT(*) as row_count FROM "User"
   UNION ALL SELECT 'Question', COUNT(*) FROM "Question"
   UNION ALL SELECT 'Answer', COUNT(*) FROM "Answer"
   UNION ALL SELECT 'WeeklyOptIn', COUNT(*) FROM "WeeklyOptIn"
   UNION ALL SELECT 'Match', COUNT(*) FROM "Match"
   UNION ALL SELECT 'EmailLog', COUNT(*) FROM "EmailLog"
   UNION ALL SELECT 'PendingSignup', COUNT(*) FROM "PendingSignup";
   ```
3. **Save these counts.** After migration, re-run this query and verify counts are identical.

### Step 4.2 — Run Prisma Migration
```bash
npx prisma migrate dev --name add_float_live_tables
```
- Open the generated migration file in `prisma/migrations/`
- **VERIFY** it only contains `CREATE TABLE` statements for the 5 new tables
- **VERIFY** it does NOT contain `ALTER TABLE "User"`, `DROP TABLE`, etc.

### Step 4.3 — Enable Supabase Realtime for Chat
1. Go to **Supabase Dashboard → Database → Replication**
2. Under **"Realtime"**, toggle ON for the `FloatLiveChatMessage` table
3. Also toggle ON for `FloatLiveParticipant` (for online count tracking)
4. Also toggle ON for `FloatLiveChatRoom` (for email reveal status updates)

### Step 4.4 — Set Up Row Level Security (RLS) Policies
Run these SQL commands in the **Supabase SQL Editor**:

```sql
-- Enable RLS on all new Float Live tables
ALTER TABLE "FloatLiveChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FloatLiveChatRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FloatLiveParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FloatLiveSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FloatLiveReport" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read messages in their own chat rooms
CREATE POLICY "Users read own chat messages"
ON "FloatLiveChatMessage" FOR SELECT
USING (
  "chatRoomId" IN (
    SELECT cr.id FROM "FloatLiveChatRoom" cr
    JOIN "FloatLiveParticipant" pa ON cr."participantAId" = pa.id
    JOIN "FloatLiveParticipant" pb ON cr."participantBId" = pb.id
    WHERE pa."userId" = auth.uid()::text OR pb."userId" = auth.uid()::text
  )
);

-- Policy: Users can insert messages only to their active chat rooms
CREATE POLICY "Users insert own messages"
ON "FloatLiveChatMessage" FOR INSERT
WITH CHECK (
  "senderId" = auth.uid()::text
  AND "chatRoomId" IN (
    SELECT cr.id FROM "FloatLiveChatRoom" cr
    JOIN "FloatLiveParticipant" pa ON cr."participantAId" = pa.id
    JOIN "FloatLiveParticipant" pb ON cr."participantBId" = pb.id
    WHERE (pa."userId" = auth.uid()::text OR pb."userId" = auth.uid()::text)
    AND cr."isActive" = true
  )
);

-- NOTE: Since this app uses custom JWT auth (jose), not Supabase Auth,
-- you may need to handle RLS via API routes instead.
-- If using API-route-only access (server-side Prisma), you can skip RLS
-- and rely on auth middleware validation in your API routes.
```

> **IMPORTANT NOTE:** Since FloatDate uses custom JWT auth with `jose` (NOT Supabase Auth), `auth.uid()` won't work in RLS policies. Instead, **handle all authorization in API route middleware** using the existing `src/lib/auth.ts` pattern. The RLS policies above are provided as reference if you later migrate to Supabase Auth.

### Step 4.5 — Create Database Indexes for Performance
```sql
-- Index for fast lookups of active participants
CREATE INDEX idx_float_live_participant_session_online
ON "FloatLiveParticipant" ("sessionId", "isOnline");

-- Index for fast message queries by chat room
CREATE INDEX idx_float_live_message_chatroom_created
ON "FloatLiveChatMessage" ("chatRoomId", "createdAt");

-- Index for pending reports (admin dashboard)
CREATE INDEX idx_float_live_report_status
ON "FloatLiveReport" ("status") WHERE "status" = 'pending';

-- Index for participant lookup by user
CREATE INDEX idx_float_live_participant_user
ON "FloatLiveParticipant" ("userId");
```

### Step 4.6 — Set Up Supabase Realtime Client (Frontend)
Install the Supabase JS client (add to package.json):
```bash
npm install @supabase/supabase-js
```

Create a Supabase client file:
```typescript
// src/lib/supabase-client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Add to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4.7 — Verify Existing Data Is Intact
After migration, run the row count query from Step 4.1 again and confirm all counts match.

---

## 5. Supabase Realtime Configuration

### How Realtime Chat Works

1. **Message sending:** User types message → API route validates auth & inserts into `FloatLiveChatMessage` via Prisma
2. **Message receiving:** Frontend subscribes to Supabase Realtime channel for the specific `chatRoomId`
3. **Online count:** Subscribe to `FloatLiveParticipant` changes where `isOnline = true`

### Frontend Realtime Subscription Pattern
```typescript
// Example: Subscribe to new messages in a chat room
const channel = supabase
  .channel(`chat-room-${chatRoomId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'FloatLiveChatMessage',
      filter: `chatRoomId=eq.${chatRoomId}`,
    },
    (payload) => {
      // payload.new contains the new message
      addMessageToUI(payload.new);
    }
  )
  .subscribe();

// Cleanup on unmount
return () => {
  supabase.removeChannel(channel);
};
```

### Online Count Subscription
```typescript
const onlineChannel = supabase
  .channel('online-count')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'FloatLiveParticipant',
      filter: `sessionId=eq.${currentSessionId}`,
    },
    () => {
      // Refetch online count when participants change
      fetchOnlineCount();
    }
  )
  .subscribe();
```

---

## 6. Visual Environment & Pixel Art Specifications

### Scene Layout
```
┌─────────────────────────────────────────────────┐
│  [Gender ▼] [Preference ▼] [Intention ▼] [Campus ▼]  │  ← Filters bar (top)
│  🟢 12 people online    [View Transcript] [Exit Date]  │  ← Status bar
├─────────────────────────────────────────────────┤
│                                                         │
│          ╔══════╗                                       │
│     🧍    ║ TABLE ║    🧍                               │  ← Pixel art scene
│   (You)   ║      ║  (Match)                             │
│     🪑    ╚══════╝    🪑                                │
│                                                         │
│   💬 "Hey! Nice to    "Hi there! What      💬          │  ← Speech bubbles
│    meet you!"          campus?"                          │
│                                                         │
├─────────────────────────────────────────────────┤
│  [📎] Type a message...                    [Send ➤]    │  ← Typing bar (bottom)
└─────────────────────────────────────────────────┘
```

### Pixel Art Requirements
- **Resolution:** 320×240 base, scaled up with `image-rendering: pixelated` CSS
- **Color palette:** Limited retro palette (16-32 colors max)
- **Assets to generate (via Nano Banana / Antigravity):**
  - Background: Café/restaurant interior with warm pixel tones
  - Table: Center-positioned wooden table (pixel art)
  - Chairs: Two chairs, one on each side
  - Character sprites: 3 variants (male, female, non-binary)
  - Speech bubble frames: Pixel-styled chat bubbles with tail pointers
  - UI elements: Pixel-styled buttons, filter dropdowns, status indicators
- **Canvas:** Use `<canvas>` element or CSS-positioned `<div>` layers
- **Animations (optional MVP):** Idle character bobbing, blinking cursors

### CSS for Pixel Rendering
```css
.pixel-scene {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  -ms-interpolation-mode: nearest-neighbor;
}
```

---

## 7. Character Gender Logic

| User's Gender | Character Sprite Displayed | Description |
|---|---|---|
| `"male"` | `sprite-male.png` | Masculine pixel character |
| `"female"` | `sprite-female.png` | Feminine pixel character |
| `"nonbinary"` | `sprite-nonbinary.png` | Gender-neutral pixel character — does NOT default to male or female appearance |

### Implementation Rules
1. Pull `gender` from the authenticated user's `User` record (existing field)
2. The **left character** is always the current user
3. The **right character** is the matched partner
4. Sprite selection: `const sprite = `/assets/sprites/sprite-${user.gender}.png``
5. For the matched partner, use their gender from `FloatLiveParticipant.gender`
6. Non-binary sprite must be visually distinct — not a recolor of male or female

---

## 8. UI Components Breakdown

### Component Tree
```
src/app/float-live/
├── page.tsx                    # Main Float Live page (lobby)
├── chat/
│   └── [roomId]/
│       └── page.tsx            # Active chat room
├── components/
│   ├── PixelScene.tsx          # 2D pixel art canvas with table + characters
│   ├── ChatBubble.tsx          # Individual speech bubble (left/right positioning)
│   ├── TypingBar.tsx           # Bottom input bar (WhatsApp-style)
│   ├── FiltersBar.tsx          # Top filters (gender, preference, intention, campus)
│   ├── OnlineCounter.tsx       # "🟢 12 people online"
│   ├── TranscriptView.tsx      # Full-screen WhatsApp-like chat transcript
│   ├── RevealEmailButton.tsx   # Mutual email reveal for blind date
│   ├── ExitDateButton.tsx      # Return to dashboard
│   ├── TermsModal.tsx          # Code of conduct acceptance modal
│   ├── TimeWarning.tsx         # "Just 10 minutes left" banner
│   ├── CharacterSprite.tsx     # Renders correct gender sprite
│   └── ReportButton.tsx        # Report user for abuse
```

---

## 9. Chat Interface Details

### Typing Bar (Bottom)
- Positioned fixed at the bottom of the viewport
- Contains: text input field + send button
- Behavior identical to WhatsApp/ChatGPT input
- Press Enter to send, Shift+Enter for new line
- Max message length: 500 characters
- Input disabled when chat session is inactive or time window has ended

### Speech Bubbles (In Pixel Scene)
- **Current user's messages:** Right side, colored accent (e.g., pixel blue)
- **Partner's messages:** Left side, colored neutral (e.g., pixel gray/white)
- Show only the **last 2-3 messages** as speech bubbles overlaid on the pixel scene
- Older messages accessible via "View Transcript" button

### Transcript View (Full-Screen Toggle)
- **Trigger:** "View Transcript" button at the top
- **Behavior:** Overlays/replaces the pixel scene with a full-screen scrollable chat view
- **Appearance:** WhatsApp-like — messages in sequential order, timestamps, sender alignment
- **Toggle back:** "Back to Scene" button returns to pixel art view
- **All messages** since chat started are shown (fetched from DB)
- Messages are **NOT** deleted during the session

---

## 10. Filters System

### Filter Options
| Filter | Options | Default |
|---|---|---|
| **Gender** (your gender) | Auto-populated from `User.gender` | User's profile gender (read-only display) |
| **Preference** (who you want) | Male, Female, Non-binary, Any | "any" |
| **Intention** | Blind Date, Friendship | "blind_date" |
| **Campus** | Dropdown of campus names (hardcoded list for MVP) | First option |

### Campus List
```typescript
const CAMPUSES = [
  "Waterloo",
  "Brantford",
  "Milton"
] as const;
```

### Filter Matching Logic (Server-Side)
```typescript
function isCompatible(userA: Participant, userB: Participant): boolean {
  // 1. Campus must match
  if (userA.campus !== userB.campus) return false;

  // 2. Intention must match
  if (userA.intention !== userB.intention) return false;

  // 3. Gender preference must be mutual
  const aPrefersB = userA.preference === "any" || userA.preference === userB.gender;
  const bPrefersA = userB.preference === "any" || userB.preference === userA.gender;
  if (!aPrefersB || !bPrefersA) return false;

  return true;
}
```

---

## 11. Matching & Queueing Logic

### Lobby Flow
1. User clicks **"Float Live"** on dashboard
2. **Time check:** Is it between 5:00 PM – 6:00 PM Ontario time?
   - **No:** Show "Float Live opens at 5:00 PM ET daily" with countdown timer
   - **Yes:** Proceed
3. User sees their character in a **blank pixel environment** (no table yet)
4. Filters are displayed at top. User selects preference, intention, campus
5. User sees online count for their filter combination
6. **Terms modal** appears: User must accept code of conduct
7. User clicks **"Start Chat"** → enters matching queue

### Queue & Pairing (Server-Side)
```typescript
// API: POST /api/float-live/find-match
async function findMatch(userId: string, filters: FilterSet) {
  // 1. Get or create today's session
  const session = await getOrCreateTodaySession();

  // 2. Register participant (upsert)
  const participant = await upsertParticipant(userId, session.id, filters);

  // 3. Find a compatible waiting participant
  const match = await prisma.floatLiveParticipant.findFirst({
    where: {
      sessionId: session.id,
      isOnline: true,
      userId: { not: userId },
      // ... apply filter compatibility logic
      chatRoomsAsA: { none: { isActive: true } },
      chatRoomsAsB: { none: { isActive: true } },
    },
  });

  if (!match) {
    return { status: "waiting", message: "Looking for someone..." };
  }

  // 4. Create chat room
  const chatRoom = await prisma.floatLiveChatRoom.create({
    data: {
      sessionId: session.id,
      participantAId: participant.id,
      participantBId: match.id,
      intention: filters.intention,
    },
  });

  return { status: "matched", chatRoomId: chatRoom.id };
}
```

### Polling for Match
- Frontend polls `GET /api/float-live/match-status` every 3 seconds while waiting
- OR use Supabase Realtime subscription on `FloatLiveChatRoom` table

---

## 12. Intention-Based Logic (Blind Date vs Friendship)

### Blind Date Mode (`intention = "blind_date"`)
- **Emails are hidden** by default
- A **"Reveal Email"** button appears at the top of the chat
- Each user can independently click it
- `emailRevealedByA` / `emailRevealedByB` flags update in `FloatLiveChatRoom`
- **Only when BOTH users have clicked** does the email get revealed to both
- UI shows: "You've agreed to reveal" / "Waiting for partner" / "Emails revealed! 📧"

```typescript
// Check if both revealed
const bothRevealed = chatRoom.emailRevealedByA && chatRoom.emailRevealedByB;
if (bothRevealed) {
  // Fetch both users' emails and show in UI
}
```

### Friendship Mode (`intention = "friendship"`)
- **Emails are visible from the start**
- No "Reveal Email" button needed
- Show partner's email in the top status bar

---

## 13. Time-Gated Access (5 PM – 6 PM Ontario Time)

### Time Zone: `America/Toronto` (Eastern Time)

### Implementation
```typescript
// src/lib/float-live-time.ts
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Toronto';
const START_HOUR = 17; // 5:00 PM
const END_HOUR = 18;   // 6:00 PM
const WARNING_MINUTES = 10; // Warn at 5:50 PM

export function isFloatLiveActive(): { active: boolean; minutesLeft: number; startsIn: number } {
  const now = new Date();
  const ontarioTime = toZonedTime(now, TIMEZONE);
  const hour = ontarioTime.getHours();
  const minutes = ontarioTime.getMinutes();

  if (hour >= START_HOUR && hour < END_HOUR) {
    const minutesLeft = (END_HOUR - hour - 1) * 60 + (60 - minutes);
    return { active: true, minutesLeft, startsIn: 0 };
  }

  // Calculate time until next 5 PM
  let startsIn: number;
  if (hour < START_HOUR) {
    startsIn = (START_HOUR - hour - 1) * 60 + (60 - minutes);
  } else {
    startsIn = (24 - hour + START_HOUR - 1) * 60 + (60 - minutes);
  }

  return { active: false, minutesLeft: 0, startsIn };
}

export function shouldShowWarning(): boolean {
  const { active, minutesLeft } = isFloatLiveActive();
  return active && minutesLeft <= WARNING_MINUTES;
}
```

### Warning Message
- At **5:50 PM ET** (10 minutes before end), show a pixel-styled banner:
  - 🕐 **"Just 10 minutes left!"** — with a countdown timer
- At **6:00 PM ET**, automatically:
  1. Disable the typing bar
  2. Show "Float Live has ended for today. See you tomorrow at 5 PM!"
  3. Soft-delete all messages from UI (set `isDeleted = true` for UI, messages stay in DB)
  4. Close all active chat rooms (`isActive = false`, `endedAt = now()`)

### Server-Side Enforcement
**Every API route** for Float Live must validate the time window:
```typescript
const { active } = isFloatLiveActive();
if (!active) {
  return NextResponse.json(
    { error: "Float Live is only available 5-6 PM ET" },
    { status: 403 }
  );
}
```

---

## 14. Code of Conduct & Terms Acceptance

### Terms Modal Content
Before entering the chat, display a modal:

```
╔══════════════════════════════════════════╗
║       🎮 Welcome to Float Live! 🎮       ║
╠══════════════════════════════════════════╣
║                                          ║
║  Before you start chatting, please       ║
║  agree to the following:                 ║
║                                          ║
║  ✅ Be respectful and kind               ║
║  ✅ No harassment, hate speech, or spam   ║
║  ✅ No sharing of explicit content        ║
║  ✅ No solicitation or advertising        ║
║                                          ║
║  ⚠️ Violations may result in:            ║
║    • Immediate chat termination           ║
║    • Permanent account suspension         ║
║    • Reports logged for admin review      ║
║                                          ║
║  All conversations are monitored and     ║
║  stored for safety purposes.             ║
║                                          ║
║  [  I Agree & Enter Chat  ]             ║
║  [       Cancel            ]             ║
╚══════════════════════════════════════════╝
```

- `acceptedTerms` flag set to `true` on `FloatLiveParticipant` record
- Must accept EACH session (not a one-time thing)

---

## 15. Abuse Reporting & Admin Dashboard

### Report Flow (User Side)
1. User clicks **"Report"** button (⚠️ icon) in the chat
2. Modal appears with reason selection:
   - Harassment
   - Spam
   - Inappropriate content
   - Other (with text field)
3. Report saved to `FloatLiveReport` table
4. Chat continues (not immediately terminated)
5. User can also click "Exit Date" to leave

### Admin Dashboard Extension
Add a new page: `src/app/admin/reports/page.tsx`

**Admin Report Review UI:**
```
┌──────────────────────────────────────────────┐
│  FloatDate Admin — Abuse Reports             │
├──────────────────────────────────────────────┤
│  Filter: [All ▼] [Pending ▼] [Date Range]   │
├──────────────────────────────────────────────┤
│  #  | Reporter    | Reported   | Reason     │
│  1  | user@a.com  | user@b.com | Harassment │ [Review]
│  2  | user@c.com  | user@d.com | Spam       │ [Review]
├──────────────────────────────────────────────┤
│  When "Review" is clicked:                   │
│  ┌────────────────────────────────────────┐  │
│  │  Full Chat Transcript                  │  │
│  │  [All messages in this chat room]      │  │
│  │  ...                                   │  │
│  │  Admin Actions:                        │  │
│  │  [ Dismiss ] [ Warn User ] [ Ban User ]│  │
│  │  Admin Notes: [________________]       │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Admin API Endpoints
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/float-live/reports` | List all reports (filterable by status) |
| `GET` | `/api/admin/float-live/reports/[id]` | Get report with full chat transcript |
| `PATCH` | `/api/admin/float-live/reports/[id]` | Update report status + admin notes |

---

## 16. Chat Persistence & Soft Delete

### During Active Session
- Messages are stored in `FloatLiveChatMessage` in real-time
- Users see all messages in the UI

### After Session Ends (6 PM ET or user exits)
- **UI side:** Messages are no longer displayed. The chat view shows "Session ended"
- **Database side:** Messages are **NEVER deleted**. They remain in `FloatLiveChatMessage`
- `FloatLiveChatMessage.isDeleted` is set to `true` — this flag controls UI visibility only
- `FloatLiveChatRoom.isActive` is set to `false`, `endedAt` is set

### Why Messages Are Kept
1. **Admin abuse review** — if a user is reported, admin can read the full transcript
2. **Legal compliance** — logs for investigation
3. **User cannot un-report** — once reported, transcript is permanently preserved

### Cleanup Policy (Future — NOT for MVP)
- Consider a cron job to hard-delete messages older than 90 days where no report exists
- Never delete messages associated with active/pending reports

---

## 17. API Endpoints (New)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/float-live/status` | Check if Float Live is active (time check) |
| `GET` | `/api/float-live/session` | Get or create today's session |
| `POST` | `/api/float-live/join` | Join lobby (register participant with filters) |
| `POST` | `/api/float-live/find-match` | Find a compatible partner |
| `GET` | `/api/float-live/match-status` | Check if matched (poll) |
| `GET` | `/api/float-live/online-count` | Get online count (optionally filtered) |
| `POST` | `/api/float-live/chat/send` | Send a chat message |
| `GET` | `/api/float-live/chat/[roomId]/messages` | Get all messages for a room |
| `POST` | `/api/float-live/chat/[roomId]/reveal-email` | Toggle email reveal |
| `POST` | `/api/float-live/chat/[roomId]/report` | Report a user |
| `POST` | `/api/float-live/chat/[roomId]/exit` | Exit the chat room |
| `POST` | `/api/float-live/leave` | Leave Float Live entirely (go offline) |
| `GET` | `/api/admin/float-live/reports` | Admin: List reports |
| `GET` | `/api/admin/float-live/reports/[id]` | Admin: Get report + transcript |
| `PATCH` | `/api/admin/float-live/reports/[id]` | Admin: Update report status |

---

## 18. Frontend Routes

| Route | Page | Description |
|---|---|---|
| `/float-live` | Lobby | Filters, online count, "Start Chat" button, time gate |
| `/float-live/chat/[roomId]` | Active Chat | Pixel scene + typing bar + transcript toggle |
| `/admin/reports` | Admin Reports | Abuse report management dashboard |

### Dashboard Integration
In the existing `src/app/dashboard/` page, add a **"Float Live"** button:
```tsx
<Link href="/float-live">
  <button className="pixel-button animate-pulse">
    🎮 Float Live
    <span className="text-xs">5-6 PM ET Daily</span>
  </button>
</Link>
```

---

## 19. Implementation Workflow (Step-by-Step for Developer)

### Phase 1: Database & Backend Foundation (~4h)
1. **Add new Prisma models** to `prisma/schema.prisma` (Section 3)
2. **Run migration:** `npx prisma migrate dev --name add_float_live_tables`
3. **Verify** existing data is unchanged (Section 4.1)
4. **Install** `@supabase/supabase-js` and create client (Section 4.6)
5. **Create** `src/lib/float-live-time.ts` (Section 13)
6. **Enable** Supabase Realtime for new tables (Section 4.3)
7. **Run SQL** to create indexes (Section 4.5)

### Phase 2: API Routes (~5h)
1. Build `/api/float-live/status` — time check
2. Build `/api/float-live/session` — get/create session
3. Build `/api/float-live/join` — register participant
4. Build `/api/float-live/find-match` — matching logic
5. Build `/api/float-live/match-status` — polling endpoint
6. Build `/api/float-live/online-count` — count query
7. Build `/api/float-live/chat/send` — message insert
8. Build `/api/float-live/chat/[roomId]/messages` — message fetch
9. Build `/api/float-live/chat/[roomId]/reveal-email` — email reveal toggle
10. Build `/api/float-live/chat/[roomId]/report` — report creation
11. Build `/api/float-live/chat/[roomId]/exit` — soft close room

### Phase 3: Pixel Art Assets (~3h)
1. Use Nano Banana / Antigravity to generate all sprites
2. Generate: background, table, chairs, 3 character variants, speech bubble frames
3. Place assets in `public/assets/float-live/`
4. Create CSS for pixel rendering

### Phase 4: Frontend Components (~6h)
1. Build `PixelScene.tsx` — scene composition
2. Build `CharacterSprite.tsx` — gender-based sprite selection
3. Build `TypingBar.tsx` — message input
4. Build `ChatBubble.tsx` — speech bubbles on scene
5. Build `FiltersBar.tsx` — 4 filter dropdowns
6. Build `OnlineCounter.tsx` — live count with Supabase subscription
7. Build `TranscriptView.tsx` — full-screen chat toggle
8. Build `TermsModal.tsx` — code of conduct
9. Build `RevealEmailButton.tsx` — mutual reveal logic
10. Build `TimeWarning.tsx` — countdown warning banner
11. Build `ReportButton.tsx` — report modal
12. Build `ExitDateButton.tsx` — return to dashboard

### Phase 5: Page Assembly (~3h)
1. Build `/float-live/page.tsx` — lobby page
2. Build `/float-live/chat/[roomId]/page.tsx` — active chat page
3. Add "Float Live" button to dashboard
4. Wire up Supabase Realtime subscriptions
5. Implement match polling or realtime listener

### Phase 6: Admin Dashboard Extension (~2h)
1. Build `/admin/reports/page.tsx` — report list
2. Build report detail view with full transcript
3. Add admin actions (dismiss, warn, ban)

### Phase 7: Testing & Polish (~3h)
1. Test time-gating logic
2. Test filter matching
3. Test email reveal flow (both modes)
4. Test reporting flow
5. Test chat persistence after session ends
6. Verify existing app features still work
7. Mobile responsiveness check

---

## 20. Security Considerations

1. **Auth on every Float Live API route** — use existing `src/lib/auth.ts` to verify JWT
2. **Rate limit message sending** — max 1 message per second per user
3. **Sanitize message content** — prevent XSS (escape HTML in messages)
4. **Server-side time validation** — never trust client time for the 5-6 PM window
5. **Server-side filter validation** — validate all filter values against allowed enums
6. **Don't expose partner's email** in any API response unless both have revealed (blind date)
7. **Don't expose User IDs** to the frontend — use participant IDs instead
8. **Admin endpoints** must validate admin auth (existing `src/lib/admin-auth.ts`)
9. **Message length limit** — enforce 500 char max server-side
10. **Prevent self-matching** — always exclude current user from match candidates

---

## 21. Testing Checklist

- [ ] **Time gate:** Visit Float Live outside 5-6 PM ET → shows countdown
- [ ] **Time gate:** Visit during 5-6 PM ET → lobby loads correctly
- [ ] **Filters:** Apply filters → online count updates
- [ ] **Terms:** Terms modal appears before entering chat
- [ ] **Matching:** Two users with compatible filters → get matched
- [ ] **Matching:** Incompatible filters → "Looking for someone..." state
- [ ] **Chat:** Send message → appears in partner's view in real-time
- [ ] **Bubbles:** Messages appear on correct sides (left = partner, right = you)
- [ ] **Transcript:** Toggle transcript view → full chat history shown
- [ ] **Blind date:** Emails hidden by default → both click reveal → emails shown
- [ ] **Friendship:** Emails visible from the start
- [ ] **Warning:** At 5:50 PM → "Just 10 minutes left" banner appears
- [ ] **Session end:** At 6:00 PM → chat disabled, "Session ended" message
- [ ] **Report:** Report user → report saved in DB → appears in admin dashboard
- [ ] **Admin:** Admin can view full transcript of reported chat
- [ ] **Persistence:** After session, messages gone from UI but present in DB
- [ ] **Data safety:** After migration, all existing User/Question/Answer/Match data intact
- [ ] **Gender sprites:** Male, female, and non-binary characters display correctly
- [ ] **Mobile:** Full flow works on mobile browser
- [ ] **Existing features:** Dashboard, questions, opt-in, matching → all still work

---

## Environment Variables to Add

```env
# Add to .env.local (existing vars stay untouched)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## New Dependencies to Install

```bash
npm install @supabase/supabase-js
```

> The existing `date-fns` and `date-fns-tz` packages (already in package.json) are sufficient for time zone handling.

---

## File Summary — What to Create vs Modify

### ✅ CREATE (New Files)
- `src/app/float-live/page.tsx`
- `src/app/float-live/chat/[roomId]/page.tsx`
- `src/app/float-live/components/*.tsx` (12 components)
- `src/lib/float-live-time.ts`
- `src/lib/supabase-client.ts`
- `src/app/api/float-live/**/*.ts` (11 API routes)
- `src/app/admin/reports/page.tsx`
- `src/app/api/admin/float-live/**/*.ts` (3 API routes)
- `public/assets/float-live/*.png` (pixel art assets)

### ✏️ MODIFY (Existing Files — Minimal Changes)
- `prisma/schema.prisma` — ADD new models at the bottom + add relation to User
- `src/app/dashboard/page.tsx` — ADD "Float Live" button
- `package.json` — ADD `@supabase/supabase-js` dependency
- `.env.local` — ADD Supabase URL + anon key

### 🚫 DO NOT MODIFY
- Existing database tables (User, Question, Answer, etc.)
- `Rules.md` (existing build plan)
- `src/lib/matching.ts` (existing matching algorithm)
- `src/lib/auth.ts` (use as-is for authentication)
- `src/lib/db.ts` (use existing Prisma client)
- Any existing API routes
- Any existing pages (except dashboard for the button)