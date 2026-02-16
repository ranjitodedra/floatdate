"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface MatchData {
    id: string;
    matchedUser: {
        name: string;
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
    const [user, setUser] = useState<{ name: string; completedSetup: boolean } | null>(null);

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
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Countdown timer
    useEffect(() => {
        function updateCountdown() {
            const now = new Date();
            const dayOfWeek = now.getUTCDay();
            const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;

            const nextMonday = new Date(now);
            nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
            nextMonday.setUTCHours(0, 0, 0, 0);

            const diff = nextMonday.getTime() - now.getTime();
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
                    <button
                        onClick={handleLogout}
                        className="text-sm text-zinc-400 hover:text-zinc-700 transition"
                    >
                        Log out
                    </button>
                </div>

                {/* Countdown Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
                        Next matching round
                    </p>
                    <p className="text-3xl font-bold text-zinc-900 font-mono">{countdown}</p>
                    <p className="text-xs text-zinc-400 mt-1">Monday 00:00 UTC</p>
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

                {/* Match Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                        Your Match
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
                                </div>
                            </div>

                            {match.matchedUser.bio && (
                                <p className="text-zinc-600 text-sm">
                                    {match.matchedUser.bio}
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

                            <p className="text-sm text-zinc-500 italic">
                                &ldquo;{match.explanation}&rdquo;
                            </p>

                            <p className="text-xs text-zinc-400">
                                Check your email for their contact info 💜
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-zinc-300 text-4xl mb-3">💜</p>
                            <p className="text-zinc-500">No match this week</p>
                            <p className="text-zinc-400 text-sm mt-1">
                                Make sure you&apos;re opted in before Monday
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
