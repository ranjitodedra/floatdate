import Link from "next/link";
import Image from "next/image";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import HeroCarousel from "@/components/HeroCarousel";
import HeroHeadline from "@/components/HeroHeadline";
import HowItWorksSection from "@/components/HowItWorksSection";
import UniversityLogoStrip from "@/components/UniversityLogoStrip";
import UpdatesButton from "@/components/UpdatesButton";
import { getSession } from "@/lib/auth";
import { UNIVERSITY_LOGO_IMAGES } from "@/lib/universities";

export default async function Home() {
  const session = await getSession();
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Hero Section (dark, with background image) ── */}
      <section className="relative min-h-screen overflow-hidden">
        <HeroCarousel />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full pointer-events-auto">
          <Image src="/images/icon.png" alt="FloatDate" width={120} height={40} className="drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" />
          <div className="flex gap-3">
            {session ? (
              <>
                <UpdatesButton />
                <Link
                  href="/dashboard"
                  className="px-5 py-2 text-sm bg-black/20 backdrop-blur-sm hover:bg-black/30 text-white rounded-full transition border border-white/30"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
                >
                  Continue
                </Link>
              </>
            ) : (
              <>
                <UpdatesButton />
                <Link
                  href="/login"
                  className="px-5 py-2 text-sm text-white hover:text-white/80 transition"
                  style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2 text-sm bg-black/20 backdrop-blur-sm hover:bg-black/30 text-white rounded-full transition border border-white/30"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Hero Content — centered */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pointer-events-none text-center">
          <HeroHeadline />

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                {session ? (
                    <Link
                      href="/dashboard"
                      className="pointer-events-auto px-8 py-4 bg-black/20 backdrop-blur-sm hover:bg-black/30 text-white font-semibold rounded-2xl transition-all duration-200 shadow-xl text-lg border border-white/30"
                      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
                    >
                    Continue
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="pointer-events-auto px-8 py-4 bg-white text-gray-600 font-semibold rounded-2xl hover:bg-gray-50 transition-all duration-200 shadow-xl text-lg"
                    >
                      Get Started
                    </Link>
                    <Link
                      href="/login"
                      className="pointer-events-auto px-8 py-4 text-white hover:text-white/80 transition text-lg"
                      style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
                    >
                      I have an account →
                    </Link>
                  </>
                )}
          </div>
        </div>
      </section>

      <UniversityLogoStrip images={UNIVERSITY_LOGO_IMAGES} />

      <HowItWorksSection />

      {/* ── Float Live Banner ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <Link href="/float-live-blog" className="block rounded-3xl overflow-hidden shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <Image
              src="/images/floatlive.png"
              alt="Float Live: real-time anonymous chat"
              width={1200}
              height={600}
              className="w-full h-auto"
            />
          </Link>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <FAQSection />

      <Footer />
    </div>
  );
}
