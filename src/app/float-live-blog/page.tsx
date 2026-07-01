import Link from "next/link";
import MarketingPageShell from "@/components/MarketingPageShell";

export const metadata = {
  title: "Float Live | FloatDate",
  description:
    "Learn about Float Live: real-time anonymous chat for Laurier students. Two modes, one hour, real connections.",
};

export default function FloatLiveBlogPage() {
  return (
    <MarketingPageShell>
      <h1 className="text-2xl font-semibold text-cream mb-6">
        Float Live
      </h1>

      <div className="relative w-full mb-8 rounded-2xl overflow-hidden shadow-lg glass-panel" style={{ paddingBottom: "56.25%" }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src="https://www.youtube.com/embed/gkg3jB3xFMY?si=gm4BV9_WHGbThqW2"
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>

      <div className="max-w-none text-cream/90 space-y-6 text-sm leading-relaxed">
        <p>
          Float Live is a real-time, anonymous chat feature inside FloatDate.
          Every day from{" "}
          <strong className="text-cream">5:00 PM to 6:00 PM ET</strong>, Laurier students can jump
          into one-on-one conversations with other students who are online at
          the same time. No profiles, no swiping, just a live connection.
        </p>

        <h2 className="text-lg font-semibold text-cream mt-8 mb-3">
          How it works
        </h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>
            <strong className="text-cream">Set your filters.</strong> Choose your gender preference,
            university, and chat mode before you start.
          </li>
          <li>
            <strong className="text-cream">Pick a character.</strong> Select one of six pixel-art
            avatars. This is how you and your partner will appear in the chat
            scene.
          </li>
          <li>
            <strong className="text-cream">Accept the guidelines.</strong> A short set of community
            rules to keep conversations respectful.
          </li>
          <li>
            <strong className="text-cream">Get matched.</strong> The system pairs you with another
            online student who shares compatible filters. If no one is
            available within five minutes, you can try again.
          </li>
          <li>
            <strong className="text-cream">Chat.</strong> Send messages in real time while your
            characters hang out in a pixel-art scene together.
          </li>
        </ol>

        <h2 className="text-lg font-semibold text-cream mt-8 mb-3">
          Two chat modes
        </h2>
        <p>
          Before entering, you choose one of two modes. Both you and your
          match must select the same mode to be paired.
        </p>
        <ul className="list-disc list-inside space-y-3">
          <li>
            <strong className="text-cream">Blind Date 💌</strong>: Identities stay anonymous. If you
            both enjoy the conversation, either person can request an email
            reveal. The other person has to agree before any contact info is
            shared. Think of it as a mutual opt-in to keep talking after the
            session.
          </li>
          <li>
            <strong className="text-cream">Friendship 🤝</strong>: Emails are visible from the
            start. This mode is for students looking for friends, study
            partners, or casual conversation without the dating context.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-cream mt-8 mb-3">
          Rules &amp; safety
        </h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            Float Live is only open during the one-hour daily window. Once the
            session ends, all active chats close automatically.
          </li>
          <li>
            You can report inappropriate behaviour at any time during a chat.
            Reports are reviewed by the FloatDate team.
          </li>
          <li>
            Either person can exit the chat at any point. Your partner will be
            notified and redirected to the lobby.
          </li>
          <li>
            All conversations are subject to FloatDate&apos;s community guidelines
            and{" "}
            <Link
              href="/privacy"
              className="text-cream underline underline-offset-2 hover:no-underline"
            >
              privacy policy
            </Link>
            .
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-cream mt-8 mb-3">
          Why Float Live?
        </h2>
        <p>
          FloatDate&apos;s weekly matching is great for deep compatibility, but
          sometimes you just want to talk to someone right now. Float Live
          fills that gap. It&apos;s spontaneous, low-pressure, and designed for
          the kind of conversations that happen naturally when two people are
          in the same place at the same time.
        </p>

        <div className="mt-10 glass-panel rounded-2xl px-6 py-6 text-center space-y-3">
          <p className="text-base font-semibold text-cream">
            Ready to try it?
          </p>
          <p className="text-sm text-cream-muted">
            Float Live opens every day from 5 - 6 PM ET. Jump in and start chatting.
          </p>
          <Link
            href="https://floatdate.com/float-live"
            className="inline-block px-6 py-2.5 text-sm font-semibold text-mahogany-deep bg-cream rounded-full hover:bg-[#ffffff] transition shadow-md"
          >
            Try Float Live →
          </Link>
        </div>

        <p>
          Questions or feedback? Reach out at{" "}
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
