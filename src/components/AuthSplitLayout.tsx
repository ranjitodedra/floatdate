import Image from "next/image";
import type { ReactNode } from "react";

interface AuthSplitLayoutProps {
  imageSrc: string;
  imageAlt: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthSplitLayout({
  imageSrc,
  imageAlt,
  subtitle,
  children,
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl flex flex-col items-center gap-8">
        <div className="text-center">
          <Image
            src="/images/icon.png"
            alt="FloatDate"
            width={120}
            height={40}
            className="mx-auto mb-3"
          />
          <p className="text-cream-muted">{subtitle}</p>
        </div>

        <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 lg:gap-8 w-full">
          <div className="relative hidden lg:block w-full max-w-md shrink-0 self-stretch rounded-2xl overflow-hidden shadow-card">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              className="object-cover object-center"
              sizes="(min-width: 1024px) 448px, 0px"
              priority
            />
          </div>
          <div className="w-full max-w-md shrink-0 flex flex-col justify-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
