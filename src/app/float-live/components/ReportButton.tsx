"use client";

import { useState } from "react";
import { glassInputClass } from "@/lib/ui-classes";

interface ReportButtonProps {
    chatRoomId: string;
}

const REASONS = [
    { value: "harassment", label: "Harassment" },
    { value: "spam", label: "Spam" },
    { value: "inappropriate", label: "Inappropriate content" },
    { value: "other", label: "Other" },
];

export default function ReportButton({ chatRoomId }: ReportButtonProps) {
    const [showModal, setShowModal] = useState(false);
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        if (!reason) return;
        setLoading(true);
        try {
            await fetch(`/api/float-live/chat/${chatRoomId}/report`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason, details }),
            });
            setSubmitted(true);
        } catch (err) {
            console.error("Report error:", err);
        } finally {
            setLoading(false);
        }
    }

    if (submitted) {
        return (
            <span className="text-xs text-cream-muted">
                ✅ Report submitted
            </span>
        );
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="text-xs text-red-400 hover:text-red-600 transition font-medium"
            >
                ⚠️ Report
            </button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="glass-panel-strong rounded-2xl shadow-modal max-w-sm w-full p-5 space-y-4">
                        <h3 className="text-lg font-bold text-cream">Report User</h3>
                        <p className="text-sm text-cream-muted">
                            Select a reason for reporting this user:
                        </p>

                        <div className="space-y-2">
                            {REASONS.map((r) => (
                                <label
                                    key={r.value}
                                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${reason === r.value
                                            ? "border-cream/40 glass-panel-strong"
                                            : "glass-input hover:bg-gold-soft/10"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={r.value}
                                        checked={reason === r.value}
                                        onChange={() => setReason(r.value)}
                                        className="accent-indigo-500"
                                    />
                                    <span className="text-sm text-cream/90">{r.label}</span>
                                </label>
                            ))}
                        </div>

                        {reason === "other" && (
                            <textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Please describe..."
                                maxLength={1000}
                                rows={3}
                                className={`${glassInputClass} text-sm resize-none`}
                            />
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 glass-input text-cream/90 rounded-xl text-sm font-medium hover:bg-gold-soft/10 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!reason || loading}
                                className="flex-1 py-2.5 bg-red-500 text-cream rounded-xl text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
                            >
                                {loading ? "Submitting..." : "Submit Report"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
