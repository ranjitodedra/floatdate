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
import { VoiceCallTrigger, VoiceCallControlBar } from "../../components/AudioChatButton";
import AudioStatusBadge from "../../components/AudioStatusBadge";
import ChatActionNotification from "../../components/ChatActionNotification";
import { useWebRTC } from "../../hooks/useWebRTC";
import { useSpeechTranscription } from "../../hooks/useSpeechTranscription";
import { supabase } from "@/lib/supabase-client";
import { HEARTBEAT_MS } from "@/lib/float-live-presence";
import type { WebRTCCallState } from "@/lib/webrtc-service";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
    const [partnerName, setPartnerName] = useState<string | null>(null);
    const [intention, setIntention] = useState("blind_date");
    const [messages, setMessages] = useState<Message[]>([]);
    const [showTranscript, setShowTranscript] = useState(false);
    const [minutesLeft, setMinutesLeft] = useState(60);
    const [chatEnded, setChatEnded] = useState(false);
    const [endedReason, setEndedReason] = useState<EndedReason>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [myParticipantId, setMyParticipantId] = useState("");
    const [partnerParticipantId, setPartnerParticipantId] = useState("");

    const [partnerStatus, setPartnerStatus] = useState<PartnerPresenceStatus | null>("online");
    const [graceSecondsLeft, setGraceSecondsLeft] = useState(480);
    const [showPartnerBack, setShowPartnerBack] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);

    const [emailRevealedByMe, setEmailRevealedByMe] = useState(false);
    const [emailRevealedByPartner, setEmailRevealedByPartner] = useState(false);
    const [emailRevealNotice, setEmailRevealNotice] = useState(false);
    const [incomingCallNotice, setIncomingCallNotice] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevPartnerStatusRef = useRef<PartnerPresenceStatus | null>("online");
    const notifyChannelRef = useRef<RealtimeChannel | null>(null);
    const prevCallStateRef = useRef<WebRTCCallState>("idle");
    const callStateRef = useRef<WebRTCCallState>("idle");
    const isParticipantARef = useRef<boolean | null>(null);
    const emailRevealedByPartnerRef = useRef(false);
    const emailRevealedByMeRef = useRef(false);
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

    // WebRTC hook
    const { callState, isMuted, error: audioError, startCall, endCall, toggleMute } = useWebRTC({
        roomId,
        userId,
        participantId: myParticipantId,
        partnerParticipantId,
        chatEnded,
    });

    useSpeechTranscription({
        callState,
        roomId,
        userId,
    });

    const handleSelfExit = useCallback(() => {
        leavingRef.current = true;
    }, []);

    const applyRevealStatus = useCallback(
        (
            revealData: {
                emailRevealedByA: boolean;
                emailRevealedByB: boolean;
                bothRevealed: boolean;
                partnerEmail: string | null;
            },
            isA: boolean
        ) => {
            const revealedByMe = isA ? revealData.emailRevealedByA : revealData.emailRevealedByB;
            const revealedByPartner = isA ? revealData.emailRevealedByB : revealData.emailRevealedByA;

            setEmailRevealedByMe(revealedByMe);
            setEmailRevealedByPartner(revealedByPartner);
            emailRevealedByMeRef.current = revealedByMe;
            emailRevealedByPartnerRef.current = revealedByPartner;

            if (revealData.bothRevealed && revealData.partnerEmail) {
                setPartnerEmail(revealData.partnerEmail);
                setEmailRevealNotice(false);
            } else if (revealedByPartner && !revealedByMe) {
                setEmailRevealNotice(true);
            }
        },
        []
    );

    const handleJoinCall = useCallback(async () => {
        setIncomingCallNotice(false);
        await startCall();
    }, [startCall]);

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
                    if (matchData.participantId) {
                        setMyParticipantId(matchData.participantId);
                    }
                    if (matchData.partnerParticipantId) {
                        setPartnerParticipantId(matchData.partnerParticipantId);
                    }
                    if (typeof matchData.isParticipantA === "boolean") {
                        isParticipantARef.current = matchData.isParticipantA;
                    }
                    if (matchData.partnerName) {
                        setPartnerName(matchData.partnerName);
                    }

                    const revealRes = await fetch(
                        `/api/float-live/chat/${roomId}/reveal-email`
                    );
                    if (revealRes.ok) {
                        const revealData = await revealRes.json();
                        if (typeof matchData.isParticipantA === "boolean") {
                            applyRevealStatus(revealData, matchData.isParticipantA);
                        } else if (revealData.partnerEmail) {
                            setPartnerEmail(revealData.partnerEmail);
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
    }, [roomId, router, handleRoomEnded, applyRevealStatus]);

    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

    useEffect(() => {
        if (chatEnded) {
            setIncomingCallNotice(false);
            setEmailRevealNotice(false);
        }
    }, [chatEnded]);

    useEffect(() => {
        const prev = prevCallStateRef.current;

        if (prev !== "connecting" && callState === "connecting") {
            notifyChannelRef.current?.send({
                type: "broadcast",
                event: "call-invite",
                payload: { fromUserId: userId },
            });
        }

        const endedBeforeConnect =
            (callState === "ended" || callState === "failed") &&
            (prev === "connecting" || prev === "requesting_mic");

        if (endedBeforeConnect) {
            notifyChannelRef.current?.send({
                type: "broadcast",
                event: "call-cancelled",
                payload: {},
            });
        }

        if (callState === "connecting" || callState === "connected") {
            setIncomingCallNotice(false);
        }

        prevCallStateRef.current = callState;
    }, [callState, userId]);

    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`chat-room-${roomId}`, {
                config: { broadcast: { self: false } },
            })
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
                        emailRevealedByA?: boolean;
                        emailRevealedByB?: boolean;
                    };

                    if (!updated.isActive || updated.status === "ended") {
                        handleRoomEnded(
                            (updated.endedReason as EndedReason) || "user_exit"
                        );
                        return;
                    }

                    const isA = isParticipantARef.current;
                    if (isA === null) return;

                    const prevPartnerRevealed = emailRevealedByPartnerRef.current;
                    const revealedByMe = isA
                        ? !!updated.emailRevealedByA
                        : !!updated.emailRevealedByB;
                    const revealedByPartner = isA
                        ? !!updated.emailRevealedByB
                        : !!updated.emailRevealedByA;

                    setEmailRevealedByMe(revealedByMe);
                    setEmailRevealedByPartner(revealedByPartner);
                    emailRevealedByMeRef.current = revealedByMe;
                    emailRevealedByPartnerRef.current = revealedByPartner;

                    if (!prevPartnerRevealed && revealedByPartner && !revealedByMe) {
                        setEmailRevealNotice(true);
                    }

                    if (revealedByMe && revealedByPartner) {
                        setEmailRevealNotice(false);
                        fetch(`/api/float-live/chat/${roomId}/reveal-email`)
                            .then((res) => (res.ok ? res.json() : null))
                            .then((data) => {
                                if (data?.partnerEmail) {
                                    setPartnerEmail(data.partnerEmail);
                                }
                            })
                            .catch(() => {
                                /* ignore */
                            });
                    }
                }
            )
            .on("broadcast", { event: "call-invite" }, () => {
                const state = callStateRef.current;
                if (
                    state === "idle" ||
                    state === "ended" ||
                    state === "failed"
                ) {
                    setIncomingCallNotice(true);
                }
            })
            .on("broadcast", { event: "call-cancelled" }, () => {
                setIncomingCallNotice(false);
            })
            .subscribe();

        notifyChannelRef.current = channel;

        return () => {
            notifyChannelRef.current = null;
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

    const partnerLabel =
        intention === "friendship" && partnerName ? partnerName : "Your partner";

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-deep">
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
        <div className="h-screen bg-surface-deep flex flex-col overflow-hidden">
            <PartnerPresence
                partnerStatus={chatEnded ? null : partnerStatus}
                graceSecondsLeft={graceSecondsLeft}
                showBackToast={showPartnerBack}
                reconnecting={reconnecting && !chatEnded}
                onDismissBackToast={() => setShowPartnerBack(false)}
            />

            {incomingCallNotice && !chatEnded && (
                <ChatActionNotification
                    message={`${partnerLabel} is calling you. Click Call to join the call.`}
                    actionLabel="Join Call"
                    onAction={handleJoinCall}
                    onDismiss={() => setIncomingCallNotice(false)}
                />
            )}

            {emailRevealNotice && !chatEnded && (
                <ChatActionNotification
                    message={`${partnerLabel} has revealed their email address. Click 'Reveal Email' to view it as well.`}
                    onDismiss={() => setEmailRevealNotice(false)}
                />
            )}

            <div className="flex items-center justify-between px-4 py-3 bg-surface-elevated border-b border-mahogany flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-cream font-semibold text-sm">Float Live</span>
                    {partnerEmail && emailRevealedByMe && emailRevealedByPartner && (
                        <span className="text-xs text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                            📧 {partnerEmail}
                        </span>
                    )}
                    <AudioStatusBadge callState={callState} isMuted={isMuted} />
                </div>
                <div className="flex items-center gap-3">
                    <RevealEmailButton
                        chatRoomId={roomId}
                        partnerEmail={partnerEmail}
                        partnerHasRevealed={emailRevealedByPartner && !emailRevealedByMe}
                    />
                    <button
                        onClick={() => setShowTranscript(true)}
                        className="text-xs text-muted hover:text-cream/90 transition font-medium"
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
                                ? "bg-surface-elevated border border-mahogany"
                                : "bg-red-900/30 border border-red-500/40 animate-pulse"
                        }`}
                    >
                        <p
                            className={`text-sm font-medium ${
                                endedReason === "session_end"
                                    ? "text-muted"
                                    : "text-red-300"
                            }`}
                        >
                            {endedMessage}
                        </p>
                    </div>
                </div>
            )}

            <div className="relative flex-shrink-0">
                {(callState === "requesting_mic" ||
                    callState === "connecting" ||
                    callState === "connected" ||
                    callState === "disconnected" ||
                    callState === "reconnecting") && (
                    <div className="absolute left-3 right-3 bottom-full mb-2 z-10 flex items-center justify-center gap-3 bg-surface-elevated/95 border border-mahogany rounded-xl shadow-lg px-4 py-2 backdrop-blur-sm">
                        <VoiceCallControlBar
                            callState={callState}
                            isMuted={isMuted}
                            onEndCall={endCall}
                            onToggleMute={toggleMute}
                        />
                    </div>
                )}
                <TypingBar
                    onSend={handleSend}
                    disabled={chatEnded || partnerStatus === "timeout"}
                    voiceTrigger={
                        <VoiceCallTrigger
                            callState={callState}
                            error={audioError}
                            onStartCall={startCall}
                            disabled={chatEnded || partnerStatus === "timeout" || !myParticipantId || !partnerParticipantId}
                        />
                    }
                />
            </div>

            <div ref={messagesEndRef} />
        </div>
    );
}
