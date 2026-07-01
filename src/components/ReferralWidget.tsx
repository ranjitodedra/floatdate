"use client";

import { useCallback, useEffect, useState } from "react";
import { ReferralSharePanel, type ReferralStatusData } from "@/components/ReferralSharePanel";
import { glassInputClass } from "@/lib/ui-classes";

export default function ReferralWidget() {
    const [status, setStatus] = useState<ReferralStatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [copyFeedback, setCopyFeedback] = useState("");

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/referral/me", { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            setStatus(data);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    async function copyLink(link: string) {
        await navigator.clipboard.writeText(link);
        setCopyFeedback("Copied ✓");
        setTimeout(() => setCopyFeedback(""), 2000);
    }

    if (loading) {
        return (
            <div className="glass-panel rounded-2xl p-6 shadow-sm">
                <p className="text-sm text-cream-faint">Loading referral status…</p>
            </div>
        );
    }

    if (!status) return null;

    if (status.unlocked) {
        return (
            <div className="pt-2">
                <p className="text-sm text-cream-muted mb-2">Share FloatLive with friends</p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        readOnly
                        value={status.link}
                        className={`${glassInputClass} flex-1 min-w-0 px-3 py-2 text-sm truncate`}
                    />
                    <button
                        type="button"
                        onClick={() => copyLink(status.link)}
                        className="shrink-0 px-3 py-2 bg-cream text-mahogany-deep text-sm font-medium rounded-lg hover:bg-[#ffffff] transition"
                    >
                        {copyFeedback || "Copy link"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-cream mb-1">Invite Friends</h2>
            <p className="text-sm text-cream-muted mb-4">
                Invite one friend to unlock FloatLive and Float Pop or Match.
            </p>

            <ReferralSharePanel link={status.link} count={status.count} compact />

            <p className="text-sm font-medium text-cream/90 mt-4">
                <span>{status.count} / 1 referrals needed</span>
            </p>
        </div>
    );
}
