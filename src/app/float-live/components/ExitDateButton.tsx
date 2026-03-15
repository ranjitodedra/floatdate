"use client";

import { useRouter } from "next/navigation";

interface ExitDateButtonProps {
    chatRoomId?: string;
    sessionId?: string;
}

export default function ExitDateButton({ chatRoomId, sessionId }: ExitDateButtonProps) {
    const router = useRouter();

    async function handleExit() {
        try {
            if (chatRoomId) {
                await fetch(`/api/float-live/chat/${chatRoomId}/exit`, {
                    method: "POST",
                });
            }
            if (sessionId) {
                await fetch("/api/float-live/leave", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId }),
                });
            }
        } catch (err) {
            console.error("Exit error:", err);
        }
        router.push("/dashboard");
    }

    return (
        <button
            onClick={handleExit}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition font-medium"
        >
            Exit Date →
        </button>
    );
}
