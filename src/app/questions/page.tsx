"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import QuestionCard from "@/components/QuestionCard";

interface Question {
    id: string;
    orderIndex: number;
    questionText: string;
    type: string;
    options: string[];
}

type AnswerValue = string | number | boolean | string[];

export default function QuestionsPage() {
    const router = useRouter();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [direction, setDirection] = useState<"next" | "prev">("next");
    const [animating, setAnimating] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadQuestions() {
            try {
                const res = await fetch("/api/questions");
                const data = await res.json();
                if (data.questions) {
                    setQuestions(data.questions);
                }
            } catch {
                setError("Failed to load questions");
            } finally {
                setLoading(false);
            }
        }
        loadQuestions();
    }, []);

    // Ensure currentIndex is valid when questions change
    useEffect(() => {
        if (questions.length > 0 && currentIndex >= questions.length) {
            setCurrentIndex(0);
        }
    }, [questions, currentIndex]);

    const saveAnswer = useCallback(
        async (questionId: string, value: AnswerValue) => {
            setSaving(true);
            try {
                const res = await fetch("/api/answers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        answers: [{ questionId, value }],
                    }),
                });
                const data = await res.json();

                if (data.completedSetup) {
                    router.push("/dashboard");
                    return;
                }
            } catch {
                console.error("Failed to save answer");
            } finally {
                setSaving(false);
            }
        },
        [router]
    );

    function handleAnswer(value: AnswerValue) {
        const q = questions[currentIndex];
        if (!q) return;
        setAnswers((prev) => ({ ...prev, [q.id]: value }));
    }

    async function goNext() {
        const q = questions[currentIndex];
        if (!q) return;
        
        const val = answers[q.id];

        if (val === undefined || val === null) {
            setError("Please answer the question before continuing");
            return;
        }

        setError("");

        // Save current answer
        await saveAnswer(q.id, val);

        if (currentIndex < questions.length - 1) {
            setDirection("next");
            setAnimating(true);
            setTimeout(() => {
                setCurrentIndex((prev) => prev + 1);
                setAnimating(false);
            }, 250);
        }
    }

    function goBack() {
        if (currentIndex > 0) {
            setError("");
            setDirection("prev");
            setAnimating(true);
            setTimeout(() => {
                setCurrentIndex((prev) => prev - 1);
                setAnimating(false);
            }, 250);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-500">Loading questions...</p>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <p className="text-zinc-500">No questions available. Please seed the database first.</p>
            </div>
        );
    }

    const current = questions[currentIndex];
    
    // Safety check: if current is undefined, reset to first question
    if (!current) {
        if (currentIndex !== 0 && questions.length > 0) {
            setCurrentIndex(0);
        }
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-500">Loading question...</p>
                </div>
            </div>
        );
    }

    const progress = ((currentIndex + 1) / questions.length) * 100;
    const hasAnswer = answers[current.id] !== undefined && answers[current.id] !== null;

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-4 py-4">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-3">
                        <Image
                            src="/images/icon.png"
                            alt="FloatDate"
                            width={90}
                            height={30}
                        />
                        <span className="text-sm text-zinc-500 font-medium">
                            {currentIndex + 1}{" "}
                            <span className="text-zinc-300">/ {questions.length}</span>
                        </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-zinc-800 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Question area */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-2xl">
                    <div
                        className={`transition-all duration-250 ease-out ${animating
                                ? direction === "next"
                                    ? "opacity-0 translate-x-8"
                                    : "opacity-0 -translate-x-8"
                                : "opacity-100 translate-x-0"
                            }`}
                    >
                        <QuestionCard
                            question={current}
                            value={answers[current.id] ?? null}
                            onChange={handleAnswer}
                        />
                    </div>

                    {error && (
                        <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-zinc-200 px-4 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                    <button
                        onClick={goBack}
                        disabled={currentIndex === 0}
                        className="px-6 py-3 rounded-xl border border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                        ← Back
                    </button>

                    <div className="flex items-center gap-2">
                        {saving && (
                            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                                <span className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </span>
                        )}
                    </div>

                    <button
                        onClick={goNext}
                        disabled={!hasAnswer || saving}
                        className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${hasAnswer
                                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                                : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                            }`}
                    >
                        {currentIndex === questions.length - 1 ? "Finish ✓" : "Next →"}
                    </button>
                </div>
            </div>
        </div>
    );
}
