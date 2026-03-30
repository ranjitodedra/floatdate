"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface University {
    id: string;
    name: string;
    slug: string;
}

interface AdminUser {
    id: string;
    name: string;
    email: string;
    city: string;
    gender: string;
    genderPref: string;
    completedSetup: boolean;
    createdAt: string;
    universityId: string;
    universityName: string;
}

export default function AdminUsersPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);
    const [universityId, setUniversityId] = useState<string>("");
    const [error, setError] = useState("");

    const fetchUniversities = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/universities");
            if (!res.ok) return;
            const data = await res.json();
            setUniversities(data.universities ?? []);
        } catch {
            // ignore
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const qs =
                universityId.length > 0
                    ? `?universityId=${encodeURIComponent(universityId)}`
                    : "";
            const res = await fetch(`/api/admin/users${qs}`);
            if (res.status === 401) {
                setAuthorized(false);
                setLoading(false);
                return;
            }
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setAuthorized(true);
            setUsers(data.users ?? []);
        } catch (err) {
            console.error(err);
            setError("Failed to load users.");
        } finally {
            setLoading(false);
        }
    }, [universityId]);

    useEffect(() => {
        fetchUniversities();
    }, [fetchUniversities]);

    useEffect(() => {
        setLoading(true);
        fetchUsers();
    }, [fetchUsers]);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString("en-US", {
            timeZone: "America/Toronto",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    if (loading && !authorized && users.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
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

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">All Users</h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            Full userbase — filter by university or view everyone
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-sm text-zinc-500">University</label>
                        <select
                            value={universityId}
                            onChange={(e) => setUniversityId(e.target.value)}
                            className="border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 min-w-[200px]"
                        >
                            <option value="">All universities</option>
                            {universities.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => router.push("/admin")}
                            className="text-sm text-zinc-400 hover:text-zinc-700 transition"
                        >
                            ← Admin Panel
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-zinc-900">Users</h2>
                        <span className="bg-zinc-100 text-zinc-700 text-sm font-medium px-3 py-1 rounded-full">
                            {users.length} user{users.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {users.length === 0 ? (
                        <p className="text-zinc-400 text-sm text-center py-8">
                            No users match this filter.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-100">
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">#</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Name</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Email</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">University</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">City</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Gender</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Pref</th>
                                        <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Setup</th>
                                        <th className="text-left py-2 text-zinc-400 font-medium">Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u, i) => (
                                        <tr
                                            key={u.id}
                                            className="border-b border-zinc-50 hover:bg-zinc-50 transition"
                                        >
                                            <td className="py-2.5 pr-4 text-zinc-400">{i + 1}</td>
                                            <td className="py-2.5 pr-4 text-zinc-900 font-medium">{u.name}</td>
                                            <td className="py-2.5 pr-4 text-zinc-500">{u.email}</td>
                                            <td className="py-2.5 pr-4 text-zinc-600">{u.universityName}</td>
                                            <td className="py-2.5 pr-4 text-zinc-500">{u.city}</td>
                                            <td className="py-2.5 pr-4 text-zinc-500 capitalize">{u.gender}</td>
                                            <td className="py-2.5 pr-4 text-zinc-500 capitalize">{u.genderPref}</td>
                                            <td className="py-2.5 pr-4">
                                                {u.completedSetup ? (
                                                    <span className="text-green-600">✓</span>
                                                ) : (
                                                    <span className="text-red-400">✗</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 text-zinc-400 text-xs">
                                                {formatDate(u.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
