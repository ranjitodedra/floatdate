"use client";

import React from "react";

import { useEffect, useState, useCallback, useMemo } from "react";
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
    universityId: string;
    universityName: string;
}

interface MatchPreview {
    userA: {
        name: string;
        email: string;
        city: string;
        universityName: string;
    };
    userB: {
        name: string;
        email: string;
        city: string;
        universityName: string;
    };
    similarityScore: number;
    reasons: string[];
}

interface UnmatchedUser {
    name: string;
    email: string;
    city: string;
    universityName: string;
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

interface University {
    id: string;
    name: string;
    slug: string;
}

interface WeekChoice {
    weekStart: string;
    label: string;
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

    // View as User state
    const [viewAsEmail, setViewAsEmail] = useState("");
    const [viewAsLoading, setViewAsLoading] = useState(false);
    const [viewAsError, setViewAsError] = useState("");
    const [viewAsSuccess, setViewAsSuccess] = useState("");

    const [universities, setUniversities] = useState<University[]>([]);
    const [observationUniversityId, setObservationUniversityId] = useState("");
    const [weekChoices, setWeekChoices] = useState<WeekChoice[]>([]);
    const [previewWeekStart, setPreviewWeekStart] = useState("");
    const [previewUniversityId, setPreviewUniversityId] = useState("");

    const fetchUniversities = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/universities");
            if (!res.ok) return;
            const data = await res.json();
            setUniversities(data.universities ?? []);
        } catch {
            // ignore
        }
    }, []);

    const fetchOptedIn = useCallback(async () => {
        try {
            const qs =
                observationUniversityId.length > 0
                    ? `?universityId=${encodeURIComponent(observationUniversityId)}`
                    : "";
            const res = await fetch(`/api/admin/opted-in${qs}`);
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
    }, [observationUniversityId]);

    const fetchWeekHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const qs =
                observationUniversityId.length > 0
                    ? `?universityId=${encodeURIComponent(observationUniversityId)}`
                    : "";
            const res = await fetch(`/api/admin/opted-in-history${qs}`);
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
    }, [observationUniversityId]);

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

    async function handleViewAsUser(e: React.FormEvent) {
        e.preventDefault();
        if (!viewAsEmail.trim()) return;
        setViewAsLoading(true);
        setViewAsError("");
        setViewAsSuccess("");
        try {
            const res = await fetch("/api/admin/impersonate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: viewAsEmail.trim() }),
            });
            if (!res.ok) {
                const data = await res.json();
                setViewAsError(data.error || "Failed to fetch user data");
                return;
            }
            const data = await res.json();
            setViewAsSuccess("Impersonation started. Redirecting to dashboard...");
            router.push(data.redirectTo ?? "/dashboard");
        } catch {
            setViewAsError("Failed to start impersonation");
        } finally {
            setViewAsLoading(false);
        }
    }

    useEffect(() => {
        fetchOptedIn();
        fetchUniversities();
        fetch("/api/admin/opted-in-history")
            .then((res) => (res.ok ? res.json() : null))
            .then((data: { weeks?: WeekHistory[] } | null) => {
                if (!data?.weeks?.length) return;
                const choices: WeekChoice[] = data.weeks
                    .map((w) => ({
                        weekStart: w.weekStart,
                        label: `Week ${w.weekNumber} (${new Date(w.weekStart).toLocaleDateString("en-US", { timeZone: "America/Toronto", month: "short", day: "numeric" })} – ${new Date(w.weekEnd).toLocaleDateString("en-US", { timeZone: "America/Toronto", month: "short", day: "numeric" })})`,
                    }))
                    .sort(
                        (a, b) =>
                            new Date(b.weekStart).getTime() -
                            new Date(a.weekStart).getTime()
                    );
                setWeekChoices(choices);
            })
            .catch(() => { });
    }, [fetchOptedIn, fetchUniversities]);

    useEffect(() => {
        if (weekStart && !previewWeekStart) {
            setPreviewWeekStart(weekStart);
        }
    }, [weekStart, previewWeekStart]);

    useEffect(() => {
        if (!showHistory) return;
        fetchWeekHistory();
    }, [observationUniversityId, showHistory, fetchWeekHistory]);

    async function handlePreview() {
        setPreviewing(true);
        setError("");
        try {
            const body: { weekStart?: string; universityId?: string | null } = {};
            if (previewWeekStart) {
                body.weekStart = previewWeekStart;
            }
            if (previewUniversityId) {
                body.universityId = previewUniversityId;
            }
            const res = await fetch("/api/admin/preview-matching", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
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

    const previewWeekOptions = useMemo(() => {
        const byIso = new Map<string, string>();
        for (const c of weekChoices) {
            byIso.set(c.weekStart, c.label);
        }
        if (weekStart && !byIso.has(weekStart)) {
            byIso.set(
                weekStart,
                `Current cycle (${new Date(weekStart).toLocaleDateString("en-US", { timeZone: "America/Toronto", month: "short", day: "numeric", year: "numeric" })})`
            );
        }
        return Array.from(byIso.entries())
            .map(([ws, label]) => ({ weekStart: ws, label }))
            .sort(
                (a, b) =>
                    new Date(b.weekStart).getTime() -
                    new Date(a.weekStart).getTime()
            );
    }, [weekChoices, weekStart]);

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
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">Admin Panel</h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            Week of {formatDate(weekStart)}
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push("/admin/users")}
                            className="mt-3 text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-4 py-2 rounded-xl transition"
                        >
                            All Users →
                        </button>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <label className="text-xs text-zinc-500 self-end">Filter opted-in &amp; history</label>
                        <select
                            value={observationUniversityId}
                            onChange={(e) => setObservationUniversityId(e.target.value)}
                            className="border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 min-w-[220px]"
                        >
                            <option value="">All universities</option>
                            {universities.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="text-sm text-zinc-400 hover:text-zinc-700 transition"
                        >
                            ← Dashboard
                        </button>
                    </div>
                </div>

                {/* Float Live & Match Feedback Quick Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => router.push("/admin/feedbacks")}
                        className="bg-indigo-600 border border-indigo-700 rounded-2xl p-5 text-left hover:bg-indigo-700 transition shadow-sm group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-semibold text-white">Match Feedbacks</h2>
                            <span className="text-indigo-200 group-hover:text-white transition group-hover:translate-x-1">→</span>
                        </div>
                        <p className="text-indigo-100 text-sm">View user responses on how their matches went.</p>
                    </button>

                    <button
                        onClick={() => router.push("/admin/float-live-chats")}
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left hover:bg-zinc-800 transition shadow-sm group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-semibold text-white">Float Live Chats</h2>
                            <span className="text-zinc-400 group-hover:text-white transition group-hover:translate-x-1">→</span>
                        </div>
                        <p className="text-zinc-400 text-sm">View all conversations, manage reports, and delete chats.</p>
                    </button>
                    
                    <button
                        onClick={() => router.push("/admin/reports")}
                        className="bg-white border border-zinc-200 rounded-2xl p-5 text-left hover:border-zinc-300 hover:shadow-md transition shadow-sm group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-semibold text-zinc-900">Abuse Reports</h2>
                            <span className="text-zinc-400 group-hover:text-zinc-900 transition group-hover:translate-x-1">→</span>
                        </div>
                        <p className="text-zinc-500 text-sm">Review user reports and take necessary actions.</p>
                    </button>

                    <button
                        onClick={() => router.push("/admin/show-applications")}
                        className="bg-emerald-600 border border-emerald-700 rounded-2xl p-5 text-left hover:bg-emerald-700 transition shadow-sm group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-semibold text-white">Show Applications</h2>
                            <span className="text-emerald-200 group-hover:text-white transition group-hover:translate-x-1">→</span>
                        </div>
                        <p className="text-emerald-100 text-sm">Review Float Pop or Match casting applications.</p>
                    </button>

                    <button
                        onClick={() => router.push("/admin/verification-requests")}
                        className="bg-amber-600 border border-amber-700 rounded-2xl p-5 text-left hover:bg-amber-700 transition shadow-sm group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-semibold text-white">Verification Requests</h2>
                            <span className="text-amber-200 group-hover:text-white transition group-hover:translate-x-1">→</span>
                        </div>
                        <p className="text-amber-100 text-sm">Review Gmail document verifications and university requests.</p>
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* View as User Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-zinc-900">View as User</h2>
                        <p className="text-zinc-400 text-sm mt-1">
                            Enter an email to see their dashboard (read-only)
                        </p>
                    </div>

                    <form onSubmit={handleViewAsUser} className="flex gap-3 mb-4">
                        <input
                            type="email"
                            value={viewAsEmail}
                            onChange={(e) => setViewAsEmail(e.target.value)}
                            placeholder="user@mylaurier.ca"
                            className="flex-1 px-4 py-2.5 border border-zinc-300 rounded-xl text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all"
                            required
                        />
                        <button
                            type="submit"
                            disabled={viewAsLoading}
                            className="px-5 py-2.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50 text-sm flex-shrink-0"
                        >
                            {viewAsLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Loading...
                                </span>
                            ) : (
                                "View Dashboard"
                            )}
                        </button>
                    </form>

                    {viewAsError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm mb-4">
                            {viewAsError}
                        </div>
                    )}

                    {viewAsSuccess && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm mb-4">
                            {viewAsSuccess}
                        </div>
                    )}
                </div>

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
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">University</th>
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
                                            <td className="py-2.5 pr-4 text-zinc-600 text-xs">{u.universityName}</td>
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
                            onClick={() => setShowHistory(!showHistory)}
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
                                                                                    <th className="text-left py-1.5 pr-3 text-zinc-400 font-medium">University</th>
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
                                                                                        <td className="py-1.5 pr-3 text-zinc-600">{u.universityName}</td>
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

                {/* Match Preview */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-zinc-900">Match Preview</h2>
                        <p className="text-zinc-400 text-sm mt-1">
                            Dry run: no emails sent, no data saved. Pick a week and optionally a
                            university pool.
                        </p>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-end gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs text-zinc-500 font-medium mb-1.5">
                                Week (cycle start)
                            </label>
                            <select
                                value={previewWeekStart || weekStart}
                                onChange={(e) => setPreviewWeekStart(e.target.value)}
                                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                            >
                                {previewWeekOptions.length === 0 && weekStart ? (
                                    <option value={weekStart}>
                                        Current cycle ({formatDate(weekStart)})
                                    </option>
                                ) : (
                                    previewWeekOptions.map((w) => (
                                        <option key={w.weekStart} value={w.weekStart}>
                                            {w.label}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs text-zinc-500 font-medium mb-1.5">
                                University pool
                            </label>
                            <select
                                value={previewUniversityId}
                                onChange={(e) => setPreviewUniversityId(e.target.value)}
                                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                            >
                                <option value="">All universities</option>
                                {universities.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={handlePreview}
                            disabled={previewing}
                            className="px-5 py-2.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm shrink-0"
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
                        <p className="text-sm text-zinc-500 text-center">
                            Preview for cycle starting{" "}
                            <span className="font-medium text-zinc-800">
                                {formatDate(preview.weekStart)}
                            </span>
                        </p>
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
                                                        <p className="text-zinc-500 text-[10px] truncate mt-0.5">
                                                            {m.userA.universityName}
                                                        </p>
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
                                                        <p className="text-zinc-500 text-[10px] truncate mt-0.5">
                                                            {m.userB.universityName}
                                                        </p>
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
                                                <p className="text-zinc-500 text-[10px] truncate">{u.universityName}</p>
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
