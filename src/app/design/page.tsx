import Image from "next/image";
import {
  btnPrimaryClass,
  glassInputClass,
  glassPanelClass,
  glassPanelStrongClass,
  glassSelectClass,
  labelClass,
} from "@/lib/ui-classes";

const COLORS = [
  { token: "bg-mahogany", hex: "#000000", className: "bg-[#000000]" },
  { token: "cream", hex: "#f2f2f0", className: "bg-cream" },
  { token: "cream-muted", hex: "#a3a3a3", className: "bg-cream-muted" },
  { token: "cream-faint", hex: "#737373", className: "bg-cream-faint" },
  { token: "gold", hex: "#d4d4d8", className: "bg-gold" },
  { token: "glass-panel", hex: "#262626", className: "bg-[#262626]" },
  { token: "glass-panel-strong", hex: "#2e2e2e", className: "bg-[#2e2e2e]" },
  { token: "glass-input", hex: "#1a1a1a", className: "bg-[#1a1a1a]" },
  { token: "surface-deep", hex: "#1a1a1a", className: "bg-surface-deep" },
  { token: "surface-elevated", hex: "#333333", className: "bg-surface-elevated" },
] as const;

const GEIST_SANS_SCALE = [
  { label: "12 / Regular", size: "text-xs", weight: "font-normal", sample: "Body caption text" },
  { label: "14 / Regular", size: "text-sm", weight: "font-normal", sample: "Secondary body text" },
  { label: "14 / Medium", size: "text-sm", weight: "font-medium", sample: "Form labels and emphasis" },
  { label: "16 / Regular", size: "text-base", weight: "font-normal", sample: "Default body copy" },
  { label: "18 / Semibold", size: "text-lg", weight: "font-semibold", sample: "Section headings" },
  { label: "24 / Bold", size: "text-2xl", weight: "font-bold", sample: "Card titles" },
  { label: "30 / Bold", size: "text-3xl", weight: "font-bold", sample: "Page headings" },
  { label: "48 / Bold", size: "text-5xl", weight: "font-bold", sample: "Display text" },
] as const;

const BORDER_RADII = [
  { label: "rounded-xl", className: "rounded-xl" },
  { label: "rounded-2xl", className: "rounded-2xl" },
  { label: "rounded-3xl", className: "rounded-3xl" },
  { label: "rounded-full", className: "rounded-full" },
] as const;

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="text-3xl font-bold text-cream border-b border-cream/10 pb-4 mb-10">
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: string }) {
  return <h3 className="text-lg font-semibold text-cream mb-4">{children}</h3>;
}

function ColorSwatch({
  token,
  hex,
  className,
  bordered,
}: {
  token: string;
  hex: string;
  className: string;
  bordered?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className={`h-24 w-full ${className} ${bordered ? "border border-cream/20" : ""}`}
      />
      <div>
        <p className="text-sm font-medium text-cream">{token}</p>
        <p className="text-sm text-cream-muted font-mono">{hex}</p>
      </div>
    </div>
  );
}

export default function DesignStyleGuidePage() {
  return (
    <div className="w-[1440px] mx-auto bg-background text-cream px-16 py-20 space-y-24">
      {/* Cover */}
      <header className="text-center space-y-6 pb-8 border-b border-cream/10">
        <Image
          src="/images/icon.png"
          alt="FloatDate"
          width={160}
          height={54}
          className="mx-auto"
        />
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-cream">FloatDate Style Guide</h1>
          <p className="text-lg text-cream-muted">Design tokens and UI components</p>
        </div>
      </header>

      {/* Colors */}
      <section>
        <SectionHeading>Colors</SectionHeading>
        <div className="grid grid-cols-5 gap-6">
          {COLORS.map((color) => (
            <ColorSwatch key={color.token} {...color} />
          ))}
        </div>
        <div className="mt-8 max-w-xs">
          <SubHeading>gold-soft</SubHeading>
          <ColorSwatch
            token="gold-soft"
            hex="rgba(255, 255, 255, 0.08)"
            className="bg-[rgba(255,255,255,0.08)]"
            bordered
          />
        </div>
      </section>

      {/* Typography */}
      <section>
        <SectionHeading>Typography</SectionHeading>

        <SubHeading>Geist Sans — Body</SubHeading>
        <div className="space-y-4 mb-12">
          {GEIST_SANS_SCALE.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-8 border-b border-cream/5 pb-4"
            >
              <p className={`${row.size} ${row.weight} text-cream`}>{row.sample}</p>
              <span className="text-sm text-cream-muted font-mono shrink-0">{row.label}</span>
            </div>
          ))}
        </div>

        <SubHeading>Geist Mono — Stats &amp; Countdown</SubHeading>
        <div className="flex items-baseline justify-between gap-8 border-b border-cream/5 pb-4 mb-12">
          <p className="text-3xl font-bold text-cream font-mono">2d 14h 32m</p>
          <span className="text-sm text-cream-muted font-mono shrink-0">30 / Bold / Mono</span>
        </div>

        <SubHeading>Libre Baskerville Italic — Hero Headline</SubHeading>
        <div className="flex items-baseline justify-between gap-8">
          <p
            className="text-5xl leading-tight tracking-tight text-cream italic font-bold"
            style={{
              fontFamily: "var(--font-libre-baskerville), Georgia, serif",
              textShadow: "0 2px 20px rgba(0,0,0,0.65), 0 1px 4px rgba(0,0,0,0.5)",
            }}
          >
            Dating that finally feels effortless.
          </p>
          <span className="text-sm text-cream-muted font-mono shrink-0">
            48 / Bold Italic
          </span>
        </div>
      </section>

      {/* Shadows & Radius */}
      <section>
        <SectionHeading>Shadows &amp; Border Radius</SectionHeading>

        <SubHeading>Shadows</SubHeading>
        <div className="grid grid-cols-3 gap-8 mb-12">
          <div className="glass-panel rounded-2xl p-8 h-40 flex flex-col justify-end">
            <p className="text-sm font-medium text-cream">shadow-card</p>
            <p className="text-xs text-cream-muted font-mono">Default elevation</p>
          </div>
          <div className="glass-panel rounded-2xl p-8 h-40 flex flex-col justify-end shadow-card-hover">
            <p className="text-sm font-medium text-cream">shadow-card-hover</p>
            <p className="text-xs text-cream-muted font-mono">Hover elevation</p>
          </div>
          <div className="glass-panel rounded-2xl p-8 h-40 flex flex-col justify-end shadow-modal">
            <p className="text-sm font-medium text-cream">shadow-modal</p>
            <p className="text-xs text-cream-muted font-mono">Modal elevation</p>
          </div>
        </div>

        <SubHeading>Border Radius</SubHeading>
        <div className="grid grid-cols-4 gap-8">
          {BORDER_RADII.map((radius) => (
            <div key={radius.label} className="space-y-3">
              <div
                className={`h-24 w-full bg-surface-elevated ${radius.className}`}
              />
              <p className="text-sm text-cream-muted font-mono">{radius.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* UI Components */}
      <section>
        <SectionHeading>UI Components</SectionHeading>

        <div className="grid grid-cols-2 gap-10">
          <div>
            <SubHeading>Glass Panel</SubHeading>
            <div className={glassPanelClass}>
              <h4 className="text-lg font-semibold text-cream">Panel title</h4>
              <p className="text-sm text-cream-muted">
                Default card surface with shadow-card elevation.
              </p>
            </div>
          </div>

          <div>
            <SubHeading>Glass Panel Strong</SubHeading>
            <div className={glassPanelStrongClass}>
              <h4 className="text-lg font-semibold text-cream">Elevated panel</h4>
              <p className="text-sm text-cream-muted">
                Stronger surface for emphasis or nested content.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 max-w-md space-y-6">
          <SubHeading>Form Fields</SubHeading>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="text"
              readOnly
              value="student@mylaurier.ca"
              className={glassInputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Input — Focus state</label>
            <input
              type="text"
              readOnly
              value="Focused input"
              className={`${glassInputClass} bg-[#202020] outline outline-2 outline-[rgba(255,255,255,0.08)] outline-offset-0`}
            />
          </div>
          <div>
            <label className={labelClass}>University</label>
            <select className={glassSelectClass} disabled defaultValue="">
              <option value="">Select your university</option>
            </select>
          </div>
          <button type="button" className={btnPrimaryClass}>
            Get Started
          </button>
        </div>

        <div className="mt-10">
          <SubHeading>Marketing Buttons</SubHeading>
          <div className="flex flex-wrap items-center gap-4">
            <span className="px-8 py-4 bg-white text-gray-600 font-semibold rounded-2xl shadow-xl text-lg">
              Get Started
            </span>
            <span className="px-5 py-2 text-sm bg-black/20 backdrop-blur-sm text-white rounded-full border border-white/30">
              Sign up
            </span>
            <span className="px-5 py-2 text-sm text-white">Log in</span>
          </div>
        </div>

        <div className="mt-10 max-w-lg space-y-3">
          <SubHeading>Quiz Option Buttons</SubHeading>
          <div className="w-full text-left px-5 py-4 rounded-xl glass-panel text-cream/90">
            <span className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full border-2 border-cream-faint flex-shrink-0" />
              Unselected option
            </span>
          </div>
          <div className="w-full text-left px-5 py-4 rounded-xl bg-cream text-mahogany-deep shadow-lg">
            <span className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full border-2 border-mahogany-deep flex items-center justify-center flex-shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-mahogany-deep" />
              </span>
              Selected option
            </span>
          </div>
        </div>

        <div className="mt-10">
          <SubHeading>Secondary Action</SubHeading>
          <span className="inline-block px-6 py-3 rounded-xl border border-mahogany text-muted">
            Back
          </span>
        </div>
      </section>

      {/* Feedback States */}
      <section>
        <SectionHeading>Feedback States</SectionHeading>

        <div className="space-y-4 max-w-lg mb-10">
          <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            Please verify your email before logging in.
          </div>
          <div className="bg-green-950/50 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">
            Your email has been verified successfully.
          </div>
          <div className="bg-amber-950/50 border border-amber-800 text-amber-200 text-sm rounded-lg px-4 py-3">
            Complete your profile to opt in for this week&apos;s match.
          </div>
        </div>

        <SubHeading>Progress Bar</SubHeading>
        <div className="max-w-md space-y-2">
          <div className="flex justify-between text-sm text-cream-muted">
            <span>Question 12 of 74</span>
            <span>16%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
            <div className="h-full bg-cream rounded-full" style={{ width: "16%" }} />
          </div>
        </div>
      </section>
    </div>
  );
}
