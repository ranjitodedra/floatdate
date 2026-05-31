"use client";

export type PartnerPresenceStatus = "online" | "away" | "timeout";

interface PartnerPresenceProps {
    partnerStatus: PartnerPresenceStatus | null;
    /** Kept for API compatibility; no longer displayed as a live countdown. */
    graceSecondsLeft?: number;
    showBackToast: boolean;
    reconnecting: boolean;
    onDismissBackToast?: () => void;
}

export default function PartnerPresence({
    partnerStatus,
    showBackToast,
    reconnecting,
    onDismissBackToast,
}: PartnerPresenceProps) {
    return (
        <>
            {reconnecting && (
                <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="bg-zinc-800 border border-zinc-600 rounded-xl px-6 py-4 text-center shadow-xl">
                        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-white text-sm font-medium">Reconnecting…</p>
                        <p className="text-zinc-400 text-xs mt-1">Your chat is still open</p>
                    </div>
                </div>
            )}

            {showBackToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
                    <div className="bg-emerald-900/90 border border-emerald-500/50 rounded-xl px-5 py-3 shadow-lg flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <p className="text-emerald-100 text-sm font-medium">
                            Your partner is back!
                        </p>
                        {onDismissBackToast && (
                            <button
                                type="button"
                                onClick={onDismissBackToast}
                                className="ml-2 text-emerald-300/80 hover:text-emerald-100 text-xs"
                                aria-label="Dismiss"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            )}

            {partnerStatus === "away" && !reconnecting && (
                <div className="px-4 pb-2 flex-shrink-0">
                    <div className="bg-amber-900/30 border border-amber-500/40 rounded-xl p-4 text-center">
                        <p className="text-amber-200 text-sm font-medium">
                            Your partner stepped away temporarily
                        </p>
                        <p className="text-amber-300/80 text-xs mt-1">
                            Will wait up to 8 minutes
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
