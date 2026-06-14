"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface University {
    id: string;
    name: string;
}

const REQUEST_UNIVERSITY_VALUE = "__request_university__";

const SUPPORTED_DOMAINS = [
    "mylaurier.ca",
    "uwaterloo.ca",
    "mail.utoronto.ca",
    "uwo.ca",
    "mcmaster.ca",
    "uottawa.ca",
    "queensu.ca",
];

function isGmailEmail(email: string): boolean {
    const domain = email.toLowerCase().split("@")[1];
    return domain === "gmail.com";
}

export default function SignupPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [universities, setUniversities] = useState<University[]>([]);
    const [selectedUniversityId, setSelectedUniversityId] = useState("");
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [requestSuccess, setRequestSuccess] = useState("");
    const [requestError, setRequestError] = useState("");
    const [requestForm, setRequestForm] = useState({
        requesterEmail: "",
        requesterName: "",
        universityName: "",
    });
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

    const normalizedEmail = form.email.toLowerCase().trim();
    const isGmail = isGmailEmail(normalizedEmail);
    const isAdmin = normalizedEmail === "ranjitodedra.dev@gmail.com";
    const showGmailVerification = isGmail && !isAdmin;

    useEffect(() => {
        fetch("/api/universities")
            .then((res) => res.json())
            .then((data) => setUniversities(data.universities ?? []))
            .catch(() => {});
    }, []);

    function updateField(field: string, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setError("");
    }

    function handleUniversityChange(value: string) {
        if (value === REQUEST_UNIVERSITY_VALUE) {
            setSelectedUniversityId("");
            setRequestForm((prev) => ({
                ...prev,
                requesterEmail: form.email,
                requesterName: form.name,
            }));
            setShowRequestModal(true);
            return;
        }
        setSelectedUniversityId(value);
        setError("");
    }

    async function handleRequestSubmit(e: FormEvent) {
        e.preventDefault();
        setRequestSubmitting(true);
        setRequestError("");
        setRequestSuccess("");

        try {
            const res = await fetch("/api/university-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestForm),
            });
            const data = await res.json();

            if (!res.ok) {
                setRequestError(data.error || "Failed to submit request");
                return;
            }

            setRequestSuccess(data.message);
            setTimeout(() => {
                setShowRequestModal(false);
                setRequestSuccess("");
            }, 2500);
        } catch {
            setRequestError("Something went wrong. Please try again.");
        } finally {
            setRequestSubmitting(false);
        }
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");

        if (form.password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        if (showGmailVerification) {
            if (!selectedUniversityId) {
                setError("Please select your university.");
                return;
            }
            if (!documentFile) {
                setError(
                    "Please upload a transcript or student ID image for verification."
                );
                return;
            }
        } else if (!isAdmin) {
            const domain = normalizedEmail.split("@")[1];
            if (!domain || !SUPPORTED_DOMAINS.includes(domain)) {
                setError(
                    "Only supported university emails are allowed, or use Gmail with document verification."
                );
                return;
            }
        }

        setLoading(true);

        try {
            let res: Response;

            if (showGmailVerification) {
                const formData = new FormData();
                formData.append("email", normalizedEmail);
                formData.append("password", form.password);
                formData.append("name", form.name);
                formData.append("age", form.age);
                formData.append("gender", form.gender);
                formData.append("genderPref", form.genderPref);
                formData.append("city", form.city);
                if (form.bio) formData.append("bio", form.bio);
                formData.append("universityId", selectedUniversityId);
                formData.append("document", documentFile!);

                res = await fetch("/api/auth/signup", {
                    method: "POST",
                    body: formData,
                });
            } else {
                res = await fetch("/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...form,
                        email: normalizedEmail,
                        age: parseInt(form.age, 10),
                    }),
                });
            }

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
                        <p className="text-xs text-zinc-500 mt-2">
                            Having trouble with your university email? Gmail is
                            also supported with document verification.
                        </p>
                    </div>

                    {showGmailVerification && (
                        <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-medium text-amber-800">
                                ⚠ Gmail detected
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                    Select your university
                                </label>
                                <select
                                    required
                                    value={selectedUniversityId}
                                    onChange={(e) =>
                                        handleUniversityChange(e.target.value)
                                    }
                                    className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition appearance-none"
                                >
                                    <option value="">Choose a university</option>
                                    {universities.map((uni) => (
                                        <option key={uni.id} value={uni.id}>
                                            {uni.name}
                                        </option>
                                    ))}
                                    <option value={REQUEST_UNIVERSITY_VALUE}>
                                        Request for your university
                                    </option>
                                </select>
                            </div>

                            <p className="text-xs text-zinc-600">
                                Your document is used only for verification and
                                is permanently deleted after approval.
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                    Upload Transcript or Student ID (Image
                                    format)
                                </label>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                                    required
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        setDocumentFile(file);
                                        setError("");
                                    }}
                                    className="w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
                                />
                                {documentFile && (
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Selected: {documentFile.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

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
                                onChange={(e) =>
                                    updateField("genderPref", e.target.value)
                                }
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

            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-zinc-900">
                                Request for your university
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowRequestModal(false)}
                                className="text-zinc-400 hover:text-zinc-700 text-xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {requestSuccess ? (
                            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                                {requestSuccess}
                            </p>
                        ) : (
                            <form onSubmit={handleRequestSubmit} className="space-y-4">
                                {requestError && (
                                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                                        {requestError}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                        Your email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={requestForm.requesterEmail}
                                        onChange={(e) =>
                                            setRequestForm((prev) => ({
                                                ...prev,
                                                requesterEmail: e.target.value,
                                            }))
                                        }
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                        Your name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={requestForm.requesterName}
                                        onChange={(e) =>
                                            setRequestForm((prev) => ({
                                                ...prev,
                                                requesterName: e.target.value,
                                            }))
                                        }
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                        Name of your university
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={requestForm.universityName}
                                        onChange={(e) =>
                                            setRequestForm((prev) => ({
                                                ...prev,
                                                universityName: e.target.value,
                                            }))
                                        }
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                        placeholder="e.g. University of Example"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={requestSubmitting}
                                    className="w-full py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition disabled:opacity-50"
                                >
                                    {requestSubmitting
                                        ? "Submitting..."
                                        : "Submit request"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
