"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import PixelScene from "../../components/PixelScene";
import TypingBar from "../../components/TypingBar";
import TranscriptView from "../../components/TranscriptView";
import RevealEmailButton from "../../components/RevealEmailButton";
import TimeWarning from "../../components/TimeWarning";
import ReportButton from "../../components/ReportButton";
import ExitDateButton from "../../components/ExitDateButton";
import { supabase } from "@/lib/supabase-client";

interface Message {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
}

export default function ChatRoomPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const roomId = params.roomId as string;

    // Character from URL params
    const urlUserChar = searchParams.get("uc") || "A";
    const urlPartnerChar = searchParams.get("pc") || "A";

    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState("");
    const [userCharacter, setUserCharacter] = useState(urlUserChar);
    const [partnerCharacter, setPartnerCharacter] = useState(urlPartnerChar);
    const [partnerEmail, setPartnerEmail] = useState<string | null>(null);
    const [intention, setIntention] = useState("blind_date");
    const [messages, setMessages] = useState<Message[]>([]);
    const [showTranscript, setShowTranscript] = useState(false);
    const [minutesLeft, setMinutesLeft] = useState(60);
    const [chatEnded, setChatEnded] = useState(false);
    const [partnerLeft, setPartnerLeft] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize
    useEffect(() => {
        async function init() {
            try {
                // Get user
                const userRes = await fetch("/api/auth/me");
                if (!userRes.ok) {
                    router.push("/login");
                    return;
                }
                const userData = await userRes.json();
                setUserId(userData.user.id);

                // Get time status
                const statusRes = await fetch("/api/float-live/status");
                const statusData = await statusRes.json();
                setMinutesLeft(statusData.minutesLeft || 0);

                if (!statusData.active) {
                    setChatEnded(true);
                }

                // Get session for match-status lookup
                const sessionRes = await fetch("/api/float-live/session");
                if (sessionRes.ok) {
                    const sessionData = await sessionRes.json();
                    setSessionId(sessionData.session.id);

                    // Get match status to learn partner details
                    const matchRes = await fetch(
                        `/api/float-live/match-status?sessionId=${sessionData.session.id}`
                    );
                    const matchData = await matchRes.json();
                    if (matchData.partnerCharacter) {
                        setPartnerCharacter(matchData.partnerCharacter);
                    }
                    if (matchData.userCharacter) {
                        setUserCharacter(matchData.userCharacter);
                    }
                    if (matchData.intention) {
                        setIntention(matchData.intention);
                    }

                    // If friendship mode, fetch partner email
                    if (matchData.intention === "friendship") {
                        const msgsRes = await fetch(`/api/float-live/chat/${roomId}/messages`);
                        if (msgsRes.ok) {
                            const revealRes = await fetch(`/api/float-live/chat/${roomId}/reveal-email`, {
                                method: "POST",
                            });
                            if (revealRes.ok) {
                                const revealData = await revealRes.json();
                                if (revealData.partnerEmail) {
                                    setPartnerEmail(revealData.partnerEmail);
                                }
                            }
                        }
                    }
                }

                // Fetch existing messages
                const msgsRes = await fetch(`/api/float-live/chat/${roomId}/messages`);
                if (msgsRes.ok) {
                    const msgsData = await msgsRes.json();
                    setMessages(msgsData.messages || []);
                }
            } catch (err) {
                console.error("Chat init error:", err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [roomId, router]);

    // Supabase Realtime subscription for new messages + chat room exit detection
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`chat-room-${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "FloatLiveChatMessage",
                    filter: `chatRoomId=eq.${roomId}`,
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages((prev) => {
                        // Avoid duplicates
                        if (prev.some((m) => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "FloatLiveChatRoom",
                    filter: `id=eq.${roomId}`,
                },
                (payload) => {
                    const updated = payload.new as { isActive: boolean };
                    if (!updated.isActive) {
                        setPartnerLeft(true);
                        setChatEnded(true);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    // Polling fallback for real-time chat — fetch messages every 3 seconds
    // Also checks if the chat room is still active (partner exit detection)
    useEffect(() => {
        if (!roomId || chatEnded) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/float-live/chat/${roomId}/messages`);
                if (res.ok) {
                    const data = await res.json();
                    const fetched: Message[] = data.messages || [];

                    // If the API returns roomActive === false, partner has left
                    if (data.roomActive === false) {
                        setPartnerLeft(true);
                        setChatEnded(true);
                        return;
                    }

                    setMessages((prev) => {
                        // Merge fetched messages, dedup by id
                        const existingIds = new Set(prev.map((m) => m.id));
                        const newMsgs = fetched.filter((m) => !existingIds.has(m.id));
                        if (newMsgs.length === 0) return prev;
                        return [...prev, ...newMsgs];
                    });
                }
            } catch { /* ignore polling errors */ }
        }, 3000);

        return () => clearInterval(interval);
    }, [roomId, chatEnded]);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Periodically check time status
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch("/api/float-live/status");
                const data = await res.json();
                setMinutesLeft(data.minutesLeft || 0);
                if (!data.active) {
                    setChatEnded(true);
                }
            } catch { /* ignore */ }
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Auto-redirect when partner leaves
    useEffect(() => {
        if (!partnerLeft) return;
        const timeout = setTimeout(() => {
            router.push("/float-live");
        }, 4000);
        return () => clearTimeout(timeout);
    }, [partnerLeft, router]);

    // Send message
    const handleSend = useCallback(
        async (content: string) => {
            try {
                const res = await fetch("/api/float-live/chat/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ chatRoomId: roomId, content }),
                });

                if (res.ok) {
                    const data = await res.json();
                    // Add immediately for local user (realtime will bring it for partner)
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === data.message.id)) return prev;
                        return [...prev, data.message];
                    });
                }
            } catch (err) {
                console.error("Send error:", err);
            }
        },
        [roomId]
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-900">
                <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (showTranscript) {
        return (
            <TranscriptView
                messages={messages}
                userId={userId}
                onClose={() => setShowTranscript(false)}
            />
        );
    }

    return (
        <div className="h-screen bg-zinc-900 flex flex-col overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-lg">🎮</span>
                    <span className="text-white font-semibold text-sm">Float Live</span>
                    {intention === "friendship" && partnerEmail && (
                        <span className="text-xs text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                            📧 {partnerEmail}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {intention === "blind_date" && (
                        <RevealEmailButton
                            chatRoomId={roomId}
                            intention={intention}
                            partnerEmail={partnerEmail}
                        />
                    )}
                    <button
                        onClick={() => setShowTranscript(true)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 transition font-medium"
                    >
                        View Transcript
                    </button>
                    <ReportButton chatRoomId={roomId} />
                    <ExitDateButton chatRoomId={roomId} sessionId={sessionId || undefined} />
                </div>
            </div>

            {/* Time warning */}
            <div className="px-4 pt-2 flex-shrink-0">
                <TimeWarning minutesLeft={minutesLeft} />
            </div>

            {/* Pixel scene — constrained height so everything fits on screen */}
            <div className="flex-1 min-h-0 px-4 py-2 flex items-center justify-center">
                <PixelScene
                    userCharacter={userCharacter}
                    partnerCharacter={partnerCharacter}
                    userId={userId}
                    messages={messages}
                />
            </div>

            {/* Partner left overlay */}
            {partnerLeft && (
                <div className="px-4 pb-2 flex-shrink-0">
                    <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-4 text-center animate-pulse">
                        <p className="text-red-300 text-sm font-medium">
                            😔 Your partner has left the chat. Redirecting to lobby...
                        </p>
                    </div>
                </div>
            )}

            {/* Chat ended message (session timeout) */}
            {chatEnded && !partnerLeft && (
                <div className="px-4 pb-2 flex-shrink-0">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center">
                        <p className="text-zinc-400 text-sm">
                            Session ended. See you tomorrow at 5 PM! 👋
                        </p>
                    </div>
                </div>
            )}

            {/* Typing bar */}
            <div className="relative flex-shrink-0">
                <TypingBar onSend={handleSend} disabled={chatEnded || partnerLeft} />
            </div>

            <div ref={messagesEndRef} />
        </div>
    );
}
