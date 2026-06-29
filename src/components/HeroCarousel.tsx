"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const SLIDES = [
  { src: "/images/hero_images/Image1.png", alt: "FloatDate hero image 1" },
  { src: "/images/hero_images/Image2.png", alt: "FloatDate hero image 2" },
  { src: "/images/hero_images/Image3.png", alt: "FloatDate hero image 3" },
  { src: "/images/hero_images/Image4.png", alt: "FloatDate hero image 4" },
  { src: "/images/hero_images/Image5.png", alt: "FloatDate hero image 5" },
  { src: "/images/hero_images/Image6.png", alt: "FloatDate hero image 6" },
  { src: "/images/hero_images/Image7.png", alt: "FloatDate hero image 7" },
  { src: "/images/hero_images/Image8.png", alt: "FloatDate hero image 8" },
  { src: "/images/hero_images/Image9.png", alt: "FloatDate hero image 9" },
  { src: "/images/hero_images/Image10.png", alt: "FloatDate hero image 10" },
  { src: "/images/hero_images/Image11.png", alt: "FloatDate hero image 11" },
] as const;

const AUTO_INTERVAL_MS = 5000;
const PAUSE_AFTER_MANUAL_MS = 8000;
const SWIPE_THRESHOLD_PX = 50;

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pausedUntil, setPausedUntil] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseAutoAdvance = useCallback(() => {
    setPausedUntil(Date.now() + PAUSE_AFTER_MANUAL_MS);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setPausedUntil(0);
    }, PAUSE_AFTER_MANUAL_MS);
  }, []);

  const manualGoNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % SLIDES.length);
    pauseAutoAdvance();
  }, [pauseAutoAdvance]);

  const manualGoPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
    pauseAutoAdvance();
  }, [pauseAutoAdvance]);

  useEffect(() => {
    const id = setInterval(() => {
      if (isInteracting || Date.now() < pausedUntil) return;
      setCurrentIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isInteracting, pausedUntil]);

  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsInteracting(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsInteracting(false);
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta > 0) manualGoPrev();
    else manualGoNext();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    setIsInteracting(true);
    touchStartX.current = e.clientX;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    setIsInteracting(false);
    if (touchStartX.current === null) return;
    const delta = e.clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta > 0) manualGoPrev();
    else manualGoNext();
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (ratio < 0.25) manualGoPrev();
    else if (ratio > 0.75) manualGoNext();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      manualGoPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      manualGoNext();
    }
  };

  return (
    <div
      className="absolute inset-0 z-0 outline-none"
      role="region"
      aria-label="Hero image carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {SLIDES.map((slide, index) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          fill
          className={`object-cover object-right transition-opacity duration-700 ease-in-out ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
          priority={index === 0}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent pointer-events-none" />

      <div
        className="absolute inset-0 md:cursor-default"
        aria-hidden
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setIsInteracting(false);
          touchStartX.current = null;
        }}
        onClick={handleClick}
      />

      <p className="sr-only" aria-live="polite">
        Slide {currentIndex + 1} of {SLIDES.length}
      </p>
    </div>
  );
}
