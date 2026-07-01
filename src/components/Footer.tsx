import Image from "next/image";
import Link from "next/link";

const CONTACT_EMAIL = "support@floatdate.com";

export default function Footer() {
  return (
    <footer
      className="relative text-cream py-16 px-6 md:py-20 bg-mahogany-deep bg-[url('/assets/footer.png')] bg-top bg-cover bg-no-repeat"
      role="contentinfo"
    >
      <div className="absolute inset-0 bg-mahogany-deep/50" aria-hidden />
      <div className="relative z-10 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-12 md:gap-16">
        {/* Left: Logo + brand + copyright */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/images/icon.png"
              alt="FloatDate"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </div>
          <p className="text-sm text-cream/90">
            © 2026 FloatDate. University students only.
          </p>
        </div>

        {/* Middle: FloatDate column with links */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-cream/80">
            FloatDate
          </h3>
          <nav className="flex flex-col gap-2" aria-label="Footer navigation">
            <Link
              href="/about"
              className="text-sm text-cream hover:text-cream/90 underline-offset-2 hover:underline transition"
            >
              About
            </Link>
            <Link
              href="/float-live-blog"
              className="text-sm text-cream hover:text-cream/90 underline-offset-2 hover:underline transition"
            >
              Float Live
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-cream hover:text-cream/90 underline-offset-2 hover:underline transition"
            >
              Privacy
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm text-white hover:text-white/90 underline-offset-2 hover:underline transition w-fit"
            >
              Contact
            </a>
          </nav>
        </div>

        {/* Right: Stats column */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-cream/80">
            Stats
          </h3>
          <p className="text-sm text-cream/90">Coming Soon</p>
        </div>
      </div>
    </footer>
  );
}
