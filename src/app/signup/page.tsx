"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function SignupPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        age: "",
        gender: "male" as "male" | "female" | "nonbinary",
        genderPref: "any" as "male" | "female" | "any",
        city: "",
        bio: "",
    });

    function updateField(field: string, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setError("");
    }

    // Supported university email domains
    const SUPPORTED_DOMAINS = [
        "mylaurier.ca",
        "uwaterloo.ca",
        "mail.utoronto.ca",
        "uwo.ca",
        "mcmaster.ca",
        "uottawa.ca",
        "queensu.ca",
    ];

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");

        const normalizedEmail = form.email.toLowerCase();
        const domain = normalizedEmail.split("@")[1];
        const isAdmin = normalizedEmail === "ranjitodedra.dev@gmail.com";
        if (!isAdmin && (!domain || !SUPPORTED_DOMAINS.includes(domain))) {
            setError("Only supported university emails are allowed (e.g. @mylaurier.ca, @uwaterloo.ca)");
            return;
        }

        if (form.password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    age: parseInt(form.age, 10),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Signup failed");
                return;
            }

            const params = new URLSearchParams({ email: form.email });
            if (data.emailFailed) {
                params.set("emailFailed", "true");
            }
            router.push(`/verify-email?${params.toString()}`);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-10">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Image
                        src="/images/icon.png"
                        alt="FloatDate"
                        width={120}
                        height={40}
                        className="mx-auto mb-3"
                    />
                    <p className="text-zinc-500 mt-2">Create your account</p>
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
                            Full Name
                        </label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                            University Email
                        </label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => updateField("email", e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition"
                            placeholder="you@university.ca"
                        />
                        <p className="text-xs text-zinc-400 mt-1">
                            Only university emails are accepted.{" "}
                            <Link
                                href="/universities"
                                className="text-zinc-700 font-medium underline hover:text-zinc-900"
                            >
                                See which universities are supported
                            </Link>
                            .
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={form.password}
                            onChange={(e) => updateField("password", e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition"
                            placeholder="Min 8 characters"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                Age
                            </label>
                            <input
                                type="number"
                                required
                                min={17}
                                max={100}
                                value={form.age}
                                onChange={(e) => updateField("age", e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition"
                                placeholder="18"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                City
                            </label>
                            <input
                                type="text"
                                required
                                value={form.city}
                                onChange={(e) => updateField("city", e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition"
                                placeholder="Waterloo"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                I am
                            </label>
                            <select
                                value={form.gender}
                                onChange={(e) => updateField("gender", e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition appearance-none"
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="nonbinary">Non-binary</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                Interested in
                            </label>
                            <select
                                value={form.genderPref}
                                onChange={(e) => updateField("genderPref", e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition appearance-none"
                            >
                                <option value="any">Everyone</option>
                                <option value="male">Men</option>
                                <option value="female">Women</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                            Bio <span className="text-zinc-400">(optional)</span>
                        </label>
                        <textarea
                            value={form.bio}
                            onChange={(e) => updateField("bio", e.target.value)}
                            maxLength={500}
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition resize-none"
                            placeholder="Tell your future match something about you..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </button>

                    <p className="text-center text-sm text-zinc-500">
                        Already have an account?{" "}
                        <a
                            href="/login"
                            className="text-zinc-900 font-medium hover:underline transition"
                        >
                            Log in
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
