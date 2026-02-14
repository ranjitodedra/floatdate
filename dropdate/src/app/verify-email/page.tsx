"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const [resending, setResending] = useState(false);
    const [resendMsg, setResendMsg] = useState("");

    const errorMessages: Record<string, string> = {
        "missing-token": "No verification token found. Please check your email for the correct link.",
        "invalid-token": "This verification link is invalid. It may have already been used.",
        "expired-token": "This verification link has expired. Please request a new one below.",
        "server-error": "Something went wrong. Please try again later.",
    };

    async function handleResend() {
        setResending(true);
        setResendMsg("");
        try {
            const res = await fetch("/api/auth/resend-verification", {
                method: "POST",
            });
            const data = await res.json();
            if (res.ok) {
                setResendMsg("Verification email sent! Check your inbox.");
            } else {
                setResendMsg(data.error || "Failed to resend.");
            }
        } catch {
            setResendMsg("Something went wrong.");
        } finally {
            setResending(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f0f] via-[#1a1025] to-[#0f0f0f] px-4">
            <div className="w-full max-w-md text-center">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        DropDate
                    </h1>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6">
                    {error ? (
                        <>
                            <div className="text-5xl mb-4">⚠️</div>
                            <h2 className="text-xl font-semibold text-white">
                                Verification Failed
                            </h2>
                            <p className="text-zinc-400">
                                {errorMessages[error] || "An unknown error occurred."}
                            </p>
                            {error === "expired-token" && (
                                <button
                                    onClick={handleResend}
                                    disabled={resending}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-200 disabled:opacity-50"
                                >
                                    {resending ? "Sending..." : "Resend Verification Email"}
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="text-5xl mb-4">✉️</div>
                            <h2 className="text-xl font-semibold text-white">
                                Check your inbox
                            </h2>
                            <p className="text-zinc-400">
                                We&apos;ve sent a verification link to your university email.
                                Click it to activate your account and start answering questions!
                            </p>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                                <p className="text-sm text-purple-300">
                                    💡 Don&apos;t see it? Check your spam folder.
                                </p>
                            </div>
                        </>
                    )}

                    {resendMsg && (
                        <p className="text-sm text-green-400">{resendMsg}</p>
                    )}

                    <p className="text-sm text-zinc-500">
                        <a
                            href="/login"
                            className="text-purple-400 hover:text-purple-300 transition"
                        >
                            Back to login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f0f] via-[#1a1025] to-[#0f0f0f]">
                    <p className="text-zinc-400">Loading...</p>
                </div>
            }
        >
            <VerifyEmailContent />
        </Suspense>
    );
}
