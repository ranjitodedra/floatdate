"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthSplitLayout from "@/components/AuthSplitLayout";
import {
    btnPrimaryClass,
    glassInputClass,
    glassPanelClass,
    labelClass,
} from "@/lib/ui-classes";

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

                if (res.status === 403 && errorMessage.includes("verify your email")) {
                    setShowResendLink(true);
                } else {
                    setShowResendLink(false);
                }
                return;
            }

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
        <AuthSplitLayout
            imageSrc="/assets/auth_images/login.png"
            imageAlt="FloatDate login"
            subtitle="Welcome back"
        >
            <form onSubmit={handleSubmit} className={glassPanelClass}>
                {error && (
                    <div className="bg-red-950/40 text-red-300 text-sm rounded-lg px-4 py-3">
                        {error}
                        {showResendLink && (
                            <div className="mt-3 pt-3 border-t border-red-900/50">
                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    disabled={resendLoading}
                                    className="text-sm text-red-200 hover:text-red-100 font-medium underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {resendLoading ? "Sending..." : "Resend verification email"}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {resendMessage && !error && (
                    <div
                        className={`text-sm rounded-lg px-4 py-3 ${
                            resendMessage.includes("sent")
                                ? "bg-green-950/40 text-green-300"
                                : "bg-red-950/40 text-red-300"
                        }`}
                    >
                        {resendMessage}
                    </div>
                )}

                <div>
                    <label className={labelClass}>Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setError("");
                        }}
                        className={glassInputClass}
                        placeholder="you@mylaurier.ca"
                    />
                </div>

                <div>
                    <label className={labelClass}>Password</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError("");
                        }}
                        className={glassInputClass}
                        placeholder="Your password"
                    />
                </div>

                <div className="text-right">
                    <a
                        href="/forgot-password"
                        className="text-sm text-cream-muted hover:text-cream hover:underline transition"
                    >
                        Forgot password?
                    </a>
                </div>

                <button type="submit" disabled={loading} className={btnPrimaryClass}>
                    {loading ? "Logging in..." : "Log In"}
                </button>

                <p className="text-center text-sm text-cream-muted">
                    Don&apos;t have an account?{" "}
                    <a href="/signup" className="text-cream font-medium hover:underline transition">
                        Sign up
                    </a>
                </p>
            </form>
        </AuthSplitLayout>
    );
}
