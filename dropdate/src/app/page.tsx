import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1025] to-[#0f0f0f] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          DropDate
        </span>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-5 py-2 text-sm text-zinc-400 hover:text-white transition"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 text-sm bg-white/10 hover:bg-white/15 text-white rounded-full transition border border-white/10"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center space-y-8">
          {/* Glow effect */}
          <div className="relative">
            <div className="absolute -inset-20 bg-purple-500/10 rounded-full blur-3xl" />
            <h1 className="relative text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
              Find your person.
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Not a profile.
              </span>
            </h1>
          </div>

          <p className="text-lg md:text-xl text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Answer 74 research-backed compatibility questions. Get matched with
            one person each week based on who you actually are.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-2xl hover:from-purple-500 hover:to-pink-500 transition-all duration-200 shadow-xl shadow-purple-500/25 text-lg"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 text-zinc-400 hover:text-white transition text-lg"
            >
              I have an account →
            </Link>
          </div>

          <p className="text-xs text-zinc-600">
            Exclusive to Wilfrid Laurier University (@mylaurier.ca)
          </p>
        </div>
      </main>

      {/* How it works */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl font-bold text-white mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Answer honestly",
                desc: "74 questions across personality, values, lifestyle, and communication — backed by relationship psychology.",
                icon: "🧠",
              },
              {
                step: "02",
                title: "Opt in weekly",
                desc: "Every week, choose to enter the matching pool. No pressure, no swiping, no algorithms watching your every move.",
                icon: "✋",
              },
              {
                step: "03",
                title: "Meet your match",
                desc: "Each Monday, you get one match via email. One real person. One real chance. That's it.",
                icon: "💜",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300"
              >
                <span className="text-3xl mb-4 block">{item.icon}</span>
                <p className="text-xs text-purple-400 font-mono mb-1">
                  Step {item.step}
                </p>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-sm text-zinc-600">
            © 2026 DropDate. Laurier only.
          </span>
          <span className="text-xs text-zinc-700">
            Built with 💜
          </span>
        </div>
      </footer>
    </div>
  );
}
