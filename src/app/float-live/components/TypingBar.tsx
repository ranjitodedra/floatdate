"use client";

import { useState, useRef, useEffect } from "react";

interface TypingBarProps {
    onSend: (content: string) => void;
    disabled?: boolean;
}

export default function TypingBar({ onSend, disabled = false }: TypingBarProps) {
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
        <div className="flex items-end gap-2 bg-white border-t border-zinc-200 p-3">
            <textarea
                ref={inputRef}
                value={text}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={disabled ? "Chat ended" : "Type a message..."}
                disabled={disabled}
                rows={1}
                className="flex-1 resize-none border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-zinc-50 disabled:text-zinc-400"
                style={{ maxHeight: "100px" }}
            />
            <button
                onClick={handleSend}
                disabled={disabled || text.trim().length === 0}
                className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl font-semibold text-sm hover:bg-indigo-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
                Send ➤
            </button>
            <span className="text-xs text-zinc-400 absolute right-16 bottom-1.5 select-none">
                {text.length}/500
            </span>
        </div>
    );
}
