"use client";

import { useState } from "react";

export interface ReferralStatusData {
    code: string;
    link: string;
    count: number;
    unlocked: boolean;
}

interface ReferralSharePanelProps {
    link: string;
    count: number;
    compact?: boolean;
}

export function ReferralSharePanel({ link, count, compact = false }: ReferralSharePanelProps) {
    const [copyFeedback, setCopyFeedback] = useState("");
    const [instagramFeedback, setInstagramFeedback] = useState("");

    const shareText = `Join me on FloatLive! Sign up here: ${link}`;

    async function copyLink() {
        await navigator.clipboard.writeText(link);
        setCopyFeedback("Copied ✓");
        setTimeout(() => setCopyFeedback(""), 2000);
    }

    async function copyForInstagram() {
        await navigator.clipboard.writeText(link);
        setInstagramFeedback("Paste this in your Instagram bio or story");
        setTimeout(() => setInstagramFeedback(""), 3000);
    }

    return (
        <div className={compact ? "space-y-3" : "space-y-4"}>
            <div className="flex gap-2">
                <input
                    type="text"
                    readOnly
                    value={link}
                    className="flex-1 min-w-0 px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-700 truncate"
                />
                <button
                    type="button"
                    onClick={copyLink}
                    className="shrink-0 px-4 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition"
                >
                    {copyFeedback || "Copy link"}
                </button>
            </div>

            <div className={`grid grid-cols-1 ${compact ? "sm:grid-cols-3" : ""} gap-2`}>
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                >
                    WhatsApp
                </a>
                <a
                    href={`sms:?body=${encodeURIComponent(shareText)}`}
                    className="flex items-center justify-center px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                >
                    SMS
                </a>
                <button
                    type="button"
                    onClick={copyForInstagram}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                >
                    Copy for Instagram
                </button>
            </div>

            {instagramFeedback && (
                <p className="text-xs text-zinc-500">{instagramFeedback}</p>
            )}

            <p className="text-sm text-zinc-500">
                {count} friend{count === 1 ? "" : "s"} joined so far
            </p>
        </div>
    );
}
