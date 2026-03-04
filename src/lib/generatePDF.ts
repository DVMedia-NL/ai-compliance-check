/**
 * generatePDF.ts
 *
 * Client-side PDF report generator for the EU AI Act Risk Assessment.
 * Uses jsPDF for layout and jsPDF-AutoTable for the answers table.
 *
 * IMPORTANT: This module must only be imported in client components
 * (Next.js "use client") because it relies on browser APIs.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeadData {
    voornaam: string;
    achternaam: string;
    bedrijfsnaam: string;
    email: string;
}

/** Map of question ID → selected riskWeight */
export type Answers = Record<string, number>;

export type RiskTier = "hoog" | "beperkt" | "minimaal";

// ─── Internal constants ───────────────────────────────────────────────────────

/** Question metadata used for the answers table.  */
const QUESTION_MAP: Record<string, { category: string; options: Record<number, string> }> = {
    "q1-annex3-hoog-risico-classificatie": {
        category: "Risicoclassificatie",
        options: { 10: "Ja", 0: "Nee", 7: "Weet niet" },
    },
    "q2-art12-logging-audit-trail": {
        category: "Logging & Traceerbaarheid",
        options: {
            0: "Ja, volledig geïmplementeerd",
            5: "Gedeeltelijk geïmplementeerd",
            10: "Nee",
            8: "Weet niet",
        },
    },
    "q3-human-oversight-mechanisme": {
        category: "Menselijk Toezicht",
        options: {
            0: "Ja, gedocumenteerd en operationeel",
            6: "In ontwikkeling",
            10: "Nee",
            7: "Weet niet",
        },
    },
    "q4-data-governance-trainingdata": {
        category: "Data Governance",
        options: {
            0: "Ja, volledig gedocumenteerd",
            5: "Gedeeltelijk gedocumenteerd",
            9: "Nee",
            8: "Weet niet",
        },
    },
    "q5-transparantie-gebruikersinformatie": {
        category: "Transparantie",
        options: {
            0: "Ja, standaard en aantoonbaar",
            5: "Situationeel, niet structureel",
            10: "Nee",
            7: "Weet niet",
        },
    },
};

/** Max possible score (5 questions × 10 pts each). */
const MAX_SCORE = 50;

// ─── Color palette ───────────────────────────────────────────────────────────

const COLORS = {
    headerBg: [15, 23, 42] as [number, number, number],     // slate-900
    headerText: [255, 255, 255] as [number, number, number],
    sectionLabel: [99, 102, 241] as [number, number, number], // indigo-500
    bodyText: [51, 65, 85] as [number, number, number],      // slate-700
    mutedText: [148, 163, 184] as [number, number, number],  // slate-400
    tableHeader: [30, 41, 59] as [number, number, number],   // slate-800
    tableOdd: [248, 250, 252] as [number, number, number],   // slate-50
    tableEven: [255, 255, 255] as [number, number, number],
    red: [220, 38, 38] as [number, number, number],          // red-600
    redBg: [254, 242, 242] as [number, number, number],      // red-50
    amber: [217, 119, 6] as [number, number, number],        // amber-600
    amberBg: [255, 251, 235] as [number, number, number],    // amber-50
    green: [22, 163, 74] as [number, number, number],        // green-600
    greenBg: [240, 253, 244] as [number, number, number],    // green-50
    divider: [226, 232, 240] as [number, number, number],    // slate-200
    adviseBg: [241, 245, 249] as [number, number, number],   // slate-100
};

// ─── Tier config ─────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<
    RiskTier,
    { label: string; sublabel: string; color: [number, number, number]; bg: [number, number, number] }
> = {
    hoog: {
        label: "Hoog Risico",
        sublabel: "Directe Actie Vereist",
        color: COLORS.red,
        bg: COLORS.redBg,
    },
    beperkt: {
        label: "Beperkt Risico",
        sublabel: "Actie Gewenst",
        color: COLORS.amber,
        bg: COLORS.amberBg,
    },
    minimaal: {
        label: "Minimaal Risico",
        sublabel: "Compliant",
        color: COLORS.green,
        bg: COLORS.greenBg,
    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a Date as DD-MM-YYYY. */
function formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

/** Draw a horizontal rule across the page. */
function drawDivider(doc: jsPDF, y: number, margin: number, pageWidth: number): void {
    doc.setDrawColor(...COLORS.divider);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Generates and immediately downloads a professional PDF compliance report.
 *
 * @param leadData     Validated contact details from the lead capture form.
 * @param answers      Map of question IDs to the selected riskWeight value.
 * @param totalScore   Pre-calculated total risk score.
 * @param riskTier     Pre-classified risk tier ("hoog" | "beperkt" | "minimaal").
 */
export function generateComplianceReport(
    leadData: LeadData,
    answers: Answers,
    totalScore: number,
    riskTier: RiskTier
): void {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    const tier = TIER_CONFIG[riskTier];

    let y = 0;

    // ── 1. HEADER BAR ──────────────────────────────────────────────────────────
    doc.setFillColor(...COLORS.headerBg);
    doc.rect(0, 0, pageWidth, 38, "F");

    // Label above title
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.mutedText);
    doc.setFont("helvetica", "bold");
    doc.text("VERTROUWELIJK — NIET VOOR PUBLIEKE VERSPREIDING", margin, 12, { charSpace: 0.5 });

    // Main title
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.headerText);
    doc.setFont("helvetica", "bold");
    doc.text("EU AI Act — Risk Assessment Report", margin, 25);

    // Sub-header right-aligned
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.mutedText);
    doc.setFont("helvetica", "normal");
    doc.text("AI Compliancecheck.nl", pageWidth - margin, 25, { align: "right" });

    y = 50;

    // ── 2. LEAD DETAILS ────────────────────────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.sectionLabel);
    doc.setFont("helvetica", "bold");
    doc.text("KLANTGEGEVENS", margin, y);
    y += 5;

    drawDivider(doc, y, margin, pageWidth);
    y += 6;

    const fullName = `${leadData.voornaam} ${leadData.achternaam}`;
    const today = formatDate(new Date());

    const details: [string, string][] = [
        ["Naam", fullName],
        ["Organisatie", leadData.bedrijfsnaam],
        ["E-mailadres", leadData.email],
        ["Beoordelingsdatum", today],
    ];

    doc.setFont("helvetica", "normal");
    for (const [label, value] of details) {
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.mutedText);
        doc.text(label, margin, y);
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.bodyText);
        doc.setFont("helvetica", "bold");
        doc.text(value, margin + 42, y);
        doc.setFont("helvetica", "normal");
        y += 7;
    }

    y += 4;

    // ── 3. RISK RESULT CARD ───────────────────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.sectionLabel);
    doc.setFont("helvetica", "bold");
    doc.text("RISICOBEOORDELING", margin, y);
    y += 5;

    drawDivider(doc, y, margin, pageWidth);
    y += 6;

    // Background card
    const cardH = 28;
    doc.setFillColor(...tier.bg);
    doc.roundedRect(margin, y, contentWidth, cardH, 3, 3, "F");

    // Tier pill
    doc.setFillColor(...tier.color);
    doc.roundedRect(margin + 5, y + 6, 38, 8, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(tier.label.toUpperCase(), margin + 24, y + 11.5, { align: "center" });

    // Sublabel
    doc.setFontSize(8);
    doc.setTextColor(...tier.color);
    doc.setFont("helvetica", "normal");
    doc.text(tier.sublabel, margin + 48, y + 11.5);

    // Score (right side)
    doc.setFontSize(26);
    doc.setTextColor(...tier.color);
    doc.setFont("helvetica", "bold");
    doc.text(String(totalScore), pageWidth - margin - 22, y + 16);
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.mutedText);
    doc.setFont("helvetica", "normal");
    doc.text(`/ ${MAX_SCORE}`, pageWidth - margin - 10, y + 16);

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.mutedText);
    doc.text("risicopunten", pageWidth - margin - 18, y + 22, { align: "center" });

    y += cardH + 10;

    // ── 4. ANSWERS TABLE ─────────────────────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.sectionLabel);
    doc.setFont("helvetica", "bold");
    doc.text("ANTWOORDENOVERZICHT", margin, y);
    y += 5;

    drawDivider(doc, y, margin, pageWidth);
    y += 4;

    // Build table rows from answers map
    const tableRows = Object.entries(QUESTION_MAP).map(([id, { category, options }]) => {
        const weight = answers[id];
        const answerLabel = weight !== undefined ? (options[weight] ?? `Score: ${weight}`) : "—";
        return [category, answerLabel];
    });

    autoTable(doc, {
        startY: y,
        head: [["Categorie", "Gegeven Antwoord"]],
        body: tableRows,
        margin: { left: margin, right: margin },
        styles: {
            font: "helvetica",
            fontSize: 8.5,
            cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
            textColor: COLORS.bodyText,
            lineColor: COLORS.divider,
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: COLORS.tableHeader,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8,
            halign: "left",
        },
        alternateRowStyles: {
            fillColor: COLORS.tableOdd,
        },
        bodyStyles: {
            fillColor: COLORS.tableEven,
        },
        columnStyles: {
            0: { cellWidth: 55, fontStyle: "bold" },
            1: { cellWidth: "auto" },
        },
        tableLineColor: COLORS.divider,
        tableLineWidth: 0.2,
    });

    // Move cursor past the table
    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    y = finalY + 12;

    // ── 5. ADVICE PARAGRAPH ──────────────────────────────────────────────────
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.sectionLabel);
    doc.setFont("helvetica", "bold");
    doc.text("STRATEGISCH ADVIES", margin, y);
    y += 5;

    drawDivider(doc, y, margin, pageWidth);
    y += 6;

    // Advice card background
    doc.setFillColor(...COLORS.adviseBg);
    const adviceText =
        "Op basis van uw antwoorden adviseren wij u dringend een strategische AI-complianceaudit te laten uitvoeren. " +
        "Deze audit brengt de specifieke risico's en compliancehiaten van uw AI-systemen in kaart, en resulteert in een concreet " +
        "actieplan waarmee u aantoonbaar voldoet aan de vereisten van de EU AI Act vóór de handhavingsdeadlines. " +
        "Een proactieve aanpak beperkt niet alleen het risico op aanzienlijke boetes (tot 3–7% van de wereldwijde jaaromzet), " +
        "maar versterkt ook het vertrouwen van uw klanten, partners en toezichthouders in uw organisatie. " +
        "Onze consultants nemen op korte termijn contact met u op om de resultaten te bespreken en de vervolgstappen te definiëren.";

    const splitAdvice = doc.splitTextToSize(adviceText, contentWidth - 10);
    const adviceBoxH = splitAdvice.length * 5 + 12;

    doc.roundedRect(margin, y, contentWidth, adviceBoxH, 3, 3, "F");

    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.bodyText);
    doc.setFont("helvetica", "normal");
    doc.text(splitAdvice, margin + 5, y + 7);

    y += adviceBoxH + 10;

    // ── 6. FOOTER ────────────────────────────────────────────────────────────
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(...COLORS.headerBg);
    doc.rect(0, pageHeight - 14, pageWidth, 14, "F");

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.mutedText);
    doc.setFont("helvetica", "normal");
    doc.text(
        `AI Compliancecheck.nl · Gegenereerd op ${today} · Vertrouwelijk document`,
        pageWidth / 2,
        pageHeight - 5.5,
        { align: "center" }
    );

    // ── 7. DOWNLOAD ──────────────────────────────────────────────────────────
    const safeCompany = leadData.bedrijfsnaam.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim();
    doc.save(`AI-Compliance-Report-${safeCompany}.pdf`);
}
