"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readStoredRef } from "@/lib/referral-client";

import AuthSplitLayout from "@/components/AuthSplitLayout";
import {
    glassPanelClass,
    glassPanelStrongClass,
    glassInputClass,
    glassSelectClass,
    btnPrimaryClass,
    labelClass,
} from "@/lib/ui-classes";

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
            const storedReferralCode = readStoredRef();

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
                if (storedReferralCode) {
                    formData.append("referralCode", storedReferralCode);
                }

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
                        ...(storedReferralCode
                            ? { referralCode: storedReferralCode }
                            : {}),
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
        <AuthSplitLayout
            imageSrc="/assets/auth_images/signup.png"
            imageAlt="FloatDate signup"
            subtitle="Create your account"
        >
            <form
                    onSubmit={handleSubmit}
                    className={`${glassPanelClass} shadow-sm`}
                >
                    {error && (
                        <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className={labelClass}>
                            Full Name
                        </label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            className={glassInputClass}
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className={labelClass}>
                            University Email
                        </label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => updateField("email", e.target.value)}
                            className={glassInputClass}
                            placeholder="you@university.ca"
                        />
                        <p className="text-xs text-cream-muted mt-1">
                            <Link
                                href="/universities"
                                className="text-cream/90 font-medium underline hover:text-cream"
                            >
                                See which universities are supported
                            </Link>
                            .
                        </p>
                        <p className="text-sm font-medium text-cream/90 mt-2">
                            Having trouble with your university email? Gmail is
                            also supported with document verification.
                        </p>
                    </div>

                    {showGmailVerification && (
                        <div className="space-y-4 rounded-xl border border-amber-800 bg-amber-950/30 p-4">
                            <p className="text-sm font-medium text-amber-300">
                                ⚠ Gmail detected
                            </p>

                            <div>
                                <label className={labelClass}>
                                    Select your university
                                </label>
                                <select
                                    required
                                    value={selectedUniversityId}
                                    onChange={(e) =>
                                        handleUniversityChange(e.target.value)
                                    }
                                    className={glassSelectClass}
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

                            <p className="text-xs text-cream-muted">
                                Your document is used only for verification and
                                is permanently deleted after approval.
                            </p>

                            <div>
                                <label className={labelClass}>
                                    Upload Transcript or Student ID (Image
                                    format)
                                </label>
                                <p className="text-xs text-cream-muted mb-2">
                                    Choose an image now. It will be uploaded
                                    securely when you click Create Account
                                    below.
                                </p>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                                    required
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        setDocumentFile(file);
                                        setError("");
                                    }}
                                    className="w-full text-sm text-cream-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-cream file:text-mahogany-deep hover:file:bg-[#ffffff]"
                                />
                                {documentFile && (
                                    <p className="text-xs text-cream-faint mt-1">
                                        Selected: {documentFile.name} — will
                                        upload when you create your account.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className={labelClass}>
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={form.password}
                            onChange={(e) => updateField("password", e.target.value)}
                            className={glassInputClass}
                            placeholder="Min 8 characters"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>
                                Age
                            </label>
                            <input
                                type="number"
                                required
                                min={17}
                                max={100}
                                value={form.age}
                                onChange={(e) => updateField("age", e.target.value)}
                                className={glassInputClass}
                                placeholder="18"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>
                                City
                            </label>
                            <input
                                type="text"
                                required
                                value={form.city}
                                onChange={(e) => updateField("city", e.target.value)}
                                className={glassInputClass}
                                placeholder="Waterloo"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>
                                I am
                            </label>
                            <select
                                value={form.gender}
                                onChange={(e) => updateField("gender", e.target.value)}
                                className={glassSelectClass}
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="nonbinary">Non-binary</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>
                                Interested in
                            </label>
                            <select
                                value={form.genderPref}
                                onChange={(e) =>
                                    updateField("genderPref", e.target.value)
                                }
                                className={glassSelectClass}
                            >
                                <option value="any">Everyone</option>
                                <option value="male">Men</option>
                                <option value="female">Women</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>
                            Bio <span className="text-cream-muted">(optional)</span>
                        </label>
                        <textarea
                            value={form.bio}
                            onChange={(e) => updateField("bio", e.target.value)}
                            maxLength={500}
                            rows={3}
                            className={`${glassInputClass} resize-none`}
                            placeholder="Tell your future match something about you..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={btnPrimaryClass}
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </button>

                    <p className="text-center text-sm text-cream-muted">
                        Already have an account?{" "}
                        <a
                            href="/login"
                            className="text-cream font-medium hover:underline transition"
                        >
                            Log in
                        </a>
                    </p>
                </form>

            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                    <div className={`${glassPanelStrongClass} w-full max-w-md shadow-modal p-6 space-y-4`}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-cream">
                                Request for your university
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowRequestModal(false)}
                                className="text-cream-faint hover:text-cream/90 text-xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {requestSuccess ? (
                            <p className="text-sm text-green-300 bg-green-950/50 border border-green-800 rounded-lg px-4 py-3">
                                {requestSuccess}
                            </p>
                        ) : (
                            <form onSubmit={handleRequestSubmit} className="space-y-4">
                                {requestError && (
                                    <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
                                        {requestError}
                                    </div>
                                )}

                                <div>
                                    <label className={labelClass}>
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
                                        className={glassInputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
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
                                        className={glassInputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
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
                                        className={glassInputClass}
                                        placeholder="e.g. University of Example"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={requestSubmitting}
                                    className={`${btnPrimaryClass} py-3`}
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
        </AuthSplitLayout>
    );
}
