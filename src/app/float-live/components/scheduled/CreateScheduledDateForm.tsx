"use client";

import { useState } from "react";

interface CreateScheduledDateFormProps {
    preference: string;
    intention: string;
    onPreferenceChange: (val: string) => void;
    onIntentionChange: (val: string) => void;
    onSubmit: (payload: {
        scheduledAt: string;
        durationMinutes: number;
        preference: string;
        intention: string;
        expectations: string;
    }) => Promise<void>;
    onCheckGhostFill: (payload: {
        scheduledAt: string;
        preference: string;
        intention: string;
    }) => Promise<void>;
    disabled?: boolean;
}

export default function CreateScheduledDateForm({
    preference,
    intention,
    onPreferenceChange,
    onIntentionChange,
    onSubmit,
    onCheckGhostFill,
    disabled,
}: CreateScheduledDateFormProps) {
    const [dateValue, setDateValue] = useState("");
    const [timeValue, setTimeValue] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [expectations, setExpectations] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function buildScheduledAtIso(): string | null {
        if (!dateValue || !timeValue) return null;
        const local = new Date(`${dateValue}T${timeValue}:00`);
        if (Number.isNaN(local.getTime())) return null;
        return local.toISOString();
    }

    async function handleTimeBlur() {
        const scheduledAt = buildScheduledAtIso();
        if (!scheduledAt) return;
        await onCheckGhostFill({ scheduledAt, preference, intention });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const scheduledAt = buildScheduledAtIso();
        if (!scheduledAt) {
            setError("Please select a date and time.");
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                scheduledAt,
                durationMinutes,
                preference,
                intention,
                expectations,
            });
            setDateValue("");
            setTimeValue("");
            setExpectations("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create date");
        } finally {
            setSubmitting(false);
        }
    }

    const selectClass =
        "w-full bg-surface-elevated text-cream text-sm px-3 py-2 rounded-lg border border-mahogany focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50";

    return (
        <form onSubmit={handleSubmit} className="bg-surface-elevated border border-mahogany rounded-xl p-4 space-y-4">
            <h3 className="text-cream font-semibold text-sm">Create a scheduled date</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="text-muted text-xs block mb-1">Date</label>
                    <input
                        type="date"
                        value={dateValue}
                        onChange={(e) => setDateValue(e.target.value)}
                        disabled={disabled || submitting}
                        className={selectClass}
                        required
                    />
                </div>
                <div>
                    <label className="text-muted text-xs block mb-1">Time</label>
                    <input
                        type="time"
                        value={timeValue}
                        onChange={(e) => setTimeValue(e.target.value)}
                        onBlur={handleTimeBlur}
                        disabled={disabled || submitting}
                        className={selectClass}
                        required
                    />
                </div>
            </div>

            <div>
                <label className="text-muted text-xs block mb-1">Duration</label>
                <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    disabled={disabled || submitting}
                    className={selectClass}
                >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="text-muted text-xs block mb-1">Prefer (partner gender)</label>
                    <select
                        value={preference}
                        onChange={(e) => onPreferenceChange(e.target.value)}
                        disabled={disabled || submitting}
                        className={selectClass}
                    >
                        <option value="any">Any</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="nonbinary">Non-binary</option>
                    </select>
                </div>
                <div>
                    <label className="text-muted text-xs block mb-1">Mode</label>
                    <select
                        value={intention}
                        onChange={(e) => onIntentionChange(e.target.value)}
                        disabled={disabled || submitting}
                        className={selectClass}
                    >
                        <option value="blind_date">Blind Date</option>
                        <option value="friendship">Friendship</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="text-muted text-xs block mb-1">
                    Other preferences or expectations (optional)
                </label>
                <textarea
                    value={expectations}
                    onChange={(e) => setExpectations(e.target.value)}
                    disabled={disabled || submitting}
                    maxLength={500}
                    rows={3}
                    placeholder='e.g. "Looking for someone who enjoys hiking."'
                    className={`${selectClass} resize-none`}
                />
                <p className="text-muted text-xs mt-1">For expectations only — not guaranteed matching rules.</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
                type="submit"
                disabled={disabled || submitting}
                className="w-full py-3 bg-indigo-500 text-cream font-semibold rounded-lg hover:bg-indigo-600 transition disabled:opacity-50"
            >
                {submitting ? "Creating..." : "Schedule Date"}
            </button>
        </form>
    );
}
