"use client";

import { useState, useRef, useEffect } from "react";

interface TypingBarProps {
    onSend: (content: string) => void;
    disabled?: boolean;
    voiceTrigger?: React.ReactNode;
}

export default function TypingBar({ onSend, disabled = false, voiceTrigger }: TypingBarProps) {
    const [text, setText] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!disabled && inputRef.current) {
            inputRef.current.focus();
        }
    }, [disabled]);

    function handleSend() {
        const trimmed = text.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setText("");
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setText(e.target.value.slice(0, 500));
        // Auto-resize
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + "px";
        }
    }

    return (
        <div className="flex items-center gap-2 bg-surface-elevated border-t border-mahogany px-3 py-3">
            <textarea
                ref={inputRef}
                value={text}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={disabled ? "Chat ended" : "Type a message..."}
                disabled={disabled}
                rows={1}
                className="flex-1 resize-none border border-mahogany bg-zinc-700 rounded-xl px-4 py-2.5 text-sm text-cream placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-surface-elevated disabled:text-muted"
                style={{ maxHeight: "100px" }}
            />
            <div className="flex items-center gap-2 flex-shrink-0">
                {voiceTrigger}
                <span className="text-xs text-muted select-none tabular-nums">
                    {text.length}/500
                </span>
                <button
                    onClick={handleSend}
                    disabled={disabled || text.trim().length === 0}
                    className="px-4 py-2.5 bg-indigo-500 text-cream rounded-xl font-semibold text-sm hover:bg-indigo-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Send ➤
                </button>
            </div>
        </div>
    );
}
