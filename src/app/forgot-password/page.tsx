"use client";

import { useState, useEffect, FormEvent } from "react";
import Image from "next/image";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(120); // 2 minutes in seconds

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Something went wrong.");
                return;
            }

            setSubmitted(true);
            setCountdown(120); // Start countdown when email is sent
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // Countdown timer effect
    useEffect(() => {
        if (countdown > 0 && submitted) {
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
    }, [countdown, submitted]);

    // Format countdown as M:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

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
                    <p className="text-zinc-500 mt-2">Reset your password</p>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl p-8 space-y-5 shadow-sm">
                    {submitted ? (
                        <div className="text-center space-y-4">
                            <div className="text-5xl">✉️</div>
                            <h2 className="text-xl font-semibold text-zinc-900">
                                Check your inbox
                            </h2>
                            {countdown > 0 ? (
                                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                                    <p className="text-sm text-zinc-700">
                                        You should receive your email within{" "}
                                        <span className="font-semibold text-zinc-900 text-base">
                                            {formatTime(countdown)}
                                        </span>
                                    </p>
                                </div>
                            ) : (
                                <p className="text-zinc-500 text-sm">
                                    If an account with that email exists, we&apos;ve
                                    sent a password reset link. Please also check
                                    your spam/junk folder.
                                </p>
                            )}
                            <a
                                href="/login"
                                className="inline-block text-sm text-zinc-900 font-medium hover:underline transition"
                            >
                                Back to login
                            </a>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                                    {error}
                                </div>
                            )}

                            <form
                                onSubmit={handleSubmit}
                                className="space-y-5"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setError("");
                                        }}
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition"
                                        placeholder="you@mylaurier.ca"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Sending..." : "Send Reset Link"}
                                </button>
                            </form>

                            <p className="text-center text-sm text-zinc-500">
                                Remember your password?{" "}
                                <a
                                    href="/login"
                                    className="text-zinc-900 font-medium hover:underline transition"
                                >
                                    Log in
                                </a>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
