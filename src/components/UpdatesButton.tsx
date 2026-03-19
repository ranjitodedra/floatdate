"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

const UPDATES_STORAGE_KEY = "floatdate-updates-seen-v1";

export default function UpdatesButton() {
  const [showDot, setShowDot] = useState(false);
  const [open, setOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, right: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = localStorage.getItem(UPDATES_STORAGE_KEY);
    if (!seen) {
      setShowDot(true);
    }
  }, []);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  function handleClick() {
    updatePosition();
    setOpen((prev) => !prev);
    if (showDot) {
      localStorage.setItem(UPDATES_STORAGE_KEY, "true");
      setShowDot(false);
    }
  }

  const popup = open && mounted
    ? createPortal(
        <div
          ref={popupRef}
          className="w-80 bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden"
          style={{
            position: "fixed",
            top: popupPos.top,
            right: popupPos.right,
            zIndex: 9999,
            animation: "fadeInDown 0.2s ease-out",
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-3">
            <p className="text-white text-sm font-semibold">
              What&apos;s New
            </p>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🎮</span>
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  Float Live is here!
                </p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Jump into real-time anonymous chats with other students every
                  day from 5 - 6 PM ET. Choose Blind Date or Friendship mode
                  and start connecting instantly.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href="/float-live-blog"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-violet-600 hover:text-violet-700 underline underline-offset-2 transition"
              >
                Read more
              </Link>
              <span className="text-zinc-300">·</span>
              <Link
                href="/float-live"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-pink-600 hover:text-pink-700 underline underline-offset-2 transition"
              >
                Try Float Live →
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="relative px-5 py-2 text-sm text-white hover:text-white/80 transition"
        style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
      >
        Updates
        {showDot && (
          <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {popup}

      <style jsx global>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
