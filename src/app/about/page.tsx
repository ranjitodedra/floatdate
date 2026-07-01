import MarketingPageShell from "@/components/MarketingPageShell";

export const metadata = {
  title: "About | FloatDate",
  description:
    "Why we made FloatDate: meaningful connections for University students, without swipe fatigue.",
};

export default function AboutPage() {
  return (
    <MarketingPageShell>
      <h1 className="text-2xl font-semibold text-cream mb-6">
        Why we made FloatDate
      </h1>
      <div className="max-w-none text-cream/90 space-y-4 text-sm leading-relaxed">
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
            className="text-cream underline underline-offset-2 hover:no-underline"
          >
            support@floatdate.com
          </a>
          .
        </p>
      </div>
    </MarketingPageShell>
  );
}
