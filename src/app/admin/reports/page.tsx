"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Report {
    id: string;
    reporterId: string;
    reportedId: string;
    reason: string;
    details: string | null;
    status: string;
    adminNotes: string | null;
    createdAt: string;
    reviewedAt: string | null;
    reporter: { email: string; name: string };
    reported: { email: string; name: string };
    chatRoom: {
        id: string;
        intention: string;
        startedAt: string;
        endedAt: string | null;
    };
}

interface ReportDetail extends Report {
    chatRoom: {
        id: string;
        intention: string;
        startedAt: string;
        endedAt: string | null;
        messages: {
            id: string;
            senderId: string;
            content: string;
            createdAt: string;
        }[];
    };
}

export default function AdminReportsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<Report[]>([]);
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [adminNotes, setAdminNotes] = useState("");
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchReports();
    }, [filterStatus]);

    async function fetchReports() {
        setLoading(true);
        try {
            const query = filterStatus === "all" ? "" : `?status=${filterStatus}`;
            const res = await fetch(`/api/admin/float-live/reports${query}`);
            if (res.ok) {
                const data = await res.json();
                setReports(data.reports);
            }
        } catch (err) {
            console.error("Fetch reports error:", err);
        } finally {
            setLoading(false);
        }
    }

    async function viewReport(id: string) {
        setDetailLoading(true);
        try {
            const res = await fetch(`/api/admin/float-live/reports/${id}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedReport(data.report);
                setAdminNotes(data.report.adminNotes || "");
            }
        } catch (err) {
            console.error("View report error:", err);
        } finally {
            setDetailLoading(false);
        }
    }

    async function updateReport(id: string, newStatus: string) {
        setUpdating(true);
        try {
            const res = await fetch(`/api/admin/float-live/reports/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, adminNotes }),
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedReport((prev) =>
                    prev ? { ...prev, status: data.report.status, adminNotes: data.report.adminNotes } : null
                );
                fetchReports();
            }
        } catch (err) {
            console.error("Update report error:", err);
        } finally {
            setUpdating(false);
        }
    }

    const statusColors: Record<string, string> = {
        pending: "bg-amber-100 text-amber-800",
        reviewed: "bg-blue-100 text-blue-800",
        action_taken: "bg-red-100 text-red-800",
        dismissed: "bg-zinc-100 text-zinc-600",
    };

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">Float Live — Abuse Reports</h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            Review, dismiss, or take action on reported conversations
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/admin")}
                        className="text-sm text-zinc-400 hover:text-zinc-700 transition"
                    >
                        ← Admin Home
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    {["all", "pending", "reviewed", "action_taken", "dismissed"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterStatus === s
                                ? "bg-zinc-900 text-white"
                                : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
                                }`}
                        >
                            {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </button>
                    ))}
                </div>

                {/* Reports list */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : reports.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400">No reports found</div>
                ) : (
                    <div className="space-y-3">
                        {reports.map((report) => (
                            <div
                                key={report.id}
                                className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[report.status] || statusColors.pending}`}>
                                                {report.status.replace("_", " ")}
                                            </span>
                                            <span className="text-xs text-zinc-400">
                                                {report.reason}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-700">
                                            <span className="font-medium">{report.reporter.email}</span>
                                            {" → reported "}
                                            <span className="font-medium">{report.reported.email}</span>
                                        </p>
                                        <p className="text-xs text-zinc-400">
                                            {new Date(report.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => viewReport(report.id)}
                                        className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-medium hover:bg-zinc-200 transition"
                                    >
                                        Review
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Detail modal */}
                {(selectedReport || detailLoading) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5">
                            {detailLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : selectedReport ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-zinc-900">Report Detail</h3>
                                        <button
                                            onClick={() => setSelectedReport(null)}
                                            className="text-zinc-400 hover:text-zinc-700 transition text-lg"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Report info */}
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-zinc-400">Reporter:</span>
                                            <p className="font-medium text-zinc-700">{selectedReport.reporter.email}</p>
                                        </div>
                                        <div>
                                            <span className="text-zinc-400">Reported:</span>
                                            <p className="font-medium text-zinc-700">{selectedReport.reported.email}</p>
                                        </div>
                                        <div>
                                            <span className="text-zinc-400">Reason:</span>
                                            <p className="font-medium text-zinc-700 capitalize">{selectedReport.reason}</p>
                                        </div>
                                        <div>
                                            <span className="text-zinc-400">Status:</span>
                                            <p className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[selectedReport.status]}`}>
                                                {selectedReport.status.replace("_", " ")}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedReport.details && (
                                        <div className="bg-zinc-50 rounded-xl p-3">
                                            <p className="text-xs text-zinc-400 mb-1">Details:</p>
                                            <p className="text-sm text-zinc-700">{selectedReport.details}</p>
                                        </div>
                                    )}

                                    {/* Chat transcript */}
                                    <div>
                                        <h4 className="font-semibold text-zinc-900 mb-3">Full Chat Transcript</h4>
                                        <div className="bg-zinc-50 rounded-xl p-4 space-y-2 max-h-[300px] overflow-y-auto">
                                            {selectedReport.chatRoom.messages.length === 0 ? (
                                                <p className="text-zinc-400 text-sm text-center">No messages</p>
                                            ) : (
                                                selectedReport.chatRoom.messages.map((msg) => {
                                                    const isReporter = msg.senderId === selectedReport.reporterId;
                                                    return (
                                                        <div key={msg.id} className="flex items-start gap-2">
                                                            <span className={`text-xs font-bold mt-0.5 ${isReporter ? "text-blue-500" : "text-red-500"}`}>
                                                                {isReporter ? "Reporter" : "Reported"}:
                                                            </span>
                                                            <div className="flex-1">
                                                                <p className="text-sm text-zinc-700">{msg.content}</p>
                                                                <p className="text-xs text-zinc-400">
                                                                    {new Date(msg.createdAt).toLocaleTimeString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Admin actions */}
                                    <div className="border-t border-zinc-200 pt-4 space-y-3">
                                        <h4 className="font-semibold text-zinc-900">Admin Actions</h4>
                                        <textarea
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            placeholder="Admin notes..."
                                            rows={2}
                                            className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateReport(selectedReport.id, "dismissed")}
                                                disabled={updating}
                                                className="flex-1 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-50"
                                            >
                                                Dismiss
                                            </button>
                                            <button
                                                onClick={() => updateReport(selectedReport.id, "reviewed")}
                                                disabled={updating}
                                                className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-200 transition disabled:opacity-50"
                                            >
                                                Mark Reviewed
                                            </button>
                                            <button
                                                onClick={() => updateReport(selectedReport.id, "action_taken")}
                                                disabled={updating}
                                                className="flex-1 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200 transition disabled:opacity-50"
                                            >
                                                Action Taken
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
