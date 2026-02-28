import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata = {
  title: "About — FloatDate",
  description:
    "Why we made FloatDate: meaningful connections for Laurier students, without swipe fatigue.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/icon.png"
              alt="FloatDate"
              width={120}
              height={40}
              className="h-9 w-auto"
            />
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 transition"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-6">
          Why we made FloatDate
        </h1>
        <div className="prose prose-zinc max-w-none text-zinc-700 space-y-4 text-sm leading-relaxed">
          <p>
            FloatDate exists to give Wilfrid Laurier University students a
            better way to meet people. We wanted to move past endless swiping
            and superficial profiles toward real compatibility and one
            thoughtful match each week.
          </p>
          <p>
            You answer 74 research-backed compatibility questions across five
            areas: emotional openness, core values, lifestyle, communication
            style, and interests. Our matching uses that to pair you with one
            person per week. Each match includes a short note on why you were
            paired, so you can start a conversation with context, not a blank
            screen.
          </p>
          <p>
            FloatDate is built only for Laurier. Sign-up requires a
            @mylaurier.ca email. The service is free for all Laurier students.
          </p>
          <p>
            If you have questions or feedback, reach out at{" "}
            <a
              href="mailto:support@floatdate.com"
              className="text-zinc-900 underline underline-offset-2 hover:no-underline"
            >
              support@floatdate.com
            </a>
            .
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
