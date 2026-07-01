import Image from "next/image";
import type { CSSProperties } from "react";

export type UniversityLogoStripProps = {
  images: string[];
  /** Scroll duration in seconds. Default: 30 */
  duration?: number;
};

function logoAltFromPath(src: string): string {
  const filename =
    src.split("/").pop()?.split("?")[0]?.replace(/\.[^.]+$/, "") ?? "University";
  return filename.replace(/[-_]/g, " ");
}

function LogoItem({ src }: { src: string }) {
  return (
    <li className="group/logo flex shrink-0 items-center justify-center">
      <div className="relative flex h-8 w-20 items-center justify-center sm:h-10 sm:w-24 md:h-11 md:w-28">
        <Image
          src={src}
          alt={logoAltFromPath(src)}
          fill
          unoptimized
          sizes="(max-width: 640px) 80px, 112px"
          className="object-contain object-center opacity-90 transition-opacity duration-300 ease-out group-hover/logo:opacity-100"
          draggable={false}
        />
      </div>
    </li>
  );
}

export default function UniversityLogoStrip({
  images,
  duration = 30,
}: UniversityLogoStripProps) {
  if (images.length === 0) return null;

  const loop = [...images, ...images];

  return (
    <section
      className="w-full px-6 py-6 sm:py-8"
      aria-label="Partner universities"
    >
      <div className="relative mx-auto max-w-3xl lg:max-w-4xl">
        <div className="relative overflow-hidden py-5 sm:py-6">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-mahogany-deep to-transparent sm:w-14"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-mahogany-deep to-transparent sm:w-14"
            aria-hidden="true"
          />

          <div className="university-logo-marquee overflow-hidden">
            <ul
              className="logo-marquee-track flex w-max list-none items-center gap-6 sm:gap-10 motion-reduce:animate-none"
              style={{ "--marquee-duration": `${duration}s` } as CSSProperties}
            >
              {loop.map((src, index) => (
                <LogoItem key={`${src}-${index}`} src={src} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
