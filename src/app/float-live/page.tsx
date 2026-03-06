"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import FiltersBar from "./components/FiltersBar";
import OnlineCounter from "./components/OnlineCounter";
import TermsModal from "./components/TermsModal";
import TimeWarning from "./components/TimeWarning";

const CHARACTERS = ["A", "B", "C", "D", "E", "F"];

export default function FloatLivePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{
        gender: string;
        name: string;
    } | null>(null);

    // Time gate state
    const [isActive, setIsActive] = useState(false);
    const [minutesLeft, setMinutesLeft] = useState(0);
    const [startsIn, setStartsIn] = useState(0);

    // Filter state
    const [preference, setPreference] = useState("any");
    const [intention, setIntention] = useState("blind_date");
    const [campus, setCampus] = useState("Waterloo");

    // Character selection
    const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
    const [showCharacterSelect, setShowCharacterSelect] = useState(false);

    // Lobby state
    const [onlineCount, setOnlineCount] = useState(0);
    const [showTerms, setShowTerms] = useState(false);
    const [searching, setSearching] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Fetch user and status
    useEffect(() => {
        async function init() {
            try {
                const [userRes, statusRes] = await Promise.all([
                    fetch("/api/auth/me"),
                    fetch("/api/float-live/status"),
                ]);

                if (!userRes.ok) {
                    router.push("/login");
                    return;
                }

                const userData = await userRes.json();
                setUser({ gender: userData.user.gender, name: userData.user.name });

                const statusData = await statusRes.json();
                setIsActive(statusData.active);
                setMinutesLeft(statusData.minutesLeft);
                setStartsIn(statusData.startsIn);
            } catch (err) {
                console.error("Init error:", err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [router]);

    // Refresh time status every 30 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch("/api/float-live/status");
                const data = await res.json();
                setIsActive(data.active);
                setMinutesLeft(data.minutesLeft);
                setStartsIn(data.startsIn);
            } catch { /* ignore */ }
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Fetch online count after session is available
    const fetchOnlineCount = useCallback(async () => {
        if (!sessionId) return;
        try {
            const res = await fetch(`/api/float-live/online-count?sessionId=${sessionId}`);
            const data = await res.json();
            setOnlineCount(data.count || 0);
        } catch { /* ignore */ }
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) return;
        fetchOnlineCount();
        const interval = setInterval(fetchOnlineCount, 5000);
        return () => clearInterval(interval);
    }, [sessionId, fetchOnlineCount]);

    // Get session when active
    useEffect(() => {
        if (!isActive) return;
        async function getSession() {
            try {
                const res = await fetch("/api/float-live/session");
                if (res.ok) {
                    const data = await res.json();
                    setSessionId(data.session.id);
                }
            } catch { /* ignore */ }
        }
        getSession();
    }, [isActive]);

    // Match polling while searching
    useEffect(() => {
        if (!searching || !sessionId) return;
        let cancelled = false;

        async function poll() {
            try {
                // First try to find a match
                await fetch("/api/float-live/find-match", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId }),
                });

                // Then check match status
                const res = await fetch(`/api/float-live/match-status?sessionId=${sessionId}`);
                const data = await res.json();

                if (!cancelled && data.status === "matched" && data.chatRoomId) {
                    // Pass character choices via URL params
                    const params = new URLSearchParams({
                        uc: data.userCharacter || selectedCharacter || "A",
                        pc: data.partnerCharacter || "A",
                    });
                    router.push(`/float-live/chat/${data.chatRoomId}?${params.toString()}`);
                }
            } catch (err) {
                console.error("Match poll error:", err);
            }
        }

        poll();
        const interval = setInterval(poll, 3000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [searching, sessionId, router, selectedCharacter]);

    function handleStartChat() {
        setShowCharacterSelect(true);
    }

    function handleCharacterSelected(char: string) {
        setSelectedCharacter(char);
        setShowCharacterSelect(false);
        setShowTerms(true);
    }

    async function handleAcceptTerms() {
        setShowTerms(false);
        if (!sessionId) return;

        try {
            await fetch("/api/float-live/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    preference,
                    intention,
                    campus,
                    character: selectedCharacter || "A",
                }),
            });
            setSearching(true);
        } catch (err) {
            console.error("Join error:", err);
        }
    }

    // Countdown display for startsIn
    function formatCountdown(totalMinutes: number) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-900">
                <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Not active — show countdown
    if (!isActive) {
        return (
            <div className="min-h-screen bg-zinc-900 flex items-center justify-center px-4">
                <div className="text-center space-y-6 max-w-md">
                    <div className="text-6xl">🎮</div>
                    <h1 className="text-2xl font-bold text-white">Float Live</h1>
                    <p className="text-zinc-400">
                        Float Live opens at <span className="text-indigo-400 font-semibold">5:00 PM ET</span> daily
                    </p>
                    <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Opens in</p>
                        <p className="text-3xl font-bold text-white font-mono">
                            {formatCountdown(startsIn)}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="text-sm text-zinc-500 hover:text-zinc-300 transition"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Lobby (active)
    return (
        <div className="min-h-screen bg-zinc-900 px-4 py-6">
            <div className="max-w-lg mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🎮</span>
                        <h1 className="text-xl font-bold text-white">Float Live</h1>
                    </div>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="text-sm text-zinc-500 hover:text-zinc-300 transition"
                    >
                        ← Dashboard
                    </button>
                </div>

                {/* Time warning */}
                <TimeWarning minutesLeft={minutesLeft} />

                {/* Pixel scene preview */}
                <div className="relative rounded-2xl overflow-hidden border border-zinc-700" style={{ aspectRatio: "16/9" }}>
                    <Image
                        src="/assets/Characters/Background.jpg"
                        alt="Scene background"
                        fill
                        className="object-cover opacity-60"
                        priority
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        {searching ? (
                            <div className="text-center space-y-3">
                                <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-white font-medium text-sm">Looking for someone...</p>
                                <button
                                    onClick={() => setSearching(false)}
                                    className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <p className="text-white/60 text-sm font-medium">
                                Set your filters & start chatting!
                            </p>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <FiltersBar
                    userGender={user?.gender || "nonbinary"}
                    preference={preference}
                    intention={intention}
                    campus={campus}
                    onPreferenceChange={setPreference}
                    onIntentionChange={setIntention}
                    onCampusChange={setCampus}
                    disabled={searching}
                />

                {/* Online count */}
                <div className="flex items-center justify-between">
                    <OnlineCounter count={onlineCount} />
                    <span className="text-xs text-zinc-500">
                        {minutesLeft} min left today
                    </span>
                </div>

                {/* Start button */}
                {!searching && (
                    <button
                        onClick={handleStartChat}
                        className="w-full py-4 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all text-lg shadow-lg shadow-indigo-500/25"
                    >
                        🚀 Start Chat
                    </button>
                )}
            </div>

            {/* Character selection modal */}
            {showCharacterSelect && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
                        <h2 className="text-xl font-bold text-white text-center mb-2">Choose Your Character</h2>
                        <p className="text-zinc-400 text-sm text-center mb-6">Pick an avatar for your chat session</p>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {CHARACTERS.map((char) => (
                                <button
                                    key={char}
                                    onClick={() => handleCharacterSelected(char)}
                                    className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 hover:border-indigo-400 ${selectedCharacter === char
                                            ? "border-indigo-500 shadow-lg shadow-indigo-500/25"
                                            : "border-zinc-600 hover:border-zinc-400"
                                        }`}
                                >
                                    <div className="aspect-square relative bg-zinc-700/50">
                                        <Image
                                            src={`/assets/Characters/${char}.png`}
                                            alt={`Character ${char}`}
                                            fill
                                            className="object-contain p-2"
                                        />
                                    </div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowCharacterSelect(false)}
                            className="w-full py-2 text-sm text-zinc-400 hover:text-zinc-200 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Terms modal */}
            {showTerms && (
                <TermsModal
                    onAccept={handleAcceptTerms}
                    onCancel={() => setShowTerms(false)}
                />
            )}
        </div>
    );
}
