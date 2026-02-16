"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Image from "next/image";

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
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
            <div className="w-full max-w-md text-center">
                <div className="mb-8">
                    <Image
                        src="/images/icon.png"
                        alt="FloatDate"
                        width={120}
                        height={40}
                        className="mx-auto"
                    />
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl p-8 space-y-6 shadow-sm">
                    {error ? (
                        <>
                            <div className="text-5xl mb-4">⚠️</div>
                            <h2 className="text-xl font-semibold text-zinc-900">
                                Verification Failed
                            </h2>
                            <p className="text-zinc-500">
                                {errorMessages[error] || "An unknown error occurred."}
                            </p>
                            {error === "expired-token" && (
                                <button
                                    onClick={handleResend}
                                    disabled={resending}
                                    className="w-full py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50"
                                >
                                    {resending ? "Sending..." : "Resend Verification Email"}
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="text-5xl mb-4">✉️</div>
                            <h2 className="text-xl font-semibold text-zinc-900">
                                Check your inbox
                            </h2>
                            <p className="text-zinc-500">
                                We&apos;ve sent a verification link to your university email.
                                Click it to activate your account and start answering questions!
                            </p>
                            <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-4">
                                <p className="text-sm text-zinc-600">
                                    💡 Don&apos;t see it? Check your spam folder.
                                </p>
                            </div>
                        </>
                    )}

                    {resendMsg && (
                        <p className="text-sm text-green-600">{resendMsg}</p>
                    )}

                    <p className="text-sm text-zinc-400">
                        <a
                            href="/login"
                            className="text-zinc-900 font-medium hover:underline transition"
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
                <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                    <p className="text-zinc-500">Loading...</p>
                </div>
            }
        >
            <VerifyEmailContent />
        </Suspense>
    );
}
