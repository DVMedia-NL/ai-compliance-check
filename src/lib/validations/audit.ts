import { z } from 'zod';

/**
 * Zod schema for validating incoming API requests for the AI Compliance Audit.
 * Enforces strict typing and data integrity.
 */
export const auditSubmissionSchema = z.object({
    name: z.string().min(2, "Naam is te kort").max(100, "Naam is te lang"),
    company: z.string().min(2, "Bedrijfsnaam is te kort").max(150, "Bedrijfsnaam is te lang"),
    email: z.string().email("Ongeldig e-mailadres"),
    sector: z.enum([
        "Staffing/uitzendbureau",
        "Zorg",
        "Retail",
        "Logistiek",
        "Financieel",
        "Overheid",
        "Anders"
    ], { message: "Ongeldige sector" }),
    employees: z.enum(["1-50", "50-250", "250+"], { message: "Ongeldig aantal medewerkers" }),
    tools: z.array(z.string()).min(1, "Selecteer minimaal één tool"),
    answers: z.object({
        q4: z.enum(["Ja", "Nee", "Soms", "Weet ik niet"]),
        q5: z.enum(["Ja altijd", "Soms", "Nee", "Weet ik niet"]),
        q6: z.enum(["Ja volledig", "Gedeeltelijk", "Nee", "Weet ik niet"]),
        q7: z.enum(["Ja aantoonbaar", "Gedeeltelijk", "Nee"]),
        q8: z.enum(["Ja", "Nee", "In ontwikkeling"]),
        q9: z.enum(["Ja we zijn al bezig", "Ja maar nog niets gedaan", "Nee dit wist ik niet"])
    }),
    gdprConsent: z.boolean().refine(val => val === true, {
        message: "U moet akkoord gaan met de voorwaarden"
    })
});

export type AuditSubmission = z.infer<typeof auditSubmissionSchema>;

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface AuditDocument {
    name: string;
    company: string;
    email: string;
    sector: string;
    employees: string;
    tools: string[];
    answers: Record<string, string>;
    score: number;
    riskLevel: RiskLevel;
    package: string;
    packagePrice: number;
    sectorOverride: boolean;
    timestamp: any; // Firebase Timestamp
    reportUrl: string;
    gdprConsent: boolean;
}
