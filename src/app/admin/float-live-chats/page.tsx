"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Participant {
    userId: string;
    name: string;
    email: string;
    character: string;
}

interface ChatMessage {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
}

interface ChatRoom {
    id: string;
    intention: string;
    startedAt: string;
    endedAt: string | null;
    participantA: Participant;
    participantB: Participant;
    messages: ChatMessage[];
    voiceTranscripts: ChatMessage[];
    hasReports: boolean;
    reportCount: number;
}

interface SessionGroup {
    sessionId: string;
    date: string;
    chatRooms: ChatRoom[];
}

export default function FloatLiveChatsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<SessionGroup[]>([]);
    const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // sessionId
    const [deleteRoomConfirm, setDeleteRoomConfirm] = useState<string | null>(null); // chatRoomId
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        fetchChats();
    }, []);

    async function fetchChats() {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/admin/float-live/chats");
            if (res.status === 401) {
                router.push("/admin");
                return;
            }
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setSessions(data.sessions);
        } catch (err) {
            console.error("Fetch chats error:", err);
            setError("Failed to load chats.");
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteDay(sessionId: string) {
        setDeleting(true);
        setError("");
        try {
            const res = await fetch("/api/admin/float-live/chats", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Delete failed");
            }
            setSuccessMsg("All chats for this day have been deleted.");
            setTimeout(() => setSuccessMsg(""), 3000);
            setDeleteConfirm(null);
            await fetchChats();
        } catch (err) {
            console.error("Delete day error:", err);
            setError(err instanceof Error ? err.message : "Failed to delete chats.");
        } finally {
            setDeleting(false);
        }
    }

    async function handleDeleteRoom(chatRoomId: string) {
        setDeleting(true);
        setError("");
        try {
            const res = await fetch(`/api/admin/float-live/chats/${chatRoomId}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Delete failed");
            }
            setSuccessMsg("Conversation deleted.");
            setTimeout(() => setSuccessMsg(""), 3000);
            setDeleteRoomConfirm(null);
            await fetchChats();
        } catch (err) {
            console.error("Delete room error:", err);
            setError(err instanceof Error ? err.message : "Failed to delete conversation.");
        } finally {
            setDeleting(false);
        }
    }

    function toggleRoom(roomId: string) {
        setExpandedRooms((prev) => {
            const next = new Set(prev);
            if (next.has(roomId)) {
                next.delete(roomId);
            } else {
                next.add(roomId);
            }
            return next;
        });
    }

    function formatDate(iso: string) {
        return new Date(iso).toLocaleDateString("en-US", {
            timeZone: "UTC",
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    function formatTime(iso: string) {
        return new Date(iso).toLocaleTimeString("en-US", {
            timeZone: "America/Toronto",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    }

    // Collect all reported chat rooms across sessions
    const reportedRooms: (ChatRoom & { sessionDate: string })[] = [];
    sessions.forEach((session) => {
        session.chatRooms.forEach((room) => {
            if (room.hasReports) {
                reportedRooms.push({ ...room, sessionDate: session.date });
            }
        });
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900">Float Live: Chats</h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            View all conversations &amp; manage reported chats
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push("/admin/reports")}
                            className="text-sm text-zinc-400 hover:text-zinc-700 transition"
                        >
                            Abuse Reports
                        </button>
                        <button
                            onClick={() => router.push("/admin")}
                            className="text-sm text-zinc-400 hover:text-zinc-700 transition"
                        >
                            ← Admin Home
                        </button>
                    </div>
                </div>

                {/* Success / Error messages */}
                {successMsg && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm font-medium">
                        ✓ {successMsg}
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* ═══════════════════════════════════════════ */}
                {/* SECTION 1: ALL CONVERSATIONS BY DATE       */}
                {/* ═══════════════════════════════════════════ */}
                <div>
                    <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <span className="text-xl">💬</span> All Conversations
                    </h2>

                    {sessions.length === 0 ? (
                        <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm text-center">
                            <p className="text-zinc-300 text-4xl mb-3">💬</p>
                            <p className="text-zinc-500 text-sm">No Float Live conversations yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {sessions.map((session) => (
                                <div
                                    key={session.sessionId}
                                    className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden"
                                >
                                    {/* Date header */}
                                    <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-200">
                                        <div>
                                            <h3 className="font-semibold text-zinc-900">
                                                {formatDate(session.date)}
                                            </h3>
                                            <p className="text-xs text-zinc-400 mt-0.5">
                                                {session.chatRooms.length} conversation{session.chatRooms.length !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                        {deleteConfirm === session.sessionId ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-red-600 font-medium">Delete all chats?</span>
                                                <button
                                                    onClick={() => handleDeleteDay(session.sessionId)}
                                                    disabled={deleting}
                                                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                                                >
                                                    {deleting ? "Deleting..." : "Yes, Delete"}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="px-3 py-1.5 bg-zinc-200 text-zinc-600 text-xs font-medium rounded-lg hover:bg-zinc-300 transition"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(session.sessionId)}
                                                className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition flex items-center gap-1.5"
                                            >
                                                🗑 Delete All Chats
                                            </button>
                                        )}
                                    </div>

                                    {/* Chat rooms list */}
                                    <div className="divide-y divide-zinc-100">
                                        {session.chatRooms.map((room) => (
                                            <div key={room.id}>
                                                {/* Room header - clickable */}
                                                <button
                                                    onClick={() => toggleRoom(room.id)}
                                                    className="w-full px-6 py-3 flex items-center justify-between hover:bg-zinc-50 transition text-left"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="flex -space-x-2 flex-shrink-0">
                                                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
                                                                {room.participantA.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
                                                                {room.participantB.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-zinc-900 truncate">
                                                                {room.participantA.name}{" "}
                                                                <span className="text-zinc-400 font-normal">&amp;</span>{" "}
                                                                {room.participantB.name}
                                                            </p>
                                                            <p className="text-xs text-zinc-400 truncate">
                                                                {room.participantA.email} • {room.participantB.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                        {room.hasReports && (
                                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                                                ⚠ {room.reportCount} report{room.reportCount !== 1 ? "s" : ""}
                                                            </span>
                                                        )}
                                                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs font-medium rounded-full">
                                                            {room.messages.length} msg{room.messages.length !== 1 ? "s" : ""}
                                                        </span>
                                                        {room.voiceTranscripts?.length > 0 && (
                                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                                                🎙️ {room.voiceTranscripts.length}
                                                            </span>
                                                        )}
                                                        <span className="capitalize text-xs text-zinc-400">
                                                            {room.intention.replace("_", " ")}
                                                        </span>
                                                        <span className="text-zinc-300 text-sm">
                                                            {expandedRooms.has(room.id) ? "▲" : "▼"}
                                                        </span>
                                                    </div>
                                                </button>

                                                {/* Expanded chat view */}
                                                {expandedRooms.has(room.id) && (
                                                    <div className="px-6 pb-4">
                                                        {/* Participant labels */}
                                                        <div className="flex items-center justify-between mb-3 px-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                                <span className="text-xs font-semibold text-blue-700">
                                                                    {room.participantA.name}
                                                                </span>
                                                                <span className="text-xs text-zinc-400">
                                                                    ({room.participantA.email})
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-zinc-400">
                                                                    ({room.participantB.email})
                                                                </span>
                                                                <span className="text-xs font-semibold text-emerald-700">
                                                                    {room.participantB.name}
                                                                </span>
                                                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                                            </div>
                                                        </div>

                                                        {/* Chat messages (WhatsApp-style) */}
                                                        <div className="bg-zinc-50 rounded-xl p-4 space-y-2 max-h-[400px] overflow-y-auto">
                                                            {room.messages.length === 0 ? (
                                                                <p className="text-zinc-400 text-sm text-center py-4">
                                                                    No messages in this conversation
                                                                </p>
                                                            ) : (
                                                                room.messages.map((msg) => {
                                                                    const isA = msg.senderId === room.participantA.userId;
                                                                    return (
                                                                        <div
                                                                            key={msg.id}
                                                                            className={`flex ${isA ? "justify-start" : "justify-end"}`}
                                                                        >
                                                                            <div
                                                                                className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
                                                                                    isA
                                                                                        ? "bg-blue-100 text-blue-900 rounded-bl-md"
                                                                                        : "bg-emerald-100 text-emerald-900 rounded-br-md"
                                                                                }`}
                                                                            >
                                                                                <p className={`text-xs font-bold mb-0.5 ${isA ? "text-blue-600" : "text-emerald-600"}`}>
                                                                                    {isA ? room.participantA.name : room.participantB.name}
                                                                                </p>
                                                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                                                                <p className={`text-xs mt-1 ${isA ? "text-blue-400" : "text-emerald-400"}`}>
                                                                                    {formatTime(msg.createdAt)}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>

                                                        {/* Voice Transcripts (if any) */}
                                                        {room.voiceTranscripts?.length > 0 && (
                                                            <div className="bg-purple-50 rounded-xl p-4 mt-4 space-y-2 max-h-[300px] overflow-y-auto border border-purple-100">
                                                                <h4 className="text-xs font-bold text-purple-800 mb-3 flex items-center gap-1">
                                                                    🎙️ Voice Transcript
                                                                </h4>
                                                                {room.voiceTranscripts.map((msg) => {
                                                                    const isA = msg.senderId === room.participantA.userId;
                                                                    return (
                                                                        <div
                                                                            key={msg.id}
                                                                            className={`flex ${isA ? "justify-start" : "justify-end"}`}
                                                                        >
                                                                            <div
                                                                                className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                                                                                    isA
                                                                                        ? "bg-purple-100 text-purple-900 rounded-bl-md"
                                                                                        : "bg-fuchsia-100 text-fuchsia-900 rounded-br-md"
                                                                                }`}
                                                                            >
                                                                                <p className={`text-xs font-bold mb-0.5 ${isA ? "text-purple-600" : "text-fuchsia-600"}`}>
                                                                                    {isA ? room.participantA.name : room.participantB.name}
                                                                                </p>
                                                                                <p className="text-sm italic leading-relaxed">"{msg.content}"</p>
                                                                                <p className={`text-xs mt-1 ${isA ? "text-purple-400" : "text-fuchsia-400"}`}>
                                                                                    {formatTime(msg.createdAt)}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        {/* Chat metadata */}
                                                        <div className="flex items-center gap-4 mt-4 px-2 border-t border-zinc-100 pt-3">
                                                            <span className="text-xs text-zinc-400">
                                                                Started: {formatTime(room.startedAt)}
                                                            </span>
                                                            {room.endedAt && (
                                                                <span className="text-xs text-zinc-400">
                                                                    Ended: {formatTime(room.endedAt)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════ */}
                {/* SECTION 2: REPORTED CHATS                  */}
                {/* ═══════════════════════════════════════════ */}
                <div className="border-t-2 border-zinc-200 pt-6">
                    <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <span className="text-xl">🚨</span> Reported Chats
                        {reportedRooms.length > 0 && (
                            <span className="ml-2 px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                {reportedRooms.length}
                            </span>
                        )}
                    </h2>

                    {reportedRooms.length === 0 ? (
                        <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm text-center">
                            <p className="text-zinc-300 text-4xl mb-3">✅</p>
                            <p className="text-zinc-500 text-sm">No reported conversations. All clear!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reportedRooms.map((room) => {
                                const isExpanded = expandedRooms.has(`reported-${room.id}`);
                                return (
                                    <div
                                        key={room.id}
                                        className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden"
                                    >
                                        {/* Report header */}
                                        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg">
                                                        ⚠ {room.reportCount} Report{room.reportCount !== 1 ? "s" : ""}
                                                    </span>
                                                    <span className="text-xs text-zinc-500">
                                                        {formatDate(room.sessionDate)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {deleteRoomConfirm === room.id ? (
                                                        <>
                                                            <span className="text-xs text-red-600 font-medium">Are you sure?</span>
                                                            <button
                                                                onClick={() => handleDeleteRoom(room.id)}
                                                                disabled={deleting}
                                                                className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                                                            >
                                                                {deleting ? "..." : "Delete"}
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteRoomConfirm(null)}
                                                                className="px-3 py-1.5 bg-zinc-200 text-zinc-600 text-xs font-medium rounded-lg hover:bg-zinc-300 transition"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => setDeleteRoomConfirm(room.id)}
                                                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition"
                                                        >
                                                            🗑 Delete Conversation
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Participants + expand */}
                                        <button
                                            onClick={() => toggleRoom(`reported-${room.id}`)}
                                            className="w-full px-6 py-3 flex items-center justify-between hover:bg-zinc-50 transition text-left"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex -space-x-2 flex-shrink-0">
                                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
                                                        {room.participantA.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
                                                        {room.participantB.name.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-zinc-900 truncate">
                                                        {room.participantA.name}{" "}
                                                        <span className="text-zinc-400 font-normal">&amp;</span>{" "}
                                                        {room.participantB.name}
                                                    </p>
                                                    <p className="text-xs text-zinc-400 truncate">
                                                        {room.participantA.email} • {room.participantB.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs font-medium rounded-full">
                                                    {room.messages.length} msg{room.messages.length !== 1 ? "s" : ""}
                                                </span>
                                                {room.voiceTranscripts?.length > 0 && (
                                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                                        🎙️ {room.voiceTranscripts.length}
                                                    </span>
                                                )}
                                                <span className="text-zinc-300 text-sm">
                                                    {isExpanded ? "▲" : "▼"}
                                                </span>
                                            </div>
                                        </button>

                                        {/* Expanded reported chat view */}
                                        {isExpanded && (
                                            <div className="px-6 pb-4">
                                                {/* Participant legend */}
                                                <div className="flex items-center justify-between mb-3 px-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                        <span className="text-xs font-semibold text-blue-700">
                                                            {room.participantA.name}
                                                        </span>
                                                        <span className="text-xs text-zinc-400">
                                                            ({room.participantA.email})
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-zinc-400">
                                                            ({room.participantB.email})
                                                        </span>
                                                        <span className="text-xs font-semibold text-emerald-700">
                                                            {room.participantB.name}
                                                        </span>
                                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                                    </div>
                                                </div>

                                                {/* Chat messages */}
                                                <div className="bg-zinc-50 rounded-xl p-4 space-y-2 max-h-[400px] overflow-y-auto">
                                                    {room.messages.length === 0 ? (
                                                        <p className="text-zinc-400 text-sm text-center py-4">
                                                            No messages
                                                        </p>
                                                    ) : (
                                                        room.messages.map((msg) => {
                                                            const isA = msg.senderId === room.participantA.userId;
                                                            return (
                                                                <div
                                                                    key={msg.id}
                                                                    className={`flex ${isA ? "justify-start" : "justify-end"}`}
                                                                >
                                                                    <div
                                                                        className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
                                                                            isA
                                                                                ? "bg-blue-100 text-blue-900 rounded-bl-md"
                                                                                : "bg-emerald-100 text-emerald-900 rounded-br-md"
                                                                        }`}
                                                                    >
                                                                        <p className={`text-xs font-bold mb-0.5 ${isA ? "text-blue-600" : "text-emerald-600"}`}>
                                                                            {isA ? room.participantA.name : room.participantB.name}
                                                                        </p>
                                                                        <p className="text-sm leading-relaxed">{msg.content}</p>
                                                                        <p className={`text-xs mt-1 ${isA ? "text-blue-400" : "text-emerald-400"}`}>
                                                                            {formatTime(msg.createdAt)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {/* Voice Transcripts */}
                                                {room.voiceTranscripts?.length > 0 && (
                                                    <div className="bg-purple-50 rounded-xl p-4 mt-4 space-y-2 max-h-[300px] overflow-y-auto border border-purple-100">
                                                        <h4 className="text-xs font-bold text-purple-800 mb-3 flex items-center gap-1">
                                                            🎙️ Voice Transcript
                                                        </h4>
                                                        {room.voiceTranscripts.map((msg) => {
                                                            const isA = msg.senderId === room.participantA.userId;
                                                            return (
                                                                <div
                                                                    key={msg.id}
                                                                    className={`flex ${isA ? "justify-start" : "justify-end"}`}
                                                                >
                                                                    <div
                                                                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                                                                            isA
                                                                                ? "bg-purple-100 text-purple-900 rounded-bl-md"
                                                                                : "bg-fuchsia-100 text-fuchsia-900 rounded-br-md"
                                                                        }`}
                                                                    >
                                                                        <p className={`text-xs font-bold mb-0.5 ${isA ? "text-purple-600" : "text-fuchsia-600"}`}>
                                                                            {isA ? room.participantA.name : room.participantB.name}
                                                                        </p>
                                                                        <p className="text-sm italic leading-relaxed">"{msg.content}"</p>
                                                                        <p className={`text-xs mt-1 ${isA ? "text-purple-400" : "text-fuchsia-400"}`}>
                                                                            {formatTime(msg.createdAt)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
