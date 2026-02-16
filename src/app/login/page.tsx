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
                setError(data.error || "Login failed");
                return;
            }

            if (data.completedSetup) {
                router.push("/dashboard");
            } else {
                router.push("/questions");
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
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
