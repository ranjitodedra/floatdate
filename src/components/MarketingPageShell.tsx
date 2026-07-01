import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import type { ReactNode } from "react";

interface MarketingPageShellProps {
  children: ReactNode;
  showFooter?: boolean;
  backHref?: string;
  backLabel?: string;
  maxWidth?: "3xl" | "full";
}

export default function MarketingPageShell({
  children,
  showFooter = true,
  backHref = "/",
  backLabel = "Back to home",
  maxWidth = "3xl",
}: MarketingPageShellProps) {
  const mainWidth = maxWidth === "3xl" ? "max-w-3xl" : "max-w-5xl";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-cream/10">
        <div className={`${mainWidth} mx-auto px-6 py-4 flex items-center justify-between`}>
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
            href={backHref}
            className="text-sm text-cream-muted hover:text-cream transition"
          >
            {backLabel}
          </Link>
        </div>
      </header>

      <main className={`flex-1 ${mainWidth} mx-auto w-full px-6 py-12 text-cream-muted`}>
        {children}
      </main>

      {showFooter && <Footer />}
    </div>
  );
}
