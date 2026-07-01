"use client";

import type { PublicScheduledCard } from "@/lib/float-live-scheduled";

interface ScheduledDateCardProps {
    date: PublicScheduledCard;
    onJoin: (id: string) => void;
    disabled?: boolean;
}

export default function ScheduledDateCard({ date, onJoin, disabled }: ScheduledDateCardProps) {
    return (
        <div className="bg-surface-elevated border border-mahogany rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-cream font-semibold text-sm">{date.scheduledAtLabel}</p>
                    <p className="text-muted text-xs mt-0.5">{date.durationMinutes} minutes</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 whitespace-nowrap">
                    {date.intentionLabel}
                </span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-zinc-700 text-cream/90 px-2 py-1 rounded capitalize">
                    {date.creatorGender}
                </span>
                <span className="bg-zinc-700 text-cream/90 px-2 py-1 rounded">
                    {date.creatorPreferenceLabel}
                </span>
                <span className="bg-zinc-700 text-cream/90 px-2 py-1 rounded truncate max-w-full">
                    {date.universityName}
                </span>
            </div>

            {date.expectations && (
                <p className="text-cream/90 text-sm leading-relaxed border-l-2 border-mahogany pl-3">
                    {date.expectations}
                </p>
            )}

            {date.canJoin ? (
                <button
                    onClick={() => onJoin(date.id)}
                    disabled={disabled}
                    className="w-full py-2.5 bg-indigo-500 text-cream text-sm font-semibold rounded-lg hover:bg-indigo-600 transition disabled:opacity-50"
                >
                    Join This Date
                </button>
            ) : (
                <button
                    disabled
                    className="w-full py-2.5 bg-zinc-700 text-muted text-sm font-medium rounded-lg cursor-not-allowed"
                >
                    Not a match for your preferences
                </button>
            )}
        </div>
    );
}
