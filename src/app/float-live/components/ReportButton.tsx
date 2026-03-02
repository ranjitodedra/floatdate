"use client";

import { useState } from "react";

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
            <span className="text-xs text-zinc-400">
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
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
                        <h3 className="text-lg font-bold text-zinc-900">Report User</h3>
                        <p className="text-sm text-zinc-500">
                            Select a reason for reporting this user:
                        </p>

                        <div className="space-y-2">
                            {REASONS.map((r) => (
                                <label
                                    key={r.value}
                                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${reason === r.value
                                            ? "border-indigo-400 bg-indigo-50"
                                            : "border-zinc-200 hover:bg-zinc-50"
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
                                    <span className="text-sm text-zinc-700">{r.label}</span>
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
                                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-medium hover:bg-zinc-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!reason || loading}
                                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
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
