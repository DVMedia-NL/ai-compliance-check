"use client";

import { useState, useEffect } from "react";
import SkeletonCard from "./SkeletonCard";
import QuestionCard from "./QuestionCard";

// ─── Data & Logic ─────────────────────────────────────────────────────────────

interface AnswerOption {
  label: string;
  riskWeight: number;
}

interface ComplianceQuestion {
  id: string;
  category: string;
  questionText: string;
  legalContext: string;
  options: AnswerOption[];
}

const questions: ComplianceQuestion[] = [
  {
    id: "q1",
    category: "Shadow AI & Tooling",
    questionText: "Maken u of uw medewerkers momenteel gebruik van generatieve AI-tools (zoals ChatGPT, Claude of Copilot) voor het opstellen van vacatureteksten, of het samenvatten/beoordelen van cv's en sollicitatiebrieven?",
    legalContext: "Ongereguleerd gebruik van externe AI-tools voor besluitvorming rondom werving wordt onder de AI Act geclassificeerd als 'Hoog Risico' (Bijlage III).",
    options: [
      { label: "Ja, we gebruiken deze tools regelmatig.", riskWeight: 5 },
      { label: "Ja, incidenteel of ongeautoriseerd (Shadow AI).", riskWeight: 5 },
      { label: "Nee, wij hebben het gebruik van AI hiervoor strikt verboden en geblokkeerd.", riskWeight: 0 }
    ]
  },
  {
    id: "q2",
    category: "Provider Liability (Artikel 25)",
    questionText: "Heeft uw organisatie een bestaande AI-tool wezenlijk aangepast, getraind op eigen bedrijfsdata (zoals eerdere cv's of prestatiebeoordelingen), of geïntegreerd in het eigen ATS (Applicant Tracking System)?",
    legalContext: "Artikel 25 stelt dat u juridisch transformeert van 'Gebruiker' naar 'Aanbieder' (Provider) zodra u een systeem substantieel wijzigt. Dit brengt maximale compliance-eisen met zich mee.",
    options: [
      { label: "Ja, we hebben modellen getraind met eigen data of API-integraties gebouwd.", riskWeight: 10 },
      { label: "We onderzoeken de mogelijkheden voor integratie in ons ATS.", riskWeight: 5 },
      { label: "Nee, we gebruiken uitsluitend standaard out-of-the-box software zonder aanpassingen.", riskWeight: 0 }
    ]
  },
  {
    id: "q3",
    category: "Human Oversight (Artikel 14)",
    questionText: "Zijn er formele, gedocumenteerde processen waarbij een menselijke beoordelaar (Human Oversight) de output van AI-systemen controleert vóórdat een kandidaat wordt afgewezen?",
    legalContext: "Artikel 14 vereist dat hoog-risico AI-systemen te allen tijde effectief door mensen onder toezicht staan om automatisering bias en discriminatie te voorkomen.",
    options: [
      { label: "Nee, het systeem filtert kandidaten zelfstandig voordat een mens ze ziet.", riskWeight: 8 },
      { label: "We controleren de output soms, maar dit is niet formeel gedocumenteerd.", riskWeight: 4 },
      { label: "Ja, elke beslissing wordt getoetst door een getrainde HR-professional (Human-in-the-loop).", riskWeight: 0 }
    ]
  },
  {
    id: "q4",
    category: "Transparantievereisten",
    questionText: "Worden sollicitanten vooraf actief en expliciet geïnformeerd dat hun data, cv's of videopitches worden geanalyseerd door een AI-systeem?",
    legalContext: "De AI Act stelt strenge transparantie-eisen. Sollicitanten moeten weten dat zij interactie hebben met of beoordeeld worden door AI.",
    options: [
      { label: "Nee, we hebben hier nog geen vermelding van gemaakt in procedure.", riskWeight: 5 },
      { label: "Dit staat ergens weggestopt in onze algemene privacyverklaring.", riskWeight: 3 },
      { label: "Ja, dit wordt expliciet en in duidelijke taal vooraf gemeld aan elke kandidaat.", riskWeight: 0 }
    ]
  },
  {
    id: "q5",
    category: "Data Governance (Artikel 10)",
    questionText: "Heeft u in kaart gebracht waar de data (cv's, persoonsgegevens) die u in AI-tools invoert fysiek wordt opgeslagen en getraind door de AI-leverancier?",
    legalContext: "Artikel 10 vereist hoogwaardige datagovernance. Het voeden van persoonsgegevens aan openbare modellen (zoals de openbare ChatGPT) is een kritiek datalek en in strijd met de AVG en de AI Act.",
    options: [
      { label: "Nee, we hebben geen controle of inzicht in hoe de AI-tool (zoals OpenAI/Microsoft) onze data gebruikt.", riskWeight: 6 },
      { label: "We hebben Enterprise-licenties, maar de data-opslag is niet getoetst.", riskWeight: 3 },
      { label: "Ja, we hebben gesloten 'zero-data-retention' overeenkomsten en data blijft in de EU.", riskWeight: 0 }
    ]
  }
];

type RiskLevel = "low" | "medium" | "critical";

function getRiskLevel(score: number): RiskLevel {
  if (score >= 16) return "critical";
  if (score >= 6) return "medium";
  return "low";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RiskCalculator() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // States: 'questions' | 'lead_capture' | 'results'
  const [viewState, setViewState] = useState<"questions" | "lead_capture" | "results">("questions");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({ name: "", email: "", company: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const totalScore = Object.values(answers).reduce((sum, val) => sum + val, 0);
  const riskLevel = getRiskLevel(totalScore);

  const handleOptionSelect = (weight: number) => {
    const currentQ = questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [currentQ.id]: weight }));

    setIsTransitioning(true);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsTransitioning(false);
      } else {
        setViewState("lead_capture");
        setIsTransitioning(false);
      }
    }, 600); // 600ms artificial delay to show SkeletonLoader preventing CLS and building tension
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError("");

    try {
      const nameParts = formData.name.trim().split(" ");
      const voornaam = nameParts[0] || "";
      const achternaam = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

      const response = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voornaam,
          achternaam,
          bedrijfsnaam: formData.company,
          email: formData.email,
          risicoscore: totalScore,
          risiconiveau: riskLevel
        }),
      });

      if (!response.ok) {
        throw new Error("Er is een netwerkfout opgetreden bij het verzenden van uw scan.");
      }

      setIsSuccess(true);
      setIsSubmitting(false);

    } catch (err: any) {
      setApiError(err.message || "Interne server fout. Probeer het opnieuw.");
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    // Native browser print mechanism - triggers PDF generation dialog securely
    window.print();
  };

  // ─── Render: Dynamic State Mapping ─────────────────────────────────────────────
  let resultProfile = null;
  if (riskLevel === "low") {
    resultProfile = {
      status: "AUDIT-READY - Laag Risico",
      description: "Gecontroleerd en Compliant. Uw organisatie toont een volwassen begrip van de EU AI-verordening. U maakt veilig gebruik van AI zonder fundamentele rechten te schenden of onbedoeld de leveranciersrol op u te nemen.",
      callToAction: "Blijf uw systemen periodiek monitoren op compliance met de EU AI Act. Zorg ervoor dat elke toekomstige AI-implementatie intern getoetst wordt op onbedoelde leveranciersverantwoordelijkheden."
    };
  } else if (riskLevel === "medium") {
    resultProfile = {
      status: "ACTION REQUIRED - Article 14 Exposure",
      description: "Verhoogd risico op boetes en reputatieschade. U bevindt zich in de gevarenzone. Er is sprake van ongestructureerd AI-gebruik op de HR-afdeling (Shadow AI) en een kritiek gebrek aan gedocumenteerd menselijk toezicht (Artikel 14).",
      callToAction: "Vraag de 'Artikel 14 Blueprint' aan bij DV Social voor direct implementeerbare protocollen. Formaliseer processen rondom menselijk toezicht (Human-in-the-loop) in lijn met Artikel 14."
    };
  } else if (riskLevel === "critical") {
    resultProfile = {
      status: "CRITICAL - Article 25 Provider Liability",
      description: "Uit uw antwoorden blijkt een hoog-risico profiel dat onmiddellijke actie vereist. Door systemen aan te passen, te voeden met eigen dataset (cv's/beoordelingen), of ongestructureerde AI-output te gebruiken in uw selectieproces, transformeert uw organisatie onder Artikel 25 van de EU AI Act juridisch van een 'Gebruiker' naar een 'Aanbieder' (Provider). Dit is de meest kritieke valkuil in de nieuwe wetgeving. Het betekent dat u als werkgever volledig verantwoordelijk wordt gehouden voor de conformiteitsbeoordeling, CE-markering eisen, en de risicobeheersystemen van de onderliggende AI-technologie.",
      callToAction: "ONMIDDELLIJKE RISICOBEPERKING: Plan direct uw Noodconsult bij DV Social in om de omvang van de blootstelling vast te stellen en een formeel conformiteitstraject voor uw systemen in te regelen. Staak tijdelijk het gebruik van gemodificeerde AI in uw recruitment funnel totdat deze juridisch is geprevalideerd."
    };
  }

  // ─── Render: Screen UI Assembly ───────────────────────────────────────────────
  let screenUI = null;

  if (isTransitioning) {
    screenUI = <SkeletonCard />;
  } else if (viewState === "results") {
    screenUI = (
      <QuestionCard className="animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-6 pt-2 pb-2 pl-4 pr-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-4 py-1.5">
            <span className="text-xs font-semibold tracking-widest text-gold uppercase">
              Audit Rapport Gegenereerd
            </span>
          </div>

          {riskLevel === "low" && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground mx-auto text-emerald-400">Audit-Ready</h2>
              <p className="text-slate-secondary">Gecontroleerd en Compliant. Uw organisatie toont een volwassen begrip van de EU AI-verordening. U maakt veilig gebruik van AI zonder fundamentele rechten te schenden of onbedoeld de leveranciersrol op u te nemen.</p>
              <div className="pt-4">
                <button onClick={() => window.location.reload()} className="w-full rounded-lg bg-navy/50 border border-gold/30 px-8 py-3 text-sm font-medium text-gold hover:bg-gold/10 transition-colors">
                  Nieuwe Scan Starten
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="w-full rounded-lg bg-transparent border border-slate-secondary/30 px-8 py-3 text-sm font-medium text-slate-secondary hover:bg-slate-secondary/10 transition-colors mt-4"
                >
                  📄 Download Audit-Rapport (PDF)
                </button>
              </div>
            </div>
          )}

          {riskLevel === "medium" && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground mx-auto text-amber-400">Action Required: Article 14 Exposure</h2>
              <p className="text-slate-secondary">Verhoogd risico op boetes en reputatieschade. U bevindt zich in de gevarenzone. Er is sprake van ongestructureerd AI-gebruik op de HR-afdeling (Shadow AI) en een kritiek gebrek aan gedocumenteerd menselijk toezicht (Artikel 14).</p>
              <div className="pt-4">
                <button className="w-full rounded-lg bg-gold px-8 py-3 text-sm font-medium text-navy hover:bg-white hover:text-navy transition-colors">
                  Vraag 'Artikel 14 Blueprint' aan
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="w-full rounded-lg bg-transparent border border-slate-secondary/30 px-8 py-3 text-sm font-medium text-slate-secondary hover:bg-slate-secondary/10 transition-colors mt-4"
                >
                  📄 Download Audit-Rapport (PDF)
                </button>
              </div>
            </div>
          )}

          {riskLevel === "critical" && (
            <div className="space-y-6 text-left bg-red-950/20 p-6 rounded-xl border border-red-500/30">
              <h2 className="text-2xl font-bold text-red-500 flex items-center gap-3">
                <span>🚨</span> KRITIEK RISICO: Onbedoelde 'Provider Liability' geconstateerd.
              </h2>
              <div className="space-y-4 text-sm text-foreground/90">
                <p>Uit uw antwoorden blijkt een hoog-risico profiel dat onmiddellijke actie vereist. Door systemen aan te passen, te voeden met eigen dataset (cv's/beoordelingen), of ongestructureerde AI-output te gebruiken in uw selectieproces, transformeert uw organisatie onder <strong>Artikel 25 van de EU AI Act</strong> juridisch van een 'Gebruiker' naar een <strong>'Aanbieder' (Provider)</strong>.</p>
                <p>Dit is de meest kritieke valkuil in de nieuwe wetgeving. Het betekent dat <strong>u</strong> als werkgever volledig verantwoordelijk wordt gehouden voor de conformiteitsbeoordeling, CE-markering eisen, en de risicobeheersystemen van de onderliggende AI-technologie. De toezichthouder tolereert in de regio Brainport geen onbewuste 'Shadow AI' in HR. De boetes voor het schenden van hoog-risico AI-bepalingen (zoals recruitment) kunnen oplopen tot €35 miljoen of 7% van de wereldwijde jaaromzet.</p>
                <p>Daarnaast ontbreekt aantoonbaar het verplichte menselijke toezicht (Artikel 14), wat het risico op ongeoorloofde bias en arbeidsrechtelijke claims exponentieel vergroot.</p>
              </div>

              <div className="pt-6 border-t border-red-500/20">
                <p className="text-sm font-medium text-slate-secondary mb-4">U bent momenteel juridisch en technisch uiterst kwetsbaar. DV Social biedt een spoedinterventie: de <strong>AI Compliance Due Diligence Audit</strong>.</p>
                <div>
                  <button className="w-full rounded-lg bg-gold px-8 py-4 text-sm font-bold text-navy hover:bg-white transition-colors shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                    Plan direct uw Noodconsult (C-Level Privé Briefing) - Capaciteit Beperkt
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full rounded-lg bg-transparent border border-slate-secondary/30 px-8 py-4 text-sm font-medium text-slate-secondary hover:bg-slate-secondary/10 transition-colors mt-4"
                  >
                    📄 Download Audit-Rapport (PDF)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </QuestionCard>
    );
  } else if (viewState === "lead_capture") {
    screenUI = (
      <div className="relative w-full mx-auto animate-in fade-in duration-500 min-h-[500px]">
        {/* Background Layer: The "Blurred Report" */}
        <div className="absolute inset-0 z-0 bg-white/[0.02] border border-white/5 rounded-2xl p-6 sm:p-8 overflow-hidden pointer-events-none select-none">
          <div className="w-full h-full opacity-40 blur-sm flex flex-col gap-6">
            {/* Fake Report Header */}
            <div className="flex justify-between items-end border-b border-slate-secondary/20 pb-4">
              <div className="space-y-2 w-1/2">
                <div className="h-6 w-full bg-slate-secondary/20 rounded"></div>
                <div className="h-3 w-2/3 bg-slate-secondary/10 rounded"></div>
              </div>
              <div className="h-8 w-8 rounded-full bg-gold/20"></div>
            </div>

            {/* Fake Text Paragraphs */}
            <div className="space-y-3">
              <div className="h-3 w-full bg-slate-secondary/10 rounded"></div>
              <div className="h-3 w-11/12 bg-slate-secondary/10 rounded"></div>
              <div className="h-3 w-4/5 bg-slate-secondary/10 rounded"></div>
              <div className="h-3 w-full bg-slate-secondary/10 rounded"></div>
              <div className="h-3 w-3/4 bg-slate-secondary/10 rounded"></div>
            </div>

            {/* Fake Graph & Bullets */}
            <div className="flex gap-6 pt-4">
              <div className="h-32 w-1/3 bg-slate-secondary/10 rounded-xl border border-slate-secondary/5"></div>
              <div className="space-y-4 flex-1 pt-2">
                <div className="flex items-center gap-3"><div className="h-1.5 w-1.5 rounded-full bg-gold/40"></div><div className="h-3 w-5/6 bg-slate-secondary/10 rounded"></div></div>
                <div className="flex items-center gap-3"><div className="h-1.5 w-1.5 rounded-full bg-gold/40"></div><div className="h-3 w-full bg-slate-secondary/10 rounded"></div></div>
                <div className="flex items-center gap-3"><div className="h-1.5 w-1.5 rounded-full bg-gold/40"></div><div className="h-3 w-2/3 bg-slate-secondary/10 rounded"></div></div>
                <div className="flex items-center gap-3"><div className="h-1.5 w-1.5 rounded-full bg-gold/40"></div><div className="h-3 w-4/5 bg-slate-secondary/10 rounded"></div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Foreground Layer: The Lead Gate */}
        <div className="relative z-10 m-4 sm:m-8 lg:m-12 bg-navy/95 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-gold/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-700 delay-150">
          <div className="text-center mb-6">
            <h2 className="text-xs font-semibold tracking-widest text-slate-secondary uppercase mb-3">Voorlopige Status:</h2>
            {riskLevel === "low" && <h3 className="text-2xl sm:text-3xl font-bold text-emerald-400">🟢 Audit-Ready</h3>}
            {riskLevel === "medium" && <h3 className="text-2xl sm:text-3xl font-bold text-amber-400">🟠 Action Required</h3>}
            {riskLevel === "critical" && <h3 className="text-2xl sm:text-3xl font-bold text-red-500 drop-shadow-md">🔴 CRITICAL: Article 25 Liability</h3>}

            <p className="mt-5 text-sm text-foreground/90 font-medium max-w-sm mx-auto leading-relaxed">
              Uw voorlopige risico-status is berekend. Vul uw gegevens in om het volledige, gepersonaliseerde audit-rapport en uw actieplan direct te ontgrendelen.
            </p>
          </div>

          {isSuccess ? (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="p-6 rounded-xl bg-navy/80 border border-gold/30 text-center shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-gold/20 mb-4">
                  <span className="text-xl text-gold">✓</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Uw rapport is verzonden naar <span className="text-gold break-words">{formData.email}</span>
                </h3>
                <p className="text-sm text-slate-secondary">
                  Wij nemen binnen 24 uur contact op voor uw gratis intake.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-slate-secondary/80 mb-1">Volledige Naam</label>
                <input
                  id="name"
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-slate-secondary/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition-colors"
                  placeholder="Voornaam Achternaam"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-xs font-medium text-slate-secondary/80 mb-1">Bedrijfsnaam</label>
                <input
                  id="company"
                  required
                  type="text"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-slate-secondary/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition-colors"
                  placeholder="Uw Organisatie"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-secondary/80 mb-1">Zakelijk E-mailadres</label>
                <input
                  id="email"
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-slate-secondary/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition-colors"
                  placeholder="naam@bedrijf.nl"
                />
              </div>

              {apiError && (
                <div className="p-3 rounded-lg bg-red-900/30 border border-red-500/30 text-xs text-red-400">
                  {apiError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-lg bg-gold px-8 py-3.5 text-sm font-semibold text-navy hover:bg-white hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" />
                    Bezig met verzenden...
                  </>
                ) : (
                  "Stuur mij het rapport & plan een audit"
                )}
              </button>
              <p className="text-[10px] text-center text-slate-secondary/50 pt-2">
                Door te klikken op de knop gaat u akkoord met ons privacybeleid.
              </p>
            </form>
          )}
        </div>
      </div>
    );
  } else {
    // viewState === "questions"
    const activeQuestion = questions[currentIndex];
    const progressPercent = Math.round(((currentIndex) / questions.length) * 100);

    screenUI = (
      <QuestionCard className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Progress Track */}
        <div className="mb-8 w-full">
          <div className="flex justify-between text-xs font-medium text-slate-secondary mb-2">
            <span>Stap {currentIndex + 1} van {questions.length}</span>
            <span>{progressPercent}% Voltooid</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gold transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mb-8">
          <span className="mb-3 inline-block rounded-md bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-secondary border border-white/10">
            {activeQuestion.category}
          </span>
          <h2 className="text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
            {activeQuestion.questionText}
          </h2>
          <div className="mt-4 rounded-lg bg-navy/50 border border-slate-secondary/10 p-4">
            <div className="flex gap-3">
              <span className="text-gold mt-0.5">ℹ️</span>
              <p className="text-xs leading-relaxed text-slate-secondary">
                <strong className="text-foreground font-medium">Beleidscontext: </strong>
                {activeQuestion.legalContext}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {activeQuestion.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleOptionSelect(opt.riskWeight)}
              className="w-full text-left p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-gold/30 transition-all duration-200 group flex items-start gap-4"
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-secondary/30 group-hover:border-gold transition-colors">
                <div className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gold transition-colors" />
              </div>
              <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </QuestionCard>
    );
  }

  // ─── Render: Top-Level Return ─────────────────────────────────────────────────
  return (
    <div className="w-full relative">
      {/* --- SCREEN UI (STRICTLY HIDDEN ON PRINT) --- */}
      <div className="print:hidden w-full min-h-screen bg-dv-navy">
        {screenUI}
      </div>

      {/* --- PRINT UI (STRICTLY VISIBLE ONLY ON PRINT) --- */}
      {resultProfile && (
        <div className="hidden print:block w-full bg-white text-black p-12 absolute top-0 left-0 z-50">
          <h1 className="text-3xl font-bold border-b-2 border-black pb-4 mb-6">DV Social - AI Compliance Audit</h1>
          <h2 className="text-2xl font-bold text-red-700 uppercase mb-4">
            STATUS: {resultProfile.status}
          </h2>
          <div className="text-lg leading-relaxed text-justify space-y-4">
            <p>{resultProfile.description}</p>
            <p className="font-bold mt-8">{resultProfile.callToAction}</p>
          </div>
        </div>
      )}
    </div>
  );
}
