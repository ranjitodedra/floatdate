import MarketingPageShell from "@/components/MarketingPageShell";

export const metadata = {
  title: "Privacy | FloatDate",
  description: "FloatDate privacy policy: how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <MarketingPageShell>
      <h1 className="text-2xl font-semibold text-cream mb-6">
        Privacy Policy
      </h1>
      <p className="text-sm text-cream-faint mb-8">
        Last updated: February 2026
      </p>
      <div className="max-w-none text-cream/90 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-cream mt-6 mb-2">
            What we collect
          </h2>
          <p>
            We collect your Wilfrid Laurier University email address
            (@mylaurier.ca), the profile information you provide, and your
            answers to our compatibility questions. This data is used only to
            run our matching service and to communicate with you about your
            account and matches.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-cream mt-6 mb-2">
            How we use it
          </h2>
          <p>
            Your data is used solely to calculate compatibility, generate
            weekly matches, and send you match notes. We do not sell or share
            your personal information with third parties for marketing or
            advertising.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-cream mt-6 mb-2">
            Data protection
          </h2>
          <p>
            We store data securely and follow industry-standard practices to
            protect it. Access to personal data is limited to what is needed to
            operate the service and support you.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-cream mt-6 mb-2">
            Float Live
          </h2>
          <p>
            We take your privacy seriously. All chats and transcripts are
            automatically deleted at the end of each day. Only chats that are
            reported are reviewed by our team for safety purposes. We never
            train, share, or store your data beyond that. Your conversations
            are yours, always.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-cream mt-6 mb-2">
            Your rights
          </h2>
          <p>
            You can request access to your data or ask for your account and
            associated data to be deleted. To do so, contact us at{" "}
            <a
              href="mailto:support@floatdate.com"
              className="text-cream underline underline-offset-2 hover:no-underline"
            >
              support@floatdate.com
            </a>
            . We will respond within a reasonable time.
          </p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-cream mt-6 mb-2">
            Contact
          </h2>
          <p>
            For privacy-related questions or requests, email{" "}
            <a
              href="mailto:support@floatdate.com"
              className="text-cream underline underline-offset-2 hover:no-underline"
            >
              support@floatdate.com
            </a>
            .
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
