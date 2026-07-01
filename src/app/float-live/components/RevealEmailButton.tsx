"use client";

import { useState, useEffect } from "react";

interface RevealEmailButtonProps {
    chatRoomId: string;
    partnerEmail?: string | null;
    partnerHasRevealed?: boolean;
}

export default function RevealEmailButton({
    chatRoomId,
    partnerEmail: initialPartnerEmail,
    partnerHasRevealed = false,
}: RevealEmailButtonProps) {
    const [revealed, setRevealed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [partnerEmail, setPartnerEmail] = useState(initialPartnerEmail || null);
    const [waitingForPartner, setWaitingForPartner] = useState(false);

    useEffect(() => {
        if (initialPartnerEmail) {
            setPartnerEmail(initialPartnerEmail);
            setRevealed(true);
        }
    }, [initialPartnerEmail]);

    // Poll for partner reveal when waiting
    useEffect(() => {
        if (!waitingForPartner || revealed) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/float-live/chat/${chatRoomId}/reveal-email`, {
                    method: "POST",
                });
                const data = await res.json();

                if (data.bothRevealed) {
                    setRevealed(true);
                    setPartnerEmail(data.partnerEmail);
                    setWaitingForPartner(false);
                }
            } catch {
                /* ignore polling errors */
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [waitingForPartner, revealed, chatRoomId]);

    async function handleReveal() {
        setLoading(true);
        try {
            const res = await fetch(`/api/float-live/chat/${chatRoomId}/reveal-email`, {
                method: "POST",
            });
            const data = await res.json();

            if (data.bothRevealed) {
                setRevealed(true);
                setPartnerEmail(data.partnerEmail);
            } else {
                setWaitingForPartner(true);
            }
        } catch (err) {
            console.error("Reveal email error:", err);
        } finally {
            setLoading(false);
        }
    }

    if (revealed && partnerEmail) {
        return (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <span className="text-green-600 text-xs font-medium">📧 Email revealed!</span>
                <span className="text-green-800 text-xs font-bold">{partnerEmail}</span>
            </div>
        );
    }

    if (waitingForPartner) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <span className="text-amber-700 text-xs font-medium">
                    ✅ You&apos;ve agreed to reveal. Waiting for partner...
                </span>
            </div>
        );
    }

    if (partnerHasRevealed) {
        return (
            <button
                onClick={handleReveal}
                disabled={loading}
                className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 font-medium hover:bg-amber-100 transition disabled:opacity-50"
            >
                {loading ? "Revealing..." : "💌 Partner is ready — Reveal Email"}
            </button>
        );
    }

    return (
        <button
            onClick={handleReveal}
            disabled={loading}
            className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-xs text-indigo-600 font-medium hover:bg-indigo-100 transition disabled:opacity-50"
        >
            {loading ? "Revealing..." : "💌 Reveal Email"}
        </button>
    );
}
