"use client";

import { useCallback, useEffect, useState } from "react";
import { ReferralSharePanel, type ReferralStatusData } from "@/components/ReferralSharePanel";

export default function ReferralWidget() {
    const [status, setStatus] = useState<ReferralStatusData | null>(null);
    const [loading, setLoading] = useState(true);

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

    if (loading) {
        return (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                <p className="text-sm text-zinc-400">Loading referral status…</p>
            </div>
        );
    }

    if (!status) return null;

    return (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">Invite Friends</h2>
            <p className="text-sm text-zinc-500 mb-4">
                Share your link to unlock FloatLive and Float Pop or Match.
            </p>

            <ReferralSharePanel link={status.link} count={status.count} compact />

            <p className="text-sm font-medium text-zinc-700 mt-4">
                {status.unlocked ? (
                    <span className="text-green-700">
                        1 / 1 referrals needed — Features unlocked ✓
                    </span>
                ) : (
                    <span>0 / 1 referrals needed</span>
                )}
            </p>
        </div>
    );
}
