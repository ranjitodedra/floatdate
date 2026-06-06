"use client";

import type { WebRTCCallState } from "@/lib/webrtc-service";

interface AudioStatusBadgeProps {
    callState: WebRTCCallState;
    isMuted: boolean;
}

/**
 * Small badge to display the current voice call status.
 * Intended to be shown somewhere prominent but unobtrusive (e.g., header or scene corner).
 */
export default function AudioStatusBadge({ callState, isMuted }: AudioStatusBadgeProps) {
    if (callState === "idle" || callState === "ended" || callState === "requesting_mic") {
        return null;
    }

    if (callState === "failed" || callState === "mic_denied") {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-[10px] font-medium text-red-300">
                <span>❌</span>
                <span>{callState === "mic_denied" ? "Mic Denied" : "Call Failed"}</span>
            </div>
        );
    }

    if (callState === "connecting") {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] font-medium text-amber-300">
                <span className="animate-pulse">📡</span>
                <span>Connecting...</span>
            </div>
        );
    }

    if (callState === "reconnecting") {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-[10px] font-medium text-orange-300">
                <span className="animate-pulse">⚠️</span>
                <span>Reconnecting...</span>
            </div>
        );
    }

    if (callState === "disconnected") {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-[10px] font-medium text-red-300">
                <span className="animate-pulse">📵</span>
                <span>Disconnected</span>
            </div>
        );
    }

    if (callState === "connected") {
        return (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors duration-300 ${
                isMuted 
                    ? "bg-zinc-700 border border-zinc-600 text-zinc-300"
                    : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
            }`}>
                {isMuted ? (
                    <>
                        <span>🔇</span>
                        <span>Muted</span>
                    </>
                ) : (
                    <>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>Voice Active</span>
                    </>
                )}
            </div>
        );
    }

    return null;
}
