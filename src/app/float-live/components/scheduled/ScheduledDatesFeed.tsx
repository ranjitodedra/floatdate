"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicScheduledCard } from "@/lib/float-live-scheduled";
import ScheduledDateCard from "./ScheduledDateCard";

interface ScheduledDatesFeedProps {
    onJoin: (id: string) => void;
    joinDisabled?: boolean;
    refreshKey?: number;
}

export default function ScheduledDatesFeed({
    onJoin,
    joinDisabled,
    refreshKey = 0,
}: ScheduledDatesFeedProps) {
    const [dates, setDates] = useState<PublicScheduledCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadFeed = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch("/api/float-live/scheduled-dates");
            if (!res.ok) {
                throw new Error("Failed to load feed");
            }
            const data = await res.json();
            setDates(data.dates || []);
        } catch {
            setError("Could not load scheduled dates.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFeed();
        const interval = setInterval(loadFeed, 15000);
        return () => clearInterval(interval);
    }, [loadFeed, refreshKey]);

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return <p className="text-red-400 text-sm text-center py-4">{error}</p>;
    }

    if (dates.length === 0) {
        return (
            <p className="text-muted text-sm text-center py-6">
                No scheduled dates available right now. Create one below!
            </p>
        );
    }

    return (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {dates.map((date) => (
                <ScheduledDateCard
                    key={date.id}
                    date={date}
                    onJoin={onJoin}
                    disabled={joinDisabled}
                />
            ))}
        </div>
    );
}
