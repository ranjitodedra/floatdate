"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState("");
    const [showResendLink, setShowResendLink] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                const errorMessage = data.error || "Login failed";
                setError(errorMessage);
                
                // Check if this is an email verification error (403)
                if (res.status === 403 && errorMessage.includes("verify your email")) {
                    setShowResendLink(true);
                } else {
                    setShowResendLink(false);
                }
                return;
            }

            // Questionnaire is optional; everyone lands on the dashboard.
            router.push("/dashboard");
        } catch {
            setError("Something went wrong. Please try again.");
            setShowResendLink(false);
        } finally {
            setLoading(false);
        }
    }

    async function handleResendVerification() {
        if (!email) {
            setResendMessage("Please enter your email address first.");
            return;
        }

        setResendLoading(true);
        setResendMessage("");

        try {
            const res = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setResendMessage(data.error || "Failed to send verification email.");
            } else {
                setResendMessage("Verification email sent! Please check your inbox.");
                setShowResendLink(false);
            }
        } catch {
            setResendMessage("Something went wrong. Please try again.");
        } finally {
            setResendLoading(false);
        }
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
                    <p className="text-zinc-500 mt-2">Welcome back</p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="bg-white border border-zinc-200 rounded-2xl p-8 space-y-5 shadow-sm"
                >
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                            {error}
                            {showResendLink && (
                                <div className="mt-3 pt-3 border-t border-red-200">
                                    <button
                                        type="button"
                                        onClick={handleResendVerification}
                                        disabled={resendLoading}
                                        className="text-sm text-red-700 hover:text-red-800 font-medium underline disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {resendLoading ? "Sending..." : "Resend verification email"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {resendMessage && !error && (
                        <div className={`text-sm rounded-lg px-4 py-3 ${
                            resendMessage.includes("sent") 
                                ? "bg-green-50 border border-green-200 text-green-600"
                                : "bg-red-50 border border-red-200 text-red-600"
                        }`}>
                            {resendMessage}
                        </div>
                    )}

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

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                            Password
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
                            placeholder="Your password"
                        />
                    </div>

                    <div className="text-right">
                        <a
                            href="/forgot-password"
                            className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline transition"
                        >
                            Forgot password?
                        </a>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Logging in..." : "Log In"}
                    </button>

                    <p className="text-center text-sm text-zinc-500">
                        Don&apos;t have an account?{" "}
                        <a
                            href="/signup"
                            className="text-zinc-900 font-medium hover:underline transition"
                        >
                            Sign up
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
