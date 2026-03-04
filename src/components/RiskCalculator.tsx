"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import questionsData from "@/data/complianceQuestions.json";
import { generateComplianceReport } from "@/lib/generatePDF";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnswerOption {
  label: string;
  riskWeight: number;
}

interface ComplianceQuestion {
  id: string;
  category: string;
  questionText: string;
  options: AnswerOption[];
  legalContext: string;
}

/** Map of question ID → selected riskWeight. */
type Answers = Record<string, number>;

/** Validated lead contact data from the optional capture form. */
interface LeadFormData {
  voornaam: string;
  achternaam: string;
  bedrijfsnaam: string;
  email: string;
}

/** Shape of the document written to the Firestore `leads` collection. */
interface AssessmentPayload extends LeadFormData {
  answers: Answers;
  totalRiskScore: number;
  riskLevel: RiskLevel;
  createdAt: ReturnType<typeof serverTimestamp>;
}

/** Colour-coded risk classification derived from the total score. */
type RiskLevel = "hoog" | "beperkt" | "minimaal";

// ─── Data ─────────────────────────────────────────────────────────────────────

const questions = questionsData as ComplianceQuestion[];
const TOTAL = questions.length;
const MAX_SCORE = TOTAL * 10; // 50 with current question set

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Derives a risk classification from a raw integer score.
 * Thresholds: ≥10 → hoog | 5–9 → beperkt | <5 → minimaal
 */
function classifyRisk(score: number): RiskLevel {
  if (score >= 10) return "hoog";
  if (score >= 5) return "beperkt";
  return "minimaal";
}

/**
 * Persists the assessment result and lead data to Firestore.
 * Only called when the user voluntarily submits the lead form.
 *
 * @param formData       Validated contact details.
 * @param answers        Map of question IDs to selected riskWeight values.
 * @param totalRiskScore Pre-calculated client-side score.
 * @param riskLevel      Pre-classified risk tier.
 * @throws               Re-throws Firestore errors for the caller to handle.
 */
async function submitAssessment(
  formData: LeadFormData,
  answers: Answers,
  totalRiskScore: number,
  riskLevel: RiskLevel
): Promise<string> {
  const payload: AssessmentPayload = {
    ...formData,
    answers,
    totalRiskScore,
    riskLevel,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, "leads"), payload);
  return docRef.id;
}

// ─── Risk level config ─────────────────────────────────────────────────────────

const riskConfig: Record<
  RiskLevel,
  {
    label: string;
    sublabel: string;
    summary: string;
    iconPath: string;
    color: {
      cardBorder: string;
      cardGlow: string;
      labelBg: string;
      labelText: string;
      barFill: string;
      barGlow: string;
      divider: string;
      scoreText: string;
    };
  }
> = {
  hoog: {
    label: "Hoog Risico",
    sublabel: "Directe Actie Vereist",
    summary:
      "Uw AI-systemen vertonen kritieke kenmerken die directe actie vereisen onder de EU AI Act. Zonder ingrijpen loopt u risico op handhaving, aanzienlijke boetes en reputatieschade.",
    iconPath:
      "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
    color: {
      cardBorder: "border-red-500/30",
      cardGlow: "shadow-[0_0_40px_-8px_rgba(239,68,68,0.3)]",
      labelBg: "bg-red-500/20 text-red-300 border border-red-500/30",
      labelText: "text-red-300",
      barFill: "bg-red-500",
      barGlow: "shadow-[0_0_12px_2px_rgba(239,68,68,0.5)]",
      divider: "bg-red-500/20",
      scoreText: "text-red-400",
    },
  },
  beperkt: {
    label: "Beperkt Risico",
    sublabel: "Actie Gewenst",
    summary:
      "Uw AI-systemen voldoen gedeeltelijk aan de EU AI Act, maar er zijn aantoonbare hiaten. Proactieve maatregelen zijn sterk aanbevolen om compliance te waarborgen vóór toezichthouders ingrijpen.",
    iconPath:
      "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
    color: {
      cardBorder: "border-amber-500/30",
      cardGlow: "shadow-[0_0_40px_-8px_rgba(245,158,11,0.3)]",
      labelBg: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
      labelText: "text-amber-300",
      barFill: "bg-amber-400",
      barGlow: "shadow-[0_0_12px_2px_rgba(245,158,11,0.5)]",
      divider: "bg-amber-500/20",
      scoreText: "text-amber-400",
    },
  },
  minimaal: {
    label: "Minimaal Risico",
    sublabel: "Compliant",
    summary:
      "Uw AI-systemen tonen een sterke compliance-positie. Periodieke herbeoordelingen zijn aanbevolen naarmate de EU AI Act-handhaving en bijbehorende richtsnoeren verder worden uitgewerkt.",
    iconPath:
      "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: {
      cardBorder: "border-emerald-500/30",
      cardGlow: "shadow-[0_0_40px_-8px_rgba(16,185,129,0.3)]",
      labelBg: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
      labelText: "text-emerald-300",
      barFill: "bg-emerald-500",
      barGlow: "shadow-[0_0_12px_2px_rgba(16,185,129,0.5)]",
      divider: "bg-emerald-500/20",
      scoreText: "text-emerald-400",
    },
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium tracking-widest text-slate-500 uppercase">
          Vraag {current} van {total}
        </span>
        <span className="text-xs font-semibold text-indigo-400">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-800">
        <div
          className="h-2 rounded-full bg-indigo-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CategoryChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-300">
      {label}
    </span>
  );
}

function OptionCard({
  option,
  onClick,
}: {
  option: AnswerOption;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl border border-slate-700 bg-slate-800/40 px-6 py-4 text-left
                 text-sm font-medium text-slate-300
                 transition-all duration-200
                 hover:border-blue-500 hover:bg-slate-800 hover:text-slate-100
                 hover:shadow-[0_0_20px_-4px_rgba(99,102,241,0.4)]
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50
                 active:scale-[0.99]"
    >
      <span className="flex items-center gap-3">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2
                       border-slate-600 transition-colors group-hover:border-indigo-400
                       group-hover:shadow-[0_0_8px_2px_rgba(99,102,241,0.4)]"
        />
        {option.label}
      </span>
    </button>
  );
}

/** Shared input class for the lead capture form. */
const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200 " +
  "placeholder:text-slate-600 transition-all backdrop-blur-sm " +
  "focus:outline-none focus:border-indigo-500/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20";

/**
 * Value-first results screen.
 * Score and risk tier are revealed immediately at the top.
 * The lead capture form sits below as an optional "unlock" action.
 */
function ResultsScreen({
  totalRiskScore,
  riskLevel,
  answers,
}: {
  totalRiskScore: number;
  riskLevel: RiskLevel;
  answers: Answers;
}) {
  const cfg = riskConfig[riskLevel];
  const c = cfg.color;
  const pct = Math.min(Math.round((totalRiskScore / MAX_SCORE) * 100), 100);

  const [form, setForm] = useState<LeadFormData>({
    voornaam: "",
    achternaam: "",
    bedrijfsnaam: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleLeadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // ── Step 1: kick off ───────────────────────────────────────────────
      console.log("Step 1: Starting submission...");

      // ── Step 2: Firestore write ────────────────────────────────────────
      console.log("Step 2: Firebase save initiated...");
      const docId = await submitAssessment(form, answers, totalRiskScore, riskLevel);
      console.log("Step 3: Firebase save complete. ID: ", docId);

      // ── Step 4: PDF generation (isolated — a crash here must NOT block success) ──
      console.log("Step 4: Generating PDF...");
      try {
        generateComplianceReport(form, answers, totalRiskScore, riskLevel);
      } catch (pdfErr) {
        // PDF failure is non-fatal: log it and continue to the success screen.
        console.error("PDF Failed", pdfErr);
      }

      // ── Step 5: show success ───────────────────────────────────────────
      console.log("Step 5: Process complete.");
      setIsSuccess(true);

    } catch (err) {
      // Firestore (or network) failure — surface it to the user.
      console.error("Firestore submission failed:", err);
      setSubmitError(
        "Er ging iets mis bij het opslaan. Probeer het opnieuw."
      );
    } finally {
      // CRITICAL: spinner ALWAYS stops, regardless of success or failure.
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ══ SECTION 1 — Score Reveal ══════════════════════════════════════════ */}
      <div className={`rounded-2xl border ${c.cardBorder} bg-slate-900/60 p-6 backdrop-blur-sm ${c.cardGlow}`}>

        {/* Risk label badge */}
        <div className="mb-5 flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3.5 py-1 text-xs font-bold tracking-widest uppercase ${c.labelBg}`}>
            {cfg.label}
          </span>
          <span className="text-xs font-medium text-slate-500">{cfg.sublabel}</span>
        </div>

        {/* Score number — dashboard style, glowing */}
        <div className="mb-1 flex items-baseline gap-2">
          <span className={`text-6xl font-extrabold tracking-tight ${c.scoreText}`}
            style={{ textShadow: "0 0 30px currentColor" }}
          >
            {totalRiskScore}
          </span>
          <span className="text-xl font-semibold text-slate-600">/ {MAX_SCORE}</span>
          <span className="ml-1 text-sm font-medium text-slate-500">risicopunten</span>
        </div>

        {/* Score sub-label */}
        <p className="mb-5 text-xs font-medium text-slate-600 uppercase tracking-widest">
          Uw Risicoscore
        </p>

        {/* Horizontal score bar — glowing */}
        <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-1 rounded-full ${c.barFill} transition-all duration-700 ${c.barGlow}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Interpretive summary */}
        <p className="text-sm leading-relaxed text-slate-400">{cfg.summary}</p>
      </div>

      {/* ══ SECTION 2 — Lead Capture / Unlock the Report ═════════════════════ */}
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 backdrop-blur-sm shadow-lg">

        {isSuccess ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            {/* Glowing green checkmark */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_30px_-4px_rgba(16,185,129,0.4)]">
              <svg
                className="h-8 w-8 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* Heading & body */}
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold tracking-tight text-slate-100">
                Rapport succesvol gedownload
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-slate-400">
                Uw gepersonaliseerde actierapport is gegenereerd. Wij nemen op korte termijn
                contact met u op om de resultaten en vervolgstappen te bespreken.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Form header */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
                Gratis actierapport
              </p>
              <h3 className="text-base font-semibold text-slate-100">
                Ontvang het volledige actierapport
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Laat uw gegevens achter om de gedetailleerde analyse en een eerste stappenplan te downloaden.
              </p>
            </div>

            <div className={`h-px w-full ${c.divider}`} />

            {/* Form fields */}
            <form onSubmit={handleLeadSubmit} className="flex flex-col gap-4" noValidate>
              {/* Row 1 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="voornaam" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Voornaam
                  </label>
                  <input
                    id="voornaam" name="voornaam" type="text" required
                    autoComplete="given-name" placeholder="Jan"
                    value={form.voornaam} onChange={handleChange}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="achternaam" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Achternaam
                  </label>
                  <input
                    id="achternaam" name="achternaam" type="text" required
                    autoComplete="family-name" placeholder="de Vries"
                    value={form.achternaam} onChange={handleChange}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bedrijfsnaam" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Bedrijfsnaam
                </label>
                <input
                  id="bedrijfsnaam" name="bedrijfsnaam" type="text" required
                  autoComplete="organization" placeholder="Acme B.V."
                  value={form.bedrijfsnaam} onChange={handleChange}
                  className={inputCls}
                />
              </div>

              {/* Row 3 */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Zakelijk E-mailadres
                </label>
                <input
                  id="email" name="email" type="email" required
                  autoComplete="work email" placeholder="jan@bedrijf.nl"
                  value={form.email} onChange={handleChange}
                  className={inputCls}
                />
              </div>

              {/* Error */}
              {submitError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                  ⚠ {submitError}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl
                           bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white
                           shadow-[0_0_20px_-4px_rgba(99,102,241,0.5)]
                           transition-all duration-200
                           hover:bg-indigo-500 hover:shadow-[0_0_28px_-4px_rgba(99,102,241,0.7)]
                           disabled:cursor-not-allowed disabled:opacity-50
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Rapport wordt verstuurd…
                  </>
                ) : (
                  <>
                    Stuur mij het rapport & plan een audit
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-600">
                Geen spam. Uw gegevens worden vertrouwelijk behandeld.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RiskCalculator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<{
    totalRiskScore: number;
    riskLevel: RiskLevel;
  } | null>(null);

  const question = questions[currentStep];
  const isLastQuestion = currentStep === TOTAL - 1;
  const showResults = result !== null;

  function handleAnswer(option: AnswerOption) {
    const updated = { ...answers, [question.id]: option.riskWeight };
    setAnswers(updated);

    if (isLastQuestion) {
      // Immediate client-side calculation — no gating
      const totalRiskScore = Object.values(updated).reduce((sum, w) => sum + w, 0);
      const riskLevel = classifyRisk(totalRiskScore);
      setResult({ totalRiskScore, riskLevel });
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }

  return (
    <div className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 backdrop-blur-md shadow-2xl shadow-blue-900/20">
      {/* ── Card Header ── */}
      <div className="border-b border-slate-800 px-8 pt-8 pb-6">
        {!showResults ? (
          <ProgressBar current={currentStep + 1} total={TOTAL} />
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-widest text-slate-500 uppercase">
              EU AI Act Risicobeoordeling — Resultaat
            </span>
            <span className="text-xs font-semibold text-emerald-400">✓ Voltooid</span>
          </div>
        )}
      </div>

      {/* ── Card Body ── */}
      <div className="px-8 py-10">
        {showResults ? (
          <ResultsScreen
            totalRiskScore={result.totalRiskScore}
            riskLevel={result.riskLevel}
            answers={answers}
          />
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <CategoryChip label={question.category} />
              <h2 className="text-xl font-bold leading-snug tracking-tight text-slate-100 sm:text-2xl">
                {question.questionText}
              </h2>
              <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
                <span className="mt-px shrink-0 opacity-70">⚖️</span>
                <span>{question.legalContext}</span>
              </p>
            </div>
            <div className="h-px w-full bg-slate-800" />
            <div className="flex flex-col gap-3">
              {question.options.map((option) => (
                <OptionCard
                  key={option.label}
                  option={option}
                  onClick={() => handleAnswer(option)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Card Footer — back nav only during questions ── */}
      {!showResults && currentStep > 0 && (
        <div className="flex items-center border-t border-slate-800 px-8 py-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600
                       transition-colors hover:text-slate-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Vorige vraag
          </button>
        </div>
      )}
    </div>
  );
}
