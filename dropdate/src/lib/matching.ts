import { prisma } from "./db";

// ---------- Types ----------
type DimensionVec = Record<string, number>;

interface UserForMatching {
    id: string;
    gender: string;
    genderPref: string;
    city: string;
    createdAt: Date;
}

// ---------- Constants ----------
const DIMENSION_WEIGHTS: DimensionVec = {
    attachment: 2.0,
    values: 2.0,
    lifestyle: 1.5,
    communication: 1.5,
    interests: 1.0,
};

const DIMENSIONS = Object.keys(DIMENSION_WEIGHTS);

const EXPLANATION_LABELS: Record<string, string> = {
    attachment: "similar emotional openness",
    values: "aligned core values",
    lifestyle: "compatible lifestyle preferences",
    communication: "matching communication styles",
    interests: "shared interests",
};

// ---------- Normalization ----------
export function normalizeAnswer(
    value: unknown,
    type: string,
    options: string[]
): number {
    switch (type) {
        case "likert": {
            const num = Number(value);
            if (isNaN(num)) return 0.5;
            // Likert value is 1-indexed from QuestionCard (1 to N)
            return (num - 1) / Math.max(options.length - 1, 1);
        }
        case "binary": {
            // value is the option string, e.g. "Yes" / "No"
            if (typeof value === "string") {
                const idx = options.indexOf(value);
                return idx >= 0 ? idx / Math.max(options.length - 1, 1) : 0.5;
            }
            return value ? 1 : 0;
        }
        case "multiple_choice": {
            if (typeof value === "string") {
                const idx = options.indexOf(value);
                return idx >= 0 ? idx / Math.max(options.length - 1, 1) : 0.5;
            }
            return 0.5;
        }
        case "ranking": {
            // For ranking, use Spearman-style: compare to default order
            // MVP: return 0.5 as placeholder since ranking comparison is complex
            return 0.5;
        }
        default:
            return 0.5;
    }
}

// ---------- Vector Construction ----------
export function buildVector(
    answers: { questionId: string; value: unknown }[],
    questions: {
        id: string;
        weightDimension: string;
        weight: number;
        type: string;
        options: unknown;
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
            const opts = Array.isArray(q.options) ? q.options : [];
            wSum += q.weight * normalizeAnswer(a.value, q.type, opts as string[]);
        }

        vec[dim] = totalW > 0 ? wSum / totalW : 0.5;
    }

    return vec;
}

// ---------- Similarity ----------
export function similarity(a: DimensionVec, b: DimensionVec): number {
    const totalW = DIMENSIONS.reduce((s, d) => s + DIMENSION_WEIGHTS[d], 0);
    const dist = DIMENSIONS.reduce(
        (s, d) => s + DIMENSION_WEIGHTS[d] * Math.abs((a[d] ?? 0.5) - (b[d] ?? 0.5)),
        0
    );
    return 1 - dist / totalW;
}

// ---------- Explanation ----------
export function explain(a: DimensionVec, b: DimensionVec): string {
    const sorted = DIMENSIONS.slice().sort(
        (x, y) =>
            Math.abs((a[x] ?? 0.5) - (b[x] ?? 0.5)) -
            Math.abs((a[y] ?? 0.5) - (b[y] ?? 0.5))
    );
    const top2 = sorted.slice(0, 2);
    return `You were matched because of your ${EXPLANATION_LABELS[top2[0]]} and ${EXPLANATION_LABELS[top2[1]]}.`;
}

// ---------- Hard Filters ----------
function passesHardFilters(a: UserForMatching, b: UserForMatching): boolean {
    // Mutual gender preference
    const aAcceptsB =
        a.genderPref === "any" || a.genderPref === b.gender;
    const bAcceptsA =
        b.genderPref === "any" || b.genderPref === a.gender;

    if (!aAcceptsB || !bAcceptsA) return false;

    // Same city
    if (a.city.toLowerCase() !== b.city.toLowerCase()) return false;

    return true;
}

// ---------- Main Matching Pipeline ----------
export async function runWeeklyMatching(weekStart: Date) {
    // 1. Get all opted-in users for this week who completed setup
    const optIns = await prisma.weeklyOptIn.findMany({
        where: { weekStart },
        include: {
            user: {
                select: {
                    id: true,
                    gender: true,
                    genderPref: true,
                    city: true,
                    createdAt: true,
                    completedSetup: true,
                },
            },
        },
    });

    const users = optIns
        .filter((o) => o.user.completedSetup)
        .map((o) => o.user);

    // 2. Get all past match pairs to avoid rematching
    const allMatches = await prisma.match.findMany({
        select: { userAId: true, userBId: true },
    });
    const pastPairs = new Set(
        allMatches.flatMap((m) => [`${m.userAId}-${m.userBId}`, `${m.userBId}-${m.userAId}`])
    );

    // 3. Build vectors for all users
    const questions = await prisma.question.findMany();
    const vectors: Record<string, DimensionVec> = {};

    for (const user of users) {
        const answers = await prisma.answer.findMany({
            where: { userId: user.id },
            select: { questionId: true, value: true },
        });
        vectors[user.id] = buildVector(answers, questions);
    }

    // 4. Sort by signup date (older first for fairness)
    const sortedUsers = users.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    // 5. Greedy matching
    const matchedIds = new Set<string>();
    const matches: {
        userAId: string;
        userBId: string;
        similarityScore: number;
        explanation: string;
        weekStart: Date;
    }[] = [];

    for (const user of sortedUsers) {
        if (matchedIds.has(user.id)) continue;

        const candidates = sortedUsers.filter(
            (c) =>
                c.id !== user.id &&
                !matchedIds.has(c.id) &&
                passesHardFilters(user, c) &&
                !pastPairs.has(`${user.id}-${c.id}`)
        );

        if (candidates.length === 0) continue;

        const scored = candidates.map((c) => ({
            candidate: c,
            score: similarity(vectors[user.id], vectors[c.id]),
        }));
        scored.sort((a, b) => b.score - a.score);

        const best = scored[0];
        const explanationStr = explain(
            vectors[user.id],
            vectors[best.candidate.id]
        );

        matches.push({
            userAId: user.id,
            userBId: best.candidate.id,
            similarityScore: best.score,
            explanation: explanationStr,
            weekStart,
        });

        matchedIds.add(user.id);
        matchedIds.add(best.candidate.id);
    }

    // 6. Save matches to DB
    for (const match of matches) {
        await prisma.match.create({
            data: match,
        });
    }

    return {
        matched: matches.length * 2,
        unmatched: users.length - matches.length * 2,
        matches,
    };
}
