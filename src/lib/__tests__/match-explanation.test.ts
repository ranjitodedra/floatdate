import { describe, expect, it } from "vitest";
import {
    createMatchExplanationV2,
    getDisplayReasonsFromExplanation,
    parseMatchExplanation,
    serializeMatchExplanationV2,
    textSimilarity,
} from "../match-explanation";

describe("match explanation parser", () => {
    it("parses legacy plain-string explanations", () => {
        const parsed = parseMatchExplanation("You both value clear communication.");

        expect(parsed.kind).toBe("legacy_string");
        expect(parsed.displayReasons).toEqual(["You both value clear communication."]);
        expect(parsed.v2).toBeNull();
    });

    it("parses legacy JSON-array explanations", () => {
        const parsed = parseMatchExplanation(JSON.stringify(["Reason one", "Reason two"]));

        expect(parsed.kind).toBe("legacy_array");
        expect(parsed.displayReasons).toEqual(["Reason one", "Reason two"]);
        expect(parsed.v2).toBeNull();
    });

    it("parses V2 structured explanations and exposes only display reasons by default", () => {
        const explanation = createMatchExplanationV2({
            generatedAt: new Date("2026-05-13T00:00:00.000Z"),
            reasons: [
                {
                    displayText: "You both described your money style as budgeting with room for fun.",
                    templateId: "v2.socio_02.exact.moderate_saver.v1",
                    questionId: "socio_02",
                    questionText: "Which of the following best describes your general approach to personal finances?",
                    userAAnswer: "Moderate saver; I budget but leave room for fun.",
                    userBAnswer: "Moderate saver; I budget but leave room for fun.",
                    compatibilityType: "exact_match",
                    category: "money",
                    trait: "financial_style",
                    confidence: 0.95,
                    score: 0.96,
                    evidenceSummary: "Both users chose the same money-style answer.",
                },
            ],
        });

        const serialized = serializeMatchExplanationV2(explanation);
        const parsed = parseMatchExplanation(serialized);

        expect(parsed.kind).toBe("v2");
        expect(parsed.displayReasons).toEqual([
            "You both described your money style as budgeting with room for fun.",
        ]);
        expect(parsed.v2?.reasons[0].questionId).toBe("socio_02");
    });

    it("returns an empty display list for empty input", () => {
        expect(getDisplayReasonsFromExplanation("")).toEqual([]);
        expect(getDisplayReasonsFromExplanation(null)).toEqual([]);
    });

    it("detects highly similar text", () => {
        expect(
            textSimilarity(
                "You both described your money style as budgeting with room for fun.",
                "You both described your money style as budgeting with room for fun"
            )
        ).toBeGreaterThan(0.9);
    });
});
