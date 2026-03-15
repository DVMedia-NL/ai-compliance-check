"use client";

import { useState } from "react";
import type { AuditSubmission, RiskLevel } from "@/lib/validations/audit";
import { calculateAuditScore } from "@/lib/scoring";

interface WizardQuestion {
    id: keyof AuditSubmission | keyof AuditSubmission["answers"];
    questionText: string;
    options: string[];
    isMultiSelect?: boolean;
}

const WIZARD_QUESTIONS: WizardQuestion[] = [
    {
        id: "sector",
        questionText: "1. In welke sector is uw organisatie actief?",
        options: ["Staffing/uitzendbureau", "Zorg", "Retail", "Logistiek", "Financieel", "Overheid", "Anders"]
    },
    {
        id: "employees",
        questionText: "2. Hoeveel medewerkers heeft uw organisatie?",
        options: ["1-50", "50-250", "250+"]
    },
    {
        id: "tools",
        questionText: "3. Welke AI-tools gebruikt uw organisatie?",
        options: ["ChatGPT", "Microsoft Copilot", "Google Gemini", "Homerun", "Textkernel", "Carerix", "Eigen AI-systeem", "Weet ik niet", "Anders"],
        isMultiSelect: true
    },
    {
        id: "q4",
        questionText: "4. Wordt AI ingezet bij beslissingen over medewerkers of kandidaten?",
        options: ["Ja", "Nee", "Soms", "Weet ik niet"]
    },
    {
        id: "q5",
        questionText: "5. Kan een mens elke AI-beslissing corrigeren of overrulen?",
        options: ["Ja altijd", "Soms", "Nee", "Weet ik niet"]
    },
    {
        id: "q6",
        questionText: "6. Kunt u terugzien welke AI-beslissingen zijn genomen en waarom?",
        options: ["Ja volledig", "Gedeeltelijk", "Nee", "Weet ik niet"]
    },
    {
        id: "q7",
        questionText: "7. Weten medewerkers en kandidaten wanneer AI wordt ingezet bij beslissingen over hen?",
        options: ["Ja aantoonbaar", "Gedeeltelijk", "Nee"]
    },
    {
        id: "q8",
        questionText: "8. Heeft uw organisatie een gedocumenteerd AI-beleid of gedragscode?",
        options: ["Ja", "Nee", "In ontwikkeling"]
    },
    {
        id: "q9",
        questionText: "9. Weet u dat de EU AI Act handhavingsdeadline op 2 augustus 2026 ligt?",
        options: ["Ja we zijn al bezig", "Ja maar we hebben nog niets gedaan", "Nee dit wist ik niet"]
    }
];

export default function ComplianceWizard() {
    const [step, setStep] = useState(0); // 0-8: questions, 9: results
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    // Form and answers state
    const [answers, setAnswers] = useState<Partial<AuditSubmission>>({ tools: [] });
    const [qaAnswers, setQaAnswers] = useState<Record<string, string>>({});
    
    const [leadForm, setLeadForm] = useState({ name: "", company: "", email: "", gdprConsent: false });
    const [apiError, setApiError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState("");

    const handleNext = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            setStep((prev) => prev + 1);
            setIsTransitioning(false);
        }, 200);
    };

    const handleBack = () => {
        if (step > 0) {
            setIsTransitioning(true);
            setTimeout(() => {
                setStep((prev) => prev - 1);
                setIsTransitioning(false);
            }, 200);
        }
    };

    const handleOptionSelect = (qId: string, option: string, isMulti: boolean) => {
        if (isMulti) {
            setAnswers((prev) => {
                const tools = prev.tools || [];
                const updated = tools.includes(option) ? tools.filter((t) => t !== option) : [...tools, option];
                return { ...prev, tools: updated };
            });
        } else if (qId === "sector" || qId === "employees") {
            setAnswers((prev) => ({ ...prev, [qId]: option }));
        } else {
            setQaAnswers((prev) => ({ ...prev, [qId]: option }));
        }
    };

    const submitAudit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError("");
        if (!leadForm.gdprConsent) return;

        setIsSubmitting(true);
        setSuccessMessage("");

        const payload: AuditSubmission = {
            name: leadForm.name,
            company: leadForm.company,
            email: leadForm.email,
            gdprConsent: leadForm.gdprConsent,
            sector: answers.sector as any,
            employees: answers.employees as any,
            tools: answers.tools || [],
            answers: {
                q4: qaAnswers.q4 as any,
                q5: qaAnswers.q5 as any,
                q6: qaAnswers.q6 as any,
                q7: qaAnswers.q7 as any,
                q8: qaAnswers.q8 as any,
                q9: qaAnswers.q9 as any,
            }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        let isSlow = false;
        
        const slowTimeoutId = setTimeout(() => {
            isSlow = true;
            setSuccessMessage("Het rapport wordt verstuurd. \nControleer uw inbox binnen 5 minuten.");
            setSubmitted(true);
        }, 5000);

        try {
            const res = await fetch("/api/submit-audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            clearTimeout(slowTimeoutId);
            
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Er ging iets mis");
            
            // --- TRIGGER EMAIL SEND-REPORT ---
            const localResult = calculateAuditScore({
                q4: qaAnswers.q4 || "",
                q5: qaAnswers.q5 || "",
                q6: qaAnswers.q6 || "",
                q7: qaAnswers.q7 || "",
                q8: qaAnswers.q8 || "",
                q9: qaAnswers.q9 || "",
            }, answers.sector as string || "");

            const nameParts = leadForm.name.trim().split(" ");
            const voornaam = nameParts[0] || "";
            const achternaam = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
            const mappedRiskLevel = localResult.riskLevel === "HIGH" ? "critical" : localResult.riskLevel === "MEDIUM" ? "medium" : "low";

            const emailController = new AbortController();
            const emailTimeoutId = setTimeout(() => emailController.abort(), 10000);
            
            try {
                await fetch("/api/send-report", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        voornaam,
                        achternaam,
                        bedrijfsnaam: leadForm.company,
                        email: leadForm.email,
                        risicoscore: localResult.score,
                        risiconiveau: mappedRiskLevel,
                        sector: answers.sector || "",
                        answers: {
                            q4: qaAnswers.q4 || "",
                            q5: qaAnswers.q5 || "",
                            q6: qaAnswers.q6 || "",
                            q7: qaAnswers.q7 || "",
                            q8: qaAnswers.q8 || "",
                            q9: qaAnswers.q9 || "",
                        }
                    }),
                    signal: emailController.signal
                });
            } catch (e) {
                console.error("Mail trigger failed, but continuing silently", e);
            } finally {
                clearTimeout(emailTimeoutId);
            }
            // --- EIND TRIGGER ---

            if (!isSlow) {
                if (data.message) {
                    setSuccessMessage(data.message);
                }
                setResultUrl(data.reportUrl || null);
                setSubmitted(true);
            }
        } catch (err: any) {
            clearTimeout(slowTimeoutId);
            if (err.name === 'AbortError') {
                if (!isSlow) {
                    setSuccessMessage("Het rapport wordt verstuurd. \nControleer uw inbox binnen 5 minuten.");
                    setSubmitted(true);
                }
            } else if (!isSlow) {
                setApiError(err.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derived states
    const activeQ = WIZARD_QUESTIONS[Math.min(step, 8)];
    const progressPerc = Math.round((step / 9) * 100);
    
    // Validation for Next button
    let isNextDisabled = true;
    if (step < 9) {
        if (activeQ.isMultiSelect) {
            isNextDisabled = (answers.tools?.length || 0) === 0;
        } else if (activeQ.id === "sector" || activeQ.id === "employees") {
            isNextDisabled = !answers[activeQ.id as keyof typeof answers];
        } else {
            isNextDisabled = !qaAnswers[activeQ.id];
        }
    }

    // Skeleton loaders match the exact component shape
    if (isTransitioning) {
        return (
            <div className="w-full max-w-2xl mx-auto min-h-[500px]">
                 <div className="mb-8 animate-pulse">
                    <div className="flex justify-between mb-2">
                        <div className="h-3 w-16 bg-muted/20"></div>
                        <div className="h-3 w-16 bg-muted/20"></div>
                    </div>
                    <div className="h-1.5 w-full bg-card"></div>
                </div>
                {step < 9 && (
                    <div className="p-6 bg-card border border-[#333333] animate-pulse">
                        <div className="h-6 w-3/4 mb-6 bg-muted/20"></div>
                        <div className="space-y-3">
                            <div className="h-12 w-full bg-muted/10 border border-[#333333]"></div>
                            <div className="h-12 w-full bg-muted/10 border border-[#333333]"></div>
                            <div className="h-12 w-full bg-muted/10 border border-[#333333]"></div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (step === 9) {
        // Calculate the score locally because we are not waiting for the API to show results
        const localResult = calculateAuditScore({
            q4: qaAnswers.q4 || "",
            q5: qaAnswers.q5 || "",
            q6: qaAnswers.q6 || "",
            q7: qaAnswers.q7 || "",
            q8: qaAnswers.q8 || "",
            q9: qaAnswers.q9 || "",
        }, answers.sector as string || "");

        const isStaffing = answers.sector === "Staffing/uitzendbureau";
        let badgeColor = "bg-risk-low";
        let badgeText = "LAAG RISICO";
        
        if (localResult.riskLevel === "MEDIUM") {
            badgeColor = "bg-risk-medium";
            badgeText = "GEMIDDELD RISICO";
        } else if (localResult.riskLevel === "HIGH") {
            badgeColor = "bg-risk-high";
            badgeText = "HOOG RISICO";
        }

        return (
            <div className="w-full max-w-2xl mx-auto animate-in fade-in duration-200">
                {/* A. DEADLINE BANNER */}
                <div className="w-full bg-gold text-[#000000] p-3 text-center font-bold text-sm uppercase tracking-wide mb-6">
                    ⚠️ EU AI Act deadline: 2 augustus 2026
                </div>

                <div className="bg-card border border-[#333333] p-6 lg:p-8 space-y-8">
                    {/* B. RISK BADGE */}
                    <div className={`w-full py-4 text-center font-bold text-lg md:text-xl text-[#ffffff] uppercase tracking-widest ${badgeColor}`}>
                        {badgeText}
                    </div>

                    {/* C. STAFFING SECTOR ALERT */}
                    {isStaffing && (
                        <div className="p-4 border border-gold bg-card">
                            <p className="text-foreground text-sm leading-relaxed">
                                <span className="text-gold font-bold">⚠️ Kritieke melding:</span> CV-screening en kandidaatsbeoordeling via AI vallen onder hoog-risico classificatie van de EU AI Act.
                            </p>
                        </div>
                    )}

                    {/* D. SCORE BREAKDOWN TABLE */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end border-b border-[#333333] pb-2">
                            <h3 className="font-serif text-lg text-foreground">Score Overzicht</h3>
                            <span className="text-xs text-muted uppercase tracking-wider font-medium">Risicopunten</span>
                        </div>
                        <div className="divide-y divide-[#333333] text-sm">
                            {WIZARD_QUESTIONS.slice(3, 9).map((q, idx) => {
                                const ans = qaAnswers[q.id];
                                const isIdk = ans === "Weet ik niet";
                                const pts = localResult.pointBreakdown[q.id as string] || 0;
                                
                                return (
                                    <div key={q.id} className="py-3 flex sm:items-center flex-col sm:flex-row gap-2 sm:gap-4 justify-between">
                                        <div className="text-muted flex-1 lg:w-3/5 pr-4">{q.questionText}</div>
                                        <div className="flex-shrink-0 text-left sm:text-center w-full sm:w-[150px]">
                                            {isIdk && pts > 0 ? (
                                                <span className="text-gold font-medium bg-[#1F1A0A] px-2 py-1 rounded-sm text-xs border border-gold/30">Structureel blinde vlek</span>
                                            ) : (
                                                <span className="text-foreground font-medium">{ans}</span>
                                            )}
                                        </div>
                                        <div className={`flex-shrink-0 text-left sm:text-right w-full sm:w-[100px] font-medium ${pts > 0 ? "text-gold" : "text-muted"}`}>
                                            +{pts} {pts === 1 ? 'punt' : 'punten'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* E. PACKAGE RECOMMENDATION */}
                    <div className="bg-[#111111] border border-[#333333] p-6 text-center">
                        <h4 className="text-gold font-serif text-2xl mb-2">Aanbevolen aanpak: {localResult.packageName}</h4>
                        <p className="text-muted text-sm leading-relaxed mb-4">
                            {localResult.riskLevel === "LOW" && "Uw risicoprofiel is beheersbaar. Een Basis Audit geeft u de aantoonbare zekerheid die u nodig heeft voor augustus 2026."}
                            {localResult.riskLevel === "MEDIUM" && "Er zijn compliance gaps geïdentificeerd. Ons Compleet pakket sluit deze gaps en maakt uw organisatie EU AI Act-ready."}
                            {localResult.riskLevel === "HIGH" && "Uw profiel vereist directe actie. Het Totaal ontzorgd pakket regelt volledige compliance — wij nemen het over."}
                        </p>
                        <a href="https://www.dvsocial.nl/pakketten" target="_blank" rel="noopener noreferrer" className="text-gold underline font-medium text-sm hover:text-white transition-colors">
                            Bekijk wat dit pakket inhoudt &rarr;
                        </a>
                    </div>

                    {/* F. CTA BUTTONS */}
                    <div className="space-y-4 pt-4">
                        <a href="https://calendly.com/danny-dvsocial/30min" target="_blank" rel="noopener noreferrer" className="block w-full min-h-[56px] bg-gold text-[#000000] font-bold text-[18px] text-center flex items-center justify-center hover:bg-white transition-colors">
                            Plan uw gratis gesprek
                        </a>
                    </div>
                </div>

                {/* G. VISUAL DIVIDER */}
                <div className="flex items-center justify-center my-8">
                    <div className="flex-1 border-t border-[#333333]"></div>
                    <span className="px-4 text-sm text-muted uppercase tracking-wider">Of ontvang het rapport per e-mail</span>
                    <div className="flex-1 border-t border-[#333333]"></div>
                </div>

                {/* H. OPTIONAL LEAD CAPTURE */}
                <div className="bg-[#1A1A1A] border border-[#333333] p-6 lg:p-8 mt-6">
                    {submitted ? (
                        <div className="text-center space-y-4 py-8">
                            <h3 className="font-serif text-2xl text-gold">Dank u wel!</h3>
                            {successMessage ? (
                                <p className="text-muted leading-relaxed max-w-sm mx-auto whitespace-pre-line">
                                    {successMessage}
                                </p>
                            ) : (
                                <>
                                    <p className="text-muted leading-relaxed max-w-sm mx-auto">
                                        Uw rapport is succesvol gegenereerd en verzonden. U kunt het rapport ook direct downloaden.
                                    </p>
                                    <a href={resultUrl || "#"} download className="inline-flex mt-4 min-h-[48px] px-8 bg-gold text-[#000000] font-bold text-sm items-center justify-center hover:bg-white transition-colors">
                                        Download PDF rapport
                                    </a>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl md:text-2xl font-serif text-foreground mb-3 text-center">
                                Ontvang uw volledige PDF rapport gratis per e-mail
                            </h2>
                            <p className="text-center text-muted mb-8 text-sm max-w-sm mx-auto">
                                Inclusief gepersonaliseerd advies per bevinding en aanbevolen next steps richting augustus 2026.
                            </p>
                            <form onSubmit={submitAudit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">Naam</label>
                                    <input 
                                        required 
                                        type="text"
                                        value={leadForm.name}
                                        onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                                        className="w-full min-h-[48px] bg-background border border-[#333333] px-4 text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">Bedrijfsnaam</label>
                                    <input 
                                        required 
                                        type="text"
                                        value={leadForm.company}
                                        onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
                                        className="w-full min-h-[48px] bg-background border border-[#333333] px-4 text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">E-mailadres</label>
                                    <input 
                                        required 
                                        type="email"
                                        value={leadForm.email}
                                        onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                                        className="w-full min-h-[48px] bg-background border border-[#333333] px-4 text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
                                    />
                                </div>
                                
                                <div className="pt-2 flex items-start gap-3">
                                    <input 
                                        id="gdpr"
                                        type="checkbox"
                                        required
                                        checked={leadForm.gdprConsent}
                                        onChange={(e) => setLeadForm({ ...leadForm, gdprConsent: e.target.checked })}
                                        className="mt-1 w-4 h-4 bg-background border-[#333333] accent-gold shrink-0"
                                    />
                                    <label htmlFor="gdpr" className="text-sm text-muted">
                                        Ik ga akkoord met de verwerking van mijn gegevens conform de AVG voor het toesturen van het rapport.
                                    </label>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isSubmitting || !leadForm.gdprConsent || !leadForm.name || !leadForm.company || !leadForm.email}
                                    className="w-full min-h-[48px] bg-gold text-[#000000] text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors"
                                >
                                    {isSubmitting ? "Bezig met verzenden..." : "Stuur mij het rapport"}
                                </button>

                                {apiError && <p className="text-risk-high text-sm pt-2 text-center">{apiError}</p>}
                            </form>
                        </>
                    )}
                </div>

                {/* G. DEADLINE BANNER */}
                <div className="w-full bg-gold text-[#000000] p-3 text-center font-bold text-sm uppercase tracking-wide mt-6">
                    ⚠️ EU AI Act deadline: 2 augustus 2026
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto min-h-[500px] animate-in fade-in duration-200">
            {/* PROGRESS BAR */}
            <div className="mb-8 w-full">
                <div className="flex justify-between text-xs font-medium text-muted mb-2 tracking-wide uppercase">
                    <span>Stap {step + 1} van 9</span>
                </div>
                <div className="h-[2px] w-full bg-card overflow-hidden">
                    <div 
                        className="h-full bg-gold transition-all duration-300 ease-out"
                        style={{ width: `${progressPerc}%` }}
                    />
                </div>
            </div>

            {step < 9 && (
                // QUESTION CARD
                <div className="bg-card border border-[#333333] p-6 lg:p-10">
                    <h2 className="text-xl md:text-2xl font-serif text-foreground mb-8 leading-relaxed">
                        {activeQ.questionText}
                    </h2>
                    
                    <div className="space-y-3">
                        {activeQ.options.map((opt) => {
                            let isSelected = false;
                            if (activeQ.isMultiSelect) {
                                isSelected = (answers.tools || []).includes(opt);
                            } else if (activeQ.id === "sector" || activeQ.id === "employees") {
                                isSelected = answers[activeQ.id as keyof typeof answers] === opt;
                            } else {
                                isSelected = qaAnswers[activeQ.id] === opt;
                            }

                            return (
                                <button
                                    key={opt}
                                    onClick={() => handleOptionSelect(activeQ.id, opt, !!activeQ.isMultiSelect)}
                                    className={`w-full text-left min-h-[48px] px-5 py-3 text-sm transition-colors border ${
                                        isSelected 
                                        ? "border-gold bg-[#1F1A0A] text-gold" 
                                        : "border-[#333333] bg-transparent text-foreground hover:border-muted"
                                    }`}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* NAVIGATION */}
            <div className="mt-8 flex justify-between gap-4">
                {step > 0 ? (
                    <button 
                        onClick={handleBack}
                        className="min-h-[48px] px-6 text-sm font-medium text-gold hover:text-white transition-colors"
                    >
                        Terug
                    </button>
                ) : <div></div>}
                
                {step < 8 ? (
                    <button 
                        onClick={handleNext}
                        disabled={isNextDisabled}
                        className="min-h-[48px] bg-gold text-[#000000] px-8 text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors"
                    >
                        Volgende
                    </button>
                ) : (
                    <button 
                        onClick={handleNext}
                        disabled={isNextDisabled}
                        className="min-h-[48px] bg-gold text-[#000000] px-8 text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors"
                    >
                        Resultaten bekijken
                    </button>
                )}
            </div>
        </div>
    );
}
