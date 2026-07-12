const textShadow =
  "0 2px 20px rgba(0,0,0,0.65), 0 1px 4px rgba(0,0,0,0.5)";

export default function StaticHeroHeadline() {
  return (
    <h1
      className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight max-w-4xl mx-auto px-2"
      style={{
        fontFamily: "var(--font-libre-baskerville), Georgia, serif",
        fontWeight: 700,
        fontStyle: "italic",
        textShadow,
      }}
    >
      <span className="text-cream">Dating that finally feels </span>
      <span className="text-cream whitespace-nowrap">effortless.</span>
    </h1>
  );
}
