"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const IMAGE_FILES = [
    "ChatGPT Image Jun 29, 2026, 01_16_01 AM.png",
    "ChatGPT Image Jun 29, 2026, 01_16_10 AM.png",
    "ChatGPT Image Jun 29, 2026, 01_16_17 AM.png",
    "ChatGPT Image Jun 29, 2026, 01_16_29 AM.png",
] as const;

const SLIDES = IMAGE_FILES.map((file, index) => ({
    src: `/images/pop_waiting_list/${encodeURIComponent(file)}`,
    alt: `Float Pop digital platform preview ${index + 1}`,
}));

const AUTO_INTERVAL_MS = 5000;
const SWIPE_THRESHOLD_PX = 50;

export default function PopWaitingListCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);

    const goNext = useCallback(() => {
        setCurrentIndex((i) => (i + 1) % SLIDES.length);
    }, []);

    const goPrev = useCallback(() => {
        setCurrentIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
    }, []);

    useEffect(() => {
        const id = setInterval(goNext, AUTO_INTERVAL_MS);
        return () => clearInterval(id);
    }, [goNext]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
        if (delta > 0) goPrev();
        else goNext();
    };

    return (
        <div className="mt-4">
            <p className="text-xs text-muted mb-2">
                A preview of what we&apos;re building
            </p>
            <div
                className="relative rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 aspect-[16/10]"
                role="region"
                aria-label="Float Pop digital platform preview carousel"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {SLIDES.map((slide, index) => (
                    <Image
                        key={slide.src}
                        src={slide.src}
                        alt={slide.alt}
                        fill
                        className={`object-cover transition-opacity duration-500 ease-in-out ${
                            index === currentIndex ? "opacity-100" : "opacity-0"
                        }`}
                        sizes="(max-width: 672px) 100vw, 672px"
                        priority={index === 0}
                    />
                ))}

                <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous slide"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-cream text-sm hover:bg-black/60 transition"
                >
                    ‹
                </button>
                <button
                    type="button"
                    onClick={goNext}
                    aria-label="Next slide"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-cream text-sm hover:bg-black/60 transition"
                >
                    ›
                </button>

                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                    {SLIDES.map((slide, index) => (
                        <button
                            key={slide.src}
                            type="button"
                            aria-label={`Go to slide ${index + 1}`}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-1.5 rounded-full transition-all ${
                                index === currentIndex
                                    ? "w-4 bg-white"
                                    : "w-1.5 bg-white/50"
                            }`}
                        />
                    ))}
                </div>
            </div>
            <p className="sr-only" aria-live="polite">
                Slide {currentIndex + 1} of {SLIDES.length}
            </p>
        </div>
    );
}
