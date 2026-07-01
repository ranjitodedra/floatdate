"use client";

import { useEffect, useState } from "react";

const STATIC_TEXT = "Dating that finally feels ";
const PHRASES = [
  "effortless.",
  "exciting again.",
  "intentional.",
  "deeply personal.",
] as const;

const HOLD_MS = 3000;
const TRANSITION_MS = 500;

const textShadow =
  "0 2px 20px rgba(0,0,0,0.65), 0 1px 4px rgba(0,0,0,0.5)";

type Phase = "visible" | "exit" | "enter";

export default function HeroHeadline() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("visible");

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleCycle = () => {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        setPhase("exit");

        timeoutId = setTimeout(() => {
          if (cancelled) return;
          setIndex((i) => (i + 1) % PHRASES.length);
          setPhase("enter");

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (cancelled) return;
              setPhase("visible");
              scheduleCycle();
            });
          });
        }, TRANSITION_MS);
      }, HOLD_MS);
    };

    scheduleCycle();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const dynamicClasses =
    phase === "visible"
      ? "opacity-100 translate-y-0"
      : phase === "exit"
        ? "opacity-0 -translate-y-2"
        : "opacity-0 translate-y-3";

  return (
    <h1
      className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight max-w-4xl mx-auto px-2"
      style={{
        fontFamily: "var(--font-libre-baskerville), Georgia, serif",
        fontWeight: 700,
        fontStyle: "italic",
        textShadow,
      }}
    >
      <span className="text-cream">{STATIC_TEXT}</span>
      <span className="inline-grid align-bottom text-center">
        <span
          className="invisible col-start-1 row-start-1 whitespace-nowrap"
          aria-hidden="true"
        >
          deeply personal.
        </span>
        <span
          aria-live="polite"
          aria-atomic="true"
          className={`col-start-1 row-start-1 whitespace-nowrap text-cream transition-all duration-500 ease-out ${dynamicClasses}`}
          style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        >
          {PHRASES[index]}
        </span>
      </span>
    </h1>
  );
}
