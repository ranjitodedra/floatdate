"use client";

interface ChatBubbleProps {
    content: string;
    side: "left" | "right";
}

export default function ChatBubble({ content, side }: ChatBubbleProps) {
    if (!content) return null;

    // Truncate long messages for the bubble display
    const displayContent = content.length > 80 ? content.slice(0, 77) + "..." : content;

    return (
        <div
            style={{
                maxWidth: "200px",
                padding: "8px 12px",
                borderRadius: side === "right" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                fontSize: "13px",
                lineHeight: "1.4",
                fontWeight: 500,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                backdropFilter: "blur(4px)",
                // Un-mirror the text if the parent container is mirrored
                transform: side === "right" ? "scaleX(-1)" : "none",
                ...(side === "right"
                    ? {
                        background: "linear-gradient(135deg, #6366f1, #818cf8)",
                        color: "#ffffff",
                        border: "1px solid rgba(129, 140, 248, 0.5)",
                    }
                    : {
                        background: "rgba(255, 255, 255, 0.95)",
                        color: "#27272a",
                        border: "1px solid rgba(0, 0, 0, 0.1)",
                    }),
            }}
        >
            <p style={{ margin: 0, wordBreak: "break-word" }}>{displayContent}</p>
        </div>
    );
}
