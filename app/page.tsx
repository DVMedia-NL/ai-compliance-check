import ComplianceWizard from "@/components/ComplianceWizard";
import CookieBanner from "@/components/CookieBanner";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16 overflow-hidden bg-navy">
      {/* Refined subtle ambient glow for Quiet Luxury */}
      <div
        className="pointer-events-none absolute top-[-10%] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gold/5 blur-[120px]"
        aria-hidden="true"
      />

      {/* ── App Header ── */}
      <header className="relative mb-12 text-center z-10 w-full max-w-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-1.5 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_6px_2px_rgba(212,175,55,0.4)]" />
          <span className="text-xs font-medium tracking-widest text-gold uppercase">
            EU AI Act · Bijlage III
          </span>
        </div>

        <h1 className="mt-2 text-3xl font-light tracking-tight sm:text-4xl lg:text-5xl text-foreground">
          AI Compliance <span className="font-semibold text-gold">Risicocalculator</span>
        </h1>

        <p className="mt-6 mx-auto max-w-lg text-sm leading-relaxed text-slate-secondary">
          Beoordeel in 9 stappen discreet en efficiënt de compliance-status van uw AI-systeem ten
          opzichte van de EU AI-verordening.
        </p>
      </header>

      {/* ── Wizard Card ── */}
      <main className="relative z-10 w-full max-w-2xl">
        <ComplianceWizard />
      </main>

      {/* ── Footer ── */}
      <footer className="relative mt-16 text-xs text-slate-secondary/60 z-10">
        © {new Date().getFullYear()} · DV Social · Gebaseerd op EU AI-verordening
        (2024/1689)
      </footer>

      {/* ── Cookie Consent ── */}
      <CookieBanner />
    </div>
  );
}
