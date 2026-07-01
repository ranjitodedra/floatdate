"use client";

interface ChatActionNotificationProps {
    message: string;
    onDismiss: () => void;
    actionLabel?: string;
    onAction?: () => void;
}

export default function ChatActionNotification({
    message,
    onDismiss,
    actionLabel,
    onAction,
}: ChatActionNotificationProps) {
    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in max-w-sm w-[calc(100%-2rem)]">
            <div className="bg-surface-elevated/95 border border-mahogany rounded-xl px-4 py-3 shadow-lg backdrop-blur-sm flex items-start gap-3">
                <p className="text-cream/90 text-sm font-medium flex-1 leading-snug">
                    {message}
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {actionLabel && onAction && (
                        <button
                            type="button"
                            onClick={onAction}
                            className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 bg-indigo-500/20 border border-indigo-500/30 rounded-lg px-2.5 py-1 transition"
                        >
                            {actionLabel}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="text-muted hover:text-cream/90 text-xs"
                        aria-label="Dismiss"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
}
