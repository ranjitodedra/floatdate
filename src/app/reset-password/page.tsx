"use client";

import { useState, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const errorMessages: Record<string, string> = {
        "invalid-token":
            "This reset link is invalid or has already been used.",
        "expired-token":
            "This reset link has expired. Please request a new one.",
    };

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                const errorKey = data.error || "server-error";
                setError(
                    errorMessages[errorKey] ||
                        data.error ||
                        "Something went wrong."
                );
                return;
            }

            setSuccess(true);
            setTimeout(() => router.push("/login"), 3000);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    if (!token) {
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
                        <div className="text-5xl">⚠️</div>
                        <h2 className="text-xl font-semibold text-zinc-900">
                            Invalid Link
                        </h2>
                        <p className="text-zinc-500">
                            No reset token found. Please request a new password
                            reset.
                        </p>
                        <a
                            href="/forgot-password"
                            className="inline-block w-full py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 text-center"
                        >
                            Request New Reset
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Image
                        src="/images/icon.png"
                        alt="FloatDate"
                        width={120}
                        height={40}
                        className="mx-auto mb-3"
                    />
                    <p className="text-zinc-500 mt-2">Choose a new password</p>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl p-8 space-y-5 shadow-sm">
                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="text-5xl">✅</div>
                            <h2 className="text-xl font-semibold text-zinc-900">
                                Password Reset!
                            </h2>
                            <p className="text-zinc-500 text-sm">
                                Your password has been updated. Redirecting to
                                login...
                            </p>
                            <a
                                href="/login"
                                className="inline-block text-sm text-zinc-900 font-medium hover:underline transition"
                            >
                                Go to login now
                            </a>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                                    {error}
                                    {(error.includes("expired") ||
                                        error.includes("invalid")) && (
                                        <div className="mt-3 pt-3 border-t border-red-200">
                                            <a
                                                href="/forgot-password"
                                                className="text-sm text-red-700 hover:text-red-800 font-medium underline"
                                            >
                                                Request a new reset link
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            <form
                                onSubmit={handleSubmit}
                                className="space-y-5"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setError("");
                                        }}
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition"
                                        placeholder="At least 8 characters"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setError("");
                                        }}
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition"
                                        placeholder="Re-enter your password"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading
                                        ? "Resetting..."
                                        : "Reset Password"}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                    <p className="text-zinc-500">Loading...</p>
                </div>
            }
        >
            <ResetPasswordContent />
        </Suspense>
    );
}
