"use client";

interface ChatBubbleProps {
    content: string;
    side: "left" | "right";
}

export default function ChatBubble({ content, side }: ChatBubbleProps) {
    return (
        <div
            className={`max-w-[200px] px-3 py-2 rounded-xl text-sm leading-snug shadow-md ${side === "right"
                    ? "bg-indigo-500 text-white ml-auto rounded-br-sm"
                    : "bg-zinc-100 text-zinc-800 mr-auto rounded-bl-sm"
                }`}
            style={{ imageRendering: "auto" }}
        >
            {content}
        </div>
    );
}
