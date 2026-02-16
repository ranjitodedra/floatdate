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
                <p className="text-lg md:text-xl text-zinc-900 font-medium leading-relaxed">
                    {questionText}
                </p>
                <div className="space-y-3">
                    {options.map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => onChange(i + 1)}
                            className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 ${selectedIndex === i + 1
                                    ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                                    : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
                                }`}
                        >
                            <span className="flex items-center gap-3">
                                <span
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedIndex === i + 1
                                            ? "border-white"
                                            : "border-zinc-300"
                                        }`}
                                >
                                    {selectedIndex === i + 1 && (
                                        <span className="w-2.5 h-2.5 rounded-full bg-white" />
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
                <p className="text-lg md:text-xl text-zinc-900 font-medium leading-relaxed">
                    {questionText}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {options.map((opt) => (
                        <button
                            key={opt}
                            onClick={() => onChange(opt)}
                            className={`px-5 py-4 rounded-xl border transition-all duration-200 text-center ${selectedVal === opt
                                    ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                                    : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
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
                <p className="text-lg md:text-xl text-zinc-900 font-medium leading-relaxed">
                    {questionText}
                </p>
                <div className="space-y-3">
                    {options.map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => onChange(opt)}
                            className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 ${selectedVal === opt
                                    ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                                    : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
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
            <p className="text-lg md:text-xl text-zinc-900 font-medium leading-relaxed">
                {questionText}
            </p>
            <div className="space-y-3">
                {options.map((opt, i) => (
                    <button
                        key={i}
                        onClick={() => onChange(opt)}
                        className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 ${selectedFallback === opt
                                ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
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
            <p className="text-lg md:text-xl text-zinc-900 font-medium leading-relaxed">
                {questionText}
            </p>
            <p className="text-sm text-zinc-500">
                Arrange from most preferred (top) to least preferred (bottom)
            </p>
            <div className="space-y-2">
                {ranked.map((opt, i) => (
                    <div
                        key={opt}
                        className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white border border-zinc-200 text-zinc-700"
                    >
                        <span className="text-zinc-900 font-bold text-sm w-6">
                            {i + 1}
                        </span>
                        <span className="flex-1">{opt}</span>
                        <div className="flex flex-col gap-1">
                            <button
                                type="button"
                                onClick={() => moveUp(i)}
                                disabled={i === 0}
                                className="text-xs text-zinc-400 hover:text-zinc-900 disabled:opacity-20 transition"
                                aria-label="Move up"
                            >
                                ▲
                            </button>
                            <button
                                type="button"
                                onClick={() => moveDown(i)}
                                disabled={i === ranked.length - 1}
                                className="text-xs text-zinc-400 hover:text-zinc-900 disabled:opacity-20 transition"
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
