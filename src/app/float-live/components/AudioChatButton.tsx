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
 * Idle voice trigger button for Float Live chat rooms.
 *
 * - Shows a "🎙️ Voice" button when idle
 * - Shows "Retry Voice" / "Allow Mic" on failure / mic-denied
 * - Does NOT morph into call controls; while a call is active it renders nothing.
 *   Active-call controls live in `VoiceCallControlBar` (a popup above the chat input).
 */
export function VoiceCallTrigger({
    callState,
    error,
    onStartCall,
    disabled = false,
}: Pick<AudioChatButtonProps, "callState" | "error" | "onStartCall" | "disabled">) {
    const isIdle = callState === "idle" || callState === "ended" || callState === "failed";

    if (!(isIdle || callState === "mic_denied")) {
        return null;
    }

    return (
        <div className="flex items-center gap-2 flex-shrink-0">
            <button
                onClick={onStartCall}
                disabled={disabled}
                className={`
                    flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${disabled
                        ? "bg-zinc-700 text-muted cursor-not-allowed"
                        : callState === "failed" || callState === "mic_denied"
                            ? "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                            : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                    }
                `}
                title={error || "Start call"}
            >
                {callState === "failed" ? (
                    <>
                        <span className="text-sm">🔄</span>
                        <span className="hidden sm:inline">Retry Call</span>
                    </>
                ) : callState === "mic_denied" ? (
                    <>
                        <span className="text-sm">🎙️</span>
                        <span className="hidden sm:inline">Allow Mic</span>
                    </>
                ) : (
                    <>
                        <span className="text-sm">🎙️</span>
                        <span className="hidden sm:inline">Call</span>
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

/**
 * Active-call control bar for Float Live chat rooms.
 *
 * Shown while requesting mic or during a call. Contains a connection-state
 * indicator, mute/unmute, and end-call controls. Returns null when idle so the
 * trigger button can take over.
 */
export function VoiceCallControlBar({
    callState,
    isMuted,
    onEndCall,
    onToggleMute,
}: Pick<AudioChatButtonProps, "callState" | "isMuted" | "onEndCall" | "onToggleMute">) {
    const isActive =
        callState === "connecting" ||
        callState === "connected" ||
        callState === "disconnected" ||
        callState === "reconnecting";

    // Requesting mic — show spinner
    if (callState === "requesting_mic") {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-amber-300 font-medium">Mic access...</span>
            </div>
        );
    }

    if (!isActive) {
        return null;
    }

    return (
        <div className="flex items-center gap-1.5">
            {/* Connection state indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-elevated border border-mahogany">
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
                <span className="text-[10px] text-muted font-medium hidden sm:block">
                    {callState === "connected"
                        ? "Call"
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
                        : "bg-zinc-700 text-cream/90 hover:bg-zinc-600 border border-mahogany"
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
                title="End call"
            >
                📵
            </button>
        </div>
    );
}
