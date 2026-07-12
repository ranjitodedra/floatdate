import Image from "next/image";
import Footer from "@/components/Footer";
import StaticFAQ from "@/components/design/StaticFAQ";
import StaticHeroBackground from "@/components/design/StaticHeroBackground";
import StaticHeroHeadline from "@/components/design/StaticHeroHeadline";
import StaticHowItWorks from "@/components/design/StaticHowItWorks";
import StaticUniversityLogos from "@/components/design/StaticUniversityLogos";

export type LandingVariant = "guest" | "authenticated";

interface LandingCaptureFrameProps {
  variant: LandingVariant;
}

const navTextShadow = { textShadow: "0 1px 6px rgba(0,0,0,0.5)" };
const pillTextShadow = { textShadow: "0 1px 4px rgba(0,0,0,0.4)" };

function StaticUpdatesLabel() {
  return (
    <span
      className="px-5 py-2 text-sm text-cream"
      style={navTextShadow}
    >
      Updates
    </span>
  );
}

function GuestNav() {
  return (
    <>
      <StaticUpdatesLabel />
      <span
        className="px-5 py-2 text-sm text-white"
        style={navTextShadow}
      >
        Log in
      </span>
      <span
        className="px-5 py-2 text-sm bg-black/20 backdrop-blur-sm text-white rounded-full border border-white/30"
        style={pillTextShadow}
      >
        Sign up
      </span>
    </>
  );
}

function AuthenticatedNav() {
  return (
    <>
      <StaticUpdatesLabel />
      <span
        className="px-5 py-2 text-sm bg-black/20 backdrop-blur-sm text-white rounded-full border border-white/30"
        style={pillTextShadow}
      >
        Continue
      </span>
    </>
  );
}

function GuestHeroCTAs() {
  return (
    <>
      <span className="px-8 py-4 bg-white text-gray-600 font-semibold rounded-2xl shadow-xl text-lg">
        Get Started
      </span>
      <span
        className="px-8 py-4 text-white text-lg"
        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
      >
        I have an account →
      </span>
    </>
  );
}

function AuthenticatedHeroCTA() {
  return (
    <span
      className="px-8 py-4 bg-black/20 backdrop-blur-sm text-white font-semibold rounded-2xl shadow-xl text-lg border border-white/30"
      style={pillTextShadow}
    >
      Continue
    </span>
  );
}

export default function LandingCaptureFrame({ variant }: LandingCaptureFrameProps) {
  const isGuest = variant === "guest";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <section className="relative min-h-screen overflow-hidden">
        <StaticHeroBackground />

        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
          <Image
            src="/images/icon.png"
            alt="FloatDate"
            width={120}
            height={40}
            className="drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
          />
          <div className="flex gap-3">
            {isGuest ? <GuestNav /> : <AuthenticatedNav />}
          </div>
        </nav>

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
          <StaticHeroHeadline />

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isGuest ? <GuestHeroCTAs /> : <AuthenticatedHeroCTA />}
          </div>
        </div>
      </section>

      <StaticUniversityLogos />
      <StaticHowItWorks />

      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="block rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/floatlive.png"
              alt="Float Live: real-time anonymous chat"
              width={1200}
              height={600}
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      <StaticFAQ />
      <Footer />
    </div>
  );
}
