"use client";

import { useState } from "react";

interface QuestionCardProps {
    question: {
        id: string;
        questionText: string;
        type: string;
        options: string[];
    };
    value: string | number | boolean | string[] | null;
    onChange: (value: string | number | boolean | string[]) => void;
}

const optionUnselected =
    "glass-panel text-cream/90 hover:bg-gold-soft/10 transition-all duration-200";
const optionSelected =
    "bg-cream text-mahogany-deep shadow-lg";

export default function QuestionCard({
    question,
    value,
    onChange,
}: QuestionCardProps) {
    const { type, options, questionText } = question;

    // Likert scale (1-5 or 1-7)
    if (type === "likert") {
        const selectedIndex = typeof value === "number" ? value : -1;
        return (
            <div className="space-y-6">
                <p className="text-lg md:text-xl text-cream font-medium leading-relaxed">
                    {questionText}
                </p>
                <div className="space-y-3">
                    {options.map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => onChange(i + 1)}
                            className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 ${selectedIndex === i + 1
                                    ? optionSelected
                                    : optionUnselected
                                }`}
                        >
                            <span className="flex items-center gap-3">
                                <span
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedIndex === i + 1
                                            ? "border-mahogany-deep"
                                            : "border-cream-faint"
                                        }`}
                                >
                                    {selectedIndex === i + 1 && (
                                        <span className="w-2.5 h-2.5 rounded-full bg-mahogany-deep" />
                                    )}
                                </span>
                                {opt}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Binary / Forced choice
    if (type === "binary") {
        const selectedVal = typeof value === "string" ? value : "";
        return (
            <div className="space-y-6">
                <p className="text-lg md:text-xl text-cream font-medium leading-relaxed">
                    {questionText}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {options.map((opt) => (
                        <button
                            key={opt}
                            onClick={() => onChange(opt)}
                            className={`px-5 py-4 rounded-xl transition-all duration-200 text-center ${selectedVal === opt
                                    ? optionSelected
                                    : optionUnselected
                                }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Multiple choice / Scenario
    if (type === "multiple_choice") {
        const selectedVal = typeof value === "string" ? value : "";
        return (
            <div className="space-y-6">
                <p className="text-lg md:text-xl text-cream font-medium leading-relaxed">
                    {questionText}
                </p>
                <div className="space-y-3">
                    {options.map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => onChange(opt)}
                            className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 ${selectedVal === opt
                                    ? optionSelected
                                    : optionUnselected
                                }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Ranking
    if (type === "ranking") {
        return <RankingInput questionText={questionText} options={options} value={value} onChange={onChange} />;
    }

    // Fallback: multiple choice style
    const selectedFallback = typeof value === "string" ? value : "";
    return (
        <div className="space-y-6">
            <p className="text-lg md:text-xl text-cream font-medium leading-relaxed">
                {questionText}
            </p>
            <div className="space-y-3">
                {options.map((opt, i) => (
                    <button
                        key={i}
                        onClick={() => onChange(opt)}
                        className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 ${selectedFallback === opt
                                ? optionSelected
                                : optionUnselected
                            }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}

// Ranking sub-component with drag-like reordering via buttons
function RankingInput({
    questionText,
    options,
    value,
    onChange,
}: {
    questionText: string;
    options: string[];
    value: string | number | boolean | string[] | null;
    onChange: (value: string[]) => void;
}) {
    const [ranked, setRanked] = useState<string[]>(
        Array.isArray(value) ? value : [...options]
    );

    function moveUp(index: number) {
        if (index === 0) return;
        const next = [...ranked];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        setRanked(next);
        onChange(next);
    }

    function moveDown(index: number) {
        if (index === ranked.length - 1) return;
        const next = [...ranked];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        setRanked(next);
        onChange(next);
    }

    return (
        <div className="space-y-6">
            <p className="text-lg md:text-xl text-cream font-medium leading-relaxed">
                {questionText}
            </p>
            <p className="text-sm text-cream-muted">
                Arrange from most preferred (top) to least preferred (bottom)
            </p>
            <div className="space-y-2">
                {ranked.map((opt, i) => (
                    <div
                        key={opt}
                        className="flex items-center gap-3 px-5 py-4 rounded-xl glass-panel text-cream/90"
                    >
                        <span className="text-cream font-bold text-sm w-6">
                            {i + 1}
                        </span>
                        <span className="flex-1">{opt}</span>
                        <div className="flex flex-col gap-1">
                            <button
                                type="button"
                                onClick={() => moveUp(i)}
                                disabled={i === 0}
                                className="text-xs text-cream-muted hover:text-cream disabled:opacity-20 transition"
                                aria-label="Move up"
                            >
                                ▲
                            </button>
                            <button
                                type="button"
                                onClick={() => moveDown(i)}
                                disabled={i === ranked.length - 1}
                                className="text-xs text-cream-muted hover:text-cream disabled:opacity-20 transition"
                                aria-label="Move down"
                            >
                                ▼
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
