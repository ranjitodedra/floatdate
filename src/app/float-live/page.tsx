"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import FiltersBar from "./components/FiltersBar";
import OnlineCounter from "./components/OnlineCounter";
import TermsModal from "./components/TermsModal";
import TimeWarning from "./components/TimeWarning";
import AppShell from "@/components/AppShell";
import ReferralGate from "@/components/ReferralGate";
import ScheduledDatesPanel from "./components/scheduled/ScheduledDatesPanel";
import { HEARTBEAT_MS } from "@/lib/float-live-presence";

const WAIT_TIMEOUT_SECONDS = 5 * 60; // 5 minutes

const CHARACTERS = ["A", "B", "C", "D", "E", "F"];

type LobbyTab = "live" | "scheduled";
type PendingAction =
    | { type: "live" }
    | { type: "claim"; dateId: string }
    | { type: "join"; dateId: string }
    | null;

export default function FloatLivePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{
        gender: string;
        name: string;
        universityName: string;
    } | null>(null);

    // Time gate state
    const [isActive, setIsActive] = useState(false);
    const [minutesLeft, setMinutesLeft] = useState(0);

    // Filter state
    const [preference, setPreference] = useState("any");
    const [intention, setIntention] = useState("blind_date");

    // Character selection
    const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
    const [showCharacterSelect, setShowCharacterSelect] = useState(false);

    // Lobby state
    const [onlineCount, setOnlineCount] = useState(0);
    const [showTerms, setShowTerms] = useState(false);
    const [searching, setSearching] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Wait timer state
    const [waitSecondsLeft, setWaitSecondsLeft] = useState(WAIT_TIMEOUT_SECONDS);
    const [timedOut, setTimedOut] = useState(false);
    const searchStartRef = useRef<number | null>(null);

    const [activeTab, setActiveTab] = useState<LobbyTab>("live");
    const [pendingAction, setPendingAction] = useState<PendingAction>(null);
    const [scheduledRefreshKey, setScheduledRefreshKey] = useState(0);

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
                setUser({
                    gender: userData.user.gender,
                    name: userData.user.name,
                    universityName: userData.user.university?.name || "Your university",
                });

                const statusData = await statusRes.json();
                setIsActive(statusData.active);
                setMinutesLeft(statusData.minutesLeft);
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

    // Cancel search — calls leave API to mark offline
    const cancelSearch = useCallback(async () => {
        setSearching(false);
        searchStartRef.current = null;
        setWaitSecondsLeft(WAIT_TIMEOUT_SECONDS);
        if (sessionId) {
            try {
                await fetch("/api/float-live/leave", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId }),
                });
            } catch { /* ignore */ }
        }
    }, [sessionId]);

    // 5-minute wait timer countdown
    useEffect(() => {
        if (!searching) return;
        if (!searchStartRef.current) {
            searchStartRef.current = Date.now();
        }

        const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - (searchStartRef.current || Date.now())) / 1000);
            const remaining = WAIT_TIMEOUT_SECONDS - elapsed;

            if (remaining <= 0) {
                clearInterval(timer);
                setSearching(false);
                setTimedOut(true);
                searchStartRef.current = null;
                setWaitSecondsLeft(0);
                // Call leave API to clean up
                if (sessionId) {
                    fetch("/api/float-live/leave", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sessionId }),
                    }).catch(() => { /* ignore */ });
                }
            } else {
                setWaitSecondsLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [searching, sessionId]);

    // Cleanup on page unload — mark user offline
    useEffect(() => {
        if (!searching || !sessionId) return;

        function handleBeforeUnload() {
            // Use sendBeacon for reliable delivery on tab close
            navigator.sendBeacon(
                "/api/float-live/leave",
                new Blob(
                    [JSON.stringify({ sessionId })],
                    { type: "application/json" }
                )
            );
        }

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [searching, sessionId]);

    // Lobby heartbeat while searching (keeps queue presence fresh)
    useEffect(() => {
        if (!searching || !sessionId) return;

        async function heartbeat() {
            try {
                await fetch("/api/float-live/heartbeat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId }),
                });
            } catch {
                /* ignore */
            }
        }

        heartbeat();
        const interval = setInterval(heartbeat, HEARTBEAT_MS);
        return () => clearInterval(interval);
    }, [searching, sessionId]);

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
        setPendingAction({ type: "live" });
        setShowCharacterSelect(true);
    }

    function handleClaimScheduledDate(dateId: string) {
        setPendingAction({ type: "claim", dateId });
        setShowCharacterSelect(true);
    }

    function handleJoinScheduledDate(dateId: string) {
        setPendingAction({ type: "join", dateId });
        setShowCharacterSelect(true);
    }

    function handleCharacterSelected(char: string) {
        setSelectedCharacter(char);
        setShowCharacterSelect(false);
        setShowTerms(true);
    }

    async function handleAcceptTerms() {
        setShowTerms(false);
        const action = pendingAction;
        setPendingAction(null);

        if (action?.type === "claim") {
            try {
                const res = await fetch(
                    `/api/float-live/scheduled-dates/${action.dateId}/claim`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            character: selectedCharacter || "A",
                            preference,
                        }),
                    }
                );
                const data = await res.json();
                if (!res.ok) {
                    alert(data.error || "Failed to join date");
                    return;
                }
                setScheduledRefreshKey((k) => k + 1);
                setActiveTab("scheduled");
            } catch (err) {
                console.error("Claim error:", err);
            }
            return;
        }

        if (action?.type === "join") {
            try {
                const res = await fetch(
                    `/api/float-live/scheduled-dates/${action.dateId}/join`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            character: selectedCharacter || "A",
                        }),
                    }
                );
                const data = await res.json();
                if (!res.ok) {
                    alert(data.error || "Failed to join date");
                    return;
                }
                const params = new URLSearchParams({
                    uc: data.userCharacter || selectedCharacter || "A",
                    pc: data.partnerCharacter || "A",
                });
                router.push(`/float-live/chat/${data.chatRoomId}?${params.toString()}`);
            } catch (err) {
                console.error("Scheduled join error:", err);
            }
            return;
        }

        if (!sessionId) return;

        try {
            await fetch("/api/float-live/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    preference,
                    intention,
                    character: selectedCharacter || "A",
                }),
            });
            setSearching(true);
        } catch (err) {
            console.error("Join error:", err);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-900">
                <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Lobby (active) — Float Live is now available 24/7
    return (
        <AppShell>
            <ReferralGate featureName="FloatLive">
            <div className="min-h-screen bg-zinc-900 px-4 py-6">
            <div className="max-w-lg mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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

                {/* Tab switcher */}
                <div className="flex rounded-xl bg-zinc-800 p-1 border border-zinc-700">
                    <button
                        onClick={() => setActiveTab("live")}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${
                            activeTab === "live"
                                ? "bg-indigo-500 text-white"
                                : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        Live Date Now
                    </button>
                    <button
                        onClick={() => setActiveTab("scheduled")}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${
                            activeTab === "scheduled"
                                ? "bg-indigo-500 text-white"
                                : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        Schedule a Date
                    </button>
                </div>

                {activeTab === "live" ? (
                    <>
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
                                <p className="text-indigo-300 text-xs font-mono">
                                    {Math.floor(waitSecondsLeft / 60)}:{String(waitSecondsLeft % 60).padStart(2, "0")}
                                </p>
                                <button
                                    onClick={cancelSearch}
                                    className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : timedOut ? (
                            <div className="text-center space-y-3 px-4">
                                <div className="text-3xl">⏰</div>
                                <p className="text-white font-medium text-sm">No one available right now</p>
                                <p className="text-zinc-400 text-xs">Try again later!</p>
                                <button
                                    onClick={() => setTimedOut(false)}
                                    className="mt-2 px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition"
                                >
                                    Try Again
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
                    universityName={user?.universityName || "Your university"}
                    preference={preference}
                    intention={intention}
                    onPreferenceChange={setPreference}
                    onIntentionChange={setIntention}
                    disabled={searching}
                />

                {/* Online count */}
                <div className="flex items-center justify-between">
                    <OnlineCounter count={onlineCount} />
                    <span className="text-xs text-zinc-500">Available 24/7</span>
                </div>

                {/* Start button */}
                {!searching && !timedOut && (
                    <button
                        onClick={handleStartChat}
                        className="w-full py-4 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all text-lg shadow-lg shadow-indigo-500/25"
                    >
                        🚀 Start Chat
                    </button>
                )}
                    </>
                ) : (
                    <ScheduledDatesPanel
                        preference={preference}
                        intention={intention}
                        onPreferenceChange={setPreference}
                        onIntentionChange={setIntention}
                        onClaimDate={handleClaimScheduledDate}
                        onJoinDate={handleJoinScheduledDate}
                        actionDisabled={searching}
                        refreshKey={scheduledRefreshKey}
                        onRefresh={() => setScheduledRefreshKey((k) => k + 1)}
                    />
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
                            onClick={() => {
                                setShowCharacterSelect(false);
                                setPendingAction(null);
                            }}
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
                    onCancel={() => {
                        setShowTerms(false);
                        setPendingAction(null);
                    }}
                />
            )}
            </div>
            </ReferralGate>
        </AppShell>
    );
}
