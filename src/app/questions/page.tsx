"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function QuestionsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isEditMode = searchParams.get("edit") === "true";

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

                // In edit mode, pre-fill existing answers
                if (isEditMode) {
                    const profileRes = await fetch("/api/profile");
                    if (profileRes.ok) {
                        const profileData = await profileRes.json();
                        if (profileData.answers) {
                            const existingAnswers: Record<string, AnswerValue> = {};
                            for (const [qId, val] of Object.entries(profileData.answers)) {
                                existingAnswers[qId] = val as AnswerValue;
                            }
                            setAnswers(existingAnswers);
                        }
                    }
                }
            } catch {
                setError("Failed to load questions");
            } finally {
                setLoading(false);
            }
        }
        loadQuestions();
    }, [isEditMode]);

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

                if (isEditMode) {
                    // In edit mode, only redirect after the very last question
                    if (currentIndex >= questions.length - 1) {
                        router.push("/dashboard");
                    }
                    return;
                }

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
        [router, isEditMode, currentIndex, questions.length]
    );

    function handleAnswer(value: AnswerValue) {
        const q = questions[currentIndex];
        if (!q) return;
        setAnswers((prev) => ({ ...prev, [q.id]: value }));
    }

    async function goNext() {
        if (animating || saving) return;

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
        if (animating) return;

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
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted">Loading questions...</p>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted">No questions available. Please seed the database first.</p>
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted">Loading question...</p>
                </div>
            </div>
        );
    }

    const progress = ((currentIndex + 1) / questions.length) * 100;
    const hasAnswer = answers[current.id] !== undefined && answers[current.id] !== null;

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 glass-panel-strong backdrop-blur-xl px-4 py-4">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <Image
                                src="/images/icon.png"
                                alt="FloatDate"
                                width={90}
                                height={30}
                            />
                            {isEditMode && (
                                <button
                                    onClick={() => router.push("/dashboard")}
                                    className="text-sm text-muted hover:text-cream/90 transition"
                                >
                                    ← Back to Dashboard
                                </button>
                            )}
                        </div>
                        <span className="text-sm text-muted font-medium">
                            {currentIndex + 1}{" "}
                            <span className="text-cream/90">/ {questions.length}</span>
                        </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                        <div
                            className="h-full bg-surface-elevated rounded-full transition-all duration-500 ease-out"
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
                        <div className="mt-4 bg-red-950/50 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="sticky bottom-0 glass-panel-strong backdrop-blur-xl px-4 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                    <button
                        onClick={goBack}
                        disabled={currentIndex === 0}
                        className="px-6 py-3 rounded-xl border border-mahogany text-muted hover:text-cream hover:border-mahogany transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                        ← Back
                    </button>

                    <div className="flex items-center gap-2">
                        {saving && (
                            <span className="text-xs text-muted flex items-center gap-1.5">
                                <span className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </span>
                        )}
                        {isEditMode && !saving && (
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="px-5 py-3 rounded-xl border border-mahogany text-muted hover:text-cream hover:border-mahogany transition-all"
                            >
                                Dashboard
                            </button>
                        )}
                    </div>

                    <button
                        onClick={goNext}
                        disabled={!hasAnswer || saving}
                        className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${hasAnswer
                            ? "bg-cream text-mahogany-deep hover:bg-[#ffffff]"
                            : "glass-panel text-cream-muted cursor-not-allowed"
                            }`}
                    >
                        {currentIndex === questions.length - 1
                            ? (isEditMode ? "Save Changes ✓" : "Finish ✓")
                            : "Next →"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function QuestionsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <QuestionsContent />
        </Suspense>
    );
}
