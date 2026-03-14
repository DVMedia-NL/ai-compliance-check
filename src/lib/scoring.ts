import { RiskLevel } from "./validations/audit";

interface ScoringResult {
    score: number;
    riskLevel: RiskLevel;
    packageName: string;
    packagePrice: number;
    sectorOverride: boolean;
    criticalAlert: boolean;
    pointBreakdown: Record<string, number>;
}

/**
 * Calculates the risk score for the AI Compliance Audit based on user answers.
 * Implements strict scoring logic where "Don't know" answers indicate systemic risk.
 * 
 * @param answers - A record of question IDs to string answers.
 * @param sector - The industry sector the company operates in.
 * @returns {ScoringResult} The calculated score, designated risk level, recommended package and pricing.
 */
export function calculateAuditScore(
    answers: {
        q4: string;
        q5: string;
        q6: string;
        q7: string;
        q8: string;
        q9: string;
    },
    sector: string
): ScoringResult {
    let score = 0;
    const pointBreakdown: Record<string, number> = {
        q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0
    };
    
    // Q4: Wordt AI ingezet bij beslissingen over medewerkers of kandidaten?
    if (answers.q4 === "Ja" || answers.q4 === "Soms") { score += 2; pointBreakdown.q4 = 2; }
    else if (answers.q4 === "Weet ik niet") { score += 1; pointBreakdown.q4 = 1; }

    // Q5: Kan een mens elke AI-beslissing altijd corrigeren of overrulen?
    if (answers.q5 === "Nee") { score += 3; pointBreakdown.q5 = 3; }
    else if (answers.q5 === "Soms" || answers.q5 === "Weet ik niet") { score += 2; pointBreakdown.q5 = 2; }

    // Q6: Kunt u terugzien welke AI-beslissingen zijn genomen en waarom?
    if (answers.q6 === "Nee") { score += 3; pointBreakdown.q6 = 3; }
    else if (answers.q6 === "Gedeeltelijk" || answers.q6 === "Weet ik niet") { score += 2; pointBreakdown.q6 = 2; }

    // Q7: Weten medewerkers en kandidaten wanneer AI wordt ingezet?
    if (answers.q7 === "Nee") { score += 2; pointBreakdown.q7 = 2; }
    else if (answers.q7 === "Gedeeltelijk") { score += 1; pointBreakdown.q7 = 1; }

    // Q8: Heeft uw organisatie een gedocumenteerd AI-beleid?
    if (answers.q8 === "Nee") { score += 3; pointBreakdown.q8 = 3; }
    else if (answers.q8 === "In ontwikkeling") { score += 1; pointBreakdown.q8 = 1; }

    // Q9: Weet u dat de EU AI Act deadline 2 augustus 2026 is?
    if (answers.q9 === "Nee dit wist ik niet") { score += 2; pointBreakdown.q9 = 2; }
    else if (answers.q9 === "Ja maar nog niets gedaan") { score += 1; pointBreakdown.q9 = 1; }

    // Determine Risk Level
    let riskLevel: RiskLevel = "LOW";
    let packageName = "Basis Audit";
    let packagePrice = 750;

    if (score >= 8) {
        riskLevel = "HIGH";
        packageName = "Totaal ontzorgd";
        packagePrice = 2500;
    } else if (score >= 4) {
        riskLevel = "MEDIUM";
        packageName = "Compleet";
        packagePrice = 1250;
    }

    // Sector Override Check
    const sectorOverride = sector === "Staffing/uitzendbureau";
    if (sectorOverride) {
        riskLevel = "HIGH";
        packageName = "Totaal ontzorgd";
        packagePrice = 2500;
        // score remains the mathematical calculation, but the level is escalated
    }

    return {
        score,
        riskLevel,
        packageName,
        packagePrice,
        sectorOverride,
        criticalAlert: sectorOverride,
        pointBreakdown
    };
}
