"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AppStatus = "pending" | "approved" | "rejected" | "waitlisted" | null;

interface ShowApplication {
    id: string;
    userId: string | null;
    createdAt: string;
    role: string;
    fullName: string;
    age: number;
    pronouns: string | null;
    yearOfStudy: string;
    program: string;
    email: string;
    socialHandle: string;
    datingGenders: string[];
    ageRangeMin: number;
    ageRangeMax: number;
    lookingFor: string;
    threeWords: string;
    unexpected: string;
    bringToRelationship: string;
    dealbreaker: string;
    questionToAsk: string;
    controversialOpinion: string;
    balloonPoppedFeeling: string;
    inRelationship: boolean;
    partnerKnows: string | null;
    previousHistory: string;
    uncomfortableWith: string | null;
    availability: string[];
    cannotAttendDates: string | null;
    preShowBriefing: string;
    anythingElse: string | null;
    consentRecorded: boolean;
    consentNoDiscrimination: boolean;
    consentPhotography: boolean;
    consentLiveFormat: boolean;
    consentVoluntary: boolean;
    waitlistOptIn: boolean;
    status: AppStatus;
    adminNotes: string | null;
    statusUpdatedAt: string | null;
}

const ROLE_LABELS: Record<string, string> = {
    spotlight: "Spotlight",
    panel: "Panel Member",
    either: "Either",
};

const ROLE_COLORS: Record<string, string> = {
    spotlight: "bg-purple-100 text-purple-800 border-purple-200",
    panel: "bg-blue-100 text-blue-800 border-blue-200",
    either: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const LOOKING_FOR_LABELS: Record<string, string> = {
    casual: "Casual",
    serious: "Serious",
    either: "Either",
};

const GENDER_LABELS: Record<string, string> = {
    men: "Men",
    women: "Women",
    nonbinary: "Non-binary",
    all: "All genders",
};

const AVAILABILITY_LABELS: Record<string, string> = {
    late_august: "Late Aug",
    early_september: "Early Sep",
    late_september: "Late Sep",
    october: "October",
};

const AVAILABILITY_FULL: Record<string, string> = {
    late_august: "Late August (Aug 23–31)",
    early_september: "First two weeks of September (Sep 1–14)",
    late_september: "Second half of September (Sep 15–30)",
    october: "October works too if needed",
};

const STATUS_OPTIONS: { value: AppStatus; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "waitlisted", label: "Waitlisted" },
];

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    waitlisted: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

const selectClass =
    "border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400";

function normalizeApp(raw: Record<string, unknown>): ShowApplication {
    return {
        ...(raw as Omit<ShowApplication, "datingGenders" | "availability" | "status">),
        datingGenders: Array.isArray(raw.datingGenders) ? (raw.datingGenders as string[]) : [],
        availability: Array.isArray(raw.availability) ? (raw.availability as string[]) : [],
        status: (raw.status as AppStatus) ?? "pending",
    };
}

function displayStatus(status: AppStatus): string {
    if (!status || status === "pending") return "Pending";
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusKey(status: AppStatus): string {
    if (!status || status === "pending") return "pending";
    return status;
}

function relativeDate(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

function socialUrl(handle: string): string {
    const h = handle.replace(/^@/, "").trim();
    if (handle.toLowerCase().includes("tiktok")) {
        return `https://tiktok.com/@${h.replace(/tiktok\s*/i, "")}`;
    }
    return `https://instagram.com/${h}`;
}

function exportCsv(apps: ShowApplication[], filename: string) {
    const headers = [
        "Full Name",
        "Email",
        "Social",
        "Role",
        "Program",
        "Year",
        "Availability",
        "Waitlist Opt-in",
        "Status",
    ];
    const rows = apps.map((a) => [
        a.fullName,
        a.email,
        a.socialHandle,
        ROLE_LABELS[a.role] ?? a.role,
        a.program,
        a.yearOfStudy,
        a.availability.map((v) => AVAILABILITY_FULL[v] ?? v).join("; "),
        a.waitlistOptIn ? "Yes" : "No",
        displayStatus(a.status),
    ]);
    const csv = [headers, ...rows]
        .map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

interface Filters {
    search: string;
    role: string;
    status: string;
    lookingFor: string;
    genderInterest: string;
    availability: string;
    waitlistOnly: boolean;
    sortBy: string;
}

const DEFAULT_FILTERS: Filters = {
    search: "",
    role: "all",
    status: "all",
    lookingFor: "all",
    genderInterest: "all",
    availability: "all",
    waitlistOnly: false,
    sortBy: "newest",
};

function AnswerBlock({ question, answer }: { question: string; answer: string }) {
    return (
        <div className="py-4 border-b border-zinc-100 last:border-0">
            <p className="text-xs text-zinc-400 mb-1.5">{question}</p>
            <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">{answer}</p>
        </div>
    );
}

export default function AdminShowApplicationsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [applications, setApplications] = useState<ShowApplication[]>([]);
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [drawerId, setDrawerId] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [adminNotesDraft, setAdminNotesDraft] = useState("");
    const [updating, setUpdating] = useState(false);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [error, setError] = useState("");
    const [copyFeedback, setCopyFeedback] = useState("");

    const fetchApplications = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/show-applications");
            if (res.status === 401) {
                setAuthorized(false);
                setLoading(false);
                return;
            }
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setAuthorized(true);
            setApplications(
                (data.applications ?? []).map((a: Record<string, unknown>) => normalizeApp(a))
            );
        } catch {
            setError("Failed to load applications.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const filtered = useMemo(() => {
        let list = [...applications];

        if (filters.search.trim()) {
            const q = filters.search.toLowerCase();
            list = list.filter(
                (a) =>
                    a.fullName.toLowerCase().includes(q) ||
                    a.email.toLowerCase().includes(q) ||
                    a.program.toLowerCase().includes(q)
            );
        }
        if (filters.role !== "all") list = list.filter((a) => a.role === filters.role);
        if (filters.status !== "all") {
            list = list.filter((a) => {
                const s = a.status ?? "pending";
                return s === filters.status;
            });
        }
        if (filters.lookingFor !== "all")
            list = list.filter((a) => a.lookingFor === filters.lookingFor);
        if (filters.genderInterest !== "all") {
            const genderVal =
                filters.genderInterest === "gender_all" ? "all" : filters.genderInterest;
            list = list.filter((a) => a.datingGenders.includes(genderVal));
        }
        if (filters.availability !== "all")
            list = list.filter((a) => a.availability.includes(filters.availability));
        if (filters.waitlistOnly) list = list.filter((a) => a.waitlistOptIn);

        list.sort((a, b) => {
            switch (filters.sortBy) {
                case "oldest":
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case "name_asc":
                    return a.fullName.localeCompare(b.fullName);
                case "name_desc":
                    return b.fullName.localeCompare(a.fullName);
                default:
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });

        return list;
    }, [applications, filters]);

    const stats = useMemo(
        () => ({
            total: applications.length,
            spotlight: applications.filter((a) => a.role === "spotlight").length,
            panel: applications.filter((a) => a.role === "panel").length,
            either: applications.filter((a) => a.role === "either").length,
            pending: applications.filter((a) => !a.status || a.status === "pending").length,
            approved: applications.filter((a) => a.status === "approved").length,
            rejected: applications.filter((a) => a.status === "rejected").length,
        }),
        [applications]
    );

    const drawerApp = useMemo(
        () => (drawerId ? filtered.find((a) => a.id === drawerId) ?? null : null),
        [drawerId, filtered]
    );

    const drawerIndex = drawerApp ? filtered.findIndex((a) => a.id === drawerApp.id) : -1;

    useEffect(() => {
        if (drawerApp) setAdminNotesDraft(drawerApp.adminNotes ?? "");
    }, [drawerApp]);

    useEffect(() => {
        if (!drawerOpen) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") closeDrawer();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [drawerOpen]);

    function openDrawer(id: string) {
        setDrawerId(id);
        setDrawerOpen(true);
    }

    function closeDrawer() {
        setDrawerOpen(false);
        setTimeout(() => setDrawerId(null), 300);
    }

    function clearFilters() {
        setFilters(DEFAULT_FILTERS);
    }

    function updateLocalApp(id: string, patch: Partial<ShowApplication>) {
        setApplications((prev) =>
            prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
        );
    }

    async function patchApplication(
        id: string,
        body: { status?: AppStatus; adminNotes?: string | null }
    ) {
        setUpdating(true);
        setError("");
        try {
            const payload: { status?: string | null; adminNotes?: string | null } = {};
            if (body.status !== undefined) {
                payload.status =
                    body.status === "pending" || body.status === null ? null : body.status;
            }
            if (body.adminNotes !== undefined) payload.adminNotes = body.adminNotes;

            const res = await fetch(`/api/admin/show-applications/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to update");
                return false;
            }
            const data = await res.json();
            updateLocalApp(id, normalizeApp(data.application));
            return true;
        } catch {
            setError("Failed to update application.");
            return false;
        } finally {
            setUpdating(false);
        }
    }

    async function handleStatusChange(id: string, status: AppStatus) {
        await patchApplication(id, { status });
    }

    async function handleAdminNotesBlur(id: string) {
        const app = applications.find((a) => a.id === id);
        if (!app || (app.adminNotes ?? "") === adminNotesDraft) return;
        await patchApplication(id, { adminNotes: adminNotesDraft || null });
    }

    async function handleBulkStatus(status: AppStatus) {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        setBulkUpdating(true);
        setError("");
        try {
            const res = await fetch("/api/admin/show-applications/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ids,
                    status: status === null ? "pending" : status,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Bulk update failed");
                return;
            }
            const statusValue = status === "pending" || status === null ? null : status;
            const now = new Date().toISOString();
            setApplications((prev) =>
                prev.map((a) =>
                    selectedIds.has(a.id)
                        ? { ...a, status: statusValue, statusUpdatedAt: now }
                        : a
                )
            );
            setSelectedIds(new Set());
        } catch {
            setError("Bulk update failed.");
        } finally {
            setBulkUpdating(false);
        }
    }

    function toggleSelect(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleSelectAllFiltered() {
        const allSelected = filtered.every((a) => selectedIds.has(a.id));
        if (allSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                filtered.forEach((a) => next.delete(a.id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                filtered.forEach((a) => next.add(a.id));
                return next;
            });
        }
    }

    function navigateDrawer(direction: -1 | 1) {
        if (drawerIndex < 0) return;
        const next = filtered[drawerIndex + direction];
        if (next) setDrawerId(next.id);
    }

    async function copyEmail(email: string) {
        await navigator.clipboard.writeText(email);
        setCopyFeedback("Copied!");
        setTimeout(() => setCopyFeedback(""), 2000);
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <p className="text-zinc-400 text-sm">Loading applications…</p>
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
                <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm text-center max-w-sm">
                    <p className="text-3xl mb-3">🔒</p>
                    <h1 className="text-xl font-bold text-zinc-900 mb-2">Access Denied</h1>
                    <p className="text-zinc-500 text-sm mb-4">
                        You don&apos;t have admin privileges.
                    </p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="text-sm text-zinc-500 hover:text-zinc-800 transition underline"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const allFilteredSelected =
        filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id));

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">Show Applications</h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            Review Float Pop or Match casting applications.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/admin")}
                        className="text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-4 py-2 rounded-xl transition"
                    >
                        ← Admin Panel
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* Stats bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                        { label: "Total", value: stats.total, color: "text-zinc-900" },
                        { label: "Spotlight", value: stats.spotlight, color: "text-purple-700" },
                        { label: "Panel", value: stats.panel, color: "text-blue-700" },
                        { label: "Either", value: stats.either, color: "text-zinc-600" },
                        { label: "Pending", value: stats.pending, color: "text-amber-700" },
                        { label: "Approved", value: stats.approved, color: "text-green-700" },
                        { label: "Rejected", value: stats.rejected, color: "text-red-700" },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm"
                        >
                            <p className="text-xs text-zinc-400 mb-1">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap gap-3">
                        <input
                            type="text"
                            placeholder="Search name, email, program…"
                            value={filters.search}
                            onChange={(e) =>
                                setFilters((f) => ({ ...f, search: e.target.value }))
                            }
                            className="flex-1 min-w-[200px] px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                        />
                        <select
                            value={filters.role}
                            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
                            className={selectClass}
                        >
                            <option value="all">All roles</option>
                            <option value="spotlight">Spotlight</option>
                            <option value="panel">Panel Member</option>
                            <option value="either">Either</option>
                        </select>
                        <select
                            value={filters.status}
                            onChange={(e) =>
                                setFilters((f) => ({ ...f, status: e.target.value }))
                            }
                            className={selectClass}
                        >
                            <option value="all">All statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="waitlisted">Waitlisted</option>
                        </select>
                        <select
                            value={filters.lookingFor}
                            onChange={(e) =>
                                setFilters((f) => ({ ...f, lookingFor: e.target.value }))
                            }
                            className={selectClass}
                        >
                            <option value="all">All looking for</option>
                            <option value="casual">Casual</option>
                            <option value="serious">Serious</option>
                            <option value="either">Either</option>
                        </select>
                        <select
                            value={filters.genderInterest}
                            onChange={(e) =>
                                setFilters((f) => ({ ...f, genderInterest: e.target.value }))
                            }
                            className={selectClass}
                        >
                            <option value="all">All gender interests</option>
                            <option value="men">Men</option>
                            <option value="women">Women</option>
                            <option value="nonbinary">Non-binary</option>
                            <option value="gender_all">All genders</option>
                        </select>
                        <select
                            value={filters.availability}
                            onChange={(e) =>
                                setFilters((f) => ({ ...f, availability: e.target.value }))
                            }
                            className={selectClass}
                        >
                            <option value="all">All availability</option>
                            <option value="late_august">Late August</option>
                            <option value="early_september">Early September</option>
                            <option value="late_september">Late September</option>
                            <option value="october">October</option>
                        </select>
                        <select
                            value={filters.sortBy}
                            onChange={(e) =>
                                setFilters((f) => ({ ...f, sortBy: e.target.value }))
                            }
                            className={selectClass}
                        >
                            <option value="newest">Newest first</option>
                            <option value="oldest">Oldest first</option>
                            <option value="name_asc">Name A–Z</option>
                            <option value="name_desc">Name Z–A</option>
                        </select>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filters.waitlistOnly}
                                onChange={(e) =>
                                    setFilters((f) => ({
                                        ...f,
                                        waitlistOnly: e.target.checked,
                                    }))
                                }
                                className="accent-indigo-600"
                            />
                            Show only digital waitlist opt-ins
                        </label>
                        <button
                            onClick={clearFilters}
                            className="text-sm text-zinc-500 hover:text-zinc-800 underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                    <p className="text-sm text-zinc-500">
                        Showing {filtered.length} of {applications.length} application
                        {applications.length === 1 ? "" : "s"}
                    </p>
                </div>

                {/* Bulk action bar */}
                {selectedIds.size > 0 && (
                    <div className="bg-zinc-900 text-white rounded-2xl px-5 py-3 flex flex-wrap items-center gap-3 shadow-sm">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={allFilteredSelected}
                                onChange={toggleSelectAllFiltered}
                                className="accent-white"
                            />
                            Select all ({filtered.length})
                        </label>
                        <span className="text-sm text-zinc-300">
                            {selectedIds.size} selected
                        </span>
                        <div className="flex flex-wrap gap-2 ml-auto">
                            {STATUS_OPTIONS.map((s) => (
                                <button
                                    key={s.value ?? "pending"}
                                    disabled={bulkUpdating}
                                    onClick={() => handleBulkStatus(s.value)}
                                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
                                >
                                    {s.label}
                                </button>
                            ))}
                            <button
                                disabled={bulkUpdating}
                                onClick={() => {
                                    const selected = applications.filter((a) =>
                                        selectedIds.has(a.id)
                                    );
                                    exportCsv(
                                        selected,
                                        `show-applications-${Date.now()}.csv`
                                    );
                                }}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition disabled:opacity-50"
                            >
                                Export selected (CSV)
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                    {applications.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-zinc-500">
                                No applications yet. Share the form link to get started.
                            </p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-zinc-500 mb-2">
                                No applications match these filters.
                            </p>
                            <button
                                onClick={clearFilters}
                                className="text-sm text-zinc-600 hover:text-zinc-900 underline"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-100 text-left text-zinc-400 text-xs uppercase tracking-wide">
                                        <th className="py-3 px-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={allFilteredSelected}
                                                onChange={toggleSelectAllFiltered}
                                                className="accent-indigo-600"
                                            />
                                        </th>
                                        <th className="py-3 px-4">Name</th>
                                        <th className="py-3 px-4">Role</th>
                                        <th className="py-3 px-4">Program + Year</th>
                                        <th className="py-3 px-4">Looking for</th>
                                        <th className="py-3 px-4">Availability</th>
                                        <th className="py-3 px-4">Social</th>
                                        <th className="py-3 px-4">Waitlist</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Applied</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((app) => (
                                        <tr
                                            key={app.id}
                                            onClick={() => openDrawer(app.id)}
                                            className="border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer transition"
                                        >
                                            <td
                                                className="py-3 px-4"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(app.id)}
                                                    onChange={() => toggleSelect(app.id)}
                                                    className="accent-indigo-600"
                                                />
                                            </td>
                                            <td className="py-3 px-4 font-medium text-zinc-900">
                                                {app.fullName}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${
                                                        ROLE_COLORS[app.role] ??
                                                        "bg-zinc-100 text-zinc-700 border-zinc-200"
                                                    }`}
                                                >
                                                    {ROLE_LABELS[app.role] ?? app.role}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-zinc-600">
                                                {app.program} · {app.yearOfStudy}
                                            </td>
                                            <td className="py-3 px-4 text-zinc-600">
                                                {LOOKING_FOR_LABELS[app.lookingFor] ??
                                                    app.lookingFor}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {app.availability.map((v) => (
                                                        <span
                                                            key={v}
                                                            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600"
                                                        >
                                                            {AVAILABILITY_LABELS[v] ?? v}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-zinc-500 text-xs">
                                                {app.socialHandle}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {app.waitlistOptIn ? (
                                                    <span className="text-green-600">✓</span>
                                                ) : (
                                                    <span className="text-zinc-300">—</span>
                                                )}
                                            </td>
                                            <td
                                                className="py-3 px-4"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <select
                                                    value={statusKey(app.status)}
                                                    onChange={(e) =>
                                                        handleStatusChange(
                                                            app.id,
                                                            e.target.value as AppStatus
                                                        )
                                                    }
                                                    className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer focus:outline-none ${
                                                        STATUS_COLORS[statusKey(app.status)]
                                                    }`}
                                                >
                                                    {STATUS_OPTIONS.map((s) => (
                                                        <option
                                                            key={s.value ?? "pending"}
                                                            value={s.value ?? "pending"}
                                                        >
                                                            {s.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td
                                                className="py-3 px-4 text-zinc-400 text-xs whitespace-nowrap"
                                                title={formatDate(app.createdAt)}
                                            >
                                                {relativeDate(app.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Profile drawer */}
            {drawerId && (
                <>
                    <div
                        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
                            drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                        }`}
                        onClick={closeDrawer}
                    />
                    <div
                        className={`fixed inset-y-0 right-0 w-full md:w-[45%] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
                            drawerOpen ? "translate-x-0" : "translate-x-full"
                        }`}
                    >
                        {drawerApp && (
                            <>
                                {/* Drawer header */}
                                <div className="border-b border-zinc-100 p-6 shrink-0">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold shrink-0">
                                                {initials(drawerApp.fullName)}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-zinc-900">
                                                    {drawerApp.fullName}
                                                    {drawerApp.pronouns && (
                                                        <span className="text-sm font-normal text-zinc-400 ml-2">
                                                            ({drawerApp.pronouns})
                                                        </span>
                                                    )}
                                                </h2>
                                                <p className="text-sm text-zinc-500">
                                                    {drawerApp.program} · {drawerApp.yearOfStudy}
                                                </p>
                                                <p className="text-xs text-zinc-400 mt-0.5">
                                                    Applied {formatDate(drawerApp.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={closeDrawer}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition text-xl"
                                            aria-label="Close"
                                        >
                                            ×
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-zinc-400 mb-1.5 block">
                                                Status
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {STATUS_OPTIONS.map((s) => {
                                                    const active =
                                                        statusKey(drawerApp.status) ===
                                                        (s.value ?? "pending");
                                                    return (
                                                        <button
                                                            key={s.value ?? "pending"}
                                                            disabled={updating}
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    drawerApp.id,
                                                                    s.value
                                                                )
                                                            }
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition disabled:opacity-50 ${
                                                                active
                                                                    ? STATUS_COLORS[
                                                                          s.value ?? "pending"
                                                                      ]
                                                                    : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                                                            }`}
                                                        >
                                                            {s.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-zinc-400 mb-1.5 block">
                                                Internal notes (only visible to admins)
                                            </label>
                                            <textarea
                                                value={adminNotesDraft}
                                                onChange={(e) =>
                                                    setAdminNotesDraft(e.target.value)
                                                }
                                                onBlur={() =>
                                                    handleAdminNotesBlur(drawerApp.id)
                                                }
                                                rows={2}
                                                placeholder="Add internal notes…"
                                                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Drawer body */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                    {/* Contact */}
                                    <section>
                                        <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                                            Contact
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <p>
                                                <span className="text-zinc-400">Email: </span>
                                                <a
                                                    href={`mailto:${drawerApp.email}`}
                                                    className="text-indigo-600 hover:underline"
                                                >
                                                    {drawerApp.email}
                                                </a>
                                            </p>
                                            <p>
                                                <span className="text-zinc-400">Social: </span>
                                                <a
                                                    href={socialUrl(drawerApp.socialHandle)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-indigo-600 hover:underline"
                                                >
                                                    {drawerApp.socialHandle}
                                                </a>
                                            </p>
                                        </div>
                                    </section>

                                    {/* Role */}
                                    <section>
                                        <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                                            Role applied for
                                        </h3>
                                        <span
                                            className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${
                                                ROLE_COLORS[drawerApp.role]
                                            }`}
                                        >
                                            {ROLE_LABELS[drawerApp.role] ?? drawerApp.role}
                                        </span>
                                    </section>

                                    {/* Dating preferences */}
                                    <section>
                                        <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                                            Dating preferences
                                        </h3>
                                        <div className="space-y-2 text-sm text-zinc-700">
                                            <p>
                                                <span className="text-zinc-400">
                                                    Gender(s) open to:{" "}
                                                </span>
                                                {drawerApp.datingGenders
                                                    .map((g) => GENDER_LABELS[g] ?? g)
                                                    .join(", ")}
                                            </p>
                                            <p>
                                                <span className="text-zinc-400">Age range: </span>
                                                {drawerApp.ageRangeMin}–{drawerApp.ageRangeMax}
                                            </p>
                                            <p>
                                                <span className="text-zinc-400">
                                                    Looking for:{" "}
                                                </span>
                                                {LOOKING_FOR_LABELS[drawerApp.lookingFor] ??
                                                    drawerApp.lookingFor}
                                            </p>
                                        </div>
                                    </section>

                                    {/* Personality */}
                                    <section>
                                        <h3 className="text-sm font-semibold text-zinc-900 mb-1">
                                            Personality and content answers
                                        </h3>
                                        <p className="text-xs text-zinc-400 mb-3">
                                            May be used in promotional content.
                                        </p>
                                        <AnswerBlock
                                            question="3 words to describe themselves"
                                            answer={drawerApp.threeWords}
                                        />
                                        <AnswerBlock
                                            question="Something people don't expect"
                                            answer={drawerApp.unexpected}
                                        />
                                        <AnswerBlock
                                            question="What they bring to a relationship"
                                            answer={drawerApp.bringToRelationship}
                                        />
                                        <AnswerBlock
                                            question="Dealbreaker (pop the balloon answer)"
                                            answer={drawerApp.dealbreaker}
                                        />
                                        <AnswerBlock
                                            question="Question they'd ask a date"
                                            answer={drawerApp.questionToAsk}
                                        />
                                        <AnswerBlock
                                            question="Most controversial dating opinion"
                                            answer={drawerApp.controversialOpinion}
                                        />
                                        <AnswerBlock
                                            question="How they'd handle being popped immediately"
                                            answer={drawerApp.balloonPoppedFeeling}
                                        />
                                    </section>

                                    {/* Conflict of interest */}
                                    <section>
                                        <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                                            Conflict of interest
                                        </h3>
                                        <div className="space-y-2 text-sm text-zinc-700">
                                            <p>
                                                <span className="text-zinc-400">
                                                    Currently in a relationship:{" "}
                                                </span>
                                                {drawerApp.inRelationship ? "Yes" : "No"}
                                                {drawerApp.inRelationship &&
                                                    drawerApp.partnerKnows && (
                                                        <span>
                                                            {" "}
                                                            (Partner knows:{" "}
                                                            {drawerApp.partnerKnows === "yes"
                                                                ? "Yes"
                                                                : "No"}
                                                            )
                                                        </span>
                                                    )}
                                            </p>
                                            <p>
                                                <span className="text-zinc-400">
                                                    Previous history with other applicants:{" "}
                                                </span>
                                                {drawerApp.previousHistory === "not_sure"
                                                    ? "Not sure"
                                                    : drawerApp.previousHistory === "yes"
                                                      ? "Yes"
                                                      : "No"}
                                            </p>
                                            {drawerApp.uncomfortableWith && (
                                                <p>
                                                    <span className="text-zinc-400">
                                                        Uncomfortable with:{" "}
                                                    </span>
                                                    {drawerApp.uncomfortableWith}
                                                </p>
                                            )}
                                        </div>
                                    </section>

                                    {/* Availability */}
                                    <section>
                                        <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                                            Availability
                                        </h3>
                                        <div className="space-y-3 text-sm text-zinc-700">
                                            <div>
                                                <p className="text-zinc-400 text-xs mb-1.5">
                                                    Available windows
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {drawerApp.availability.map((v) => (
                                                        <span
                                                            key={v}
                                                            className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600"
                                                        >
                                                            {AVAILABILITY_FULL[v] ?? v}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            {drawerApp.cannotAttendDates && (
                                                <p>
                                                    <span className="text-zinc-400">
                                                        Cannot attend:{" "}
                                                    </span>
                                                    {drawerApp.cannotAttendDates}
                                                </p>
                                            )}
                                            <p>
                                                <span className="text-zinc-400">
                                                    Pre-show briefing:{" "}
                                                </span>
                                                {drawerApp.preShowBriefing.charAt(0).toUpperCase() +
                                                    drawerApp.preShowBriefing.slice(1)}
                                            </p>
                                            {drawerApp.anythingElse && (
                                                <p>
                                                    <span className="text-zinc-400">
                                                        Anything else:{" "}
                                                    </span>
                                                    {drawerApp.anythingElse}
                                                </p>
                                            )}
                                        </div>
                                    </section>

                                    {/* Consent */}
                                    <section>
                                        <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                                            Consent
                                        </h3>
                                        <ul className="space-y-2 text-sm">
                                            {[
                                                {
                                                    ok: drawerApp.consentRecorded,
                                                    label: "Understands balloon pop explanation may be recorded",
                                                },
                                                {
                                                    ok: drawerApp.consentNoDiscrimination,
                                                    label: "Agrees not to make discriminatory remarks",
                                                },
                                                {
                                                    ok: drawerApp.consentPhotography,
                                                    label: "Consents to photography and filming",
                                                },
                                                {
                                                    ok: drawerApp.consentLiveFormat,
                                                    label: "Understands live entertainment format outcomes",
                                                },
                                                {
                                                    ok: drawerApp.consentVoluntary,
                                                    label: "Participating voluntarily",
                                                },
                                            ].map((item) => (
                                                <li
                                                    key={item.label}
                                                    className="flex items-start gap-2 text-zinc-600"
                                                >
                                                    <span className="text-green-600 shrink-0">
                                                        ✓
                                                    </span>
                                                    {item.label}
                                                </li>
                                            ))}
                                            <li className="flex items-start gap-2 text-zinc-600 pt-2 border-t border-zinc-100">
                                                <span
                                                    className={
                                                        drawerApp.waitlistOptIn
                                                            ? "text-green-600"
                                                            : "text-zinc-300"
                                                    }
                                                >
                                                    {drawerApp.waitlistOptIn ? "✓" : "✗"}
                                                </span>
                                                Digital platform waitlist opt-in
                                            </li>
                                        </ul>
                                    </section>
                                </div>

                                {/* Drawer footer */}
                                <div className="border-t border-zinc-100 p-4 shrink-0 flex flex-wrap items-center gap-3">
                                    <button
                                        disabled={drawerIndex <= 0}
                                        onClick={() => navigateDrawer(-1)}
                                        className="text-sm px-3 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition"
                                    >
                                        ← Previous
                                    </button>
                                    <button
                                        disabled={drawerIndex >= filtered.length - 1}
                                        onClick={() => navigateDrawer(1)}
                                        className="text-sm px-3 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition"
                                    >
                                        Next →
                                    </button>
                                    <button
                                        onClick={() => copyEmail(drawerApp.email)}
                                        className="text-sm px-3 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition ml-auto"
                                    >
                                        {copyFeedback || "Copy email"}
                                    </button>
                                    {/* TODO: export single profile */}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
