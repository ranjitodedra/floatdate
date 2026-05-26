import { describe, expect, it } from "vitest";
import { createMatchExplanationV2, serializeMatchExplanationV2 } from "../match-explanation";
import { generateMatchExplanationV2, QuestionForReasoning } from "../match-reasoning-v2";

const weekStart = new Date("2026-05-11T00:00:00.000Z");
const generatedAt = new Date("2026-05-13T00:00:00.000Z");

const questions: QuestionForReasoning[] = [
    {
        id: "socio_02",
        questionText: "Which of the following best describes your general approach to personal finances?",
        weightDimension: "lifestyle",
        weight: 1.5,
        type: "multiple_choice",
        options: [
            "Strict budgeter; save as much as possible.",
            "Moderate saver; I budget but leave room for fun.",
            "Live for today; money is meant to be spent.",
        ],
    },
    {
        id: "conf_02_scen",
        questionText: "Scenario: You discover your partner made a medium-sized financial purchase without discussing it.",
        weightDimension: "communication",
        weight: 1.5,
        type: "multiple_choice",
        options: [
            "Bring it up immediately and express my frustration.",
            "Wait until we are both relaxed to calmly ask about it.",
            "Make a sarcastic comment about their spending habits.",
            "Avoid bringing it up to prevent an argument.",
        ],
    },
    {
        id: "val_02",
        questionText: "Rank the following in order of priority in your life right now:",
        weightDimension: "values",
        weight: 1.5,
        type: "ranking",
        options: [
            "Career & Ambition",
            "Family & Relationships",
            "Personal Growth & Hobbies",
            "Faith & Community",
        ],
    },
    {
        id: "habits_04",
        questionText: "Rank the following weekend activities from most to least enjoyable for you.",
        weightDimension: "lifestyle",
        weight: 1.5,
        type: "ranking",
        options: [
            "Night out at a busy club or bar",
            "Quiet evening at home watching movies",
            "Outdoor adventure (hiking, sports)",
            "Dinner party with close friends",
        ],
    },
    {
        id: "comm_02_scen",
        questionText: "Scenario: Your partner has a habit that mildly annoys you.",
        weightDimension: "communication",
        weight: 1.5,
        type: "multiple_choice",
        options: [
            "Directly tell them it bothers me.",
            "Drop subtle hints and hope they notice.",
            "Make a joke about it to soften the blow.",
            "I don't say anything; it's not worth the conflict.",
        ],
    },
    {
        id: "bf_02",
        questionText: "I follow a schedule and am exacting in my work and commitments.",
        weightDimension: "lifestyle",
        weight: 1.5,
        type: "likert",
        options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    },
    {
        id: "att_01",
        questionText: "I often worry that my partner will not want to stay with me.",
        weightDimension: "attachment",
        weight: 1.5,
        type: "likert",
        options: [
            "Strongly Disagree",
            "Disagree",
            "Somewhat Disagree",
            "Neutral",
            "Somewhat Agree",
            "Agree",
            "Strongly Agree",
        ],
    },
];

const strongAnswersA = [
    { questionId: "socio_02", value: "Moderate saver; I budget but leave room for fun." },
    { questionId: "conf_02_scen", value: "Wait until we are both relaxed to calmly ask about it." },
    {
        questionId: "val_02",
        value: [
            "Career & Ambition",
            "Family & Relationships",
            "Personal Growth & Hobbies",
            "Faith & Community",
        ],
    },
    {
        questionId: "habits_04",
        value: [
            "Outdoor adventure (hiking, sports)",
            "Dinner party with close friends",
            "Quiet evening at home watching movies",
            "Night out at a busy club or bar",
        ],
    },
    { questionId: "comm_02_scen", value: "Directly tell them it bothers me." },
    { questionId: "bf_02", value: 5 },
    { questionId: "att_01", value: 7 },
];

const strongAnswersB = [
    { questionId: "socio_02", value: "Moderate saver; I budget but leave room for fun." },
    { questionId: "conf_02_scen", value: "Wait until we are both relaxed to calmly ask about it." },
    {
        questionId: "val_02",
        value: [
            "Family & Relationships",
            "Career & Ambition",
            "Faith & Community",
            "Personal Growth & Hobbies",
        ],
    },
    {
        questionId: "habits_04",
        value: [
            "Outdoor adventure (hiking, sports)",
            "Quiet evening at home watching movies",
            "Dinner party with close friends",
            "Night out at a busy club or bar",
        ],
    },
    { questionId: "comm_02_scen", value: "Directly tell them it bothers me." },
    { questionId: "bf_02", value: 4 },
    { questionId: "att_01", value: 7 },
];

describe("generateMatchExplanationV2", () => {
    it("generates grounded reasons with structured evidence", () => {
        const result = generateMatchExplanationV2({
            answersA: strongAnswersA,
            answersB: strongAnswersB,
            questions,
            similarityScore: 0.91,
            weekStart,
            generatedAt,
            pairKey: "A:B:2026-05-11",
        });

        expect(result.explanation.version).toBe(2);
        expect(result.explanation.reasons.length).toBeGreaterThanOrEqual(3);
        expect(result.explanation.reasons.length).toBeLessThanOrEqual(4);

        for (const reason of result.explanation.reasons) {
            expect(reason.displayText).toContain("you");
            expect(reason.questionId).not.toBe("att_01");
            expect(reason.templateId).toMatch(/^v2\./);
            expect(reason.questionText.length).toBeGreaterThan(0);
            expect(reason.confidence).toBeGreaterThanOrEqual(0.58);
        }
    });

    it("keeps selected reasons diverse by category when alternatives exist", () => {
        const result = generateMatchExplanationV2({
            answersA: strongAnswersA,
            answersB: strongAnswersB,
            questions,
            similarityScore: 0.91,
            weekStart,
            generatedAt,
            pairKey: "A:B:2026-05-11",
        });

        const categories = result.explanation.reasons.map((reason) => reason.category);
        expect(new Set(categories).size).toBe(categories.length);
    });

    it("blocks repeated template/question reasons using historical V2 explanations", () => {
        const historyExplanation = createMatchExplanationV2({
            generatedAt: new Date("2026-05-06T00:00:00.000Z"),
            reasons: [
                {
                    displayText: "You both described your money style as budgeting with room for fun.",
                    templateId: "v2.socio_02.exact.moderate_saver_i_budget_but_leave_room_for_fun.v1",
                    questionId: "socio_02",
                    questionText: questions[0].questionText ?? "socio_02",
                    userAAnswer: "Moderate saver; I budget but leave room for fun.",
                    userBAnswer: "Moderate saver; I budget but leave room for fun.",
                    compatibilityType: "exact_match",
                    category: "money",
                    trait: "financial_style",
                    confidence: 0.95,
                    score: 0.96,
                    evidenceSummary: "Historical reason.",
                },
            ],
        });

        const result = generateMatchExplanationV2({
            answersA: strongAnswersA,
            answersB: strongAnswersB,
            questions,
            similarityScore: 0.91,
            weekStart,
            generatedAt,
            historicalMatches: [
                {
                    weekStart: new Date("2026-05-04T00:00:00.000Z"),
                    explanation: serializeMatchExplanationV2(historyExplanation),
                },
            ],
            pairKey: "A:B:2026-05-11",
        });

        expect(result.explanation.reasons.some((reason) => reason.questionId === "socio_02")).toBe(false);
        expect(result.debug.rejected.some((item) => item.questionId === "socio_02")).toBe(true);
    });

    it("blocks highly similar legacy display text", () => {
        const result = generateMatchExplanationV2({
            answersA: strongAnswersA,
            answersB: strongAnswersB,
            questions,
            similarityScore: 0.91,
            weekStart,
            generatedAt,
            historicalMatches: [
                {
                    weekStart: new Date("2025-01-06T00:00:00.000Z"),
                    explanation: "You both described your money style as budgeting with room for fun.",
                },
            ],
            pairKey: "A:B:2026-05-11",
        });

        expect(result.explanation.reasons.some((reason) => reason.questionId === "socio_02")).toBe(false);
    });

    it("uses a safe aggregate fallback when strong safe evidence is broad but no single reason stands out", () => {
        const neutralQuestions: QuestionForReasoning[] = [
            questions.find((q) => q.id === "bf_02")!,
            {
                id: "comm_03_beh",
                questionText: "I regularly ask my partner about their day and actively listen without interrupting.",
                weightDimension: "communication",
                weight: 1.5,
                type: "likert",
                options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
            },
            {
                id: "habits_05",
                questionText: "I prefer my living space to be meticulously organized at all times.",
                weightDimension: "lifestyle",
                weight: 1.5,
                type: "likert",
                options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
            },
            {
                id: "time_02",
                questionText: "When making major decisions, I heavily weigh the long-term impact.",
                weightDimension: "lifestyle",
                weight: 1.5,
                type: "likert",
                options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
            },
            {
                id: "social_01",
                questionText: "After attending a large social event, I feel energized rather than drained.",
                weightDimension: "interests",
                weight: 1.5,
                type: "likert",
                options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
            },
        ];
        const neutralAnswers = neutralQuestions.map((question) => ({
            questionId: question.id,
            value: 3,
        }));

        const result = generateMatchExplanationV2({
            answersA: neutralAnswers,
            answersB: neutralAnswers,
            questions: neutralQuestions,
            similarityScore: 0.82,
            weekStart,
            generatedAt,
            pairKey: "A:B:2026-05-11",
        });

        expect(result.explanation.fallbackUsed).toBe(true);
        expect(result.explanation.reasons).toHaveLength(1);
        expect(result.explanation.reasons[0].compatibilityType).toBe("aggregate_pattern");
    });

    it("is deterministic for identical inputs", () => {
        const input = {
            answersA: strongAnswersA,
            answersB: strongAnswersB,
            questions,
            similarityScore: 0.91,
            weekStart,
            generatedAt,
            pairKey: "A:B:2026-05-11",
        };

        const first = generateMatchExplanationV2(input).explanation;
        const second = generateMatchExplanationV2(input).explanation;

        expect(second).toEqual(first);
    });
});
