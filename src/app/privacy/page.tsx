import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Privacy — FloatDate",
  description: "FloatDate privacy policy: how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-zinc-500 mb-8">
          Last updated: February 2026
        </p>
        <div className="prose prose-zinc max-w-none text-zinc-700 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-zinc-900 mt-6 mb-2">
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
            <h2 className="text-base font-semibold text-zinc-900 mt-6 mb-2">
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
            <h2 className="text-base font-semibold text-zinc-900 mt-6 mb-2">
              Data protection
            </h2>
            <p>
              We store data securely and follow industry-standard practices to
              protect it. Access to personal data is limited to what is needed to
              operate the service and support you.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-zinc-900 mt-6 mb-2">
              Your rights
            </h2>
            <p>
              You can request access to your data or ask for your account and
              associated data to be deleted. To do so, contact us at{" "}
              <a
                href="mailto:support@floatdate.com"
                className="text-zinc-900 underline underline-offset-2 hover:no-underline"
              >
                support@floatdate.com
              </a>
              . We will respond within a reasonable time.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-zinc-900 mt-6 mb-2">
              Contact
            </h2>
            <p>
              For privacy-related questions or requests, email{" "}
              <a
                href="mailto:support@floatdate.com"
                className="text-zinc-900 underline underline-offset-2 hover:no-underline"
              >
                support@floatdate.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
