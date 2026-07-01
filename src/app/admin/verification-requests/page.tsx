"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface VerificationRequest {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    verificationStatus: string;
    verificationNotes: string | null;
    documentUrl: string | null;
    university: { id: string; name: string };
    referredBy: { name: string; email: string; referralCode: string } | null;
}

interface UniversityRequest {
    id: string;
    requesterEmail: string;
    requesterName: string;
    universityName: string;
    status: string;
    adminNotes: string | null;
    createdAt: string;
    reviewedAt: string | null;
}

export default function AdminVerificationRequestsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [verificationRequests, setVerificationRequests] = useState<
        VerificationRequest[]
    >([]);
    const [universityRequests, setUniversityRequests] = useState<
        UniversityRequest[]
    >([]);
    const [selectedRequest, setSelectedRequest] =
        useState<VerificationRequest | null>(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState("");
    const [uniFilter, setUniFilter] = useState("pending");

    const fetchVerificationRequests = useCallback(async () => {
        try {
            const res = await fetch(
                `/api/admin/verification-requests?status=pending`
            );
            if (res.status === 401) {
                setAuthorized(false);
                return;
            }
            if (!res.ok) throw new Error("Failed to fetch");
            setAuthorized(true);
            const data = await res.json();
            setVerificationRequests(data.requests ?? []);
        } catch (err) {
            console.error(err);
            setError("Failed to load verification requests.");
        }
    }, []);

    const fetchUniversityRequests = useCallback(async () => {
        try {
            const qs =
                uniFilter === "all" ? "" : `?status=${encodeURIComponent(uniFilter)}`;
            const res = await fetch(`/api/admin/university-requests${qs}`);
            if (res.status === 401) {
                setAuthorized(false);
                return;
            }
            if (!res.ok) throw new Error("Failed to fetch");
            setAuthorized(true);
            const data = await res.json();
            setUniversityRequests(data.requests ?? []);
        } catch (err) {
            console.error(err);
            setError("Failed to load university requests.");
        }
    }, [uniFilter]);

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchVerificationRequests(), fetchUniversityRequests()]).finally(
            () => setLoading(false)
        );
    }, [fetchVerificationRequests, fetchUniversityRequests]);

    async function handleVerificationAction(
        userId: string,
        action: "approve" | "reject"
    ) {
        setUpdating(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/verification-requests/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, adminNotes }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to update request");
                return;
            }
            setSelectedRequest(null);
            setAdminNotes("");
            await fetchVerificationRequests();
        } catch {
            setError("Failed to update request.");
        } finally {
            setUpdating(false);
        }
    }

    async function handleUniversityRequestUpdate(
        id: string,
        status: "approved" | "rejected"
    ) {
        setUpdating(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/university-requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to update request");
                return;
            }
            await fetchUniversityRequests();
        } catch {
            setError("Failed to update university request.");
        } finally {
            setUpdating(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <p className="text-zinc-500">Loading...</p>
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
                <div className="bg-white border border-zinc-200 rounded-2xl p-8 max-w-md text-center shadow-sm">
                    <p className="text-zinc-900 font-semibold mb-2">Access Denied</p>
                    <p className="text-zinc-500 text-sm mb-4">
                        You don&apos;t have permission to view this page.
                    </p>
                    <button
                        onClick={() => router.push("/admin")}
                        className="text-sm text-zinc-700 underline hover:text-zinc-900"
                    >
                        Back to Admin
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => router.push("/admin")}
                            className="text-sm text-zinc-500 hover:text-zinc-700 mb-2"
                        >
                            ← Back to Admin
                        </button>
                        <h1 className="text-2xl font-bold text-zinc-900">
                            Verification Requests
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1">
                            Review Gmail document verifications and university
                            requests.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* Document verification requests */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-zinc-900">
                            Document Verifications
                        </h2>
                        <span className="bg-amber-100 text-amber-800 text-sm font-medium px-3 py-1 rounded-full">
                            {verificationRequests.length} pending
                        </span>
                    </div>

                    {verificationRequests.length === 0 ? (
                        <p className="text-zinc-500 text-sm">
                            No pending document verification requests.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-100">
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">
                                            Name
                                        </th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">
                                            Email
                                        </th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">
                                            University
                                        </th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">
                                            Referred by
                                        </th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">
                                            Submitted
                                        </th>
                                        <th className="text-left py-2 text-zinc-400 font-medium">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {verificationRequests.map((req) => (
                                        <tr
                                            key={req.id}
                                            className="border-b border-zinc-50 hover:bg-zinc-50"
                                        >
                                            <td className="py-3 pr-4 text-zinc-900">
                                                {req.name}
                                            </td>
                                            <td className="py-3 pr-4 text-zinc-600">
                                                {req.email}
                                            </td>
                                            <td className="py-3 pr-4 text-zinc-600">
                                                {req.university.name}
                                            </td>
                                            <td className="py-3 pr-4 text-zinc-600">
                                                {req.referredBy ? (
                                                    <span>
                                                        {req.referredBy.name}
                                                        <br />
                                                        <span className="text-zinc-500 text-xs">
                                                            {req.referredBy.email}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400">
                                                        Direct / no referrer
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 pr-4 text-zinc-500">
                                                {new Date(
                                                    req.createdAt
                                                ).toLocaleDateString()}
                                            </td>
                                            <td className="py-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(req);
                                                        setAdminNotes(
                                                            req.verificationNotes ||
                                                                ""
                                                        );
                                                    }}
                                                    className="text-sm text-zinc-700 underline hover:text-zinc-900"
                                                >
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* University requests */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <h2 className="text-lg font-semibold text-zinc-900">
                            University Requests
                        </h2>
                        <div className="flex gap-2">
                            {["pending", "approved", "rejected", "all"].map(
                                (status) => (
                                    <button
                                        key={status}
                                        onClick={() => setUniFilter(status)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                                            uniFilter === status
                                                ? "bg-zinc-900 text-white"
                                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                        }`}
                                    >
                                        {status}
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {universityRequests.length === 0 ? (
                        <p className="text-zinc-500 text-sm">
                            No university requests found.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-100">
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">
                                            Name
                                        </th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">
                                            Email
                                        </th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">
                                            University
                                        </th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">
                                            Status
                                        </th>
                                        <th className="text-left py-2 text-zinc-400 font-medium">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {universityRequests.map((req) => (
                                        <tr
                                            key={req.id}
                                            className="border-b border-zinc-50 hover:bg-zinc-50"
                                        >
                                            <td className="py-3 pr-4 text-zinc-900">
                                                {req.requesterName}
                                            </td>
                                            <td className="py-3 pr-4 text-zinc-600">
                                                {req.requesterEmail}
                                            </td>
                                            <td className="py-3 pr-4 text-zinc-600">
                                                {req.universityName}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                                        req.status === "pending"
                                                            ? "bg-amber-100 text-amber-800"
                                                            : req.status ===
                                                                "approved"
                                                              ? "bg-green-100 text-green-800"
                                                              : "bg-red-100 text-red-800"
                                                    }`}
                                                >
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                {req.status === "pending" && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            disabled={updating}
                                                            onClick={() =>
                                                                handleUniversityRequestUpdate(
                                                                    req.id,
                                                                    "approved"
                                                                )
                                                            }
                                                            className="text-xs px-2 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            disabled={updating}
                                                            onClick={() =>
                                                                handleUniversityRequestUpdate(
                                                                    req.id,
                                                                    "rejected"
                                                                )
                                                            }
                                                            className="text-xs px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Review modal for document verification */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-zinc-900">
                                Review Verification
                            </h2>
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="text-zinc-400 hover:text-zinc-700 text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="text-zinc-500">Name:</span>{" "}
                                {selectedRequest.name}
                            </p>
                            <p>
                                <span className="text-zinc-500">Email:</span>{" "}
                                {selectedRequest.email}
                            </p>
                            <p>
                                <span className="text-zinc-500">University:</span>{" "}
                                {selectedRequest.university.name}
                            </p>
                            <p>
                                <span className="text-zinc-500">Referred by:</span>{" "}
                                {selectedRequest.referredBy ? (
                                    <>
                                        {selectedRequest.referredBy.name} (
                                        {selectedRequest.referredBy.email})
                                    </>
                                ) : (
                                    "Direct / no referrer"
                                )}
                            </p>
                        </div>

                        {selectedRequest.documentUrl && (
                            <div>
                                <p className="text-sm font-medium text-zinc-700 mb-2">
                                    Uploaded Document
                                </p>
                                <a
                                    href={selectedRequest.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={selectedRequest.documentUrl}
                                        alt="Verification document"
                                        className="max-h-64 rounded-lg border border-zinc-200 object-contain w-full bg-zinc-50"
                                    />
                                </a>
                                <p className="text-xs text-zinc-400 mt-1">
                                    Link expires in 15 minutes.
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                                Admin notes (optional)
                            </label>
                            <textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                placeholder="Internal notes..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                disabled={updating}
                                onClick={() =>
                                    handleVerificationAction(
                                        selectedRequest.id,
                                        "approve"
                                    )
                                }
                                className="flex-1 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 disabled:opacity-50"
                            >
                                Approve
                            </button>
                            <button
                                disabled={updating}
                                onClick={() =>
                                    handleVerificationAction(
                                        selectedRequest.id,
                                        "reject"
                                    )
                                }
                                className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
