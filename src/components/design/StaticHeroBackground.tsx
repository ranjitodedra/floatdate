import Image from "next/image";

export default function StaticHeroBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <Image
        src="/images/hero_images/Image1.png"
        alt="FloatDate hero"
        fill
        className="object-cover object-right"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent pointer-events-none" />
    </div>
  );
}
