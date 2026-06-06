"use client";

import type { WebRTCCallState } from "@/lib/webrtc-service";

interface AudioChatButtonProps {
    callState: WebRTCCallState;
    isMuted: boolean;
    error: string | null;
    onStartCall: () => void;
    onEndCall: () => void;
    onToggleMute: () => void;
    disabled?: boolean;
}

/**
 * Voice chat toggle button and inline controls for Float Live chat rooms.
 *
 * - Shows a "🎙️ Voice" button when idle
 * - Expands to mute/unmute + end call controls when active
 * - Displays connection state with colored indicators
 * - Shows clear error messages for mic permission denial
 */
export default function AudioChatButton({
    callState,
    isMuted,
    error,
    onStartCall,
    onEndCall,
    onToggleMute,
    disabled = false,
}: AudioChatButtonProps) {
    const isActive =
        callState === "connecting" ||
        callState === "connected" ||
        callState === "disconnected" ||
        callState === "reconnecting";

    const isIdle = callState === "idle" || callState === "ended" || callState === "failed";

    // Idle / failed / ended — show start button
    if (isIdle || callState === "mic_denied") {
        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={onStartCall}
                    disabled={disabled}
                    className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                        transition-all duration-200
                        ${disabled
                            ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                            : callState === "failed" || callState === "mic_denied"
                                ? "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                                : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                        }
                    `}
                    title={error || "Start voice chat"}
                >
                    {callState === "failed" ? (
                        <>
                            <span className="text-sm">🔄</span>
                            Retry Voice
                        </>
                    ) : callState === "mic_denied" ? (
                        <>
                            <span className="text-sm">🎙️</span>
                            Allow Mic
                        </>
                    ) : (
                        <>
                            <span className="text-sm">🎙️</span>
                            Voice
                        </>
                    )}
                </button>

                {/* Error tooltip */}
                {error && (callState === "failed" || callState === "mic_denied") && (
                    <span className="text-[10px] text-red-400 max-w-[140px] leading-tight hidden sm:block">
                        {error}
                    </span>
                )}
            </div>
        );
    }

    // Requesting mic — show spinner
    if (callState === "requesting_mic") {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-amber-300 font-medium">Mic access...</span>
            </div>
        );
    }

    // Active call — show controls
    if (isActive) {
        return (
            <div className="flex items-center gap-1.5">
                {/* Connection state indicator */}
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600">
                    <span
                        className={`
                            w-2 h-2 rounded-full flex-shrink-0
                            ${callState === "connected"
                                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                                : callState === "connecting"
                                    ? "bg-amber-400 animate-pulse"
                                    : callState === "reconnecting"
                                        ? "bg-orange-400 animate-pulse"
                                        : "bg-red-400 animate-pulse"
                            }
                        `}
                    />
                    <span className="text-[10px] text-zinc-400 font-medium hidden sm:block">
                        {callState === "connected"
                            ? "Voice"
                            : callState === "connecting"
                                ? "Connecting"
                                : callState === "reconnecting"
                                    ? "Reconnecting"
                                    : "Disconnected"
                        }
                    </span>
                </div>

                {/* Mute/Unmute */}
                <button
                    onClick={onToggleMute}
                    className={`
                        p-1.5 rounded-lg transition-all duration-200 text-sm
                        ${isMuted
                            ? "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                            : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border border-zinc-600"
                        }
                    `}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? "🔇" : "🔊"}
                </button>

                {/* End call */}
                <button
                    onClick={onEndCall}
                    className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-all duration-200 text-sm"
                    title="End voice call"
                >
                    📵
                </button>
            </div>
        );
    }

    return null;
}
