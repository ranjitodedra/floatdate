"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    step: "01",
    title: "Tell us about yourself",
    desc: "Your core beliefs, personal interests, and key priorities",
    icon: "🧠",
    image: "/images/step_1.png",
  },
  {
    step: "02",
    title: "Opt in weekly",
    desc: "Opt in by Wednesday 9 PM ET. Get your match at the same time at week’s end, along with why we think you’ll click.",
    icon: "✋",
    image: "/images/step_2.png",
  },
  {
    step: "03",
    title: "Meet your match",
    desc: "We share their email. The connection is yours to build.",
    icon: "💜",
    image: "/images/step_3.png",
  },
] as const;

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`how-it-works-section px-6 py-20${visible ? " is-visible" : ""}`}
    >
      <div className="max-w-5xl mx-auto">
        <h2 className="scroll-reveal-heading text-center text-3xl font-bold text-cream mb-16">
          How it works
        </h2>
        <div className="space-y-8">
          {STEPS.map((item, index) => (
            <div
              key={item.step}
              className={`scroll-reveal-card scroll-reveal-card-${index + 1} relative rounded-3xl p-12 min-h-[300px] flex flex-col justify-center text-white shadow-2xl hover:scale-[1.02] transition-transform duration-300 overflow-hidden`}
            >
              <Image
                src={item.image}
                alt={`Step ${item.step} background`}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative z-10">
                <span className="text-5xl mb-6 block">{item.icon}</span>
                <p className="text-sm text-white/70 font-mono mb-3 uppercase tracking-wider">
                  Step {item.step}
                </p>
                <h3 className="text-3xl font-bold text-white mb-4">
                  {item.title}
                </h3>
                <p className="text-lg text-white/90 leading-relaxed max-w-2xl">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
