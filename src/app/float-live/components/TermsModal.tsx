"use client";

import { btnPrimaryClass } from "@/lib/ui-classes";

interface TermsModalProps {
    onAccept: () => void;
    onCancel: () => void;
}

export default function TermsModal({ onAccept, onCancel }: TermsModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-panel-strong rounded-2xl shadow-modal max-w-md w-full p-6 space-y-5 animate-in">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-cream">Welcome to Float Live!</h2>
                    <p className="text-sm text-cream-muted mt-1">Before you start chatting, please agree to the following:</p>
                </div>

                <ul className="space-y-2.5 text-sm text-cream/90">
                    <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✅</span>
                        <span>Be respectful and kind</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✅</span>
                        <span>No harassment, hate speech, or spam</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✅</span>
                        <span>No sharing of explicit content</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✅</span>
                        <span>No solicitation or advertising</span>
                    </li>
                </ul>

                <div className="bg-amber-950/30 border border-amber-800 rounded-xl p-3">
                    <p className="text-xs text-amber-300">
                        ⚠️ Violations may result in permanent account suspension, and reports logged for admin review.
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={onAccept}
                        className={`${btnPrimaryClass} py-3 text-sm`}
                    >
                        I Agree & Enter Chat
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-3 glass-input text-cream/90 font-medium rounded-xl hover:bg-gold-soft/10 transition-all text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
