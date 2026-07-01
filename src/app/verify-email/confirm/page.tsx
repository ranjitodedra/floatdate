"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Image from "next/image";
import { clearStoredRef } from "@/lib/referral-client";
import {
    glassPanelClass,
    btnPrimaryClass,
} from "@/lib/ui-classes";

function VerifyEmailConfirmContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resending, setResending] = useState(false);
    const [resendMsg, setResendMsg] = useState("");

    const errorMessages: Record<string, string> = {
        "missing-token": "No verification token found. Please check your email for the correct link.",
        "invalid-token": "This verification link is invalid. It may have already been used.",
        "expired-token": "This verification link has expired. Please request a new one below.",
        "server-error": "Something went wrong. Please try again later.",
    };

    async function handleVerify() {
        if (!token) {
            setError("missing-token");
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });

            const data = await res.json();

            if (!res.ok) {
                const errorCode = data.error || "server-error";
                setError(errorCode);
                return;
            }

            clearStoredRef();

            // Success - redirect to questions page
            if (data.redirect) {
                router.push(data.redirect);
            } else {
                router.push("/questions");
            }
        } catch {
            setError("server-error");
        } finally {
            setVerifying(false);
        }
    }

    async function handleResend() {
        setResending(true);
        setResendMsg("");
        try {
            // We need the email, but we don't have it here. 
            // The user should go back to the main verify-email page
            router.push("/verify-email");
        } catch {
            setResendMsg("Something went wrong.");
        } finally {
            setResending(false);
        }
    }

    if (!token) {
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
                        <div className="text-5xl mb-4">⚠️</div>
                        <h2 className="text-xl font-semibold text-cream">
                            Verification Failed
                        </h2>
                        <p className="text-cream-muted">
                            {errorMessages["missing-token"]}
                        </p>
                        <button
                            onClick={() => router.push("/verify-email")}
                            className={btnPrimaryClass}
                        >
                            Go to Verification Page
                        </button>
                    </div>
                </div>
            </div>
        );
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
                                    className={`${btnPrimaryClass} disabled:opacity-50`}
                                >
                                    {resending ? "Redirecting..." : "Request New Verification Email"}
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="text-5xl mb-4">✉️</div>
                            <h2 className="text-xl font-semibold text-cream">
                                Verify Your Email
                            </h2>
                            <p className="text-cream-muted">
                                Click the button below to verify your email address and activate your account.
                            </p>
                            <button
                                onClick={handleVerify}
                                disabled={verifying}
                                className={`${btnPrimaryClass} disabled:opacity-50`}
                            >
                                {verifying ? "Verifying..." : "Verify My Email"}
                            </button>
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

export default function VerifyEmailConfirmPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <p className="text-cream-muted">Loading...</p>
                </div>
            }
        >
            <VerifyEmailConfirmContent />
        </Suspense>
    );
}
