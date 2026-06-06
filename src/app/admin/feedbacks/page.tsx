"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface FeedbackUser {
    id: string;
    name: string;
    email: string;
    city: string;
}

interface FeedbackMatch {
    id: string;
    weekStart: string;
    similarityScore: number;
}

interface MatchFeedback {
    id: string;
    howItWent: string;
    feedbackText: string | null;
    createdAt: string;
    user: FeedbackUser;
    partner: FeedbackUser;
    match: FeedbackMatch;
}

const HOW_IT_WENT_MAP: Record<string, { label: string; emoji: string; color: string }> = {
    "never_started": { label: "Never Started", emoji: "🌱", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    "chatted": { label: "Chatted", emoji: "💬", color: "text-blue-700 bg-blue-50 border-blue-200" },
    "great_conversation": { label: "Great Convo", emoji: "✨", color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
    "met_in_person": { label: "Met in Person", emoji: "☕", color: "text-orange-700 bg-orange-50 border-orange-200" },
    "keep_seeing": { label: "Keep Seeing", emoji: "❤️", color: "text-rose-700 bg-rose-50 border-rose-200" },
    "faded": { label: "Faded", emoji: "🤷", color: "text-zinc-700 bg-zinc-100 border-zinc-200" },
    "felt_off": { label: "Felt Off", emoji: "🚩", color: "text-red-700 bg-red-50 border-red-200" },
    "ghosted": { label: "Ghosted", emoji: "😬", color: "text-purple-700 bg-purple-50 border-purple-200" },
    "figuring_out": { label: "Figuring Out", emoji: "⏸", color: "text-sky-700 bg-sky-50 border-sky-200" },
};

export default function AdminFeedbacksPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [feedbacks, setFeedbacks] = useState<MatchFeedback[]>([]);
    const [error, setError] = useState("");

    const fetchFeedbacks = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/feedback");
            if (res.status === 401) {
                setAuthorized(false);
                setLoading(false);
                return;
            }
            if (!res.ok) throw new Error("Failed to fetch");

            const data = await res.json();
            setAuthorized(true);
            setFeedbacks(data.feedbacks || []);
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Failed to load match feedbacks.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeedbacks();
    }, [fetchFeedbacks]);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", {
            timeZone: "America/Toronto",
            month: "short",
            day: "numeric",
        });
    };

    const stats = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const f of feedbacks) {
            counts[f.howItWent] = (counts[f.howItWent] || 0) + 1;
        }
        return counts;
    }, [feedbacks]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
                <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm text-center max-w-sm">
                    <p className="text-3xl mb-3">🔒</p>
                    <h1 className="text-xl font-bold text-zinc-900 mb-2">Access Denied</h1>
                    <p className="text-zinc-500 text-sm mb-4">
                        You don&apos;t have admin privileges.
                    </p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="text-sm text-zinc-500 hover:text-zinc-800 transition underline"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">Match Feedbacks</h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            Review how matches are performing across cycles.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/admin")}
                        className="text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-4 py-2 rounded-xl transition self-start"
                    >
                        ← Admin Panel
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">
                        {error}
                    </div>
                )}

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm text-center">
                        <p className="text-2xl font-bold text-white">{feedbacks.length}</p>
                        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider">Total Feedbacks</p>
                    </div>
                    
                    {Object.entries(HOW_IT_WENT_MAP).map(([key, info]) => {
                        const count = stats[key] || 0;
                        if (count === 0) return null;
                        return (
                            <div key={key} className={`border rounded-xl p-4 text-center ${info.color.split(" ")[1]} ${info.color.split(" ")[2]}`}>
                                <p className="text-2xl font-bold text-zinc-900">
                                    <span className="mr-2 text-xl">{info.emoji}</span>
                                    {count}
                                </p>
                                <p className={`text-xs mt-1 uppercase tracking-wider font-semibold ${info.color.split(" ")[0]}`}>
                                    {info.label}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Feedback Grid */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    {feedbacks.length === 0 ? (
                        <p className="text-zinc-500 text-center py-8">No feedback data available yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-100">
                                        <th className="text-left py-3 pr-4 text-zinc-500 font-medium whitespace-nowrap">Date</th>
                                        <th className="text-left py-3 pr-4 text-zinc-500 font-medium whitespace-nowrap">User</th>
                                        <th className="text-left py-3 pr-4 text-zinc-500 font-medium whitespace-nowrap">Partner</th>
                                        <th className="text-left py-3 pr-4 text-zinc-500 font-medium whitespace-nowrap">Cycle</th>
                                        <th className="text-left py-3 pr-4 text-zinc-500 font-medium whitespace-nowrap">How it went</th>
                                        <th className="text-left py-3 text-zinc-500 font-medium min-w-[200px]">Comments</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50">
                                    {feedbacks.map((fb) => {
                                        const howMap = HOW_IT_WENT_MAP[fb.howItWent] || { label: fb.howItWent, emoji: "❓", color: "bg-zinc-100 text-zinc-600 border-zinc-200" };
                                        
                                        return (
                                            <tr key={fb.id} className="hover:bg-zinc-50/50 transition">
                                                <td className="py-3 pr-4 text-zinc-500 whitespace-nowrap">
                                                    {formatDate(fb.createdAt)}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <div className="font-medium text-zinc-900">{fb.user.name}</div>
                                                    <div className="text-xs text-zinc-400">{fb.user.email}</div>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <div className="font-medium text-zinc-900">{fb.partner.name}</div>
                                                    <div className="text-xs text-zinc-400">{Math.round(fb.match.similarityScore * 100)}% match</div>
                                                </td>
                                                <td className="py-3 pr-4 text-zinc-500 whitespace-nowrap">
                                                    {formatDate(fb.match.weekStart)}
                                                </td>
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${howMap.color}`}>
                                                        <span>{howMap.emoji}</span>
                                                        {howMap.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-zinc-600 text-xs leading-relaxed max-w-sm">
                                                    {fb.feedbackText ? (
                                                        <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-2.5 text-zinc-700 italic">
                                                            &ldquo;{fb.feedbackText}&rdquo;
                                                        </div>
                                                    ) : (
                                                        <span className="text-zinc-300 italic">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
