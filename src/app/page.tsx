import Link from "next/link";
import Image from "next/image";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import UpdatesButton from "@/components/UpdatesButton";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Hero Section (dark, with background image) ── */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background Image */}
        <Image
          src="/images/Hero_section.png"
          alt="Hero background"
          fill
          className="object-cover object-right"
          priority
        />

        {/* Bottom fade to white */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
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

        {/* Hero Content — overlaid on the left */}
        <div className="relative z-10 flex items-center min-h-[calc(100vh-80px)] px-6">
          <div className="max-w-6xl mx-auto w-full">
            <div className="max-w-xl space-y-8">
              <h1
                className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-wide"
                style={{
                  textShadow: "0 2px 16px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)",
                  fontFamily: "var(--font-delius), sans-serif"
                }}
              >
                Dates minus
                <br />
                the swipe fatigue.
                <br />
                For University students
              </h1>

              <p
                className="text-xs md:text-sm text-white max-w-lg leading-relaxed font-medium"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.5)" }}
              >
                Answer 74 research-backed compatibility questions. Get matched
                with one person each week based on who you actually are. Each match is thoughtfully paired, with a note explaining why.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                {session ? (
                  <Link
                    href="/dashboard"
                    className="px-8 py-4 bg-white text-gray-600 font-semibold rounded-2xl hover:bg-gray-50 transition-all duration-200 shadow-xl text-lg"
                  >
                    Continue
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="px-8 py-4 bg-white text-gray-600 font-semibold rounded-2xl hover:bg-gray-50 transition-all duration-200 shadow-xl text-lg"
                    >
                      Get Started
                    </Link>
                    <Link
                      href="/login"
                      className="px-8 py-4 text-white hover:text-white/80 transition text-lg"
                      style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
                    >
                      I have an account →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works (white background) ── */}
      <section className="bg-white px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-3xl font-bold text-zinc-900 mb-16">
            How it works
          </h2>
          <div className="space-y-8">
            {[
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
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-3xl p-12 min-h-[300px] flex flex-col justify-center text-white shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden"
              >
                {/* Background Image */}
                <Image
                  src={item.image}
                  alt={`Step ${item.step} background`}
                  fill
                  className="object-cover"
                />
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-black/50" />
                {/* Content */}
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

      {/* ── Float Live Banner ── */}
      <section className="bg-white px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <Link href="/float-live-blog" className="block rounded-3xl overflow-hidden shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <Image
              src="/images/floatlive.png"
              alt="Float Live — Real-time anonymous chat"
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
