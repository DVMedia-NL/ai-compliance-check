import RiskCalculator from "@/components/RiskCalculator";

export default function Home() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.15) 0%, transparent 60%), linear-gradient(to bottom, #0f172a, #020617)",
      }}
    >
      {/* Subtle grid overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── App Header ── */}
      <header className="relative mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_2px_rgba(129,140,248,0.6)]" />
          <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">
            EU AI Act · Bijlage III
          </span>
        </div>
        <h1
          className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
          style={{
            background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 60%, #e879f9 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          AI Compliance Risicocalculator
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
          Beoordeel in vijf stappen de compliance-status van uw AI-systeem ten
          opzichte van de EU AI-verordening. Resultaten zijn uitsluitend
          indicatief.
        </p>
      </header>

      {/* ── Wizard Card ── */}
      <main className="relative w-full max-w-2xl">
        <RiskCalculator />
      </main>

      {/* ── Footer ── */}
      <footer className="relative mt-12 text-xs text-slate-600">
        © {new Date().getFullYear()} · Gebaseerd op EU AI-verordening
        (2024/1689) · Niet juridisch advies
      </footer>
    </div>
  );
}
