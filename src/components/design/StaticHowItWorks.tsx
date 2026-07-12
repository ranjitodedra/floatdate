import Image from "next/image";

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

export default function StaticHowItWorks() {
  return (
    <section className="px-6 py-20">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-3xl font-bold text-cream mb-16">How it works</h2>
        <div className="space-y-8">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="relative rounded-3xl p-12 min-h-[300px] flex flex-col justify-center text-white shadow-2xl overflow-hidden"
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
                <h3 className="text-3xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-lg text-white/90 leading-relaxed max-w-2xl">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
