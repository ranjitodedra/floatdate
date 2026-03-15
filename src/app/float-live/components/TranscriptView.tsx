"use client";

interface Message {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
}

interface TranscriptViewProps {
    messages: Message[];
    userId: string;
    onClose: () => void;
}

export default function TranscriptView({ messages, userId, onClose }: TranscriptViewProps) {
    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
                <h2 className="font-semibold text-zinc-900">Chat Transcript</h2>
                <button
                    onClick={onClose}
                    className="text-sm text-indigo-500 hover:text-indigo-700 font-medium transition"
                >
                    ← Back to Scene
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                    <p className="text-center text-zinc-400 py-12">No messages yet</p>
                )}
                {messages.map((msg) => {
                    const isMe = msg.senderId === userId;
                    const time = new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    });
                    return (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                            <div
                                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe
                                        ? "bg-indigo-500 text-white rounded-br-sm"
                                        : "bg-zinc-100 text-zinc-800 rounded-bl-sm"
                                    }`}
                            >
                                {msg.content}
                            </div>
                            <span className="text-xs text-zinc-400 mt-1 px-1">{time}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
