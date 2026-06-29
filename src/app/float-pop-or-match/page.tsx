"use client";

import { useEffect, useState, FormEvent } from "react";
import AppShell from "@/components/AppShell";
import ReferralGate from "@/components/ReferralGate";

const inputClass =
    "w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition";
const labelClass = "block text-sm font-medium text-zinc-700 mb-1.5";
const sectionClass =
    "rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 mb-6";
const errorClass = "text-sm text-red-600 mt-1";

type Role = "" | "spotlight" | "panel" | "either";
type LookingFor = "" | "casual" | "serious" | "either";
type YesNo = "" | "yes" | "no";
type YesNoMaybe = "" | "yes" | "no" | "maybe";
type PreviousHistory = "" | "yes" | "no" | "not_sure";

interface FormState {
    role: Role;
    fullName: string;
    age: string;
    pronouns: string;
    yearOfStudy: string;
    program: string;
    email: string;
    socialHandle: string;
    datingGenders: string[];
    ageRangeMin: number;
    ageRangeMax: number;
    lookingFor: LookingFor;
    threeWords: string;
    unexpected: string;
    bringToRelationship: string;
    dealbreaker: string;
    questionToAsk: string;
    controversialOpinion: string;
    balloonPoppedFeeling: string;
    inRelationship: YesNo;
    partnerKnows: YesNo;
    previousHistory: PreviousHistory;
    uncomfortableWith: string;
    availability: string[];
    cannotAttendDates: string;
    preShowBriefing: YesNoMaybe;
    anythingElse: string;
    consentRecorded: boolean;
    consentNoDiscrimination: boolean;
    consentPhotography: boolean;
    consentLiveFormat: boolean;
    consentVoluntary: boolean;
    waitlistOptIn: boolean;
}

const INITIAL_FORM: FormState = {
    role: "",
    fullName: "",
    age: "",
    pronouns: "",
    yearOfStudy: "",
    program: "",
    email: "",
    socialHandle: "",
    datingGenders: [],
    ageRangeMin: 18,
    ageRangeMax: 26,
    lookingFor: "",
    threeWords: "",
    unexpected: "",
    bringToRelationship: "",
    dealbreaker: "",
    questionToAsk: "",
    controversialOpinion: "",
    balloonPoppedFeeling: "",
    inRelationship: "",
    partnerKnows: "",
    previousHistory: "",
    uncomfortableWith: "",
    availability: [],
    cannotAttendDates: "",
    preShowBriefing: "",
    anythingElse: "",
    consentRecorded: false,
    consentNoDiscrimination: false,
    consentPhotography: false,
    consentLiveFormat: false,
    consentVoluntary: false,
    waitlistOptIn: false,
};

const ROLE_OPTIONS = [
    {
        value: "spotlight" as const,
        label: "Spotlight",
        description:
            "I want to be the single being evaluated. I'll stand in front of the panel and answer questions live.",
    },
    {
        value: "panel" as const,
        label: "Panel Member",
        description:
            "I'll hold a balloon and decide to pop or hold as the spotlight answers questions.",
    },
    {
        value: "either" as const,
        label: "Either",
        description: "I'm open to being cast in either role.",
    },
];

const LOOKING_FOR_OPTIONS = [
    { value: "casual" as const, label: "Casual connection" },
    { value: "serious" as const, label: "Something serious" },
    { value: "either" as const, label: "Open to either" },
];

const DATING_GENDER_OPTIONS = [
    { value: "men", label: "Men" },
    { value: "women", label: "Women" },
    { value: "nonbinary", label: "Non-binary people" },
    { value: "all", label: "All genders" },
];

const AVAILABILITY_OPTIONS = [
    { value: "late_august", label: "Late August (Aug 23–31)" },
    { value: "early_september", label: "First two weeks of September (Sep 1–14)" },
    { value: "late_september", label: "Second half of September (Sep 15–30)" },
    { value: "october", label: "October works too if needed" },
];

function CharCount({ current, max }: { current: number; max: number }) {
    return (
        <p className="text-xs text-zinc-400 mt-1 text-right">
            {current}/{max}
        </p>
    );
}

function CardSelect<T extends string>({
    options,
    value,
    onChange,
    name,
}: {
    options: { value: T; label: string; description?: string }[];
    value: T | "";
    onChange: (v: T) => void;
    name: string;
}) {
    return (
        <div className="flex flex-col gap-3">
            {options.map((opt) => {
                const selected = value === opt.value;
                return (
                    <label
                        key={opt.value}
                        className={`flex flex-col rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                            selected
                                ? "bg-indigo-50 border-indigo-200"
                                : "border-zinc-200 hover:bg-zinc-50"
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <input
                                type="radio"
                                name={name}
                                value={opt.value}
                                checked={selected}
                                onChange={() => onChange(opt.value)}
                                className="mt-1 accent-indigo-600"
                            />
                            <div>
                                <span
                                    className={`text-sm font-semibold ${
                                        selected ? "text-indigo-700" : "text-zinc-800"
                                    }`}
                                >
                                    {opt.label}
                                </span>
                                {opt.description && (
                                    <p className="text-sm text-zinc-500 mt-0.5">
                                        {opt.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </label>
                );
            })}
        </div>
    );
}

function RadioGroup({
    name,
    options,
    value,
    onChange,
}: {
    name: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-4">
            {options.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name={name}
                        value={opt.value}
                        checked={value === opt.value}
                        onChange={() => onChange(opt.value)}
                        className="accent-indigo-600"
                    />
                    <span className="text-sm text-zinc-700">{opt.label}</span>
                </label>
            ))}
        </div>
    );
}

function CheckboxGroup({
    options,
    values,
    onChange,
}: {
    options: { value: string; label: string }[];
    values: string[];
    onChange: (values: string[]) => void;
}) {
    function toggle(val: string) {
        if (values.includes(val)) {
            onChange(values.filter((v) => v !== val));
        } else {
            onChange([...values, val]);
        }
    }

    return (
        <div className="flex flex-col gap-2.5">
            {options.map((opt) => (
                <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={values.includes(opt.value)}
                        onChange={() => toggle(opt.value)}
                        className="mt-0.5 accent-indigo-600"
                    />
                    <span className="text-sm text-zinc-700">{opt.label}</span>
                </label>
            ))}
        </div>
    );
}

function AgeRangeSlider({
    min,
    max,
    onChange,
}: {
    min: number;
    max: number;
    onChange: (min: number, max: number) => void;
}) {
    const SLIDER_MIN = 18;
    const SLIDER_MAX = 40;
    const range = SLIDER_MAX - SLIDER_MIN;
    const leftPct = ((min - SLIDER_MIN) / range) * 100;
    const rightPct = ((max - SLIDER_MIN) / range) * 100;

    return (
        <div>
            <p className="text-sm text-zinc-600 mb-4">
                Age range: <span className="font-semibold text-zinc-900">{min} – {max}</span>
            </p>
            <div className="relative h-8 mx-1">
                <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-zinc-200 rounded-full" />
                <div
                    className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-indigo-400 rounded-full"
                    style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
                />
                <input
                    type="range"
                    min={SLIDER_MIN}
                    max={SLIDER_MAX}
                    value={min}
                    onChange={(e) => {
                        const v = Number(e.target.value);
                        onChange(Math.min(v, max), max);
                    }}
                    className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow"
                    style={{ zIndex: min > SLIDER_MAX - 3 ? 5 : 3 }}
                />
                <input
                    type="range"
                    min={SLIDER_MIN}
                    max={SLIDER_MAX}
                    value={max}
                    onChange={(e) => {
                        const v = Number(e.target.value);
                        onChange(min, Math.max(v, min));
                    }}
                    className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow"
                    style={{ zIndex: 4 }}
                />
            </div>
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
                <span>18</span>
                <span>40</span>
            </div>
        </div>
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className={errorClass}>{message}</p>;
}

export default function FloatPopOrMatchPage() {
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [prefillLoading, setPrefillLoading] = useState(true);

    useEffect(() => {
        async function prefill() {
            try {
                const res = await fetch("/api/auth/me");
                if (res.ok) {
                    const data = await res.json();
                    setForm((prev) => ({
                        ...prev,
                        fullName: data.user?.name || prev.fullName,
                        email: data.user?.email || prev.email,
                        age: data.user?.age ? String(data.user.age) : prev.age,
                    }));
                }
            } catch {
                // ignore prefill errors
            } finally {
                setPrefillLoading(false);
            }
        }
        prefill();
    }, []);

    function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => {
            const next = { ...prev };
            delete next[key as string];
            return next;
        });
    }

    function validate(): Record<string, string> {
        const e: Record<string, string> = {};

        if (!form.role) e.role = "Please select a role";
        if (!form.fullName.trim()) e.fullName = "Full name is required";
        if (!form.age.trim()) {
            e.age = "Age is required";
        } else {
            const ageNum = Number(form.age);
            if (isNaN(ageNum) || ageNum < 18) e.age = "You must be 18 or older";
        }
        if (!form.yearOfStudy) e.yearOfStudy = "Please select your year of study";
        if (!form.program.trim()) e.program = "Program / major is required";
        if (!form.email.trim()) {
            e.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            e.email = "Please enter a valid email address";
        }
        if (!form.socialHandle.trim()) e.socialHandle = "Instagram or TikTok handle is required";
        if (form.datingGenders.length === 0)
            e.datingGenders = "Select at least one gender preference";
        if (!form.lookingFor) e.lookingFor = "Please select what you are looking for";
        if (!form.threeWords.trim()) e.threeWords = "Three words are required";
        else if (form.threeWords.length > 30) e.threeWords = "Maximum 30 characters";
        if (!form.unexpected.trim()) e.unexpected = "This field is required";
        else if (form.unexpected.length > 300) e.unexpected = "Maximum 300 characters";
        if (!form.bringToRelationship.trim()) e.bringToRelationship = "This field is required";
        else if (form.bringToRelationship.length > 300)
            e.bringToRelationship = "Maximum 300 characters";
        if (!form.dealbreaker.trim()) e.dealbreaker = "This field is required";
        else if (form.dealbreaker.length > 400) e.dealbreaker = "Maximum 400 characters";
        if (!form.questionToAsk.trim()) e.questionToAsk = "This field is required";
        else if (form.questionToAsk.length > 200) e.questionToAsk = "Maximum 200 characters";
        if (!form.controversialOpinion.trim()) e.controversialOpinion = "This field is required";
        else if (form.controversialOpinion.length > 300)
            e.controversialOpinion = "Maximum 300 characters";
        if (!form.balloonPoppedFeeling.trim()) e.balloonPoppedFeeling = "This field is required";
        else if (form.balloonPoppedFeeling.length > 400)
            e.balloonPoppedFeeling = "Maximum 400 characters";
        if (!form.inRelationship) e.inRelationship = "Please answer this question";
        if (form.inRelationship === "yes" && !form.partnerKnows)
            e.partnerKnows = "Please indicate whether your partner knows";
        if (!form.previousHistory) e.previousHistory = "Please answer this question";
        if (form.availability.length === 0)
            e.availability = "Select at least one availability window";
        if (!form.preShowBriefing) e.preShowBriefing = "Please answer this question";
        if (!form.consentRecorded || !form.consentNoDiscrimination || !form.consentPhotography || !form.consentLiveFormat || !form.consentVoluntary) {
            e.consent = "You must agree to all required consent items";
        }

        return e;
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setSubmitError("");

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            const firstKey = Object.keys(validationErrors)[0];
            const el = document.getElementById(`field-${firstKey}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/float-pop-or-match", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    role: form.role,
                    fullName: form.fullName.trim(),
                    age: Number(form.age),
                    pronouns: form.pronouns.trim() || null,
                    yearOfStudy: form.yearOfStudy,
                    program: form.program.trim(),
                    email: form.email.trim(),
                    socialHandle: form.socialHandle.trim(),
                    datingGenders: form.datingGenders,
                    ageRangeMin: form.ageRangeMin,
                    ageRangeMax: form.ageRangeMax,
                    lookingFor: form.lookingFor,
                    threeWords: form.threeWords.trim(),
                    unexpected: form.unexpected.trim(),
                    bringToRelationship: form.bringToRelationship.trim(),
                    dealbreaker: form.dealbreaker.trim(),
                    questionToAsk: form.questionToAsk.trim(),
                    controversialOpinion: form.controversialOpinion.trim(),
                    balloonPoppedFeeling: form.balloonPoppedFeeling.trim(),
                    inRelationship: form.inRelationship === "yes",
                    partnerKnows:
                        form.inRelationship === "yes" ? form.partnerKnows || null : null,
                    previousHistory: form.previousHistory,
                    uncomfortableWith: form.uncomfortableWith.trim() || null,
                    availability: form.availability,
                    cannotAttendDates: form.cannotAttendDates.trim() || null,
                    preShowBriefing: form.preShowBriefing,
                    anythingElse: form.anythingElse.trim() || null,
                    consentRecorded: form.consentRecorded,
                    consentNoDiscrimination: form.consentNoDiscrimination,
                    consentPhotography: form.consentPhotography,
                    consentLiveFormat: form.consentLiveFormat,
                    consentVoluntary: form.consentVoluntary,
                    waitlistOptIn: form.waitlistOptIn,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setSubmitError(data.error || "Something went wrong. Please try again.");
                return;
            }

            setSubmitted(true);
        } catch {
            setSubmitError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    if (submitted) {
        return (
            <AppShell>
                <ReferralGate featureName="Float Pop or Match">
                <div className="min-h-screen bg-zinc-50 px-4 py-10 sm:py-16">
                    <div className="max-w-2xl mx-auto">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-8 sm:p-12 text-center">
                            <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto mb-6">
                                <span className="text-2xl">✓</span>
                            </div>
                            <h1 className="text-2xl font-semibold text-zinc-900 mb-3">
                                You&apos;re in the pool!
                            </h1>
                            <p className="text-zinc-600">
                                We&apos;ll be in touch before the event.
                            </p>
                        </div>
                    </div>
                </div>
                </ReferralGate>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <ReferralGate featureName="Float Pop or Match">
            <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:py-12">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 mb-2">
                            Float Pop or Match Application
                        </h1>
                        <p className="text-zinc-600 text-sm sm:text-base">
                            Apply to join our live campus dating show. Fill out every section
                            below — we&apos;ll review applications and reach out before casting.
                        </p>
                    </div>

                    {prefillLoading ? (
                        <div className="text-center py-12 text-zinc-400 text-sm">
                            Loading…
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate>
                            {/* Section 1 — Role Selection */}
                            <section className={sectionClass} id="field-role">
                                <h2 className="text-lg font-semibold text-zinc-900 mb-1">
                                    Role Selection
                                </h2>
                                <p className="text-sm text-zinc-500 mb-5">
                                    Which role are you applying for?{" "}
                                    <span className="text-red-500">*</span>
                                </p>
                                <CardSelect
                                    name="role"
                                    options={ROLE_OPTIONS}
                                    value={form.role}
                                    onChange={(v) => setField("role", v)}
                                />
                                <FieldError message={errors.role} />
                            </section>

                            {/* Section 2 — Basic Profile */}
                            <section className={sectionClass}>
                                <h2 className="text-lg font-semibold text-zinc-900 mb-5">
                                    Basic Profile
                                </h2>
                                <div className="flex flex-col gap-5">
                                    <div id="field-fullName">
                                        <label className={labelClass}>
                                            Full name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.fullName}
                                            onChange={(e) => setField("fullName", e.target.value)}
                                            className={inputClass}
                                            placeholder="Your full name"
                                        />
                                        <FieldError message={errors.fullName} />
                                    </div>

                                    <div id="field-age">
                                        <label className={labelClass}>
                                            Age <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={99}
                                            value={form.age}
                                            onChange={(e) => setField("age", e.target.value)}
                                            className={inputClass}
                                            placeholder="18"
                                        />
                                        {form.age && Number(form.age) < 18 && (
                                            <p className={errorClass}>
                                                You must be 18 or older to apply
                                            </p>
                                        )}
                                        <FieldError message={errors.age} />
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            Pronouns{" "}
                                            <span className="text-zinc-400 font-normal">
                                                (optional)
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.pronouns}
                                            onChange={(e) => setField("pronouns", e.target.value)}
                                            className={inputClass}
                                            placeholder="e.g. he/him, she/her, they/them"
                                        />
                                    </div>

                                    <div id="field-yearOfStudy">
                                        <label className={labelClass}>
                                            Year of study <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={form.yearOfStudy}
                                            onChange={(e) =>
                                                setField("yearOfStudy", e.target.value)
                                            }
                                            className={inputClass}
                                        >
                                            <option value="">Select year</option>
                                            <option value="1st year">1st year</option>
                                            <option value="2nd year">2nd year</option>
                                            <option value="3rd year">3rd year</option>
                                            <option value="4th year">4th year</option>
                                            <option value="Graduate">Graduate</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <FieldError message={errors.yearOfStudy} />
                                    </div>

                                    <div id="field-program">
                                        <label className={labelClass}>
                                            Program / Major <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.program}
                                            onChange={(e) => setField("program", e.target.value)}
                                            className={inputClass}
                                            placeholder="e.g. Psychology, Computer Science"
                                        />
                                        <FieldError message={errors.program} />
                                    </div>

                                    <div id="field-email">
                                        <label className={labelClass}>
                                            Email address <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setField("email", e.target.value)}
                                            className={inputClass}
                                            placeholder="you@university.edu"
                                        />
                                        <FieldError message={errors.email} />
                                    </div>

                                    <div id="field-socialHandle">
                                        <label className={labelClass}>
                                            Instagram or TikTok handle{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.socialHandle}
                                            onChange={(e) =>
                                                setField("socialHandle", e.target.value)
                                            }
                                            className={inputClass}
                                            placeholder="@yourhandle"
                                        />
                                        <p className="text-xs text-zinc-400 mt-1">
                                            This is for casting purposes and may appear in
                                            promotional content.
                                        </p>
                                        <FieldError message={errors.socialHandle} />
                                    </div>
                                </div>
                            </section>

                            {/* Section 3 — Dating Preferences */}
                            <section className={sectionClass}>
                                <h2 className="text-lg font-semibold text-zinc-900 mb-5">
                                    Dating Preferences
                                </h2>
                                <div className="flex flex-col gap-6">
                                    <div id="field-datingGenders">
                                        <label className={labelClass}>
                                            What gender(s) are you open to dating?{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <CheckboxGroup
                                            options={DATING_GENDER_OPTIONS}
                                            values={form.datingGenders}
                                            onChange={(v) => setField("datingGenders", v)}
                                        />
                                        <FieldError message={errors.datingGenders} />
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            What age range are you open to dating?{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <AgeRangeSlider
                                            min={form.ageRangeMin}
                                            max={form.ageRangeMax}
                                            onChange={(min, max) => {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    ageRangeMin: min,
                                                    ageRangeMax: max,
                                                }));
                                            }}
                                        />
                                    </div>

                                    <div id="field-lookingFor">
                                        <label className={labelClass}>
                                            What are you currently looking for?{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <CardSelect
                                            name="lookingFor"
                                            options={LOOKING_FOR_OPTIONS}
                                            value={form.lookingFor}
                                            onChange={(v) => setField("lookingFor", v)}
                                        />
                                        <FieldError message={errors.lookingFor} />
                                    </div>
                                </div>
                            </section>

                            {/* Section 4 — Personality and Content Questions */}
                            <section className={sectionClass}>
                                <h2 className="text-lg font-semibold text-zinc-900 mb-1">
                                    Personality and Content Questions
                                </h2>
                                <p className="text-sm text-zinc-500 mb-5">
                                    These answers may be used in promotional content.
                                </p>
                                <div className="flex flex-col gap-5">
                                    <div id="field-threeWords">
                                        <label className={labelClass}>
                                            Describe yourself in exactly 3 words.{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.threeWords}
                                            onChange={(e) =>
                                                setField("threeWords", e.target.value)
                                            }
                                            maxLength={30}
                                            className={inputClass}
                                            placeholder="Bold, curious, loyal"
                                        />
                                        <p className="text-xs text-zinc-400 mt-1">
                                            Hint: separate with commas
                                        </p>
                                        <CharCount current={form.threeWords.length} max={30} />
                                        <FieldError message={errors.threeWords} />
                                    </div>

                                    <div id="field-unexpected">
                                        <label className={labelClass}>
                                            What&apos;s something about you that most people
                                            don&apos;t expect?{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={form.unexpected}
                                            onChange={(e) =>
                                                setField("unexpected", e.target.value)
                                            }
                                            maxLength={300}
                                            rows={3}
                                            className={inputClass}
                                        />
                                        <CharCount current={form.unexpected.length} max={300} />
                                        <FieldError message={errors.unexpected} />
                                    </div>

                                    <div id="field-bringToRelationship">
                                        <label className={labelClass}>
                                            What do you bring to a relationship that most people
                                            can&apos;t? <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={form.bringToRelationship}
                                            onChange={(e) =>
                                                setField("bringToRelationship", e.target.value)
                                            }
                                            maxLength={300}
                                            rows={3}
                                            className={inputClass}
                                        />
                                        <CharCount
                                            current={form.bringToRelationship.length}
                                            max={300}
                                        />
                                        <FieldError message={errors.bringToRelationship} />
                                    </div>

                                    <div id="field-dealbreaker">
                                        <label className={labelClass}>
                                            What would make you pop the balloon within the first 30
                                            seconds? What&apos;s your non-negotiable dealbreaker?{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={form.dealbreaker}
                                            onChange={(e) =>
                                                setField("dealbreaker", e.target.value)
                                            }
                                            maxLength={400}
                                            rows={4}
                                            className={inputClass}
                                        />
                                        <CharCount current={form.dealbreaker.length} max={400} />
                                        <FieldError message={errors.dealbreaker} />
                                    </div>

                                    <div id="field-questionToAsk">
                                        <label className={labelClass}>
                                            What&apos;s one question you&apos;d want to ask a
                                            potential date on the spot?{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.questionToAsk}
                                            onChange={(e) =>
                                                setField("questionToAsk", e.target.value)
                                            }
                                            maxLength={200}
                                            className={inputClass}
                                        />
                                        <CharCount
                                            current={form.questionToAsk.length}
                                            max={200}
                                        />
                                        <FieldError message={errors.questionToAsk} />
                                    </div>

                                    <div id="field-controversialOpinion">
                                        <label className={labelClass}>
                                            What&apos;s your most controversial opinion about
                                            dating? <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={form.controversialOpinion}
                                            onChange={(e) =>
                                                setField("controversialOpinion", e.target.value)
                                            }
                                            maxLength={300}
                                            rows={3}
                                            className={inputClass}
                                        />
                                        <CharCount
                                            current={form.controversialOpinion.length}
                                            max={300}
                                        />
                                        <FieldError message={errors.controversialOpinion} />
                                    </div>

                                    <div id="field-balloonPoppedFeeling">
                                        <label className={labelClass}>
                                            If the panel popped your balloon immediately — before
                                            you even said anything — how do you think you&apos;d
                                            handle that emotionally?{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={form.balloonPoppedFeeling}
                                            onChange={(e) =>
                                                setField("balloonPoppedFeeling", e.target.value)
                                            }
                                            maxLength={400}
                                            rows={4}
                                            className={inputClass}
                                        />
                                        <CharCount
                                            current={form.balloonPoppedFeeling.length}
                                            max={400}
                                        />
                                        <FieldError message={errors.balloonPoppedFeeling} />
                                    </div>
                                </div>
                            </section>

                            {/* Section 5 — Conflict of Interest */}
                            <section className={sectionClass}>
                                <h2 className="text-lg font-semibold text-zinc-900 mb-1">
                                    Conflict of Interest
                                </h2>
                                <p className="text-sm text-zinc-500 mb-5">
                                    We ask these to make sure everyone has a comfortable experience.
                                </p>
                                <div className="flex flex-col gap-6">
                                    <div id="field-inRelationship">
                                        <label className={labelClass}>
                                            Are you currently in a relationship?{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <RadioGroup
                                            name="inRelationship"
                                            options={[
                                                { value: "yes", label: "Yes" },
                                                { value: "no", label: "No" },
                                            ]}
                                            value={form.inRelationship}
                                            onChange={(v) => {
                                                setField("inRelationship", v as YesNo);
                                                if (v === "no") setField("partnerKnows", "");
                                            }}
                                        />
                                        <FieldError message={errors.inRelationship} />
                                    </div>

                                    {form.inRelationship === "yes" && (
                                        <div id="field-partnerKnows">
                                            <label className={labelClass}>
                                                Does your partner know you are applying?{" "}
                                                <span className="text-red-500">*</span>
                                            </label>
                                            <RadioGroup
                                                name="partnerKnows"
                                                options={[
                                                    { value: "yes", label: "Yes" },
                                                    { value: "no", label: "No" },
                                                ]}
                                                value={form.partnerKnows}
                                                onChange={(v) =>
                                                    setField("partnerKnows", v as YesNo)
                                                }
                                            />
                                            <FieldError message={errors.partnerKnows} />
                                        </div>
                                    )}

                                    <div id="field-previousHistory">
                                        <label className={labelClass}>
                                            Do you have a previous romantic or sexual history with
                                            anyone else who may be applying or attending this
                                            event? <span className="text-red-500">*</span>
                                        </label>
                                        <RadioGroup
                                            name="previousHistory"
                                            options={[
                                                { value: "yes", label: "Yes" },
                                                { value: "no", label: "No" },
                                                { value: "not_sure", label: "Not sure" },
                                            ]}
                                            value={form.previousHistory}
                                            onChange={(v) =>
                                                setField("previousHistory", v as PreviousHistory)
                                            }
                                        />
                                        <FieldError message={errors.previousHistory} />
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            Is there anyone on campus you would be uncomfortable
                                            being matched with or evaluated by?{" "}
                                            <span className="text-zinc-400 font-normal">
                                                (optional)
                                            </span>
                                        </label>
                                        <textarea
                                            value={form.uncomfortableWith}
                                            onChange={(e) =>
                                                setField("uncomfortableWith", e.target.value)
                                            }
                                            maxLength={200}
                                            rows={2}
                                            className={inputClass}
                                            placeholder="You don't need to name them, just describe the situation"
                                        />
                                        <CharCount
                                            current={form.uncomfortableWith.length}
                                            max={200}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Section 6 — Availability and Logistics */}
                            <section className={sectionClass}>
                                <h2 className="text-lg font-semibold text-zinc-900 mb-5">
                                    Availability and Logistics
                                </h2>
                                <div className="flex flex-col gap-6">
                                    <div id="field-availability">
                                        <p className="text-sm text-zinc-500 mb-3">
                                            The event is tentatively planned for late August or
                                            September — exact date will be confirmed based on
                                            everyone&apos;s availability (it&apos;s a one day
                                            event).
                                        </p>
                                        <label className={labelClass}>
                                            When are you generally available after August 22?{" "}
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <CheckboxGroup
                                            options={AVAILABILITY_OPTIONS}
                                            values={form.availability}
                                            onChange={(v) => setField("availability", v)}
                                        />
                                        <FieldError message={errors.availability} />
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            Are there any specific dates in that window you
                                            absolutely cannot attend?{" "}
                                            <span className="text-zinc-400 font-normal">
                                                (optional)
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.cannotAttendDates}
                                            onChange={(e) =>
                                                setField("cannotAttendDates", e.target.value)
                                            }
                                            className={inputClass}
                                            placeholder={'e.g. "Sep 5–7, I\'m away"'}
                                        />
                                    </div>

                                    <div id="field-preShowBriefing">
                                        <label className={labelClass}>
                                            Can you attend a 15-minute pre-show briefing on the
                                            same day? <span className="text-red-500">*</span>
                                        </label>
                                        <RadioGroup
                                            name="preShowBriefing"
                                            options={[
                                                { value: "yes", label: "Yes" },
                                                { value: "no", label: "No" },
                                                { value: "maybe", label: "Maybe" },
                                            ]}
                                            value={form.preShowBriefing}
                                            onChange={(v) =>
                                                setField("preShowBriefing", v as YesNoMaybe)
                                            }
                                        />
                                        <FieldError message={errors.preShowBriefing} />
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            Is there anything else the organizer should know before
                                            casting you?{" "}
                                            <span className="text-zinc-400 font-normal">
                                                (optional)
                                            </span>
                                        </label>
                                        <textarea
                                            value={form.anythingElse}
                                            onChange={(e) =>
                                                setField("anythingElse", e.target.value)
                                            }
                                            maxLength={400}
                                            rows={3}
                                            className={inputClass}
                                        />
                                        <CharCount current={form.anythingElse.length} max={400} />
                                    </div>
                                </div>
                            </section>

                            {/* Section 7 — Consent and Conduct */}
                            <section className={sectionClass} id="field-consent">
                                <h2 className="text-lg font-semibold text-zinc-900 mb-5">
                                    Consent and Conduct
                                </h2>
                                <div className="flex flex-col gap-4">
                                    {[
                                        {
                                            key: "consentRecorded" as const,
                                            label: "I understand that if I pop a balloon, I will be asked to explain my decision in front of the audience. My response may be recorded.",
                                        },
                                        {
                                            key: "consentNoDiscrimination" as const,
                                            label: "I agree not to make remarks targeting race, skin tone, body size, disability, or any other protected characteristic as the basis for my decision. I understand that doing so may result in immediate removal from the event.",
                                        },
                                        {
                                            key: "consentPhotography" as const,
                                            label: "I consent to being photographed and filmed during the event. This content may be used for promotional purposes including social media posts and clips.",
                                        },
                                        {
                                            key: "consentLiveFormat" as const,
                                            label: "I understand this is a live entertainment format. Outcomes — including rejection — are part of the experience, and I will not hold the organizers responsible for emotional responses to those outcomes.",
                                        },
                                        {
                                            key: "consentVoluntary" as const,
                                            label: "I am participating voluntarily. I understand I may withdraw before the event begins by contacting the organizer.",
                                        },
                                    ].map(({ key, label }) => (
                                        <label
                                            key={key}
                                            className="flex items-start gap-3 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={form[key]}
                                                onChange={(e) => setField(key, e.target.checked)}
                                                className="mt-0.5 accent-indigo-600 shrink-0"
                                            />
                                            <span className="text-sm text-zinc-700">
                                                {label}{" "}
                                                <span className="text-red-500">*</span>
                                            </span>
                                        </label>
                                    ))}
                                    <FieldError message={errors.consent} />
                                </div>

                                <div className="mt-8 pt-6 border-t border-zinc-100">
                                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">
                                        Bonus: join the early access list
                                    </p>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.waitlistOptIn}
                                            onChange={(e) =>
                                                setField("waitlistOptIn", e.target.checked)
                                            }
                                            className="mt-0.5 accent-zinc-400 shrink-0"
                                        />
                                        <span className="text-sm text-zinc-500">
                                            Would you like to be notified when the digital version
                                            of this experience launches as an online platform?
                                        </span>
                                    </label>
                                </div>
                            </section>

                            {submitError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6">
                                    <p className="text-sm text-red-700">{submitError}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-12"
                            >
                                {loading ? "Submitting…" : "Submit Application"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
            </ReferralGate>
        </AppShell>
    );
}
