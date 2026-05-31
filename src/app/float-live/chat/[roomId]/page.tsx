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
import PartnerPresence, {
    type PartnerPresenceStatus,
} from "../../components/PartnerPresence";
import { supabase } from "@/lib/supabase-client";
import { HEARTBEAT_MS } from "@/lib/float-live-presence";

interface Message {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
}

type EndedReason = "user_exit" | "timeout" | "session_end" | null;

export default function ChatRoomPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const roomId = params.roomId as string;

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
    const [endedReason, setEndedReason] = useState<EndedReason>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const [partnerStatus, setPartnerStatus] = useState<PartnerPresenceStatus | null>("online");
    const [graceSecondsLeft, setGraceSecondsLeft] = useState(480);
    const [showPartnerBack, setShowPartnerBack] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevPartnerStatusRef = useRef<PartnerPresenceStatus | null>("online");
    const connectionIdRef = useRef(
        typeof crypto !== "undefined" ? crypto.randomUUID() : `conn-${Date.now()}`
    );
    // True once THIS client initiates leaving the chat. Used to suppress the
    // "your partner left" message on the client that is itself leaving.
    const leavingRef = useRef(false);

    const handleRoomEnded = useCallback((reason: EndedReason) => {
        // If I'm the one leaving, don't flash "your partner left" at myself —
        // the exit flow handles navigation away from the chat.
        if (leavingRef.current) return;
        setChatEnded(true);
        setEndedReason(reason);
        setPartnerStatus("timeout");
    }, []);

    const handleSelfExit = useCallback(() => {
        leavingRef.current = true;
    }, []);

    useEffect(() => {
        async function init() {
            try {
                const userRes = await fetch("/api/auth/me");
                if (!userRes.ok) {
                    router.push("/login");
                    return;
                }
                const userData = await userRes.json();
                setUserId(userData.user.id);

                const statusRes = await fetch("/api/float-live/status");
                const statusData = await statusRes.json();
                setMinutesLeft(statusData.minutesLeft || 0);

                if (!statusData.active) {
                    handleRoomEnded("session_end");
                }

                const sessionRes = await fetch("/api/float-live/session");
                if (sessionRes.ok) {
                    const sessionData = await sessionRes.json();
                    setSessionId(sessionData.session.id);

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

                    if (matchData.intention === "friendship") {
                        const revealRes = await fetch(
                            `/api/float-live/chat/${roomId}/reveal-email`
                        );
                        if (revealRes.ok) {
                            const revealData = await revealRes.json();
                            if (revealData.partnerEmail) {
                                setPartnerEmail(revealData.partnerEmail);
                            }
                        }
                    }
                }

                const msgsRes = await fetch(`/api/float-live/chat/${roomId}/messages`);
                if (msgsRes.ok) {
                    const msgsData = await msgsRes.json();
                    setMessages(msgsData.messages || []);
                    if (msgsData.roomActive === false) {
                        handleRoomEnded(
                            (msgsData.endedReason as EndedReason) || "user_exit"
                        );
                    }
                }
            } catch (err) {
                console.error("Chat init error:", err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [roomId, router, handleRoomEnded]);

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
                    const updated = payload.new as {
                        isActive: boolean;
                        status?: string;
                        endedReason?: string | null;
                    };
                    if (!updated.isActive || updated.status === "ended") {
                        handleRoomEnded(
                            (updated.endedReason as EndedReason) || "user_exit"
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, handleRoomEnded]);

    const sendPresence = useCallback(async () => {
        if (!roomId || chatEnded) return;

        try {
            const res = await fetch(`/api/float-live/chat/${roomId}/presence`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionId: connectionIdRef.current,
                    away: typeof document !== "undefined" && document.hidden,
                }),
            });

            if (!res.ok) {
                setReconnecting(true);
                return;
            }

            setReconnecting(false);
            const data = await res.json();

            if (data.roomStatus === "ended") {
                handleRoomEnded((data.endedReason as EndedReason) || "user_exit");
                return;
            }

            const nextStatus = data.partner?.status as PartnerPresenceStatus;
            const prev = prevPartnerStatusRef.current;

            if (prev === "away" && nextStatus === "online") {
                setShowPartnerBack(true);
                setTimeout(() => setShowPartnerBack(false), 5000);
            }

            prevPartnerStatusRef.current = nextStatus;
            setPartnerStatus(nextStatus);
            setGraceSecondsLeft(data.partner?.graceSecondsLeft ?? 0);
        } catch {
            setReconnecting(true);
        }
    }, [roomId, chatEnded, handleRoomEnded]);

    useEffect(() => {
        if (!roomId || chatEnded) return;

        sendPresence();
        const interval = setInterval(sendPresence, HEARTBEAT_MS);
        return () => clearInterval(interval);
    }, [roomId, chatEnded, sendPresence]);

    // Report away/back the instant this tab is hidden or refocused so the
    // partner sees "stepped away" immediately instead of after a heartbeat gap.
    useEffect(() => {
        if (!roomId || chatEnded) return;
        const onVisibility = () => {
            sendPresence();
        };
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("blur", onVisibility);
        window.addEventListener("focus", onVisibility);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("blur", onVisibility);
            window.removeEventListener("focus", onVisibility);
        };
    }, [roomId, chatEnded, sendPresence]);

    useEffect(() => {
        if (!roomId || chatEnded) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/float-live/chat/${roomId}/messages`);
                if (res.ok) {
                    const data = await res.json();
                    const fetched: Message[] = data.messages || [];

                    if (data.roomActive === false) {
                        handleRoomEnded(
                            (data.endedReason as EndedReason) || "user_exit"
                        );
                        return;
                    }

                    setMessages((prev) => {
                        const existingIds = new Set(prev.map((m) => m.id));
                        const newMsgs = fetched.filter((m) => !existingIds.has(m.id));
                        if (newMsgs.length === 0) return prev;
                        return [...prev, ...newMsgs];
                    });
                }
            } catch {
                /* ignore polling errors */
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [roomId, chatEnded, handleRoomEnded]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch("/api/float-live/status");
                const data = await res.json();
                setMinutesLeft(data.minutesLeft || 0);
                if (!data.active) {
                    handleRoomEnded("session_end");
                }
            } catch {
                /* ignore */
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [handleRoomEnded]);

    useEffect(() => {
        if (!chatEnded) return;
        const timeout = setTimeout(() => {
            router.push("/float-live");
        }, 4000);
        return () => clearTimeout(timeout);
    }, [chatEnded, router]);

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

    const endedMessage = (() => {
        if (!chatEnded) return null;
        switch (endedReason) {
            case "timeout":
                return "Your partner didn't come back in time.";
            case "session_end":
                return "Session ended. See you tomorrow at 5 PM! 👋";
            case "user_exit":
            default:
                return "Your partner has left the chat. Redirecting to lobby...";
        }
    })();

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
            <PartnerPresence
                partnerStatus={chatEnded ? null : partnerStatus}
                graceSecondsLeft={graceSecondsLeft}
                showBackToast={showPartnerBack}
                reconnecting={reconnecting && !chatEnded}
                onDismissBackToast={() => setShowPartnerBack(false)}
            />

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
                    <ExitDateButton
                        chatRoomId={roomId}
                        sessionId={sessionId || undefined}
                        onExit={handleSelfExit}
                    />
                </div>
            </div>

            <div className="px-4 pt-2 flex-shrink-0">
                <TimeWarning minutesLeft={minutesLeft} />
            </div>

            <div className="flex-1 min-h-0 px-4 py-2 flex items-center justify-center">
                <PixelScene
                    userCharacter={userCharacter}
                    partnerCharacter={partnerCharacter}
                    userId={userId}
                    messages={messages}
                />
            </div>

            {chatEnded && endedMessage && (
                <div className="px-4 pb-2 flex-shrink-0">
                    <div
                        className={`rounded-xl p-4 text-center ${
                            endedReason === "session_end"
                                ? "bg-zinc-800 border border-zinc-700"
                                : "bg-red-900/30 border border-red-500/40 animate-pulse"
                        }`}
                    >
                        <p
                            className={`text-sm font-medium ${
                                endedReason === "session_end"
                                    ? "text-zinc-400"
                                    : "text-red-300"
                            }`}
                        >
                            {endedMessage}
                        </p>
                    </div>
                </div>
            )}

            <div className="relative flex-shrink-0">
                <TypingBar
                    onSend={handleSend}
                    disabled={chatEnded || partnerStatus === "timeout"}
                />
            </div>

            <div ref={messagesEndRef} />
        </div>
    );
}
