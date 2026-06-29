"use client";

import { useCallback, useState } from "react";
import type { PublicScheduledCard } from "@/lib/float-live-scheduled";
import ScheduledDatesFeed from "./ScheduledDatesFeed";
import CreateScheduledDateForm from "./CreateScheduledDateForm";
import GhostFillPrompt from "./GhostFillPrompt";
import MyScheduledDates from "./MyScheduledDates";

interface ScheduledDatesPanelProps {
    preference: string;
    intention: string;
    onPreferenceChange: (val: string) => void;
    onIntentionChange: (val: string) => void;
    onClaimDate: (dateId: string) => void;
    onJoinDate: (dateId: string) => void;
    actionDisabled?: boolean;
    refreshKey?: number;
    onRefresh?: () => void;
}

export default function ScheduledDatesPanel({
    preference,
    intention,
    onPreferenceChange,
    onIntentionChange,
    onClaimDate,
    onJoinDate,
    actionDisabled,
    refreshKey = 0,
    onRefresh,
}: ScheduledDatesPanelProps) {
    const [ghostFill, setGhostFill] = useState<{
        count: number;
        timeLabel: string;
        dates: PublicScheduledCard[];
    } | null>(null);
    const [showGhostFill, setShowGhostFill] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [localRefresh, setLocalRefresh] = useState(0);

    const combinedRefreshKey = refreshKey + localRefresh;

    const bumpRefresh = useCallback(() => {
        setLocalRefresh((k) => k + 1);
        onRefresh?.();
    }, [onRefresh]);

    const handleCheckGhostFill = useCallback(
        async (payload: { scheduledAt: string; preference: string; intention: string }) => {
            const params = new URLSearchParams(payload);
            const res = await fetch(`/api/float-live/scheduled-dates/ghost-fill?${params}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.count > 0) {
                setGhostFill({
                    count: data.count,
                    timeLabel: data.timeLabel,
                    dates: data.dates,
                });
                setShowGhostFill(true);
            } else {
                setGhostFill(null);
                setShowGhostFill(false);
            }
        },
        []
    );

    const handleCreate = useCallback(
        async (payload: {
            scheduledAt: string;
            durationMinutes: number;
            preference: string;
            intention: string;
            expectations: string;
        }) => {
            const res = await fetch("/api/float-live/scheduled-dates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to create scheduled date");
            }
            setShowGhostFill(false);
            setGhostFill(null);
            setSuccessMessage("Your scheduled date has been posted to the feed.");
            bumpRefresh();
        },
        [bumpRefresh]
    );

    async function handleCancel(id: string) {
        const res = await fetch(`/api/float-live/scheduled-dates/${id}`, { method: "DELETE" });
        if (res.ok) {
            bumpRefresh();
        }
    }

    return (
        <div className="space-y-4">
            <MyScheduledDates
                onJoinDate={onJoinDate}
                onCancel={handleCancel}
                refreshKey={combinedRefreshKey}
            />

            {successMessage && (
                <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-4">
                    {successMessage}
                </p>
            )}

            <div>
                <h3 className="text-white font-semibold text-sm mb-2">Available scheduled dates</h3>
                <ScheduledDatesFeed
                    onJoin={onClaimDate}
                    joinDisabled={actionDisabled}
                    refreshKey={combinedRefreshKey}
                />
            </div>

            {showGhostFill && ghostFill && (
                <GhostFillPrompt
                    count={ghostFill.count}
                    timeLabel={ghostFill.timeLabel}
                    dates={ghostFill.dates}
                    onJoinExisting={onClaimDate}
                    onContinueCreating={() => setShowGhostFill(false)}
                    disabled={actionDisabled}
                />
            )}

            <CreateScheduledDateForm
                preference={preference}
                intention={intention}
                onPreferenceChange={onPreferenceChange}
                onIntentionChange={onIntentionChange}
                onSubmit={handleCreate}
                onCheckGhostFill={handleCheckGhostFill}
                disabled={actionDisabled}
            />
        </div>
    );
}
