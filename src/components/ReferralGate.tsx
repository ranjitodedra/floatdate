"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ReferralSharePanel, type ReferralStatusData } from "@/components/ReferralSharePanel";

interface ReferralGateProps {
    featureName: string;
    children: ReactNode;
}

export default function ReferralGate({ featureName, children }: ReferralGateProps) {
    const [status, setStatus] = useState<ReferralStatusData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/referral/me", { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            setStatus(data);
        } catch {
            // ignore — show page without gate on error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    useEffect(() => {
        function onVisibilityChange() {
            if (document.visibilityState === "visible") {
                fetchStatus();
            }
        }
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => document.removeEventListener("visibilitychange", onVisibilityChange);
    }, [fetchStatus]);

    if (loading || !status || status.unlocked) {
        return <>{children}</>;
    }

    return (
        <div className="relative">
            <div className="blur-sm pointer-events-none select-none">{children}</div>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-mahogany-deep/60 backdrop-blur-sm p-4">
                <div className="glass-panel-strong shadow-modal rounded-2xl max-w-md w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                    <div className="text-center">
                        <p className="text-3xl mb-3" aria-hidden="true">
                            🔒
                        </p>
                        <h2 className="text-xl font-bold text-cream">
                            Unlock {featureName}
                        </h2>
                        <p className="text-sm text-cream-muted mt-2">
                            Invite one friend to FloatLive. Once they sign up, this
                            unlocks for both of you instantly.
                        </p>
                    </div>

                    <ReferralSharePanel link={status.link} count={status.count} />

                    <p className="text-xs text-cream-faint text-center">
                        Your friend just needs to create a free account. That&apos;s it.
                    </p>
                </div>
            </div>
        </div>
    );
}
