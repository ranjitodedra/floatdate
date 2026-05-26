export const MATCH_EXPLANATION_V2_VERSION = 2;
export const MATCH_EXPLANATION_V2_ALGORITHM = "match-reasons-v2";

export type MatchCompatibilityType =
    | "exact_match"
    | "similar_answer"
    | "shared_value"
    | "complementary_difference"
    | "compatible_conflict_style"
    | "aggregate_pattern";

export interface MatchReasonV2 {
    displayText: string;
    templateId: string;
    questionId: string;
    questionText: string;
    userAAnswer: unknown;
    userBAnswer: unknown;
    compatibilityType: MatchCompatibilityType;
    category: string;
    trait: string;
    confidence: number;
    score: number;
    evidenceSummary: string;
}

export interface MatchExplanationV2 {
    version: typeof MATCH_EXPLANATION_V2_VERSION;
    algorithmVersion: typeof MATCH_EXPLANATION_V2_ALGORITHM;
    generatedAt: string;
    reasons: MatchReasonV2[];
    fallbackUsed?: boolean;
}

export type ParsedMatchExplanation =
    | {
        kind: "empty";
        displayReasons: string[];
        v2: null;
    }
    | {
        kind: "legacy_string";
        displayReasons: string[];
        v2: null;
    }
    | {
        kind: "legacy_array";
        displayReasons: string[];
        v2: null;
    }
    | {
        kind: "v2";
        displayReasons: string[];
        v2: MatchExplanationV2;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanReasonText(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const cleaned = value.trim().replace(/\s+/g, " ");
    return cleaned.length > 0 ? cleaned : null;
}

function parseReasonV2(value: unknown): MatchReasonV2 | null {
    if (!isRecord(value)) return null;

    const displayText = cleanReasonText(value.displayText);
    const templateId = cleanReasonText(value.templateId);
    const questionId = cleanReasonText(value.questionId);
    const questionText = cleanReasonText(value.questionText);
    const compatibilityType = cleanReasonText(value.compatibilityType);
    const category = cleanReasonText(value.category);
    const trait = cleanReasonText(value.trait);
    const evidenceSummary = cleanReasonText(value.evidenceSummary);

    if (
        !displayText ||
        !templateId ||
        !questionId ||
        !questionText ||
        !compatibilityType ||
        !category ||
        !trait ||
        !evidenceSummary
    ) {
        return null;
    }

    const allowedTypes = new Set<MatchCompatibilityType>([
        "exact_match",
        "similar_answer",
        "shared_value",
        "complementary_difference",
        "compatible_conflict_style",
        "aggregate_pattern",
    ]);

    if (!allowedTypes.has(compatibilityType as MatchCompatibilityType)) {
        return null;
    }

    const confidence = typeof value.confidence === "number" ? value.confidence : 0;
    const score = typeof value.score === "number" ? value.score : 0;

    return {
        displayText,
        templateId,
        questionId,
        questionText,
        userAAnswer: value.userAAnswer,
        userBAnswer: value.userBAnswer,
        compatibilityType: compatibilityType as MatchCompatibilityType,
        category,
        trait,
        confidence,
        score,
        evidenceSummary,
    };
}

function parseV2(value: unknown): MatchExplanationV2 | null {
    if (!isRecord(value)) return null;
    if (value.version !== MATCH_EXPLANATION_V2_VERSION) return null;
    if (value.algorithmVersion !== MATCH_EXPLANATION_V2_ALGORITHM) return null;
    if (!Array.isArray(value.reasons)) return null;

    const generatedAt =
        typeof value.generatedAt === "string" && value.generatedAt.length > 0
            ? value.generatedAt
            : new Date(0).toISOString();

    const reasons = value.reasons
        .map(parseReasonV2)
        .filter((reason): reason is MatchReasonV2 => reason !== null);

    return {
        version: MATCH_EXPLANATION_V2_VERSION,
        algorithmVersion: MATCH_EXPLANATION_V2_ALGORITHM,
        generatedAt,
        reasons,
        fallbackUsed: value.fallbackUsed === true,
    };
}

export function parseMatchExplanation(
    explanation: string | null | undefined
): ParsedMatchExplanation {
    const raw = explanation?.trim();
    if (!raw) {
        return { kind: "empty", displayReasons: [], v2: null };
    }

    try {
        const parsed = JSON.parse(raw) as unknown;

        if (Array.isArray(parsed)) {
            return {
                kind: "legacy_array",
                displayReasons: parsed
                    .map(cleanReasonText)
                    .filter((reason): reason is string => reason !== null),
                v2: null,
            };
        }

        const v2 = parseV2(parsed);
        if (v2) {
            return {
                kind: "v2",
                displayReasons: v2.reasons.map((reason) => reason.displayText),
                v2,
            };
        }
    } catch {
        // Legacy explanations were stored as plain text.
    }

    const legacyReason = cleanReasonText(raw);
    return {
        kind: "legacy_string",
        displayReasons: legacyReason ? [legacyReason] : [],
        v2: null,
    };
}

export function getDisplayReasonsFromExplanation(
    explanation: string | null | undefined
): string[] {
    return parseMatchExplanation(explanation).displayReasons;
}

export function serializeMatchExplanationV2(explanation: MatchExplanationV2): string {
    return JSON.stringify(explanation);
}

export function createMatchExplanationV2(input: {
    generatedAt?: Date;
    reasons: MatchReasonV2[];
    fallbackUsed?: boolean;
}): MatchExplanationV2 {
    return {
        version: MATCH_EXPLANATION_V2_VERSION,
        algorithmVersion: MATCH_EXPLANATION_V2_ALGORITHM,
        generatedAt: (input.generatedAt ?? new Date()).toISOString(),
        reasons: input.reasons,
        fallbackUsed: input.fallbackUsed,
    };
}

export function normalizeReasonTextForComparison(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function textSimilarity(a: string, b: string): number {
    const tokensA = new Set(normalizeReasonTextForComparison(a).split(" ").filter(Boolean));
    const tokensB = new Set(normalizeReasonTextForComparison(b).split(" ").filter(Boolean));

    if (tokensA.size === 0 && tokensB.size === 0) return 1;
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const token of tokensA) {
        if (tokensB.has(token)) intersection++;
    }

    const union = tokensA.size + tokensB.size - intersection;
    return union > 0 ? intersection / union : 0;
}
