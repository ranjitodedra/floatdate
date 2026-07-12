import Image from "next/image";
import { UNIVERSITY_LOGO_IMAGES } from "@/lib/universities";

function logoAltFromPath(src: string): string {
  const filename =
    src.split("/").pop()?.split("?")[0]?.replace(/\.[^.]+$/, "") ?? "University";
  return filename.replace(/[-_]/g, " ");
}

export default function StaticUniversityLogos() {
  return (
    <section className="w-full px-6 py-6 sm:py-8" aria-label="Partner universities">
      <div className="relative mx-auto max-w-3xl lg:max-w-4xl">
        <ul className="flex list-none flex-wrap items-center justify-center gap-6 sm:gap-10">
          {UNIVERSITY_LOGO_IMAGES.map((src) => (
            <li key={src} className="flex shrink-0 items-center justify-center">
              <div className="relative flex h-8 w-20 items-center justify-center sm:h-10 sm:w-24 md:h-11 md:w-28">
                <Image
                  src={src}
                  alt={logoAltFromPath(src)}
                  fill
                  unoptimized
                  sizes="112px"
                  className="object-contain object-center opacity-90"
                  draggable={false}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
