"use client";

import React from "react";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface OptedInUser {
    id: string;
    name: string;
    email: string;
    city: string;
    gender: string;
    genderPref: string;
    completedSetup: boolean;
    optedInAt: string;
}

interface MatchPreview {
    userA: { name: string; email: string; city: string };
    userB: { name: string; email: string; city: string };
    similarityScore: number;
    reasons: string[];
}

interface UnmatchedUser {
    name: string;
    email: string;
    city: string;
}

interface PreviewResult {
    weekStart: string;
    totalOptedIn: number;
    matches: MatchPreview[];
    unmatched: UnmatchedUser[];
}

interface WeekHistory {
    weekNumber: number;
    weekStart: string;
    weekEnd: string;
    totalOptedIn: number;
    users: OptedInUser[];
}

export default function AdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [users, setUsers] = useState<OptedInUser[]>([]);
    const [weekStart, setWeekStart] = useState("");
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [previewing, setPreviewing] = useState(false);
    const [error, setError] = useState("");
    const [weekHistory, setWeekHistory] = useState<WeekHistory[]>([]);
    const [historyGrandTotal, setHistoryGrandTotal] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

    const fetchOptedIn = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/opted-in");
            if (res.status === 401) {
                setAuthorized(false);
                setLoading(false);
                return;
            }
            if (!res.ok) throw new Error("Failed to fetch");

            const data = await res.json();
            setAuthorized(true);
            setUsers(data.users);
            setWeekStart(data.weekStart);
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Failed to load opted-in users.");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchWeekHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await fetch("/api/admin/opted-in-history");
            if (!res.ok) throw new Error("Failed to fetch history");
            const data = await res.json();
            setWeekHistory(data.weeks);
            setHistoryGrandTotal(data.grandTotal);
        } catch (err) {
            console.error("History fetch error:", err);
            setError("Failed to load opt-in history.");
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const toggleWeekExpanded = (weekNumber: number) => {
        setExpandedWeeks((prev) => {
            const next = new Set(prev);
            if (next.has(weekNumber)) {
                next.delete(weekNumber);
            } else {
                next.add(weekNumber);
            }
            return next;
        });
    };

    useEffect(() => {
        fetchOptedIn();
    }, [fetchOptedIn]);

    async function handlePreview() {
        setPreviewing(true);
        setError("");
        try {
            const res = await fetch("/api/admin/preview-matching", {
                method: "POST",
            });
            if (!res.ok) throw new Error("Preview failed");
            const data: PreviewResult = await res.json();
            setPreview(data);
        } catch (err) {
            console.error("Preview error:", err);
            setError("Failed to preview matches.");
        } finally {
            setPreviewing(false);
        }
    }

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

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString("en-US", {
            timeZone: "America/Toronto",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">Admin Panel</h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            Week of {formatDate(weekStart)}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="text-sm text-zinc-400 hover:text-zinc-700 transition"
                    >
                        ← Dashboard
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* Opted-In Users Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-zinc-900">
                            Opted-In Users
                        </h2>
                        <span className="bg-zinc-100 text-zinc-700 text-sm font-medium px-3 py-1 rounded-full">
                            {users.length} user{users.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {users.length === 0 ? (
                        <p className="text-zinc-400 text-sm text-center py-6">
                            No users opted in this week yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-100">
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">#</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Name</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Email</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">City</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Gender</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Pref</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Setup</th>
                                        <th className="text-left py-2 text-zinc-400 font-medium">Opted In</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u, i) => (
                                        <tr
                                            key={u.id}
                                            className="border-b border-zinc-50 hover:bg-zinc-50 transition"
                                        >
                                            <td className="py-2.5 pr-4 text-zinc-400">{i + 1}</td>
                                            <td className="py-2.5 pr-4 text-zinc-900 font-medium">{u.name}</td>
                                            <td className="py-2.5 pr-4 text-zinc-500">{u.email}</td>
                                            <td className="py-2.5 pr-4 text-zinc-500">{u.city}</td>
                                            <td className="py-2.5 pr-4 text-zinc-500 capitalize">{u.gender}</td>
                                            <td className="py-2.5 pr-4 text-zinc-500 capitalize">{u.genderPref}</td>
                                            <td className="py-2.5 pr-4">
                                                {u.completedSetup ? (
                                                    <span className="text-green-600">✓</span>
                                                ) : (
                                                    <span className="text-red-400">✗</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 text-zinc-400 text-xs">
                                                {formatDate(u.optedInAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Weekly Opt-In History Section */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900">
                                Weekly Opt-In History
                            </h2>
                            <p className="text-zinc-400 text-sm mt-1">
                                Breakdown of opted-in users by week
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                if (!showHistory && weekHistory.length === 0) {
                                    fetchWeekHistory();
                                }
                                setShowHistory(!showHistory);
                            }}
                            className="px-4 py-2 bg-zinc-100 text-zinc-700 font-medium rounded-xl hover:bg-zinc-200 transition-all duration-200 text-sm"
                        >
                            {showHistory ? "Hide History" : "Show History"}
                        </button>
                    </div>

                    {showHistory && (
                        <>
                            {historyLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : weekHistory.length === 0 ? (
                                <p className="text-zinc-400 text-sm text-center py-6">
                                    No opt-in history found.
                                </p>
                            ) : (
                                <>
                                    {/* Summary Table */}
                                    <div className="overflow-x-auto mb-4">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-zinc-100">
                                                    <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Week</th>
                                                    <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Date Range</th>
                                                    <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Opted In</th>
                                                    <th className="text-left py-2 text-zinc-400 font-medium"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {weekHistory.map((week) => (
                                                    <React.Fragment key={`week-${week.weekNumber}`}>
                                                        <tr
                                                            className="border-b border-zinc-50 hover:bg-zinc-50 transition cursor-pointer"
                                                            onClick={() => toggleWeekExpanded(week.weekNumber)}
                                                        >
                                                            <td className="py-2.5 pr-4 text-zinc-900 font-medium">
                                                                Week {week.weekNumber}
                                                            </td>
                                                            <td className="py-2.5 pr-4 text-zinc-500">
                                                                {formatDate(week.weekStart)} → {formatDate(week.weekEnd)}
                                                            </td>
                                                            <td className="py-2.5 pr-4">
                                                                <span className="bg-zinc-100 text-zinc-700 text-xs font-medium px-2.5 py-1 rounded-full">
                                                                    {week.totalOptedIn}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 text-zinc-400 text-xs">
                                                                {expandedWeeks.has(week.weekNumber) ? "▲" : "▼"}
                                                            </td>
                                                        </tr>
                                                        {expandedWeeks.has(week.weekNumber) && (
                                                            <tr key={`detail-${week.weekNumber}`}>
                                                                <td colSpan={4} className="py-2 px-4">
                                                                    <div className="bg-zinc-50 rounded-xl p-4">
                                                                        <table className="w-full text-xs">
                                                                            <thead>
                                                                                <tr className="border-b border-zinc-200">
                                                                                    <th className="text-left py-1.5 pr-3 text-zinc-400 font-medium">#</th>
                                                                                    <th className="text-left py-1.5 pr-3 text-zinc-400 font-medium">Name</th>
                                                                                    <th className="text-left py-1.5 pr-3 text-zinc-400 font-medium">Email</th>
                                                                                    <th className="text-left py-1.5 pr-3 text-zinc-400 font-medium">City</th>
                                                                                    <th className="text-left py-1.5 pr-3 text-zinc-400 font-medium">Gender</th>
                                                                                    <th className="text-left py-1.5 pr-3 text-zinc-400 font-medium">Pref</th>
                                                                                    <th className="text-left py-1.5 text-zinc-400 font-medium">Setup</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {week.users.map((u, idx) => (
                                                                                    <tr key={u.id} className="border-b border-zinc-100">
                                                                                        <td className="py-1.5 pr-3 text-zinc-400">{idx + 1}</td>
                                                                                        <td className="py-1.5 pr-3 text-zinc-900 font-medium">{u.name}</td>
                                                                                        <td className="py-1.5 pr-3 text-zinc-500">{u.email}</td>
                                                                                        <td className="py-1.5 pr-3 text-zinc-500">{u.city}</td>
                                                                                        <td className="py-1.5 pr-3 text-zinc-500 capitalize">{u.gender}</td>
                                                                                        <td className="py-1.5 pr-3 text-zinc-500 capitalize">{u.genderPref}</td>
                                                                                        <td className="py-1.5">
                                                                                            {u.completedSetup ? (
                                                                                                <span className="text-green-600">✓</span>
                                                                                            ) : (
                                                                                                <span className="text-red-400">✗</span>
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                                <tr className="border-t-2 border-zinc-200">
                                                    <td className="py-2.5 pr-4 text-zinc-900 font-bold">Total</td>
                                                    <td className="py-2.5 pr-4"></td>
                                                    <td className="py-2.5 pr-4">
                                                        <span className="bg-zinc-900 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                                            {historyGrandTotal}
                                                        </span>
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Preview Matches Button */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900">Match Preview</h2>
                            <p className="text-zinc-400 text-sm mt-1">
                                Dry run — no emails sent, no data saved
                            </p>
                        </div>
                        <button
                            onClick={handlePreview}
                            disabled={previewing || users.length < 2}
                            className="px-5 py-2.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {previewing ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Running...
                                </span>
                            ) : (
                                "Preview Matches"
                            )}
                        </button>
                    </div>
                </div>

                {/* Preview Results */}
                {preview && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm text-center">
                                <p className="text-2xl font-bold text-zinc-900">{preview.totalOptedIn}</p>
                                <p className="text-xs text-zinc-400 mt-1">Total Opted In</p>
                            </div>
                            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm text-center">
                                <p className="text-2xl font-bold text-green-600">{preview.matches.length * 2}</p>
                                <p className="text-xs text-zinc-400 mt-1">Would Be Matched</p>
                            </div>
                            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm text-center">
                                <p className="text-2xl font-bold text-amber-500">{preview.unmatched.length}</p>
                                <p className="text-xs text-zinc-400 mt-1">Unmatched</p>
                            </div>
                        </div>

                        {/* Match Pairs */}
                        {preview.matches.length > 0 && (
                            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-zinc-900 mb-4">
                                    Match Pairs ({preview.matches.length})
                                </h3>
                                <div className="space-y-4">
                                    {preview.matches.map((m, i) => (
                                        <div
                                            key={i}
                                            className="border border-zinc-100 rounded-xl p-4 hover:border-zinc-200 transition"
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                        {m.userA.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-zinc-900 font-medium text-sm truncate">{m.userA.name}</p>
                                                        <p className="text-zinc-400 text-xs truncate">{m.userA.email}</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-center flex-shrink-0 px-2">
                                                    <span className="text-zinc-300 text-lg">💜</span>
                                                    <span className="text-xs font-bold text-zinc-700 mt-0.5">
                                                        {Math.round(m.similarityScore * 100)}%
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 flex-1 justify-end">
                                                    <div className="min-w-0 text-right">
                                                        <p className="text-zinc-900 font-medium text-sm truncate">{m.userB.name}</p>
                                                        <p className="text-zinc-400 text-xs truncate">{m.userB.email}</p>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                        {m.userB.name.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
                                            </div>

                                            {m.reasons.length > 0 && (
                                                <div className="bg-zinc-50 rounded-lg p-3 mt-2">
                                                    <p className="text-xs font-medium text-zinc-500 mb-1.5">Match reasons:</p>
                                                    <ul className="text-xs text-zinc-600 space-y-0.5">
                                                        {m.reasons.map((r, j) => (
                                                            <li key={j}>• {r}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Unmatched Users */}
                        {preview.unmatched.length > 0 && (
                            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-zinc-900 mb-4">
                                    Unmatched Users ({preview.unmatched.length})
                                </h3>
                                <div className="space-y-2">
                                    {preview.unmatched.map((u, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 py-2 px-3 bg-amber-50 border border-amber-100 rounded-lg"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-zinc-900 text-sm font-medium truncate">{u.name}</p>
                                                <p className="text-zinc-400 text-xs truncate">{u.email} · {u.city}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
