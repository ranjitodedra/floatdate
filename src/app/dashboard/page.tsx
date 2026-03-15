"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
    weekStart: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [optedIn, setOptedIn] = useState(false);
    const [optingIn, setOptingIn] = useState(false);
    const [match, setMatch] = useState<MatchData | null>(null);
    const [countdown, setCountdown] = useState("");
    const [user, setUser] = useState<{ name: string; email: string; completedSetup: boolean } | null>(null);

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

            if (!userData.user.completedSetup) {
                router.push("/questions");
                return;
            }

            // Check opt-in status  
            const optinRes = await fetch("/api/optin/status");
            const optinData = await optinRes.json();
            setOptedIn(optinData.optedIn);

            // Check current match
            const matchRes = await fetch("/api/match/current");
            const matchData = await matchRes.json();
            setMatch(matchData.match);

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

    async function handleOptIn() {
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
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
                                onClick={handleOptIn}
                                disabled={optingIn}
                                className="w-full py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50"
                            >
                                {optingIn ? "Opting in..." : "Opt In This Week"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Float Live Card */}
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-sm text-center">
                    <div className="text-3xl mb-2">🎮</div>
                    <h2 className="text-lg font-bold text-white mb-1">Float Live</h2>
                    <p className="text-zinc-400 text-sm mb-4">
                        Anonymous chat — daily 5-6 PM ET
                    </p>
                    <a
                        href="/float-live"
                        className="inline-block w-full py-3 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-600 transition-all duration-200 text-sm"
                    >
                        Enter Float Live
                    </a>
                </div>

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
                                    let reasons: string[];
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
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-zinc-300 text-4xl mb-3">💜</p>
                            <p className="text-zinc-500">No match yet</p>
                            <p className="text-zinc-400 text-sm mt-1">
                                Opt in before Wednesday 9 PM ET to receive your first match
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
        </div>
    );
}

