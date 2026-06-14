"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AppShell from "@/components/AppShell";

interface MatchData {
    id: string;
    matchedUser: {
        name: string;
        email: string;
        bio: string | null;
        city: string;
    };
    similarityScore: number;
    explanation: string;
    reasons?: string[];
    weekStart: string;
}

interface MatchAttemptData {
    id: string;
    status: "matched" | "no_match";
    feedback: string | null;
    feedbackAt: string | null;
    weekStart: string;
    createdAt: string;
}

interface PreviousMatchInfo {
    matchId: string;
    partnerName: string;
    feedbackSubmitted: boolean;
}

const HOW_IT_WENT_OPTIONS = [
    { value: "never_started", label: "We never really started talking", emoji: "🌱" },
    { value: "chatted", label: "We chatted a bit", emoji: "💬" },
    { value: "great_conversation", label: "We had a great conversation", emoji: "✨" },
    { value: "met_in_person", label: "We met in person", emoji: "☕" },
    { value: "keep_seeing", label: "We want to keep seeing each other", emoji: "❤️" },
    { value: "faded", label: "Things slowly faded", emoji: "🤷" },
    { value: "felt_off", label: "Something felt off", emoji: "🚩" },
    { value: "ghosted", label: "I got ghosted", emoji: "😬" },
    { value: "figuring_out", label: "We’re still figuring it out", emoji: "⏸" },
] as const;

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [optedIn, setOptedIn] = useState(false);
    const [optingIn, setOptingIn] = useState(false);
    const [match, setMatch] = useState<MatchData | null>(null);
    const [latestAttempt, setLatestAttempt] = useState<MatchAttemptData | null>(null);
    const [previousMatch, setPreviousMatch] = useState<PreviousMatchInfo | null>(null);
    
    // Feedback Modal State
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackStep, setFeedbackStep] = useState<1 | 2>(1);
    const [howItWent, setHowItWent] = useState<string>("");
    const [feedbackText, setFeedbackText] = useState("");
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [countdown, setCountdown] = useState("");
    const [user, setUser] = useState<{ name: string; email: string; completedSetup: boolean; verificationStatus?: string } | null>(null);
    const [impersonationActor, setImpersonationActor] = useState<{ id: string; name: string; email: string } | null>(null);

    // Edit profile state
    const [editingBio, setEditingBio] = useState(false);
    const [bio, setBio] = useState("");
    const [bioInput, setBioInput] = useState("");
    const [savingBio, setSavingBio] = useState(false);
    const [bioMessage, setBioMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            // Check user status
            const userRes = await fetch("/api/auth/me");
            const userData = await userRes.json();

            if (!userRes.ok) {
                router.push("/login");
                return;
            }

            setUser(userData.user);
            setImpersonationActor(userData.session?.isImpersonating ? userData.session?.actor ?? null : null);

            // Note: the questionnaire is optional. Users land on the dashboard
            // directly and are only sent to /questions when they click Opt In
            // without having completed it (see handleOptInClick).

            // Check opt-in status  
            const optinRes = await fetch("/api/optin/status");
            const optinData = await optinRes.json();
            setOptedIn(optinData.optedIn);
            setPreviousMatch(optinData.previousMatch ?? null);

            // Check current match
            const matchRes = await fetch("/api/match/current");
            const matchData = await matchRes.json();
            setMatch(matchData.match ?? null);
            setLatestAttempt(matchData.attempt ?? null);

            // Fetch profile data (bio)
            const profileRes = await fetch("/api/profile");
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                setBio(profileData.bio || "");
                setBioInput(profileData.bio || "");
            }
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Countdown timer — targets next Wednesday 9:00 PM America/Toronto
    useEffect(() => {
        function getNextWednesday9pmET(): Date {
            const now = new Date();
            // Use Intl to figure out what day/hour it is in Toronto
            const torontoParts = new Intl.DateTimeFormat("en-US", {
                timeZone: "America/Toronto",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
                weekday: "short",
            }).formatToParts(now);

            const get = (type: string) =>
                torontoParts.find((p) => p.type === type)?.value ?? "";

            const weekday = get("weekday"); // "Wed", "Thu", etc.
            const hour = parseInt(get("hour"), 10);
            const year = parseInt(get("year"), 10);
            const month = parseInt(get("month"), 10) - 1; // 0-indexed
            const day = parseInt(get("day"), 10);

            // Map weekday string to numeric (0=Sun)
            const dayMap: Record<string, number> = {
                Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
            };
            const dayOfWeek = dayMap[weekday] ?? 0;

            let daysUntilWed: number;
            if (dayOfWeek === 3) {
                daysUntilWed = hour < 21 ? 0 : 7;
            } else if (dayOfWeek < 3) {
                daysUntilWed = 3 - dayOfWeek;
            } else {
                daysUntilWed = 10 - dayOfWeek;
            }

            // Build target date in Toronto local time
            const targetLocalDate = new Date(year, month, day + daysUntilWed);

            // We need the UTC equivalent of "targetLocalDate 21:00 Toronto".
            // Create a temp date and use Intl to find the Toronto offset at that date.
            const tempDate = new Date(
                Date.UTC(
                    targetLocalDate.getFullYear(),
                    targetLocalDate.getMonth(),
                    targetLocalDate.getDate(),
                    21, 0, 0, 0,
                ),
            );
            // Get Toronto's formatted time at this UTC instant to derive offset
            const probe = new Intl.DateTimeFormat("en-US", {
                timeZone: "America/Toronto",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                day: "2-digit",
            }).formatToParts(tempDate);
            const probeHour = parseInt(
                probe.find((p) => p.type === "hour")?.value ?? "0",
                10,
            );
            const probeDay = parseInt(
                probe.find((p) => p.type === "day")?.value ?? "0",
                10,
            );

            // Toronto hour at tempDate(UTC). Offset = torontoHour - utcHour (21).
            // Account for day rollover.
            let offsetHours = probeHour - 21;
            if (probeDay > targetLocalDate.getDate()) offsetHours += 24;
            if (probeDay < targetLocalDate.getDate()) offsetHours -= 24;

            // Wed 9 PM Toronto = Wed 9 PM UTC minus offset
            const targetUTC = new Date(
                Date.UTC(
                    targetLocalDate.getFullYear(),
                    targetLocalDate.getMonth(),
                    targetLocalDate.getDate(),
                    21 - offsetHours, 0, 0, 0,
                ),
            );

            return targetUTC;
        }

        function updateCountdown() {
            const now = new Date();
            const target = getNextWednesday9pmET();
            let diff = target.getTime() - now.getTime();

            if (diff <= 0) {
                // Safety fallback: add 7 days
                diff = target.getTime() + 7 * 24 * 60 * 60 * 1000 - now.getTime();
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, []);

    const needsFeedback = previousMatch && !previousMatch.feedbackSubmitted;

    async function doOptInOnly() {
        setOptingIn(true);
        try {
            const res = await fetch("/api/optin", { method: "POST" });
            if (res.ok) {
                setOptedIn(true);
            }
        } catch (err) {
            console.error("Opt-in error:", err);
        } finally {
            setOptingIn(false);
        }
    }

    async function handleOptInClick() {
        // Opting into weekly matching requires a completed questionnaire.
        // Send users who haven't finished it to the questionnaire first.
        if (!user?.completedSetup) {
            router.push("/questions");
            return;
        }
        if (needsFeedback) {
            // Open feedback modal instead of directly opting in
            setShowFeedbackModal(true);
            setFeedbackStep(1);
            setHowItWent("");
            setFeedbackText("");
        } else {
            // Just opt in
            await doOptInOnly();
        }
    }

    async function submitFeedbackAndOptIn() {
        if (!previousMatch) return;
        setFeedbackSubmitting(true);
        setFeedbackMessage(null);

        try {
            // Save feedback
            const fbRes = await fetch("/api/match/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    matchId: previousMatch.matchId,
                    howItWent,
                    feedbackText,
                }),
            });

            if (!fbRes.ok) {
                const data = await fbRes.json();
                setFeedbackMessage({ type: "error", text: data.error || "Failed to save feedback." });
                setFeedbackSubmitting(false);
                return;
            }

            // Mark feedback as submitted locally
            setPreviousMatch({ ...previousMatch, feedbackSubmitted: true });

            // Automatically opt in after feedback
            await doOptInOnly();
            
            // Close modal
            setShowFeedbackModal(false);
            setFeedbackMessage(null);
        } catch {
            setFeedbackMessage({ type: "error", text: "Something went wrong. Please try again." });
            setFeedbackSubmitting(false);
        }
    }

    async function handleSaveBio() {
        setSavingBio(true);
        setBioMessage(null);
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bio: bioInput }),
            });
            if (res.ok) {
                setBio(bioInput);
                setEditingBio(false);
                setBioMessage({ type: "success", text: "Bio updated!" });
                setTimeout(() => setBioMessage(null), 3000);
            } else {
                const data = await res.json();
                setBioMessage({ type: "error", text: data.error || "Failed to update bio" });
            }
        } catch {
            setBioMessage({ type: "error", text: "Failed to update bio" });
        } finally {
            setSavingBio(false);
        }
    }

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    }

    async function handleStopViewAsUser() {
        await fetch("/api/admin/impersonate/clear", { method: "POST" });
        router.push("/admin");
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <AppShell>
            <div className="min-h-screen bg-zinc-50 px-4 py-8">
            <div className="max-w-lg mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/images/icon.png"
                            alt="FloatDate"
                            width={100}
                            height={34}
                        />
                        <p className="text-sm text-zinc-500">
                            Hey, {user?.name || "there"} 👋
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {user?.email === "ranjitodedra.dev@gmail.com" && (
                            <a
                                href="/admin"
                                className="text-sm text-zinc-400 hover:text-zinc-700 transition"
                            >
                                Admin
                            </a>
                        )}
                        <button
                            onClick={handleLogout}
                            className="text-sm text-zinc-400 hover:text-zinc-700 transition"
                        >
                            Log out
                        </button>
                    </div>
                </div>

                {impersonationActor && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                        <p className="text-amber-800 text-sm">
                            Admin View Mode: you are currently viewing this dashboard as a user.
                        </p>
                        <button
                            onClick={handleStopViewAsUser}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 transition"
                        >
                            Exit to Admin
                        </button>
                    </div>
                )}

                {user?.verificationStatus === "pending" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-amber-800 text-sm font-medium">
                            Your university verification is pending review.
                        </p>
                        <p className="text-amber-700 text-xs mt-1">
                            You can continue using FloatDate while we review your
                            submitted document. We&apos;ll notify you once a
                            decision is made.
                        </p>
                    </div>
                )}

                {user?.verificationStatus === "rejected" && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-red-800 text-sm font-medium">
                            We couldn&apos;t verify your account.
                        </p>
                        <p className="text-red-700 text-xs mt-1">
                            If you believe this was a mistake, please contact{" "}
                            <a
                                href="mailto:support@floatdate.com"
                                className="underline font-medium hover:text-red-900"
                            >
                                support@floatdate.com
                            </a>{" "}
                            to appeal.
                        </p>
                    </div>
                )}

                {/* Countdown Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
                        Next matching round
                    </p>
                    <p className="text-3xl font-bold text-zinc-900 font-mono">{countdown}</p>
                    <p className="text-xs text-zinc-400 mt-1">Wednesday 9:00 PM ET</p>
                </div>

                {/* Opt-in Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-zinc-900 mb-2">
                        Weekly Opt-in
                    </h2>
                    {optedIn ? (
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-green-600 font-medium">
                                You&apos;re opted in for this week
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-zinc-500 text-sm mb-4">
                                Opt in to be included in this week&apos;s matching round.
                            </p>
                            <button
                                onClick={handleOptInClick}
                                disabled={optingIn}
                                className="w-full py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50"
                            >
                                {optingIn ? "Opting in..." : "Opt In This Week"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Pending Feedback Card (If they didn't opt in but still have a previous match) */}
                {needsFeedback && !optedIn && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-indigo-900 mb-1">
                                    How did your match with {previousMatch.partnerName} go?
                                </h3>
                                <p className="text-sm text-indigo-700/80">
                                    We&apos;d love to hear how it went!
                                </p>
                            </div>
                            <div className="text-3xl pl-2">🤔</div>
                        </div>
                        <button
                            onClick={() => {
                                setShowFeedbackModal(true);
                                setFeedbackStep(1);
                            }}
                            className="mt-4 w-full py-2.5 bg-white border border-indigo-200 text-indigo-700 font-medium rounded-xl hover:bg-indigo-50 transition-all text-sm"
                        >
                            Share Feedback
                        </button>
                    </div>
                )}

                {/* Match Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                        Your Latest Match
                    </h2>

                    {match ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xl font-bold">
                                    {match.matchedUser.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-zinc-900 font-semibold text-lg">
                                        {match.matchedUser.name}
                                    </p>
                                    <p className="text-zinc-400 text-sm">
                                        {match.matchedUser.city}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <p className="text-zinc-500 text-sm">
                                            {match.matchedUser.email}
                                        </p>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(match.matchedUser.email);
                                                const btn = document.getElementById("copy-email-btn");
                                                if (btn) {
                                                    btn.textContent = "Copied!";
                                                    setTimeout(() => { btn.textContent = "Copy"; }, 2000);
                                                }
                                            }}
                                            id="copy-email-btn"
                                            className="text-xs text-zinc-400 hover:text-zinc-700 transition px-1.5 py-0.5 rounded-md hover:bg-zinc-100"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {match.matchedUser.bio && (
                                <p className="text-zinc-600 text-sm">
                                    <span className="font-semibold text-zinc-700">Bio: </span>{match.matchedUser.bio}
                                </p>
                            )}

                            {/* Compatibility score */}
                            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-zinc-500">Compatibility</span>
                                    <span className="text-zinc-900 font-bold">
                                        {Math.round(match.similarityScore * 100)}%
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-zinc-800 rounded-full transition-all duration-1000"
                                        style={{
                                            width: `${Math.round(match.similarityScore * 100)}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <p className="text-sm font-semibold text-zinc-700 mb-2">
                                    Here&apos;s why:
                                </p>
                                {(() => {
                                    // Parse explanation as JSON array, with fallback for legacy string format
                                    let reasons: string[] = match.reasons ?? [];
                                    if (reasons.length > 0) {
                                        return (
                                            <ul className="list-disc list-inside space-y-1 text-sm text-zinc-600">
                                                {reasons.map((reason, idx) => (
                                                    <li key={idx}>{reason}</li>
                                                ))}
                                            </ul>
                                        );
                                    }
                                    try {
                                        reasons = JSON.parse(match.explanation);
                                        if (!Array.isArray(reasons)) {
                                            reasons = [match.explanation];
                                        }
                                    } catch {
                                        reasons = [match.explanation];
                                    }
                                    return (
                                        <ul className="list-disc list-inside space-y-1 text-sm text-zinc-600">
                                            {reasons.map((reason, idx) => (
                                                <li key={idx}>{reason}</li>
                                            ))}
                                        </ul>
                                    );
                                })()}
                            </div>

                            <p className="text-xs text-zinc-400">
                                Check your email for their contact info 💜
                            </p>
                        </div>
                    ) : latestAttempt?.status === "no_match" ? (
                        <div className="text-center py-8">
                            <p className="text-zinc-300 text-4xl mb-3">💜</p>
                            <p className="text-zinc-700 font-medium">
                                We were not able to find match for you in this cycle.
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-zinc-300 text-4xl mb-3">💜</p>
                            <p className="text-zinc-700 font-medium">
                                We were not able to find match for you this week.
                            </p>
                        </div>
                    )}
                </div>

                {/* Edit Profile Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                        Edit Profile
                    </h2>

                    {/* Bio Section */}
                    <div className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-zinc-700">Your Bio</p>
                            {!editingBio && (
                                <button
                                    onClick={() => {
                                        setBioInput(bio);
                                        setEditingBio(true);
                                        setBioMessage(null);
                                    }}
                                    className="text-sm text-zinc-400 hover:text-zinc-700 transition"
                                >
                                    Edit
                                </button>
                            )}
                        </div>

                        {editingBio ? (
                            <div className="space-y-3">
                                <textarea
                                    value={bioInput}
                                    onChange={(e) => setBioInput(e.target.value)}
                                    maxLength={300}
                                    rows={3}
                                    placeholder="Tell your match a bit about yourself..."
                                    className="w-full px-4 py-3 border border-zinc-300 rounded-xl text-zinc-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all"
                                />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-400">
                                        {bioInput.length}/300
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setBioInput(bio);
                                                setEditingBio(false);
                                            }}
                                            className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveBio}
                                            disabled={savingBio}
                                            className="px-5 py-2 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50"
                                        >
                                            {savingBio ? "Saving..." : "Save"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500">
                                {bio || "No bio set yet."}
                            </p>
                        )}

                        {bioMessage && (
                            <p className={`text-sm mt-2 ${bioMessage.type === "success" ? "text-green-600" : "text-red-500"}`}>
                                {bioMessage.text}
                            </p>
                        )}
                    </div>

                    {/* Edit Answers */}
                    <div className="border-t border-zinc-100 pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-700">Your Answers</p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Update your question answers to improve matching
                                </p>
                            </div>
                            <button
                                onClick={() => router.push("/questions?edit=true")}
                                className="px-5 py-2 bg-zinc-100 text-zinc-700 text-sm font-semibold rounded-xl hover:bg-zinc-200 transition-all duration-200"
                            >
                                Edit Answers
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feedback Modal Overlay */}
            {showFeedbackModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
                            <h2 className="text-lg font-bold text-zinc-900">
                                Match Feedback
                            </h2>
                            <button
                                onClick={() => setShowFeedbackModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="p-6">
                            {feedbackStep === 1 ? (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-zinc-900 text-center mb-6">
                                        How did your match with {previousMatch?.partnerName} go?
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {HOW_IT_WENT_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    setHowItWent(opt.value);
                                                    setFeedbackStep(2);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-900 hover:bg-zinc-50 transition-all text-left group"
                                            >
                                                <span className="text-xl group-hover:scale-110 transition-transform">{opt.emoji}</span>
                                                <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900">
                                                    {opt.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <button
                                        onClick={() => setFeedbackStep(1)}
                                        className="text-sm text-zinc-500 hover:text-zinc-900 transition flex items-center gap-1 mb-2"
                                    >
                                        ← Back
                                    </button>
                                    <h3 className="text-xl font-bold text-zinc-900">
                                        Any feedback about this match?
                                    </h3>
                                    <p className="text-sm text-zinc-500">
                                        Tell us what worked, what didn&apos;t, or anything else you&apos;d like to share. This helps us improve your future matches.
                                    </p>
                                    
                                    <textarea
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 border border-zinc-300 rounded-xl text-zinc-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all mt-4"
                                        placeholder="Optional feedback..."
                                    />

                                    {feedbackMessage && (
                                        <p className={`text-sm mt-2 ${feedbackMessage.type === "success" ? "text-green-600" : "text-red-500"}`}>
                                            {feedbackMessage.text}
                                        </p>
                                    )}

                                    <button
                                        onClick={submitFeedbackAndOptIn}
                                        disabled={feedbackSubmitting}
                                        className="w-full mt-6 py-3.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50"
                                    >
                                        {feedbackSubmitting ? "Submitting..." : (optedIn ? "Submit Feedback" : "Submit & Opt In")}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            </div>
        </AppShell>
    );
}
