"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

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

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");

        if (!form.email.toLowerCase().endsWith("@mylaurier.ca")) {
            setError("Only @mylaurier.ca emails are allowed");
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

            router.push("/verify-email");
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f0f] via-[#1a1025] to-[#0f0f0f] px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        DropDate
                    </h1>
                    <p className="text-zinc-400 mt-2">Create your account</p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-5"
                >
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                            Full Name
                        </label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                            University Email
                        </label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => updateField("email", e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                            placeholder="you@mylaurier.ca"
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                            Only @mylaurier.ca emails accepted
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={form.password}
                            onChange={(e) => updateField("password", e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                            placeholder="Min 8 characters"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                                Age
                            </label>
                            <input
                                type="number"
                                required
                                min={17}
                                max={100}
                                value={form.age}
                                onChange={(e) => updateField("age", e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                                placeholder="18"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                                City
                            </label>
                            <input
                                type="text"
                                required
                                value={form.city}
                                onChange={(e) => updateField("city", e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                                placeholder="Waterloo"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                                I am
                            </label>
                            <select
                                value={form.gender}
                                onChange={(e) => updateField("gender", e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition appearance-none"
                            >
                                <option value="male" className="bg-zinc-900">Male</option>
                                <option value="female" className="bg-zinc-900">Female</option>
                                <option value="nonbinary" className="bg-zinc-900">Non-binary</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                                Interested in
                            </label>
                            <select
                                value={form.genderPref}
                                onChange={(e) => updateField("genderPref", e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition appearance-none"
                            >
                                <option value="any" className="bg-zinc-900">Everyone</option>
                                <option value="male" className="bg-zinc-900">Men</option>
                                <option value="female" className="bg-zinc-900">Women</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                            Bio <span className="text-zinc-500">(optional)</span>
                        </label>
                        <textarea
                            value={form.bio}
                            onChange={(e) => updateField("bio", e.target.value)}
                            maxLength={500}
                            rows={3}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition resize-none"
                            placeholder="Tell your future match something about you..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </button>

                    <p className="text-center text-sm text-zinc-400">
                        Already have an account?{" "}
                        <a
                            href="/login"
                            className="text-purple-400 hover:text-purple-300 transition"
                        >
                            Log in
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
