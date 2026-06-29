"use client";

import type { PublicScheduledCard } from "@/lib/float-live-scheduled";
import ScheduledDateCard from "./ScheduledDateCard";

interface GhostFillPromptProps {
    count: number;
    timeLabel: string;
    dates: PublicScheduledCard[];
    onJoinExisting: (id: string) => void;
    onContinueCreating: () => void;
    disabled?: boolean;
}

export default function GhostFillPrompt({
    count,
    timeLabel,
    dates,
    onJoinExisting,
    onContinueCreating,
    disabled,
}: GhostFillPromptProps) {
    return (
        <div className="bg-zinc-800 border border-amber-500/40 rounded-xl p-4 space-y-4">
            <div>
                <p className="text-amber-200 font-semibold text-sm">
                    You already have {count} scheduled {count === 1 ? "date" : "dates"} available at{" "}
                    {timeLabel}.
                </p>
                <p className="text-zinc-400 text-xs mt-1">
                    Would you like to join one instead? This helps reduce fragmentation.
                </p>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
                {dates.map((date) => (
                    <ScheduledDateCard
                        key={date.id}
                        date={date}
                        onJoin={onJoinExisting}
                        disabled={disabled}
                    />
                ))}
            </div>

            <button
                onClick={onContinueCreating}
                disabled={disabled}
                className="w-full py-2.5 border border-zinc-600 text-zinc-200 text-sm font-medium rounded-lg hover:bg-zinc-700 transition disabled:opacity-50"
            >
                Continue creating my own date
            </button>
        </div>
    );
}
