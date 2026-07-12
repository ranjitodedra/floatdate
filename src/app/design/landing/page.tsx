import type { Metadata } from "next";
import LandingCaptureFrame from "@/components/design/LandingCaptureFrame";

export const metadata: Metadata = {
  title: "FloatDate Landing — Figma Capture",
  robots: { index: false },
};

export default function DesignLandingPage() {
  return (
    <div className="bg-background">
      <div className="w-[1440px] mx-auto px-16 py-8 border-b border-cream/10">
        <h1 className="text-xl font-bold text-cream mb-3">Figma import instructions</h1>
        <ol className="text-sm text-cream-muted space-y-1 list-decimal list-inside">
          <li>Set browser width to 1440px</li>
          <li>Use html.to.design to capture each section below</li>
          <li>
            Capture <strong className="text-cream">Logged Out</strong> first, then{" "}
            <strong className="text-cream">Logged In</strong> (or scroll-capture the full page)
          </li>
          <li>In Figma, rename layers to match section labels</li>
        </ol>
        <p className="text-xs text-cream-faint mt-4">
          Backup: import live <code className="text-cream-muted">/</code> at localhost — pause
          hero carousel, expect extra cleanup on marquee and FAQ.
        </p>
      </div>

      <div className="space-y-32 py-16">
        <section>
          <p className="w-[1440px] mx-auto px-16 text-sm font-mono text-cream-muted uppercase tracking-wider mb-6">
            Landing — Logged Out
          </p>
          <div className="w-[1440px] mx-auto">
            <LandingCaptureFrame variant="guest" />
          </div>
        </section>

        <section>
          <p className="w-[1440px] mx-auto px-16 text-sm font-mono text-cream-muted uppercase tracking-wider mb-6">
            Landing — Logged In
          </p>
          <div className="w-[1440px] mx-auto">
            <LandingCaptureFrame variant="authenticated" />
          </div>
        </section>
      </div>
    </div>
  );
}
