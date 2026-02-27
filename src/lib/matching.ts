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

interface Answer {
    questionId: string;
    value: unknown;
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

// Question-level insights for generating specific match reasons
type QuestionInsight = {
    high?: string; // When both users score high/agree
    low?: string; // When both users score low/disagree
    same?: string; // When both users pick the same option (for scenarios/choices)
    dimension: string; // Fallback dimension label
};

const QUESTION_INSIGHTS: Record<string, QuestionInsight> = {
    // Big Five personality traits
    bf_01: {
        low: "Neither of you stresses easily about relationship issues",
        dimension: "attachment",
    },
    bf_02: {
        high: "You both value organization and follow through on commitments",
        dimension: "lifestyle",
    },
    bf_03_rev: {
        low: "You both avoid holding grudges and handle frustration constructively",
        dimension: "communication",
    },
    bf_06_scen: {
        same: "You'd both assume the best when your partner is late without worrying",
        dimension: "attachment",
    },
    // Attachment style
    att_01: {
        low: "Neither of you worries about your partner leaving or not loving you enough",
        dimension: "attachment",
    },
    att_02: {
        low: "You both feel comfortable opening up and relying on romantic partners",
        dimension: "attachment",
    },
    att_03: {
        high: "You both find it easy to get close to others and depend on them",
        dimension: "attachment",
    },
    att_05_beh: {
        same: "You both handle stress in similar ways when it comes to seeking support",
        dimension: "attachment",
    },
    att_06_scen: {
        same: "You'd both give space after a disagreement without worry",
        dimension: "attachment",
    },
    // Conflict resolution
    conf_02_scen: {
        same: "You both handle financial disagreements in similar ways",
        dimension: "communication",
    },
    conf_04_rev: {
        high: "You both find it easy to let go of negative feelings after a fight is resolved",
        dimension: "communication",
    },
    // Emotional regulation
    emo_01: {
        high: "You both take time to process emotions before speaking or acting",
        dimension: "communication",
    },
    emo_03_scen: {
        same: "You both handle stress and frustration in similar ways",
        dimension: "communication",
    },
    emo_04: {
        high: "You both bounce back quickly after frustrating events",
        dimension: "communication",
    },
    emo_05_rev: {
        low: "You both feel in control of your emotions",
        dimension: "communication",
    },
    // Communication style
    comm_02_scen: {
        same: "You both communicate annoyances in similar ways",
        dimension: "communication",
    },
    comm_03_beh: {
        high: "You both regularly ask about each other's day and actively listen",
        dimension: "communication",
    },
    comm_04_rev: {
        low: "You both find it easy to express your needs clearly",
        dimension: "communication",
    },
    // Core values
    val_02: {
        same: "You both prioritize similar things in life right now",
        dimension: "values",
    },
    val_03_scen: {
        same: "You both approach career vs family trade-offs similarly",
        dimension: "values",
    },
    // Relationship beliefs
    bel_02: {
        high: "You both believe successful relationships evolve through hard work and compromise",
        dimension: "values",
    },
    bel_03_scen: {
        same: "You both view relationship challenges through a similar lens",
        dimension: "values",
    },
    bel_04_rev: {
        low: "You both believe relationships can require effort early on and still be meant to be",
        dimension: "values",
    },
    // Long-term goals
    goals_01_filter: {
        same: "You both have aligned views on having children",
        dimension: "values",
    },
    goals_02_filter: {
        same: "You both have similar relationship trajectory goals",
        dimension: "values",
    },
    goals_04_scen: {
        same: "You both approach financial windfalls in similar ways",
        dimension: "values",
    },
    goals_05: {
        high: "You both would be willing to relocate for your partner's dream job",
        dimension: "values",
    },
    // Socioeconomic preferences
    socio_02: {
        same: "You both approach personal finances in similar ways",
        dimension: "lifestyle",
    },
    socio_05_scen: {
        same: "You both prefer similar travel styles",
        dimension: "lifestyle",
    },
    // Lifestyle habits
    habits_04: {
        same: "You both enjoy similar weekend activities",
        dimension: "interests",
    },
    habits_06_beh: {
        same: "You both have similar approaches to alcohol consumption",
        dimension: "lifestyle",
    },
    // Time orientation
    time_02: {
        high: "You both heavily weigh long-term impacts when making major decisions",
        dimension: "lifestyle",
    },
    // Social energy
    social_01: {
        high: "You both feel energized after large social events",
        dimension: "interests",
    },
    social_04: {
        same: "You both have similar openness to dating someone with different social energy needs",
        dimension: "interests",
    },
    // Deal-breakers
    dealbreak_01_filter: {
        same: "You both have compatible views on pets",
        dimension: "values",
    },
    dealbreak_02: {
        same: "You both have similar geographic distance preferences",
        dimension: "values",
    },
    dealbreak_04_scen: {
        same: "You both handle ex-partner friendships in similar ways",
        dimension: "values",
    },
    // Attraction style
    attr_03_scen: {
        same: "You both weigh physical attraction and conversational chemistry similarly",
        dimension: "interests",
    },
    attr_04: {
        same: "You both find similar things create the strongest initial chemistry",
        dimension: "interests",
    },
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

// ---------- Detailed Explanation ----------
interface Question {
    id: string;
    weightDimension: string;
    weight: number;
    type: string;
    options: unknown;
}

export function explainDetailed(
    answersA: Answer[],
    answersB: Answer[],
    questions: Question[],
    vecA: DimensionVec,
    vecB: DimensionVec
): string[] {
    const reasons: string[] = [];
    const usedDimensions = new Set<string>();
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Score each question by answer closeness
    const scoredQuestions: Array<{
        questionId: string;
        question: Question;
        score: number;
        insight: string | null;
    }> = [];

    for (const question of questions) {
        const answerA = answersA.find((a) => a.questionId === question.id);
        const answerB = answersB.find((a) => a.questionId === question.id);

        if (!answerA || !answerB) continue;

        const insight = QUESTION_INSIGHTS[question.id];
        if (!insight) continue; // Skip questions without insights

        let closeness = 0;
        let insightText: string | null = null;

        const options = Array.isArray(question.options) ? (question.options as string[]) : [];

        if (question.type === "likert" || question.type === "binary") {
            const normA = normalizeAnswer(answerA.value, question.type, options);
            const normB = normalizeAnswer(answerB.value, question.type, options);
            closeness = 1 - Math.abs(normA - normB);

            // For high closeness, use appropriate insight
            if (closeness > 0.7) {
                if (normA > 0.6 && insight.high) {
                    insightText = insight.high;
                } else if (normA < 0.4 && insight.low) {
                    insightText = insight.low;
                }
            }
        } else if (question.type === "multiple_choice" || question.type === "scenario") {
            // Check if both picked the same option
            if (typeof answerA.value === "string" && typeof answerB.value === "string") {
                if (answerA.value === answerB.value) {
                    closeness = 1.0;
                    if (insight.same) {
                        insightText = insight.same;
                    }
                }
            }
        } else if (question.type === "ranking") {
            // For ranking, check if arrays are similar
            if (Array.isArray(answerA.value) && Array.isArray(answerB.value)) {
                const arrA = answerA.value as string[];
                const arrB = answerB.value as string[];
                if (arrA.length === arrB.length) {
                    let matches = 0;
                    for (let i = 0; i < arrA.length; i++) {
                        if (arrA[i] === arrB[i]) matches++;
                    }
                    closeness = matches / arrA.length;
                    if (closeness > 0.7 && insight.same) {
                        insightText = insight.same;
                    }
                }
            }
        }

        if (insightText && closeness > 0.5) {
            scoredQuestions.push({
                questionId: question.id,
                question,
                score: closeness * question.weight,
                insight: insightText,
            });
        }
    }

    // Sort by score (highest first) and pick top ones ensuring dimension coverage
    scoredQuestions.sort((a, b) => b.score - a.score);

    // First pass: pick top insights ensuring we cover multiple dimensions
    for (const item of scoredQuestions) {
        if (reasons.length >= 6) break;

        const dim = item.question.weightDimension;
        // Prefer questions from dimensions we haven't covered yet
        if (!usedDimensions.has(dim) || reasons.length < 3) {
            reasons.push(item.insight!);
            usedDimensions.add(dim);
        }
    }

    // Second pass: fill remaining slots with highest scoring insights
    for (const item of scoredQuestions) {
        if (reasons.length >= 6) break;
        if (!reasons.includes(item.insight!)) {
            reasons.push(item.insight!);
        }
    }

    // Fallback: if we don't have enough reasons, use dimension-level labels
    if (reasons.length < 4) {
        const sortedDims = DIMENSIONS.slice().sort(
            (x, y) =>
                Math.abs((vecA[x] ?? 0.5) - (vecB[x] ?? 0.5)) -
                Math.abs((vecA[y] ?? 0.5) - (vecB[y] ?? 0.5))
        );

        for (const dim of sortedDims) {
            if (reasons.length >= 4) break;
            const label = EXPLANATION_LABELS[dim];
            if (label && !reasons.some((r) => r.includes(label))) {
                reasons.push(`You both have ${label}`);
            }
        }
    }

    return reasons.slice(0, 6); // Return max 6 reasons
}

// ---------- Hard Filters ----------
export function passesHardFilters(a: UserForMatching, b: UserForMatching): boolean {
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

    // 3. Build vectors for all users and store answers
    const questions = await prisma.question.findMany();
    const vectors: Record<string, DimensionVec> = {};
    const allAnswers: Record<string, Answer[]> = {};

    for (const user of users) {
        const answers = await prisma.answer.findMany({
            where: { userId: user.id },
            select: { questionId: true, value: true },
        });
        vectors[user.id] = buildVector(answers, questions);
        allAnswers[user.id] = answers;
    }

    // 4. Determine carry-forward priority (unmatched from previous cycle)
    //    Users who opted in last week but didn't get matched get sorted first.
    const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const prevOptIns = await prisma.weeklyOptIn.findMany({
        where: { weekStart: prevWeekStart },
        select: { userId: true },
    });

    const prevMatches = await prisma.match.findMany({
        where: { weekStart: prevWeekStart },
        select: { userAId: true, userBId: true },
    });

    const prevMatchedIds = new Set(
        prevMatches.flatMap((m) => [m.userAId, m.userBId])
    );

    // Priority = opted in last week AND not matched last week AND opted in this week
    const priorityUserIds = new Set(
        prevOptIns
            .filter((o) => !prevMatchedIds.has(o.userId))
            .map((o) => o.userId)
    );

    // Sort: priority users first, then by signup date (older first)
    const sortedUsers = users.sort((a, b) => {
        const aPri = priorityUserIds.has(a.id) ? 0 : 1;
        const bPri = priorityUserIds.has(b.id) ? 0 : 1;
        if (aPri !== bPri) return aPri - bPri;
        return a.createdAt.getTime() - b.createdAt.getTime();
    });

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
        const reasons = explainDetailed(
            allAnswers[user.id],
            allAnswers[best.candidate.id],
            questions,
            vectors[user.id],
            vectors[best.candidate.id]
        );
        const explanationStr = JSON.stringify(reasons);

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
        priorityUsers: users.filter((u) => priorityUserIds.has(u.id)).length,
        matches,
    };
}
