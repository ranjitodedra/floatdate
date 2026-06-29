"use client";

import type { PublicScheduledCard } from "@/lib/float-live-scheduled";

interface ScheduledDateCardProps {
    date: PublicScheduledCard;
    onJoin: (id: string) => void;
    disabled?: boolean;
}

export default function ScheduledDateCard({ date, onJoin, disabled }: ScheduledDateCardProps) {
    return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-white font-semibold text-sm">{date.scheduledAtLabel}</p>
                    <p className="text-zinc-400 text-xs mt-0.5">{date.durationMinutes} minutes</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 whitespace-nowrap">
                    {date.intentionLabel}
                </span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-zinc-700 text-zinc-200 px-2 py-1 rounded capitalize">
                    {date.creatorGender}
                </span>
                <span className="bg-zinc-700 text-zinc-200 px-2 py-1 rounded">
                    {date.creatorPreferenceLabel}
                </span>
                <span className="bg-zinc-700 text-zinc-200 px-2 py-1 rounded truncate max-w-full">
                    {date.universityName}
                </span>
            </div>

            {date.expectations && (
                <p className="text-zinc-300 text-sm leading-relaxed border-l-2 border-zinc-600 pl-3">
                    {date.expectations}
                </p>
            )}

            {date.canJoin ? (
                <button
                    onClick={() => onJoin(date.id)}
                    disabled={disabled}
                    className="w-full py-2.5 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 transition disabled:opacity-50"
                >
                    Join This Date
                </button>
            ) : (
                <button
                    disabled
                    className="w-full py-2.5 bg-zinc-700 text-zinc-400 text-sm font-medium rounded-lg cursor-not-allowed"
                >
                    Not a match for your preferences
                </button>
            )}
        </div>
    );
}
