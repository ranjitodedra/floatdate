"use client";

import { useState } from "react";
import { glassInputClass } from "@/lib/ui-classes";

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

    const secondaryBtnClass =
        "flex items-center justify-center px-4 py-2.5 rounded-xl glass-input text-sm font-medium text-cream/90 hover:bg-gold-soft/10 transition";

    return (
        <div className={compact ? "space-y-3" : "space-y-4"}>
            <div className="flex gap-2">
                <input
                    type="text"
                    readOnly
                    value={link}
                    className={`${glassInputClass} flex-1 min-w-0 px-3 py-2.5 text-sm truncate`}
                />
                <button
                    type="button"
                    onClick={copyLink}
                    className="shrink-0 px-4 py-2.5 bg-cream text-mahogany-deep text-sm font-medium rounded-xl hover:bg-[#ffffff] transition"
                >
                    {copyFeedback || "Copy link"}
                </button>
            </div>

            <div className={`grid grid-cols-1 ${compact ? "sm:grid-cols-3" : ""} gap-2`}>
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={secondaryBtnClass}
                >
                    WhatsApp
                </a>
                <a
                    href={`sms:?body=${encodeURIComponent(shareText)}`}
                    className={secondaryBtnClass}
                >
                    SMS
                </a>
                <button
                    type="button"
                    onClick={copyForInstagram}
                    className={secondaryBtnClass}
                >
                    Copy for Instagram
                </button>
            </div>

            {instagramFeedback && (
                <p className="text-xs text-cream-muted">{instagramFeedback}</p>
            )}

            <p className="text-sm text-cream-muted">
                {count} friend{count === 1 ? "" : "s"} joined so far
            </p>
        </div>
    );
}
