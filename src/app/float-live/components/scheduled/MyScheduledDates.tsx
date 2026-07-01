"use client";

import { useCallback, useEffect, useState } from "react";

export interface MyScheduledDateItem {
    id: string;
    scheduledAt: string;
    scheduledAtLabel: string;
    durationMinutes: number;
    intention: string;
    status: string;
    role: "creator" | "joiner";
    expectations: string | null;
    universityName: string;
    banner: string | null;
    canJoin: boolean;
    chatRoomId: string | null;
}

interface MyScheduledDatesProps {
    onJoinDate: (id: string) => void;
    onCancel?: (id: string) => void;
    refreshKey?: number;
}

export default function MyScheduledDates({
    onJoinDate,
    onCancel,
    refreshKey = 0,
}: MyScheduledDatesProps) {
    const [dates, setDates] = useState<MyScheduledDateItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadMine = useCallback(async () => {
        try {
            const res = await fetch("/api/float-live/scheduled-dates/mine");
            if (res.ok) {
                const data = await res.json();
                setDates(data.dates || []);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMine();
        const interval = setInterval(loadMine, 15000);
        return () => clearInterval(interval);
    }, [loadMine, refreshKey]);

    if (loading) return null;

    const upcoming = dates.filter(
        (d) => d.status === "open" || d.status === "claimed" || d.status === "in_progress"
    );

    if (upcoming.length === 0) return null;

    return (
        <div className="space-y-3">
            <h3 className="text-cream font-semibold text-sm">Your scheduled dates</h3>
            {upcoming.map((date) => (
                <div
                    key={date.id}
                    className="bg-surface-elevated border border-mahogany rounded-xl p-4 space-y-3"
                >
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-cream text-sm font-medium">{date.scheduledAtLabel}</p>
                            <p className="text-muted text-xs">
                                {date.durationMinutes} min ·{" "}
                                {date.intention === "blind_date" ? "Blind Date" : "Friendship"} ·{" "}
                                {date.role === "creator" ? "You created" : "You joined"}
                            </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-zinc-700 text-cream/90 capitalize">
                            {date.status.replace("_", " ")}
                        </span>
                    </div>

                    {date.banner && (
                        <p className="text-indigo-200 text-sm bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-4">
                            {date.banner}
                        </p>
                    )}

                    {date.expectations && date.role === "creator" && (
                        <p className="text-muted text-xs italic">{date.expectations}</p>
                    )}

                    <div className="flex gap-2">
                        {(date.canJoin || date.status === "in_progress") && (
                            <button
                                onClick={() => onJoinDate(date.id)}
                                className="flex-1 py-2.5 bg-indigo-500 text-cream text-sm font-semibold rounded-lg hover:bg-indigo-600 transition"
                            >
                                Join Date
                            </button>
                        )}
                        {date.status === "open" && date.role === "creator" && onCancel && (
                            <button
                                onClick={() => onCancel(date.id)}
                                className="px-4 py-2.5 border border-mahogany text-cream/90 text-sm rounded-lg hover:bg-surface-elevated transition"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
