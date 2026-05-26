import {
    createMatchExplanationV2,
    MatchCompatibilityType,
    MatchExplanationV2,
    MatchReasonV2,
    parseMatchExplanation,
    textSimilarity,
} from "./match-explanation";

interface AnswerForReasoning {
    questionId: string;
    value: unknown;
}

export interface QuestionForReasoning {
    id: string;
    questionText?: string;
    weightDimension: string;
    weight: number;
    type: string;
    options: unknown;
}

export interface HistoricalMatchForReasoning {
    weekStart: Date | string;
    explanation: string;
}

interface ReasonHistoryEntry {
    weekStart: Date;
    displayText: string;
    templateId?: string;
    questionId?: string;
    category?: string;
    trait?: string;
    compatibilityType?: MatchCompatibilityType;
}

interface ReasonMetadata {
    category: string;
    trait: string;
    sensitive?: boolean;
    minConfidence?: number;
    likertHighText?: string;
    likertLowText?: string;
    exactTextByAnswer?: Record<string, string>;
    sharedExactText?: (answerLabel: string) => string;
    similarText?: (answerA: string, answerB: string) => string;
    rankingText?: (overlap: string[]) => string;
    complementaryText?: string;
    compatibilityType?: MatchCompatibilityType;
}

interface ReasonCandidate extends MatchReasonV2 {
    stableKey: string;
    questionWeight: number;
}

export interface MatchReasoningV2Debug {
    candidateCount: number;
    rejected: Array<{
        templateId: string;
        questionId: string;
        displayText: string;
        reason: string;
    }>;
    selected: Array<{
        templateId: string;
        questionId: string;
        category: string;
        trait: string;
        score: number;
    }>;
}

export interface MatchReasoningV2Result {
    explanation: MatchExplanationV2;
    debug: MatchReasoningV2Debug;
}

const TEMPLATE_COOLDOWN_WEEKS = 12;
const QUESTION_COOLDOWN_WEEKS = 6;
const TRAIT_COOLDOWN_WEEKS = 4;
const HIGH_TEXT_SIMILARITY = 0.82;
const TARGET_REASON_COUNT = 4;
const MIN_REASON_CONFIDENCE = 0.58;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const SENSITIVE_REASON_IDS = new Set([
    "bf_01",
    "att_01",
    "att_02",
    "att_03",
    "att_04_rev",
    "att_05_beh",
    "att_06_scen",
    "emo_05_rev",
    "val_01_filter",
    "val_04_beh",
    "dealbreak_03_filter",
    "dealbreak_05_weight",
    "attr_05_weight",
    "habits_01_filter",
    "habits_02_beh",
    "habits_06_beh",
    "socio_01_filter",
    "socio_03_weight",
    "dealbreak_01_filter",
    "dealbreak_04_scen",
]);

const QUESTION_METADATA: Record<string, ReasonMetadata> = {
    bf_02: {
        category: "lifestyle",
        trait: "follow_through",
        likertHighText: "Your answers suggest you both value following through on plans and commitments.",
        likertLowText: "Your answers suggest you both prefer flexibility over rigid schedules.",
    },
    bf_04: {
        category: "social_energy",
        trait: "spotlight_preference",
        likertHighText: "Your answers suggest you both enjoy lively, high-energy social settings.",
        likertLowText: "Your answers suggest you both prefer quieter settings over being the center of attention.",
        complementaryText: "Your social energies may balance each other: one brings momentum while the other brings a calmer pace.",
    },
    bf_05: {
        category: "interests",
        trait: "abstract_conversation",
        likertHighText: "Your answers suggest you both enjoy reflective, idea-heavy conversations.",
    },
    bf_06_scen: {
        category: "communication",
        trait: "lateness_response",
        exactTextByAnswer: {
            "I assume they got stuck in traffic and wait patiently.":
                "If plans run late, your answers suggest you would both start from a calm assumption.",
            "I text them once to check in and find something else to do.":
                "If plans run late, you both seem likely to check in once and keep your balance.",
        },
        compatibilityType: "compatible_conflict_style",
    },
    conf_01: {
        category: "conflict",
        trait: "conflict_priority",
        exactTextByAnswer: {
            "Keep the peace":
                "In disagreements, you both tend to value keeping things calm over winning the point.",
            "Prove I am right":
                "In disagreements, you both prefer to address the issue directly rather than smooth it over.",
        },
        compatibilityType: "compatible_conflict_style",
    },
    conf_02_scen: {
        category: "conflict",
        trait: "money_conflict_timing",
        exactTextByAnswer: {
            "Bring it up immediately and express my frustration.":
                "When money feels tense, your answers suggest you both prefer to address it directly.",
            "Wait until we are both relaxed to calmly ask about it.":
                "When money feels tense, you both seem to prefer waiting for a calmer moment to talk.",
            "Avoid bringing it up to prevent an argument.":
                "Your answers suggest you both tend to avoid turning money tension into an immediate argument.",
        },
        compatibilityType: "compatible_conflict_style",
    },
    conf_03_beh: {
        category: "conflict",
        trait: "cooldown_style",
        exactTextByAnswer: {
            Yes: "Your answers suggest you both know when to take space during a heated moment.",
            No: "Your answers suggest you both prefer to stay present and work through conflict in the moment.",
        },
        compatibilityType: "compatible_conflict_style",
    },
    conf_04_rev: {
        category: "conflict",
        trait: "repair_after_conflict",
        likertHighText: "After conflict is resolved, your answers suggest you both prefer to move forward cleanly.",
    },
    conf_05_weight: {
        category: "conflict",
        trait: "argument_style_importance",
        likertHighText: "You both place real importance on sharing a similar approach to resolving arguments.",
    },
    emo_01: {
        category: "communication",
        trait: "emotion_timing",
        likertHighText: "When emotions run high, your answers suggest you both prefer to pause before responding.",
    },
    emo_02_beh: {
        category: "communication",
        trait: "stress_spillover",
        exactTextByAnswer: {
            No: "Your answers suggest you both try not to let outside stress spill onto people close to you.",
        },
    },
    emo_03_scen: {
        category: "communication",
        trait: "bad_day_response",
        exactTextByAnswer: {
            "Take a deep breath, explain that I had a bad day, and ask for help tidying.":
                "After a bad day, your answers suggest you both prefer naming what happened and asking for help.",
            "Clean it myself while quietly feeling resentful.":
                "After a bad day, your answers suggest you both may prefer handling things quietly before talking.",
        },
    },
    emo_04: {
        category: "communication",
        trait: "bounce_back",
        likertHighText: "Your answers suggest you both tend to recover quickly after frustrating moments.",
    },
    comm_01: {
        category: "communication",
        trait: "sensitive_topic_style",
        rankingText: (overlap) =>
            `For sensitive topics, ${formatList(overlap)} ranked near the top for both of you.`,
        compatibilityType: "compatible_conflict_style",
    },
    comm_02_scen: {
        category: "communication",
        trait: "annoyance_directness",
        exactTextByAnswer: {
            "Directly tell them it bothers me.":
                "Your answers suggest you both prefer direct, clear communication when something bothers you.",
            "Make a joke about it to soften the blow.":
                "Your answers suggest you both use warmth or humor to soften small annoyances.",
            "I don't say anything; it's not worth the conflict.":
                "For small annoyances, your answers suggest you both tend to pick your battles.",
        },
    },
    comm_03_beh: {
        category: "communication",
        trait: "active_listening",
        likertHighText: "Your answers suggest you both value asking questions and really listening day to day.",
    },
    comm_04_rev: {
        category: "communication",
        trait: "expressing_needs",
        likertLowText: "Your answers suggest you both try to say what you need instead of expecting mind-reading.",
    },
    comm_05_weight: {
        category: "communication",
        trait: "expressiveness_importance",
        likertHighText: "You both place real importance on verbal, expressive communication.",
    },
    val_02: {
        category: "values",
        trait: "life_priorities",
        rankingText: (overlap) =>
            `${formatList(overlap)} ranked near the top of what matters most for both of you right now.`,
        compatibilityType: "shared_value",
    },
    val_03_scen: {
        category: "values",
        trait: "career_family_tradeoff",
        exactTextByAnswer: {
            "Yes; major career growth is worth the distance.":
                "When career and distance compete, your answers suggest you both lean toward taking the growth opportunity.",
            "No; being close to family matters more.":
                "When career and distance compete, your answers suggest family proximity matters to both of you.",
            "Only if my partner and I can make a concrete plan for visiting or relocating together.":
                "When career and distance compete, your answers suggest you both look for a practical plan together.",
        },
        compatibilityType: "shared_value",
    },
    val_05_weight: {
        category: "values",
        trait: "ambition_importance",
        likertHighText: "You both place real importance on ambition in a partner.",
    },
    bel_01: {
        category: "relationship_beliefs",
        trait: "growth_vs_destiny",
        likertLowText: "Your answers suggest you both see relationships as something people build, not just something they find.",
    },
    bel_02: {
        category: "relationship_beliefs",
        trait: "relationship_effort",
        likertHighText: "Your answers suggest you both believe strong relationships grow through effort and compromise.",
    },
    bel_03_scen: {
        category: "relationship_beliefs",
        trait: "different_hobbies",
        exactTextByAnswer: {
            "It is perfectly fine; partners do not need to share every interest.":
                "If your hobbies differ, your answers suggest you both see that as normal rather than alarming.",
            "It means we should actively build new shared hobbies together.":
                "If your hobbies differ, your answers suggest you both would look for new shared experiences.",
            "It is a warning sign that we may not be compatible.":
                "Your answers suggest you both pay attention to whether day-to-day interests actually overlap.",
        },
    },
    bel_04_rev: {
        category: "relationship_beliefs",
        trait: "early_effort",
        likertLowText: "Your answers suggest early relationship effort does not automatically feel like a bad sign to either of you.",
    },
    bel_05_weight: {
        category: "relationship_beliefs",
        trait: "relationship_work_importance",
        likertHighText: "You both place real importance on a partner who believes relationships take ongoing work.",
    },
    goals_01_filter: {
        category: "long_term_goals",
        trait: "children_stance",
        sharedExactText: () =>
            "Your answers point in a similar direction on one of the bigger long-term life questions.",
        compatibilityType: "shared_value",
    },
    goals_02_filter: {
        category: "long_term_goals",
        trait: "marriage_direction",
        sharedExactText: () =>
            "Your answers suggest you are looking for a similar level of long-term relationship direction.",
        compatibilityType: "shared_value",
    },
    goals_03_beh: {
        category: "long_term_goals",
        trait: "five_year_follow_through",
        exactTextByAnswer: {
            Yes: "You both say you are actively working toward a specific five-year goal.",
        },
        compatibilityType: "shared_value",
    },
    goals_04_scen: {
        category: "money",
        trait: "windfall_priorities",
        exactTextByAnswer: {
            "Invest most of it for the future.":
                "If extra money came in, your answers suggest you would both prioritize the future.",
            "Use it for a down payment or major life milestone.":
                "If extra money came in, your answers suggest you would both put it toward a major life milestone.",
            "Spend it on travel, experiences, or things I have always wanted.":
                "If extra money came in, your answers suggest you would both want some of it to become real experiences.",
        },
        compatibilityType: "shared_value",
    },
    goals_05: {
        category: "long_term_goals",
        trait: "relocation_flexibility",
        likertHighText: "Your answers suggest you both have some openness to relocating for a partner's major opportunity.",
        likertLowText: "Your answers suggest you both place importance on staying rooted where life already is.",
    },
    socio_02: {
        category: "money",
        trait: "financial_style",
        exactTextByAnswer: {
            "Strict budgeter; save as much as possible.":
                "You both described your money style as careful and savings-focused.",
            "Moderate saver; I budget but leave room for fun.":
                "You both described your money style as budgeting with room for fun.",
            "Live for today; money is meant to be spent.":
                "You both described money as something meant to support living in the present.",
        },
        similarText: () =>
            "Your answers suggest your money styles are close enough to talk through without starting from opposite ends.",
    },
    socio_04_beh: {
        category: "money",
        trait: "budget_tracking",
        exactTextByAnswer: {
            Yes: "You both say you actively track where your money goes.",
        },
    },
    socio_05_scen: {
        category: "lifestyle",
        trait: "travel_style",
        exactTextByAnswer: {
            "Luxury resorts and high-end dining.":
                "For travel, your answers suggest you both like comfort and a higher-end experience.",
            "Mid-range hotels and a mix of paid tours and free exploration.":
                "For travel, your answers suggest you both like a balance of comfort, planning, and exploring.",
            "Budget backpacking, hostels, and street food.":
                "For travel, your answers suggest you both care more about the experience than the extras.",
        },
        similarText: () =>
            "Your travel answers are close enough that planning a trip would likely start from similar expectations.",
    },
    habits_02_beh: {
        category: "lifestyle",
        trait: "exercise_routine",
        exactTextByAnswer: {
            Yes: "You both say intentional exercise is part of your weekly routine.",
        },
    },
    habits_03_beh: {
        category: "lifestyle",
        trait: "weekend_mornings",
        exactTextByAnswer: {
            Yes: "Your answers suggest you both like getting an early start on weekends.",
            No: "Your answers suggest you both appreciate slower weekend mornings.",
        },
    },
    habits_04: {
        category: "lifestyle",
        trait: "weekend_activities",
        rankingText: (overlap) =>
            `${formatList(overlap)} ranked near the top of your ideal weekend activities.`,
    },
    habits_05: {
        category: "lifestyle",
        trait: "home_organization",
        likertHighText: "Your answers suggest you both prefer a tidy, organized living space.",
        likertLowText: "Your answers suggest neither of you needs home life to be perfectly organized all the time.",
    },
    time_01: {
        category: "planning",
        trait: "present_vs_future",
        likertHighText: "Your answers suggest you both like leaving room for the present moment.",
        likertLowText: "Your answers suggest you both prefer thinking ahead rather than improvising everything.",
        complementaryText: "Your planning styles may balance each other: one brings structure while the other keeps things flexible.",
    },
    time_02: {
        category: "planning",
        trait: "long_game_decisions",
        likertHighText: "When making big decisions, your answers suggest you both pay attention to the long game.",
    },
    time_03_scen: {
        category: "planning",
        trait: "free_weekend_style",
        exactTextByAnswer: {
            "Make a detailed plan to maximize the weekend.":
                "With a free weekend, your answers suggest you both like having a real plan.",
            "Keep a loose list of possibilities but decide in the moment.":
                "With a free weekend, your answers suggest you both like a flexible plan.",
            "Do whatever I feel like when I wake up; no plan needed.":
                "With a free weekend, your answers suggest you both enjoy keeping things spontaneous.",
        },
    },
    time_04: {
        category: "planning",
        trait: "future_comfort",
        sensitive: true,
    },
    social_01: {
        category: "social_energy",
        trait: "social_recharge",
        likertHighText: "After big social events, your answers suggest you both tend to feel energized.",
        likertLowText: "After big social events, your answers suggest you both value recharge time.",
        complementaryText: "Your social-energy answers may balance each other: one brings outward energy while the other protects downtime.",
    },
    social_02_beh: {
        category: "social_energy",
        trait: "meeting_new_people",
        exactTextByAnswer: {
            Yes: "You both say you actively seek chances to meet new people.",
            No: "Your answers suggest you both are selective about expanding your social circle.",
        },
    },
    social_03: {
        category: "social_energy",
        trait: "friendship_depth",
        exactTextByAnswer: {
            "I prefer a few close, deep friendships.":
                "You both prefer a smaller circle of deeper friendships.",
            "I prefer a large network of casual acquaintances.":
                "You both seem comfortable keeping a wider social network.",
        },
    },
    social_04: {
        category: "social_energy",
        trait: "opposite_social_energy",
        exactTextByAnswer: {
            Yes: "You both say you are open to dating someone with a different social rhythm.",
        },
    },
    social_05_weight: {
        category: "social_energy",
        trait: "social_match_importance",
        likertHighText: "You both place real importance on sharing a similar social-energy level.",
        likertLowText: "Your answers suggest neither of you needs a partner with exactly the same social-energy level.",
    },
    dealbreak_01_filter: {
        category: "lifestyle",
        trait: "pets",
        sharedExactText: () => "Your answers suggest you are broadly aligned on the pet question.",
    },
    dealbreak_02: {
        category: "lifestyle",
        trait: "distance",
        sharedExactText: () => "Your answers suggest you have a similar comfort zone around dating distance.",
    },
    dealbreak_04_scen: {
        category: "boundaries",
        trait: "ex_friendship_boundaries",
        exactTextByAnswer: {
            "It is fine if the friendship is healthy and transparent.":
                "Your answers suggest you both value transparency when past relationships are still part of someone's life.",
            "I would want clear boundaries and reassurance.":
                "Your answers suggest you both prefer clear boundaries around past relationships.",
            "I would be uncomfortable and consider it a deal-breaker.":
                "Your answers suggest you both take boundaries around past relationships seriously.",
        },
    },
    attr_01: {
        category: "attraction",
        trait: "personality_vs_appearance",
        likertLowText: "Your answers suggest personality and connection matter more to both of you than appearance alone.",
    },
    attr_02: {
        category: "attraction",
        trait: "slow_burn",
        likertHighText: "Your answers suggest attraction tends to grow for both of you through emotional or intellectual connection.",
    },
    attr_03_scen: {
        category: "attraction",
        trait: "first_date_chemistry",
        exactTextByAnswer: {
            "Yes; physical attraction is enough to explore further.":
                "On a first date, your answers suggest you both are open to seeing whether chemistry grows.",
            "Maybe; I would consider whether nerves affected the conversation.":
                "On a first date, your answers suggest you both make room for nerves before deciding.",
            "No; conversational chemistry matters more to me.":
                "On a first date, your answers suggest conversation chemistry matters a lot to both of you.",
        },
    },
    attr_04: {
        category: "attraction",
        trait: "chemistry_drivers",
        rankingText: (overlap) =>
            `${formatList(overlap)} ranked near the top of what creates chemistry for both of you.`,
    },
};

export function isMatchReasoningV2Enabled(): boolean {
    return process.env.MATCH_REASONING_V2 === "true";
}

export function generateMatchExplanationV2(input: {
    answersA: AnswerForReasoning[];
    answersB: AnswerForReasoning[];
    questions: QuestionForReasoning[];
    vecA?: Record<string, number>;
    vecB?: Record<string, number>;
    similarityScore: number;
    weekStart: Date;
    generatedAt?: Date;
    historicalMatches?: HistoricalMatchForReasoning[];
    pairKey?: string;
}): MatchReasoningV2Result {
    const history = buildReasonHistory(input.historicalMatches ?? []);
    const candidates = generateCandidates(input);
    const rejected: MatchReasoningV2Debug["rejected"] = [];
    const usable = applyHistoryAndQualityFilters(
        candidates,
        history,
        input.weekStart,
        rejected
    );
    const selected = selectDiverseReasons(usable, input.pairKey ?? "");
    const withFallback = maybeAddAggregateFallback({
        selected,
        history,
        rejected,
        input,
    });

    const explanation = createMatchExplanationV2({
        generatedAt: input.generatedAt,
        reasons: withFallback.reasons,
        fallbackUsed: withFallback.fallbackUsed,
    });

    return {
        explanation,
        debug: {
            candidateCount: candidates.length,
            rejected,
            selected: explanation.reasons.map((reason) => ({
                templateId: reason.templateId,
                questionId: reason.questionId,
                category: reason.category,
                trait: reason.trait,
                score: reason.score,
            })),
        },
    };
}

function generateCandidates(input: {
    answersA: AnswerForReasoning[];
    answersB: AnswerForReasoning[];
    questions: QuestionForReasoning[];
    pairKey?: string;
}): ReasonCandidate[] {
    const answersA = new Map(input.answersA.map((answer) => [answer.questionId, answer]));
    const answersB = new Map(input.answersB.map((answer) => [answer.questionId, answer]));
    const candidates: ReasonCandidate[] = [];

    input.questions.forEach((question, index) => {
        const metadata = QUESTION_METADATA[question.id];
        if (!metadata || metadata.sensitive || SENSITIVE_REASON_IDS.has(question.id)) return;

        const answerA = answersA.get(question.id);
        const answerB = answersB.get(question.id);
        if (!answerA || !answerB) return;

        const options = getOptions(question.options);

        candidates.push(
            ...generateQuestionCandidates({
                answerA: answerA.value,
                answerB: answerB.value,
                metadata,
                options,
                question,
                questionIndex: index,
                pairKey: input.pairKey ?? "",
            })
        );
    });

    return candidates;
}

function generateQuestionCandidates(input: {
    answerA: unknown;
    answerB: unknown;
    metadata: ReasonMetadata;
    options: string[];
    question: QuestionForReasoning;
    questionIndex: number;
    pairKey: string;
}): ReasonCandidate[] {
    const { answerA, answerB, metadata, options, question } = input;

    if (Array.isArray(answerA) && Array.isArray(answerB)) {
        return generateRankingCandidate(input);
    }

    if (typeof answerA === "number" && typeof answerB === "number") {
        return generateLikertCandidate(input);
    }

    const labelA = answerLabel(answerA);
    const labelB = answerLabel(answerB);
    if (!labelA || !labelB) return [];

    if (labelA === labelB) {
        const text =
            metadata.exactTextByAnswer?.[labelA] ??
            metadata.sharedExactText?.(shortOptionLabel(labelA));

        if (!text) return [];

        const confidence = metadata.minConfidence ?? 0.9;
        const compatibilityType = metadata.compatibilityType ?? "exact_match";
        const answerSlug = slugify(labelA).slice(0, 48);

        return [
            makeCandidate({
                question,
                metadata,
                displayText: text,
                templateId: `v2.${question.id}.exact.${answerSlug}.v1`,
                compatibilityType,
                answerA,
                answerB,
                confidence,
                compatibilityStrength: 1,
                questionIndex: input.questionIndex,
                pairKey: input.pairKey,
            }),
        ];
    }

    if (metadata.similarText && areNeighboringOptions(labelA, labelB, options)) {
        return [
            makeCandidate({
                question,
                metadata,
                displayText: metadata.similarText(shortOptionLabel(labelA), shortOptionLabel(labelB)),
                templateId: `v2.${question.id}.similar.neighboring.v1`,
                compatibilityType: "similar_answer",
                answerA,
                answerB,
                confidence: 0.68,
                compatibilityStrength: 0.68,
                questionIndex: input.questionIndex,
                pairKey: input.pairKey,
            }),
        ];
    }

    return [];
}

function generateRankingCandidate(input: {
    answerA: unknown;
    answerB: unknown;
    metadata: ReasonMetadata;
    question: QuestionForReasoning;
    questionIndex: number;
    pairKey: string;
}): ReasonCandidate[] {
    const { answerA, answerB, metadata, question } = input;
    if (!Array.isArray(answerA) || !Array.isArray(answerB) || !metadata.rankingText) {
        return [];
    }

    const rankingA = answerA.filter((item): item is string => typeof item === "string");
    const rankingB = answerB.filter((item): item is string => typeof item === "string");
    if (rankingA.length === 0 || rankingB.length === 0) return [];

    const overlap = topOverlap(rankingA, rankingB, 2)
        .map(shortOptionLabel)
        .filter((item) => !isSensitiveDisplayOption(item));
    if (overlap.length === 0) return [];

    const confidence = overlap.length >= 2 ? 0.92 : 0.78;
    const compatibilityStrength = overlap.length >= 2 ? 0.95 : 0.78;
    const overlapSlug = overlap.map(slugify).join("-");

    return [
        makeCandidate({
            question,
            metadata,
            displayText: metadata.rankingText(overlap),
            templateId: `v2.${question.id}.ranking.${overlapSlug}.v1`,
            compatibilityType: metadata.compatibilityType ?? "shared_value",
            answerA,
            answerB,
            confidence,
            compatibilityStrength,
            questionIndex: input.questionIndex,
            pairKey: input.pairKey,
        }),
    ];
}

function generateLikertCandidate(input: {
    answerA: unknown;
    answerB: unknown;
    metadata: ReasonMetadata;
    options: string[];
    question: QuestionForReasoning;
    questionIndex: number;
    pairKey: string;
}): ReasonCandidate[] {
    const { answerA, answerB, metadata, options, question } = input;
    const normA = normalizeLikert(answerA, options);
    const normB = normalizeLikert(answerB, options);
    if (normA === null || normB === null) return [];

    const distance = Math.abs(normA - normB);
    const close = 1 - distance;
    const avg = (normA + normB) / 2;

    if (metadata.complementaryText && distance >= 0.72) {
        return [
            makeCandidate({
                question,
                metadata,
                displayText: metadata.complementaryText,
                templateId: `v2.${question.id}.complementary.v1`,
                compatibilityType: "complementary_difference",
                answerA,
                answerB,
                confidence: 0.6,
                compatibilityStrength: 0.55,
                questionIndex: input.questionIndex,
                pairKey: input.pairKey,
            }),
        ];
    }

    if (close < 0.74) return [];

    const high = avg >= 0.63;
    const low = avg <= 0.37;
    const displayText = high ? metadata.likertHighText : low ? metadata.likertLowText : null;
    if (!displayText) return [];

    const confidence = Math.min(0.95, 0.64 + close * 0.25 + Math.abs(avg - 0.5) * 0.2);

    return [
        makeCandidate({
            question,
            metadata,
            displayText,
            templateId: `v2.${question.id}.likert.${high ? "high" : "low"}.v1`,
            compatibilityType: metadata.compatibilityType ?? "similar_answer",
            answerA,
            answerB,
            confidence,
            compatibilityStrength: close,
            questionIndex: input.questionIndex,
            pairKey: input.pairKey,
        }),
    ];
}

function makeCandidate(input: {
    question: QuestionForReasoning;
    metadata: ReasonMetadata;
    displayText: string;
    templateId: string;
    compatibilityType: MatchCompatibilityType;
    answerA: unknown;
    answerB: unknown;
    confidence: number;
    compatibilityStrength: number;
    questionIndex: number;
    pairKey: string;
}): ReasonCandidate {
    const weight = typeof input.question.weight === "number" ? input.question.weight : 1;
    const weightScore = Math.min(1, Math.max(0.25, weight / 1.5));
    const score = roundScore(
        input.confidence * 0.5 +
        input.compatibilityStrength * 0.35 +
        weightScore * 0.15
    );
    const questionText = input.question.questionText ?? input.question.id;

    return {
        displayText: input.displayText,
        templateId: input.templateId,
        questionId: input.question.id,
        questionText,
        userAAnswer: input.answerA,
        userBAnswer: input.answerB,
        compatibilityType: input.compatibilityType,
        category: input.metadata.category,
        trait: input.metadata.trait,
        confidence: roundScore(input.confidence),
        score,
        evidenceSummary: `${input.question.id}: both comparable answers support ${input.metadata.category}/${input.metadata.trait}.`,
        stableKey: `${input.pairKey}:${input.questionIndex}:${input.templateId}`,
        questionWeight: weight,
    };
}

function applyHistoryAndQualityFilters(
    candidates: ReasonCandidate[],
    history: ReasonHistoryEntry[],
    weekStart: Date,
    rejected: MatchReasoningV2Debug["rejected"]
): ReasonCandidate[] {
    return candidates.filter((candidate) => {
        const rejection = getCandidateRejection(candidate, history, weekStart);
        if (rejection) {
            rejected.push({
                templateId: candidate.templateId,
                questionId: candidate.questionId,
                displayText: candidate.displayText,
                reason: rejection,
            });
            return false;
        }
        return true;
    });
}

function getCandidateRejection(
    candidate: ReasonCandidate,
    history: ReasonHistoryEntry[],
    weekStart: Date
): string | null {
    if (candidate.confidence < MIN_REASON_CONFIDENCE) {
        return "below_minimum_confidence";
    }

    for (const entry of history) {
        const weeksAgo = weeksBetween(weekStart, entry.weekStart);

        if (
            entry.templateId &&
            entry.templateId === candidate.templateId &&
            weeksAgo < TEMPLATE_COOLDOWN_WEEKS
        ) {
            return `template_cooldown_${weeksAgo}_weeks`;
        }

        if (
            entry.questionId &&
            entry.questionId === candidate.questionId &&
            weeksAgo < QUESTION_COOLDOWN_WEEKS
        ) {
            return `question_cooldown_${weeksAgo}_weeks`;
        }

        if (
            entry.category === candidate.category &&
            entry.trait === candidate.trait &&
            entry.compatibilityType === candidate.compatibilityType &&
            weeksAgo < TRAIT_COOLDOWN_WEEKS
        ) {
            return `trait_cooldown_${weeksAgo}_weeks`;
        }

        if (textSimilarity(entry.displayText, candidate.displayText) >= HIGH_TEXT_SIMILARITY) {
            return "similar_text_history";
        }
    }

    return null;
}

function selectDiverseReasons(
    candidates: ReasonCandidate[],
    pairKey: string
): ReasonCandidate[] {
    const sorted = [...candidates].sort((a, b) => compareCandidates(a, b, pairKey));
    const selected: ReasonCandidate[] = [];
    const usedCategories = new Set<string>();
    const usedQuestions = new Set<string>();
    const usedTraits = new Set<string>();

    for (const candidate of sorted) {
        if (selected.length >= TARGET_REASON_COUNT) break;
        if (usedCategories.has(candidate.category)) continue;
        if (isDuplicateWithinSelection(candidate, selected)) continue;

        selected.push(candidate);
        usedCategories.add(candidate.category);
        usedQuestions.add(candidate.questionId);
        usedTraits.add(`${candidate.category}:${candidate.trait}`);
    }

    if (selected.length < TARGET_REASON_COUNT) {
        for (const candidate of sorted) {
            if (selected.length >= TARGET_REASON_COUNT) break;
            if (selected.includes(candidate)) continue;
            if (usedQuestions.has(candidate.questionId)) continue;
            if (usedTraits.has(`${candidate.category}:${candidate.trait}`)) continue;
            if (candidate.score < 0.86) continue;
            if (isDuplicateWithinSelection(candidate, selected)) continue;

            selected.push(candidate);
            usedQuestions.add(candidate.questionId);
            usedTraits.add(`${candidate.category}:${candidate.trait}`);
        }
    }

    return selected;
}

function maybeAddAggregateFallback(input: {
    selected: ReasonCandidate[];
    history: ReasonHistoryEntry[];
    rejected: MatchReasoningV2Debug["rejected"];
    input: {
        answersA: AnswerForReasoning[];
        answersB: AnswerForReasoning[];
        questions: QuestionForReasoning[];
        vecA?: Record<string, number>;
        vecB?: Record<string, number>;
        similarityScore: number;
        weekStart: Date;
        pairKey?: string;
    };
}): { reasons: MatchReasonV2[]; fallbackUsed: boolean } {
    if (input.selected.length >= 2) {
        return { reasons: input.selected, fallbackUsed: false };
    }

    const comparableSafeQuestions = countComparableSafeQuestions(
        input.input.answersA,
        input.input.answersB,
        input.input.questions
    );

    if (input.input.similarityScore < 0.62 || comparableSafeQuestions < 5) {
        return { reasons: input.selected, fallbackUsed: false };
    }

    const fallback = makeAggregateFallback(input.input);
    const rejection = getCandidateRejection(fallback, input.history, input.input.weekStart);
    if (rejection) {
        input.rejected.push({
            templateId: fallback.templateId,
            questionId: fallback.questionId,
            displayText: fallback.displayText,
            reason: rejection,
        });
        return { reasons: input.selected, fallbackUsed: false };
    }

    if (isDuplicateWithinSelection(fallback, input.selected)) {
        return { reasons: input.selected, fallbackUsed: false };
    }

    return { reasons: [...input.selected, fallback], fallbackUsed: true };
}

function makeAggregateFallback(input: {
    similarityScore: number;
    weekStart: Date;
    pairKey?: string;
}): ReasonCandidate {
    const score = roundScore(Math.max(0.62, Math.min(0.82, input.similarityScore)));

    return {
        displayText:
            "Across several answers, your overall compatibility was strong even though no single safe topic dominated the match.",
        templateId: "v2.aggregate.safe_overall.v1",
        questionId: "aggregate_compatibility",
        questionText: "Aggregate compatibility across comparable answers",
        userAAnswer: null,
        userBAnswer: null,
        compatibilityType: "aggregate_pattern",
        category: "overall",
        trait: "broad_compatibility",
        confidence: score,
        score,
        evidenceSummary:
            "Used only when safe question-level reasons are sparse but aggregate compatibility is strong.",
        stableKey: `${input.pairKey ?? ""}:aggregate:${input.weekStart.toISOString()}`,
        questionWeight: 1,
    };
}

function buildReasonHistory(matches: HistoricalMatchForReasoning[]): ReasonHistoryEntry[] {
    const entries: ReasonHistoryEntry[] = [];

    for (const match of matches) {
        const weekStart =
            match.weekStart instanceof Date ? match.weekStart : new Date(match.weekStart);
        if (Number.isNaN(weekStart.getTime())) continue;

        const parsed = parseMatchExplanation(match.explanation);
        if (parsed.kind === "v2" && parsed.v2) {
            for (const reason of parsed.v2.reasons) {
                entries.push({
                    weekStart,
                    displayText: reason.displayText,
                    templateId: reason.templateId,
                    questionId: reason.questionId,
                    category: reason.category,
                    trait: reason.trait,
                    compatibilityType: reason.compatibilityType,
                });
            }
            continue;
        }

        for (const displayText of parsed.displayReasons) {
            entries.push({ weekStart, displayText });
        }
    }

    return entries;
}

function countComparableSafeQuestions(
    answersA: AnswerForReasoning[],
    answersB: AnswerForReasoning[],
    questions: QuestionForReasoning[]
): number {
    const aIds = new Set(answersA.map((answer) => answer.questionId));
    const bIds = new Set(answersB.map((answer) => answer.questionId));
    return questions.filter((question) => {
        const metadata = QUESTION_METADATA[question.id];
        return (
            metadata &&
            !metadata.sensitive &&
            !SENSITIVE_REASON_IDS.has(question.id) &&
            aIds.has(question.id) &&
            bIds.has(question.id)
        );
    }).length;
}

function isDuplicateWithinSelection(
    candidate: ReasonCandidate,
    selected: ReasonCandidate[]
): boolean {
    return selected.some((reason) => {
        if (reason.templateId === candidate.templateId) return true;
        if (reason.questionId === candidate.questionId) return true;
        if (
            reason.category === candidate.category &&
            reason.trait === candidate.trait &&
            reason.compatibilityType === candidate.compatibilityType
        ) {
            return true;
        }
        return textSimilarity(reason.displayText, candidate.displayText) >= HIGH_TEXT_SIMILARITY;
    });
}

function compareCandidates(a: ReasonCandidate, b: ReasonCandidate, pairKey: string): number {
    if (b.score !== a.score) return b.score - a.score;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (b.questionWeight !== a.questionWeight) return b.questionWeight - a.questionWeight;
    return stableHash(`${pairKey}:${a.stableKey}`) - stableHash(`${pairKey}:${b.stableKey}`);
}

function stableHash(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function weeksBetween(currentWeekStart: Date, historicalWeekStart: Date): number {
    return Math.max(0, Math.floor((currentWeekStart.getTime() - historicalWeekStart.getTime()) / MS_PER_WEEK));
}

function getOptions(options: unknown): string[] {
    return Array.isArray(options)
        ? options.filter((option): option is string => typeof option === "string")
        : [];
}

function normalizeLikert(value: unknown, options: string[]): number | null {
    if (typeof value !== "number" || Number.isNaN(value)) return null;
    const denominator = Math.max(options.length - 1, 1);
    return Math.max(0, Math.min(1, (value - 1) / denominator));
}

function answerLabel(value: unknown): string | null {
    if (typeof value === "string") return value.trim() || null;
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return null;
}

function topOverlap(arrA: string[], arrB: string[], n: number): string[] {
    const topA = new Set(arrA.slice(0, n));
    return arrB.slice(0, n).filter((item) => topA.has(item));
}

function areNeighboringOptions(answerA: string, answerB: string, options: string[]): boolean {
    const idxA = options.indexOf(answerA);
    const idxB = options.indexOf(answerB);
    return idxA >= 0 && idxB >= 0 && Math.abs(idxA - idxB) === 1;
}

function shortOptionLabel(value: string): string {
    return value
        .replace(/\s*\([^)]*\)/g, "")
        .replace(/\s*;\s*/g, ", ")
        .replace(/\s*&\s*/g, " and ")
        .replace(/\.$/, "")
        .trim();
}

function isSensitiveDisplayOption(value: string): boolean {
    const normalized = value.toLowerCase();
    return [
        "faith",
        "religion",
        "religious",
        "spiritual",
        "politic",
        "sexual",
        "sex",
        "touch",
        "physical attractiveness",
    ].some((term) => normalized.includes(term));
}

function formatList(items: string[]): string {
    const cleaned = items.map(shortOptionLabel).filter(Boolean);
    if (cleaned.length === 0) return "similar choices";
    if (cleaned.length === 1) return cleaned[0];
    if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
    return `${cleaned.slice(0, -1).join(", ")}, and ${cleaned[cleaned.length - 1]}`;
}

function slugify(value: string): string {
    const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    return slug || "answer";
}

function roundScore(value: number): number {
    return Math.round(value * 1000) / 1000;
}
