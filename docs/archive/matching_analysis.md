# Matching Algorithm Analysis & Improvement Ideas

You have **two separate matching systems**. Here's a deep-dive into each, their issues, and what we can improve.

---

## 1. Float Live — Real-Time Matching

> [find-match/route.ts](file:///c:/Users/ranji/OneDrive/Documents/GitHub/Not-decided-yet/src/app/api/float-live/find-match/route.ts) + [match-status/route.ts](file:///c:/Users/ranji/OneDrive/Documents/GitHub/Not-decided-yet/src/app/api/float-live/match-status/route.ts)

### How It Works

1. Client polls `POST /find-match` every **3 seconds** while searching
2. Server checks if user already has an active chat room → returns it
3. Queries all online, unmatched participants in the same session
4. Runs [isCompatible()](file:///c:/Users/ranji/OneDrive/Documents/GitHub/Not-decided-yet/src/app/api/float-live/find-match/route.ts#6-20) — checks **campus**, **intention**, and **mutual gender preference**
5. Returns the **first** compatible candidate found (`.find()` — not the *best*)
6. Creates a chat room (with race-condition handling for P2002 unique constraint)

### Current Issues & Risks

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | **First-match, not best-match** | 🟡 Medium | `candidates.find()` returns the first compatible user from the DB query order, not the person with the highest compatibility. Two users who are great matches could end up with mediocre partners. |
| 2 | **Race condition → double matching** | 🔴 High | Both User A and User B poll simultaneously. Both see each other as "available." Both try to create a room. The P2002 catch helps, but there's a window where User A matches with User C while User B also matches with User C — because there's **no atomic lock** on participant availability. |
| 3 | **No re-match prevention** | 🟡 Medium | Users who previously chatted in the same session can get re-matched after a room is deactivated. The code even has logic to reactivate old rooms, which means users could cycle through the same person repeatedly. |
| 4 | **Polling overhead** | 🟡 Medium | Every 3 seconds, each searching user fires 2 HTTP requests (find-match + match-status). With 50 users searching, that's ~33 requests/sec. This creates unnecessary DB load. |
| 5 | **No questionnaire data used** | 🟡 Medium | Float Live matching is purely filter-based (campus/intention/preference). It doesn't leverage the rich questionnaire data from [lib/matching.ts](file:///c:/Users/ranji/OneDrive/Documents/GitHub/Not-decided-yet/src/lib/matching.ts) at all. |
| 6 | **No timeout / stale participant cleanup** | 🟢 Low | If a user closes their browser without leaving properly, they stay `isOnline: true` indefinitely and block themselves from future sessions. |

### Improvement Ideas

#### A. Use similarity scoring for Float Live (leverage questionnaire data)
Instead of `.find()` (first match), compute compatibility scores from the weekly questionnaire vectors and pick the best available match. This would make Float Live matches significantly more meaningful.

#### B. Replace polling with Supabase Realtime
You already use Supabase. Instead of 3-second polling, use Realtime subscriptions on the `FloatLiveChatRoom` table. When a room is created involving a user, their client gets notified instantly. This eliminates ~90% of HTTP requests.

#### C. Server-side match queue with atomic pairing
Instead of each client independently trying to pair:
- When a user clicks "Start Chat," add them to a **match queue** (a DB table or in-memory list)
- A background job (or the first poll) atomically pairs the top two compatible users from the queue using a DB transaction with row-level locking
- This completely eliminates the race condition

#### D. Cooldown / re-match prevention within session
Track which pairs have already chatted in a session and exclude them from future matching (the same way the weekly system uses `pastPairs`).

#### E. Stale participant heartbeat
Add a `lastSeen` timestamp updated on each poll. Mark participants as offline if no heartbeat in 15+ seconds.

---

## 2. Weekly Batch Matching

> [matching.ts](file:///c:/Users/ranji/OneDrive/Documents/GitHub/Not-decided-yet/src/lib/matching.ts) + [run-matching/route.ts](file:///c:/Users/ranji/OneDrive/Documents/GitHub/Not-decided-yet/src/app/api/admin/run-matching/route.ts)

### How It Works

1. Triggered by cron (Wednesday 9 PM ET) via `run-matching` endpoint
2. Fetches all opted-in users with completed setup for the week
3. Loads all past matches to avoid re-matching
4. Builds a **5-dimension vector** per user from questionnaire answers:
   - `attachment` (weight 2.0), `values` (2.0), `lifestyle` (1.5), `communication` (1.5), `interests` (1.0)
5. Prioritizes users who opted in last week but weren't matched (carry-forward)
6. **Greedy algorithm**: iterate sorted users, for each unmatched user find the highest-scoring compatible candidate
7. Saves matches + sends match/no-match emails

### Current Issues & Risks

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | **Greedy ≠ Optimal** | 🟡 Medium | The greedy approach processes users in order and picks each user's best available partner. This can produce sub-optimal global pairings. User #1 might "steal" User #2's only compatible match when User #1 had many other good options. |
| 2 | **Ranking normalization is a placeholder** | 🔴 High | [normalizeAnswer()](file:///c:/Users/ranji/OneDrive/Documents/GitHub/Not-decided-yet/src/lib/matching.ts#219-256) for `ranking` type returns a hardcoded `0.5`. This means **all ranking questions contribute zero signal** — they're dead weight in the matching. |
| 3 | **Similarity metric is Manhattan distance, not cosine** | 🟢 Low | Using weighted absolute difference (L1 distance). This works, but cosine similarity or Pearson correlation might capture compatibility patterns better, especially when users have different response calibrations. |
| 4 | **N+1 query pattern** | 🟡 Medium | Line 497–504: answers are fetched per user in a loop (`for (const user of users)` → `prisma.answer.findMany`). With 200 users, that's 200 individual DB queries. Should be one bulk query. |
| 5 | **`users.sort()` mutates the source array** | 🟢 Low | Line 532: `users.sort()` mutates the original array in-place. Not a bug per se since the array isn't reused, but it's a code smell. |
| 6 | **No minimum similarity threshold** | 🟡 Medium | A user is matched to their "best" candidate even if similarity is 0.1 (essentially random). Users receive low-quality matches rather than a "no match this week" notification. |
| 7 | **`scenario` type not handled in [normalizeAnswer](file:///c:/Users/ranji/OneDrive/Documents/GitHub/Not-decided-yet/src/lib/matching.ts#219-256)** | 🟡 Medium | [explainDetailed()](file:///c:/Users/ranji/OneDrive/Documents/GitHub/Not-decided-yet/src/lib/matching.ts#318-444) checks for `question.type === "scenario"` but [normalizeAnswer()](file:///c:/Users/ranji/OneDrive/Documents/GitHub/Not-decided-yet/src/lib/matching.ts#219-256) has no `scenario` case — it falls through to `default: return 0.5`. Scenario questions contribute zero to vectors. |
| 8 | **Serial match creation** | 🟢 Low | Line 591–595: matches are saved one at a time. Could use `prisma.$transaction` with `createMany` for atomicity and speed. |

### Improvement Ideas

#### A. Implement ranking normalization (fix the placeholder)
Use Spearman rank correlation or a simplified version:
```
// Compare two rankings using normalized displacement
function normalizeRanking(userRanking: string[], referenceOrder: string[]): number {
    let displacement = 0;
    for (let i = 0; i < userRanking.length; i++) {
        const refIdx = referenceOrder.indexOf(userRanking[i]);
        displacement += Math.abs(i - refIdx);
    }
    const maxDisplacement = userRanking.length * (userRanking.length - 1) / 2;
    return 1 - displacement / maxDisplacement;
}
```

#### B. Add a minimum similarity threshold
Only create a match if `similarityScore >= 0.4` (or whatever threshold makes sense). Users below threshold get the "no match" email — better than a bad match.

#### C. Upgrade from greedy to stable matching
Implement the **Gale-Shapley stable matching algorithm**:
1. Each user ranks all compatible candidates by similarity score
2. Run the proposal/rejection cycle to find a stable pairing
3. Result: no two unmatched users would prefer each other over their assigned partners

This is the gold standard for these types of 1:1 matching problems and would meaningfully improve match quality.

#### D. Handle scenario questions properly
Add a `scenario` case to [normalizeAnswer()](file:///c:/Users/ranji/OneDrive/Documents/GitHub/Not-decided-yet/src/lib/matching.ts#219-256) similar to `multiple_choice`, so these questions actually contribute to the dimension vectors.

#### E. Bulk-fetch answers
Replace the N+1 loop with:
```typescript
const allAnswersRaw = await prisma.answer.findMany({
    where: { userId: { in: users.map(u => u.id) } },
    select: { userId: true, questionId: true, value: true },
});
// Group by userId
```

#### F. Add match quality analytics
Track similarity score distributions over time. Are matches improving? What's the average score? How many users fall below threshold? This data would guide future tuning of dimension weights.

---

## Summary: Priority Ranking

| Priority | Change | Impact | Effort |
|----------|--------|--------|--------|
| 🔴 **1** | Fix ranking normalization (placeholder `0.5`) | High — unlocks dead questions | Low |
| 🔴 **2** | Fix scenario type in [normalizeAnswer](file:///c:/Users/ranji/OneDrive/Documents/GitHub/Not-decided-yet/src/lib/matching.ts#219-256) | High — unlocks dead questions | Low |
| 🟡 **3** | Add minimum similarity threshold | Medium — prevents bad matches | Low |
| 🟡 **4** | Fix N+1 answer queries | Medium — performance | Low |
| 🟡 **5** | Add re-match prevention to Float Live | Medium — user experience | Low |
| 🟡 **6** | Use similarity data in Float Live matching | Medium — match quality | Medium |
| 🟡 **7** | Upgrade to Gale-Shapley stable matching | Medium — match quality | Medium |
| 🟢 **8** | Replace polling with Supabase Realtime | Low — infra optimization | Medium |
| 🟢 **9** | Atomic match queue for Float Live | Low — edge case fix | High |
| 🟢 **10** | Match quality analytics dashboard | Low — observability | Medium |
