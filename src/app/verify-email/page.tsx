"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import {
    glassPanelClass,
    btnPrimaryClass,
} from "@/lib/ui-classes";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const emailParam = searchParams.get("email");
    const emailFailed = searchParams.get("emailFailed") === "true";
    const [resending, setResending] = useState(false);
    const [resendMsg, setResendMsg] = useState("");
    const [countdown, setCountdown] = useState(120); // 2 minutes in seconds

    const errorMessages: Record<string, string> = {
        "missing-token": "No verification token found. Please check your email for the correct link.",
        "invalid-token": "This verification link is invalid. It may have already been used.",
        "expired-token": "This verification link has expired. Please request a new one below.",
        "server-error": "Something went wrong. Please try again later.",
    };

    // Countdown timer effect
    useEffect(() => {
        if (countdown > 0 && !error && !emailFailed) {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [countdown, error, emailFailed]);

    // Format countdown as M:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    async function handleResend() {
        setResending(true);
        setResendMsg("");
        try {
            const res = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(emailParam ? { email: emailParam } : {}),
            });
            const data = await res.json();
            if (res.ok) {
                setResendMsg("Verification email sent! Check your inbox.");
                setCountdown(120); // Reset timer to 2 minutes
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
        <div className="min-h-screen flex items-center justify-center px-4">
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

                <div className={`${glassPanelClass} shadow-sm`}>
                    {error ? (
                        <>
                            <div className="text-5xl mb-4">⚠️</div>
                            <h2 className="text-xl font-semibold text-cream">
                                Verification Failed
                            </h2>
                            <p className="text-cream-muted">
                                {errorMessages[error] || "An unknown error occurred."}
                            </p>
                            {(error === "expired-token" || error === "invalid-token") && (
                                <button
                                    onClick={handleResend}
                                    disabled={resending}
                                    className={btnPrimaryClass}
                                >
                                    {resending ? "Sending..." : "Resend Verification Email"}
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="text-5xl mb-4">{emailFailed ? "⚠️" : "✉️"}</div>
                            <h2 className="text-xl font-semibold text-cream">
                                {emailFailed ? "Verification email failed" : "Check your inbox"}
                            </h2>
                            {emailFailed ? (
                                <>
                                    <p className="text-cream-muted">
                                        Your account was created, but we couldn't send the verification email. Please click below to resend it.
                                    </p>
                                    <button
                                        onClick={handleResend}
                                        disabled={resending}
                                        className={btnPrimaryClass}
                                    >
                                        {resending ? "Sending..." : "Send Verification Email"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    {countdown > 0 ? (
                                        <div className="glass-panel rounded-xl p-5 my-4">
                                            <p className="text-sm text-cream/90 leading-relaxed">
                                                You should receive your email within{" "}
                                                <span className="font-semibold text-cream text-base">
                                                    {formatTime(countdown)}
                                                </span>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="glass-panel rounded-xl p-5 my-4">
                                            <p className="text-sm text-cream/90 leading-relaxed">
                                                Didn&apos;t get it? Try resending or check your spam folder. If you still don&apos;t receive anything, feel free to reach out:{" "}
                                                <a
                                                    href="mailto:team.floatdate@gmail.com"
                                                    className="text-cream underline hover:text-cream/90 font-medium"
                                                >
                                                    team.floatdate@gmail.com
                                                </a>
                                            </p>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleResend}
                                        disabled={resending || countdown > 0}
                                        className={`${btnPrimaryClass} disabled:cursor-not-allowed`}
                                    >
                                        {resending ? "Sending..." : "Resend Verification Email"}
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {resendMsg && (
                        <p className="text-sm text-green-300">{resendMsg}</p>
                    )}

                    <p className="text-sm text-cream-muted">
                        <a
                            href="/login"
                            className="text-cream font-medium hover:underline transition"
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
                <div className="min-h-screen flex items-center justify-center">
                    <p className="text-cream-muted">Loading...</p>
                </div>
            }
        >
            <VerifyEmailContent />
        </Suspense>
    );
}
