import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface LeadData {
  voornaam: string;
  achternaam: string;
  bedrijfsnaam: string;
  email: string;
  risicoscore: number;
  risiconiveau: string;
  sector: string;
  answers: {
    q4: 'ja' | 'nee' | 'weet_niet';
    q5: 'ja' | 'nee' | 'weet_niet';
    q6: 'ja' | 'nee' | 'weet_niet';
    q7: 'ja' | 'nee' | 'weet_niet';
    q8: 'ja' | 'nee' | 'weet_niet';
    q9: 'ja' | 'nee' | 'weet_niet';
  };
}

type GapStatus = 'ONTBREEKT' | 'ONVOLDOENDE' | 'AANWEZIG' | 'ONBEKEND' | 'NIET GEVERIF.';
type RiskLevel = 'KRITISCH' | 'HOOG' | 'VERHOOGD' | 'LAAG';

interface GapItem {
  verplichting: string;
  artikel: string;
  status: GapStatus;
  risico: RiskLevel;
}

function getSectorContext(sector: string): { title: string; lines: string[] } {
  switch (sector) {
    case 'Staffing/uitzendbureau':
      return {
        title: 'SECTORSPECIFIEKE CONTEXT: STAFFING & UITZEND — SECTOR-OVERRIDE ACTIEF',
        lines: [
          'CV-screening en kandidaatsbeoordeling via AI vallen altijd onder hoog-risico (Bijlage III, punt 4a EU AI Act).',
          'Sector-override is automatisch van kracht: uw risiconiveau is HOOG ongeacht de totaalscore.',
          'Artikel 22 AVG verbiedt volledig geautomatiseerde besluiten over kandidaten zonder expliciete toestemming.',
        ],
      };
    case 'Zorg':
      return {
        title: 'SECTORSPECIFIEKE CONTEXT: ZORG — MDR & EU AI ACT OVERLAP',
        lines: [
          'Medische beslissingsondersteuning via AI valt onder hoog-risico (Bijlage III, punt 5 EU AI Act).',
          'Dubbele conformiteitsverplichting: EU AI Act en Medical Device Regulation (MDR) zijn gelijktijdig van toepassing.',
          'Menselijk toezicht (Art. 14) is extra kritisch bij diagnostiek en behandeladvies — documentatie is verplicht.',
        ],
      };
    case 'Financieel':
      return {
        title: 'SECTORSPECIFIEKE CONTEXT: FINANCIËLE SECTOR',
        lines: [
          'AI bij kredietbeoordeling en fraudedetectie valt onder hoog-risico (Bijlage III, punt 5b EU AI Act).',
          'Overlap met PSD2, CRD en DORA verplicht tot geïntegreerde risicodocumentatie en audittrails.',
          'Transparantieplicht naar klanten over algoritmische besluiten is wettelijk verankerd (Art. 13).',
        ],
      };
    case 'Overheid':
      return {
        title: 'SECTORSPECIFIEKE CONTEXT: OVERHEID — VERHOOGDE TOEZICHTSVERPLICHTING',
        lines: [
          'Overheidsorganisaties vallen onder extra toezicht; AI bij dienstverlening aan burgers is veelal hoog-risico.',
          'Publieke aanbestedingen van AI-systemen vereisen conformiteitsverklaringen van leveranciers (Ann. IV).',
          'Transparantie en logging (Art. 12 & 13) zijn verplicht bij elk AI-systeem dat burgers betreft.',
        ],
      };
    case 'Logistiek':
      return {
        title: 'SECTORSPECIFIEKE CONTEXT: LOGISTIEK',
        lines: [
          'AI bij route-optimalisatie en planning valt doorgaans onder beperkt of minimaal risico.',
          'Uitzondering: AI-systemen met veiligheidsrelevante besluiten (bijv. transport) vallen onder hoog-risico.',
          'Transparantie over geautomatiseerde roostering richting medewerkers is vereist (Art. 13 EU AI Act).',
        ],
      };
    case 'Retail':
      return {
        title: 'SECTORSPECIFIEKE CONTEXT: RETAIL',
        lines: [
          'AI bij prijsoptimalisatie en klantprofilering valt veelal onder beperkt risico.',
          'Uitzondering: AI bij personeelsbeoordeling of -selectie valt onder hoog-risico (Bijlage III EU AI Act).',
          'Transparantieplicht naar consumenten over AI-gebruik is verplicht per Art. 13 EU AI Act.',
        ],
      };
    default:
      return {
        title: 'SECTORSPECIFIEKE CONTEXT: EU AI ACT BASISVEREISTEN',
        lines: [
          'Alle AI-systemen vereisen een risicoclassificatie; hoog-risico systemen (Bijlage III) vereisen directe actie.',
          'Technische documentatie, menselijk toezicht (Art. 14) en logging (Art. 12) zijn basisverplichtingen.',
          'Transparantie naar gebruikers en een gedocumenteerd AI-beleid zijn vereist vóór 2 augustus 2026.',
        ],
      };
  }
}

function buildGapAnalysis(answers: LeadData['answers'], sector: string): GapItem[] {
  const isStaffing = sector === 'staffing';
  
  const answerToStatus = (ans: string): GapStatus => {
    if (ans === 'ja') return 'AANWEZIG';
    if (ans === 'nee') return 'ONTBREEKT';
    return 'ONBEKEND';
  };

  const answerToRisk = (ans: string, kritischIfNee = false): RiskLevel => {
    if (ans === 'ja') return 'LAAG';
    if (ans === 'nee') return kritischIfNee ? 'KRITISCH' : 'HOOG';
    return 'VERHOOGD';
  };

  return [
    {
      verplichting: 'Conformiteitsbeoordeling AI-systeem',
      artikel: 'Art. 43',
      status: isStaffing ? 'ONTBREEKT' : answerToStatus(answers.q4),
      risico: isStaffing ? 'KRITISCH' : answerToRisk(answers.q4, true),
    },
    {
      verplichting: 'Menselijk toezichtprotocol (gedocumenteerd)',
      artikel: 'Art. 14',
      status: answerToStatus(answers.q5),
      risico: answerToRisk(answers.q5, true),
    },
    {
      verplichting: 'Technische documentatie AI-systeem',
      artikel: 'Art. 11',
      status: answerToStatus(answers.q6),
      risico: answerToRisk(answers.q6, true),
    },
    {
      verplichting: 'Gebruiksverantwoordelijke aanwijzing',
      artikel: 'Art. 25',
      status: answers.q8 === 'ja' ? 'AANWEZIG' : 'ONBEKEND',
      risico: answerToRisk(answers.q8),
    },
    {
      verplichting: 'Transparantieverklaring naar kandidaten',
      artikel: 'Art. 13',
      status: answerToStatus(answers.q7),
      risico: answerToRisk(answers.q7),
    },
    {
      verplichting: 'Conformiteitsverklaring leverancier',
      artikel: 'Ann. IV',
      status: 'NIET GEVERIF.',
      risico: 'HOOG',
    },
    {
      verplichting: 'Data Governance & Bias Audit',
      artikel: 'Art. 9',
      status: answerToStatus(answers.q8),
      risico: answerToRisk(answers.q8),
    },
    {
      verplichting: 'Verwerkersovereenkomst AI (GDPR)',
      artikel: 'Art. 28 AVG',
      status: 'ONBEKEND',
      risico: 'VERHOOGD',
    },
  ];
}

async function generateAuditPDF(data: LeadData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Brand colors as rgb values
  const bg = rgb(0.039, 0.039, 0.039);         // #0A0A0A
  const gold = rgb(0.788, 0.659, 0.298);        // #C9A84C
  const white = rgb(0.878, 0.878, 0.878);       // #E0E0E0
  const dimWhite = rgb(0.533, 0.533, 0.533);    // #888888
  const red = rgb(0.753, 0.224, 0.169);         // #C0392B
  const cardBg = rgb(0.067, 0.067, 0.067);      // #111111

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  const gapItems = buildGapAnalysis(data.answers, data.sector);
  const today = new Date().toLocaleDateString('nl-NL', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
  const refNum = `DVS-2026-${Date.now().toString().slice(-4)}`;

  // ── PAGE 1: COVER ──────────────────────────────────────────
  const cover = pdfDoc.addPage([pageWidth, pageHeight]);

  // Background
  cover.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: bg });

  // Red top bar
  cover.drawRectangle({ x: 0, y: pageHeight - 40, width: pageWidth, height: 40, color: red });
  cover.drawText('VOORLOPIGE STATUS: KRITISCH RISICO  |  VERTROUWELIJK DOCUMENT', {
    x: 80, y: pageHeight - 24, size: 8, font: helveticaBold, color: rgb(1,1,1)
  });

  // Gold left accent
  cover.drawRectangle({ x: 0, y: 0, width: 3, height: pageHeight - 40, color: gold });

  // Logo
  cover.drawText('DV SOCIAL', { x: margin, y: pageHeight - 90, size: 10, font: helveticaBold, color: gold });
  cover.drawText('AI COMPLIANCE ADVISORY  ·  NEDERLAND', { x: margin, y: pageHeight - 105, size: 7, font: helvetica, color: dimWhite });

  // Gold line
  cover.drawLine({ start: { x: margin, y: pageHeight - 115 }, end: { x: pageWidth - margin, y: pageHeight - 115 }, thickness: 0.5, color: gold });

  // Main title
  cover.drawText('AI COMPLIANCE', { x: margin, y: pageHeight - 190, size: 28, font: helveticaBold, color: white });
  cover.drawText('AUDITRAPPORT', { x: margin, y: pageHeight - 225, size: 28, font: helveticaBold, color: gold });
  cover.drawText('Artikel 25 & Artikel 14 — EU AI Act Risicoanalyse', { x: margin, y: pageHeight - 248, size: 9, font: helvetica, color: dimWhite });

  // Info fields
  cover.drawLine({ start: { x: margin, y: pageHeight - 258 }, end: { x: pageWidth - margin, y: pageHeight - 258 }, thickness: 0.3, color: gold });

  const infoFields = [
    ['OPGESTELD VOOR', `${data.voornaam} ${data.achternaam}`],
    ['ORGANISATIE', data.bedrijfsnaam],
    ['AUDITDATUM', today],
    ['REFERENTIENUMMER', refNum],
    ['CLASSIFICATIE', 'Hoog-Risico HR Systeem — Bijlage III, punt 4a'],
  ];

  let fy = pageHeight - 280;
  for (const [label, value] of infoFields) {
    cover.drawText(label, { x: margin, y: fy, size: 6.5, font: helvetica, color: dimWhite });
    cover.drawText(value, { x: margin + 130, y: fy, size: 8.5, font: helveticaBold, color: white });
    fy -= 22;
  }

  // Deadline banner
  cover.drawRectangle({ x: margin, y: fy - 45, width: contentWidth, height: 48, color: rgb(0.1, 0.04, 0) });
  cover.drawText('HANDHAVINGSDEADLINE EU AI ACT', { x: margin + 12, y: fy - 18, size: 7, font: helveticaBold, color: gold });
  cover.drawText('2 AUGUSTUS 2026', { x: margin + 12, y: fy - 36, size: 14, font: helveticaBold, color: white });

  // Risk card
  fy -= 95;
  cover.drawRectangle({ x: margin, y: fy - 68, width: contentWidth, height: 72, color: rgb(0.1, 0, 0) });
  cover.drawText(`RISICOCLASSIFICATIE: ${data.risiconiveau.toUpperCase()}`, { x: pageWidth / 2 - 80, y: fy - 20, size: 10, font: helveticaBold, color: red });
  cover.drawText('Uw organisatie vereist directe compliancemaatregelen voor 2 augustus 2026.', { x: margin + 30, y: fy - 38, size: 8, font: helvetica, color: dimWhite });
  cover.drawText('Dit rapport is opgesteld op basis van uw antwoorden in de AI Compliance Check.', { x: margin + 20, y: fy - 52, size: 7.5, font: helvetica, color: dimWhite });

  // Footer
  cover.drawLine({ start: { x: margin, y: 32 }, end: { x: pageWidth - margin, y: 32 }, thickness: 0.5, color: gold });
  cover.drawText('D.V Social  ·  AI Compliance Advisory  ·  KVK 96576545  ·  ai-compliance-check.nl', { x: margin, y: 20, size: 6.5, font: helvetica, color: dimWhite });
  cover.drawText('Pagina 1 van 3', { x: pageWidth - margin - 55, y: 20, size: 6.5, font: helvetica, color: dimWhite });

  // ── PAGE 2: GAP ANALYSE ────────────────────────────────────
  const gapPage = pdfDoc.addPage([pageWidth, pageHeight]);
  gapPage.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: bg });
  gapPage.drawRectangle({ x: 0, y: 0, width: 3, height: pageHeight, color: gold });

  // Header
  gapPage.drawRectangle({ x: 0, y: pageHeight - 62, width: pageWidth, height: 62, color: cardBg });
  gapPage.drawText('VOORLOPIGE GAP-ANALYSE', { x: margin, y: pageHeight - 34, size: 14, font: helveticaBold, color: white });
  gapPage.drawText(`ORGANISATIE: ${data.bedrijfsnaam.toUpperCase()}  ·  STATUS: VOORLOPIG`, { x: margin, y: pageHeight - 52, size: 7.5, font: helvetica, color: gold });

  // Sector context block
  const sectorCtx = getSectorContext(data.sector);
  const ctxBlockTop = pageHeight - 68;  // visual top (pdf-lib: bottom-left y + height)
  const ctxBlockHeight = 58;
  gapPage.drawRectangle({ x: margin, y: ctxBlockTop - ctxBlockHeight, width: contentWidth, height: ctxBlockHeight, color: rgb(0.05, 0.05, 0.05) });
  gapPage.drawLine({ start: { x: margin, y: ctxBlockTop }, end: { x: pageWidth - margin, y: ctxBlockTop }, thickness: 0.5, color: gold });
  gapPage.drawText(sectorCtx.title, { x: margin + 8, y: ctxBlockTop - 14, size: 6.5, font: helveticaBold, color: gold });
  gapPage.drawText(sectorCtx.lines[0], { x: margin + 8, y: ctxBlockTop - 26, size: 7.5, font: helvetica, color: dimWhite });
  gapPage.drawText(sectorCtx.lines[1], { x: margin + 8, y: ctxBlockTop - 38, size: 7.5, font: helvetica, color: dimWhite });
  gapPage.drawText(sectorCtx.lines[2], { x: margin + 8, y: ctxBlockTop - 50, size: 7.5, font: helvetica, color: dimWhite });

  // Table header
  const colX = [margin, margin + 210, margin + 285, margin + 340];
  let ty = pageHeight - 146;
  gapPage.drawRectangle({ x: margin, y: ty - 18, width: contentWidth, height: 20, color: gold });
  const headers = ['VERPLICHTING', 'ARTIKEL', 'STATUS', 'RISICO'];
  for (let i = 0; i < headers.length; i++) {
    gapPage.drawText(headers[i], { x: colX[i] + 4, y: ty - 11, size: 7, font: helveticaBold, color: bg });
  }

  ty -= 20;
  const statusColors: Record<string, ReturnType<typeof rgb>> = {
    'ONTBREEKT':    rgb(0.906, 0.298, 0.235),
    'ONVOLDOENDE':  rgb(0.906, 0.298, 0.235),
    'AANWEZIG':     rgb(0.18, 0.8, 0.44),
    'ONBEKEND':     rgb(0.945, 0.769, 0.059),
    'ONDUIDELIJK':  rgb(0.902, 0.494, 0.133),
    'NIET GEVERIF.':rgb(0.902, 0.494, 0.133),
  };
  const riskColors: Record<string, ReturnType<typeof rgb>> = {
    'KRITISCH': rgb(0.906, 0.298, 0.235),
    'HOOG':     rgb(0.902, 0.494, 0.133),
    'VERHOOGD': rgb(0.945, 0.769, 0.059),
    'LAAG':     rgb(0.18, 0.8, 0.44),
  };

  for (let i = 0; i < gapItems.length; i++) {
    const item = gapItems[i];
    const rowBg = i % 2 === 0 ? cardBg : rgb(0.078, 0.078, 0.078);
    const rowH = 26;
    ty -= rowH;

    gapPage.drawRectangle({ x: margin, y: ty, width: contentWidth, height: rowH, color: rowBg });
    gapPage.drawText(item.verplichting, { x: colX[0] + 4, y: ty + 9, size: 7.5, font: helvetica, color: white });
    gapPage.drawText(item.artikel, { x: colX[1] + 4, y: ty + 9, size: 7.5, font: helveticaBold, color: dimWhite });
    gapPage.drawText(item.status, { x: colX[2] + 4, y: ty + 9, size: 7, font: helveticaBold, color: statusColors[item.status] ?? white });
    gapPage.drawText(item.risico, { x: colX[3] + 4, y: ty + 9, size: 7, font: helveticaBold, color: riskColors[item.risico] ?? white });
  }

  // Score summary
  ty -= 36;
  gapPage.drawRectangle({ x: margin, y: ty - 48, width: contentWidth, height: 52, color: rgb(0.06, 0.06, 0.06) });
  gapPage.drawLine({ start: { x: margin, y: ty + 4 }, end: { x: pageWidth - margin, y: ty + 4 }, thickness: 1.5, color: gold });
  gapPage.drawText('UW RISICOSCORE', { x: margin + 12, y: ty - 14, size: 8, font: helveticaBold, color: dimWhite });
  gapPage.drawText(`${data.risicoscore} punten`, { x: margin + 12, y: ty - 30, size: 16, font: helveticaBold, color: gold });
  gapPage.drawText(`Risiconiveau: ${data.risiconiveau.toUpperCase()}`, { x: margin + 130, y: ty - 22, size: 10, font: helveticaBold, color: red });
  gapPage.drawText('Gebaseerd op uw antwoorden in de AI Compliance Check', { x: margin + 130, y: ty - 36, size: 8, font: helvetica, color: dimWhite });

  gapPage.drawLine({ start: { x: margin, y: 32 }, end: { x: pageWidth - margin, y: 32 }, thickness: 0.5, color: gold });
  gapPage.drawText('D.V Social  ·  AI Compliance Advisory  ·  KVK 96576545  ·  ai-compliance-check.nl', { x: margin, y: 20, size: 6.5, font: helvetica, color: dimWhite });
  gapPage.drawText('Pagina 2 van 3', { x: pageWidth - margin - 55, y: 20, size: 6.5, font: helvetica, color: dimWhite });

  // ── PAGE 3: CTA ────────────────────────────────────────────
  const ctaPage = pdfDoc.addPage([pageWidth, pageHeight]);
  ctaPage.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: bg });
  ctaPage.drawRectangle({ x: 0, y: 0, width: 3, height: pageHeight, color: gold });

  ctaPage.drawRectangle({ x: 0, y: pageHeight - 62, width: pageWidth, height: 62, color: cardBg });
  ctaPage.drawText('VERVOLGSTAP: DEFINITIEVE INTAKEBEOORDELING', { x: margin, y: pageHeight - 34, size: 12, font: helveticaBold, color: white });
  ctaPage.drawText('UW VOLGENDE STAP RICHTING AANTOONBARE CONFORMITEIT', { x: margin, y: pageHeight - 52, size: 7.5, font: helvetica, color: gold });

  const intro = `Uw risicoprofiel vereist actie voor 2 augustus 2026. Wij helpen u`;
  const intro2 = 'begrijpen wat er speelt — in gewone taal, zonder omwegen.';
  ctaPage.drawText(intro, { x: margin, y: pageHeight - 85, size: 9, font: helvetica, color: white });
  ctaPage.drawText(intro2, { x: margin, y: pageHeight - 100, size: 9, font: helvetica, color: white });
  const intro3 = 'De intake duurt 45 minuten en is volledig kosteloos.';
  ctaPage.drawText(intro3, { x: margin, y: pageHeight - 115, size: 9, font: helvetica, color: white });

  const steps = [
    ['01', 'Wat is uw juridische rol?', 'We bepalen of u aanbieder of gebruiker bent onder de wet.'],
    ['02', 'Welke AI gebruikt u zonder het te weten?', 'We brengen alle AI in uw recruitmentproces in kaart.'],
    ['03', 'Wat ontbreekt er precies?', 'We laten zien wat er gedocumenteerd moet worden.'],
    ['04', 'Wat moet u als eerste doen?', 'Een prioriteitenlijst: wat is urgent, wat kan wachten.'],
    ['05', 'Hoeveel tijd en geld kost het?', 'Een eerlijke inschatting van de volledige aanpak.'],
  ];

  let sy = pageHeight - 145;
  for (const [num, title, desc] of steps) {
    ctaPage.drawRectangle({ x: margin, y: sy - 38, width: contentWidth, height: 42, color: cardBg });
    ctaPage.drawCircle({ x: margin + 18, y: sy - 16, size: 10, color: gold });
    ctaPage.drawText(num, { x: margin + 13, y: sy - 20, size: 8, font: helveticaBold, color: bg });
    ctaPage.drawText(title, { x: margin + 36, y: sy - 10, size: 9, font: helveticaBold, color: white });
    ctaPage.drawText(desc, { x: margin + 36, y: sy - 24, size: 8, font: helvetica, color: dimWhite });
    sy -= 48;
  }

  // Final CTA block
  sy -= 12;
  ctaPage.drawRectangle({ x: margin, y: sy - 68, width: contentWidth, height: 72, color: rgb(0.05, 0.1, 0.05) });
  ctaPage.drawLine({ start: { x: margin, y: sy + 4 }, end: { x: pageWidth - margin, y: sy + 4 }, thickness: 1.5, color: gold });
  ctaPage.drawText('BEVESTIG UW DEFINITIEVE INTAKEBEOORDELING', { x: margin + 50, y: sy - 16, size: 10, font: helveticaBold, color: white });
  ctaPage.drawText('Mobiel: 06 38 20 24 24  ·  ai-compliance-check.nl  ·  Reactie binnen 24 uur', { x: margin + 40, y: sy - 32, size: 8.5, font: helvetica, color: dimWhite });
  ctaPage.drawText('Er zijn nog 2 intakeposities beschikbaar voor Q2 2026.', { x: margin + 70, y: sy - 48, size: 8.5, font: helveticaBold, color: gold });

  ctaPage.drawLine({ start: { x: margin, y: 32 }, end: { x: pageWidth - margin, y: 32 }, thickness: 0.5, color: gold });
  ctaPage.drawText('D.V Social  ·  AI Compliance Advisory  ·  KVK 96576545  ·  ai-compliance-check.nl', { x: margin, y: 20, size: 6.5, font: helvetica, color: dimWhite });
  ctaPage.drawText('Pagina 3 van 3', { x: pageWidth - margin - 55, y: 20, size: 6.5, font: helvetica, color: dimWhite });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function POST(request: Request) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
        return NextResponse.json(
            { message: "Uw rapport is onderweg. \nControleer uw inbox binnen 5 minuten." },
            { status: 200 }
        );
    }
    const resend = new Resend(resendKey);

    try {
        const body: LeadData = await request.json();
        const { voornaam, achternaam, bedrijfsnaam, email, risicoscore, risiconiveau } = body;

        if (!voornaam || !bedrijfsnaam || !email) {
            return NextResponse.json(
                { message: "Uw rapport is onderweg. \nControleer uw inbox binnen 5 minuten." },
                { status: 200 }
            );
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            // Run both Firestore and Resend in parallel
            const firestorePromise = addDoc(collection(db, 'leads'), {
                voornaam,
                achternaam,
                bedrijfsnaam,
                email,
                risicoscore,
                risiconiveau,
                source: 'ai-compliance-check.nl',
                createdAt: serverTimestamp(),
            });

            const dynamicPdfBuffer = await generateAuditPDF(body);

            const risicoNiveauNL: Record<string, string> = {
                'critical': 'KRITISCH RISICO',
                'high': 'HOOG RISICO', 
                'medium': 'GEMIDDELD RISICO',
                'low': 'LAAG RISICO',
                'CRITICAL': 'KRITISCH RISICO',
                'HIGH': 'HOOG RISICO',
                'MEDIUM': 'GEMIDDELD RISICO',
                'LOW': 'LAAG RISICO',
            };
            const risicoDisplay = risicoNiveauNL[risiconiveau] ?? risiconiveau.toUpperCase();

            // Email to lead
            const leadEmailPromise = resend.emails.send({
                from: 'DV Social <noreply@dvsocial.nl>', // Adjust from email if needed
                to: email,
                subject: 'Uw AI Compliance Auditrapport — DV Social',
                html: `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#0A0A0A; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A0A0A;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%;">

  <tr>
    <td style="background:linear-gradient(90deg,#C9A84C 0%,#8B6914 50%,#C9A84C 100%); height:3px; font-size:0; line-height:0;">&nbsp;</td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:36px 48px 28px 48px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:13px; color:#C9A84C; letter-spacing:4px; text-transform:uppercase; margin-bottom:4px;">DV SOCIAL</div>
            <div style="font-family:'Courier New',monospace; font-size:9px; color:#444; letter-spacing:3px; text-transform:uppercase;">AI COMPLIANCE ADVISORY · NEDERLAND</div>
          </td>
          <td align="right">
            <div style="border:1px solid #1e1e1e; padding:8px 14px;">
              <div style="font-family:'Courier New',monospace; font-size:8px; color:#555; letter-spacing:2px;">REF: DVS-2026-${Date.now().toString().slice(-4)}</div>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:0 48px;">
      <div style="height:1px; background:linear-gradient(90deg,transparent,#C9A84C 30%,#C9A84C 70%,transparent); font-size:0;">&nbsp;</div>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:24px 48px 0 48px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1A0000; border:1px solid #3D0000; border-left:3px solid #C0392B;">
        <tr>
          <td style="padding:16px 20px;">
            <div style="font-family:'Courier New',monospace; font-size:9px; color:#888; letter-spacing:3px; margin-bottom:4px;">RISICOCLASSIFICATIE</div>
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:16px; color:#E74C3C; font-weight:bold; letter-spacing:1px;">${risicoDisplay}</div>
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:11px; color:#888; margin-top:4px;">Uw organisatie vereist directe compliancemaatregelen vóór 2 augustus 2026.</div>
          </td>
          <td align="right" style="padding:16px 20px; white-space:nowrap;">
            <div style="font-family:'Courier New',monospace; font-size:9px; color:#555; letter-spacing:1px;">DEADLINE</div>
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:13px; color:#C9A84C; font-weight:bold;">2 AUG 2026</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:32px 48px 0 48px;">
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:13px; color:#C9A84C; letter-spacing:1px; margin-bottom:6px;">Beste ${voornaam},</div>
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:15px; color:#E0E0E0; line-height:1.8; margin-bottom:20px;">
        Bedankt voor het invullen van de <span style="color:#C9A84C;">AI Compliance Check</span>. Op basis van uw antwoorden heeft onze analyse een <strong style="color:#E74C3C;">hoog risicoprofiel</strong> vastgesteld voor uw organisatie.
      </div>
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:15px; color:#E0E0E0; line-height:1.8; margin-bottom:24px;">
        In de bijlage vindt u uw <strong style="color:#C9A84C;">persoonlijke AI Compliance Auditrapport</strong> — een voorlopige gap-analyse op basis van Artikel 14 en Artikel 25 van de EU AI Act.
      </div>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:0 48px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111; border:1px solid #1e1e1e;">
        <tr><td style="padding:20px 24px 8px 24px;">
          <div style="font-family:'Courier New',monospace; font-size:9px; color:#C9A84C; letter-spacing:3px; margin-bottom:14px;">WAT STAAT ER IN UW RAPPORT</div>
        </td></tr>
        <tr><td style="padding:0 24px 20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="20" valign="top" style="padding-bottom:10px;"><div style="width:6px; height:6px; background:#C9A84C; margin-top:5px;">&nbsp;</div></td>
              <td style="padding-bottom:10px; padding-left:10px;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:12px; color:#E0E0E0; font-weight:bold;">Voorlopige Gap-Analyse</div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:11px; color:#888; margin-top:2px;">8 compliance-verplichtingen beoordeeld op status en risico</div></td>
            </tr>
            <tr>
              <td width="20" valign="top" style="padding-bottom:10px;"><div style="width:6px; height:6px; background:#C9A84C; margin-top:5px;">&nbsp;</div></td>
              <td style="padding-bottom:10px; padding-left:10px;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:12px; color:#E0E0E0; font-weight:bold;">Persoonlijke Aansprakelijkheid (Art. 25)</div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:11px; color:#888; margin-top:2px;">Wat uw rol als HR Director juridisch betekent</div></td>
            </tr>
            <tr>
              <td width="20" valign="top" style="padding-bottom:10px;"><div style="width:6px; height:6px; background:#C9A84C; margin-top:5px;">&nbsp;</div></td>
              <td style="padding-bottom:10px; padding-left:10px;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:12px; color:#E0E0E0; font-weight:bold;">Maximale Sancties</div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:11px; color:#888; margin-top:2px;">Tot €35 miljoen of 7% jaaromzet — wie is aansprakelijk</div></td>
            </tr>
            <tr>
              <td width="20" valign="top"><div style="width:6px; height:6px; background:#C9A84C; margin-top:5px;">&nbsp;</div></td>
              <td style="padding-left:10px;"><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:12px; color:#E0E0E0; font-weight:bold;">Concrete Vervolgstap</div><div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:11px; color:#888; margin-top:2px;">Wat u nu kunt doen vóór de deadline van 2 augustus 2026</div></td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:28px 48px 0 48px;">
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:13px; color:#888; line-height:1.8; border-left:2px solid #C9A84C; padding-left:16px; font-style:italic;">
        "De handhavingsdeadline van 2 augustus 2026 is onherroepelijk. Organisaties zonder aantoonbare conformiteit riskeren niet alleen boetes — maar ook reputatieschade en persoonlijke aansprakelijkheid voor de HR-verantwoordelijke."
      </div>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:32px 48px 0 48px;" align="center">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:linear-gradient(135deg,#C9A84C,#8B6914); padding:1px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#0A0A0A;">
                  <a href="https://calendly.com/danny-dvsocial/30min" style="display:block; padding:16px 48px; font-family:'Courier New',monospace; font-size:10px; color:#C9A84C; text-decoration:none; letter-spacing:4px; text-transform:uppercase; text-align:center;">
                    Plan uw gratis intake →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:11px; color:#555; margin-top:12px; text-align:center;">45 minuten · Kosteloos · Zonder verdere verplichting</div>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:24px 48px 0 48px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0D1A0D; border:1px solid #1a3a1a;">
        <tr><td style="padding:14px 20px;">
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:12px; color:#E0E0E0; line-height:1.6;">
            <span style="color:#C9A84C; font-weight:bold;">Beschikbaarheid Q2 2026:</span> Er zijn nog <strong style="color:#C9A84C;">2 intakeposities beschikbaar</strong> voor Q2 2026.
          </div>
        </td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:32px 48px 0 48px;">
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:13px; color:#E0E0E0; line-height:1.8; margin-bottom:8px;">Met vriendelijke groet,</div>
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:15px; color:#C9A84C; font-weight:bold;">Danny Verbeek</div>
      <div style="font-family:'Courier New',monospace; font-size:9px; color:#555; letter-spacing:2px; margin-top:2px;">OPRICHTER · DV SOCIAL · AI COMPLIANCE ADVISORY</div>
      <div style="font-family:'Courier New',monospace; font-size:9px; color:#444; margin-top:6px;">Mobiel: 06 38 20 24 24 &nbsp;·&nbsp; ai-compliance-check.nl</div>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:28px 48px 0 48px;">
      <div style="height:1px; background:linear-gradient(90deg,transparent,#1e1e1e 30%,#1e1e1e 70%,transparent); font-size:0;">&nbsp;</div>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:20px 48px 36px 48px;">
      <div style="font-family:'Courier New',monospace; font-size:8px; color:#333; letter-spacing:1px; line-height:1.8; text-align:center;">
        D.V Social &nbsp;·&nbsp; KVK: 96576545 &nbsp;·&nbsp; Nederland<br>
        Dit rapport is vertrouwelijk en uitsluitend bestemd voor de geadresseerde.<br>
        U ontvangt deze email omdat u de AI Compliance Check heeft ingevuld op ai-compliance-check.nl
      </div>
    </td>
  </tr>

  <tr>
    <td style="background:linear-gradient(90deg,#C9A84C 0%,#8B6914 50%,#C9A84C 100%); height:3px; font-size:0; line-height:0;">&nbsp;</td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`,
                text: `Beste ${voornaam},\n\nBedankt voor het invullen van de AI Compliance Check. In de bijlage vindt u uw persoonlijke auditrapport op basis van de ingevulde gegevens.\n\nWij nemen spoedig contact met u op voor uw gratis intake.\n\nMet vriendelijke groet,\nDV Social`,
                attachments: [{
                    filename: `DV-Social-Auditrapport-${body.bedrijfsnaam.replace(/\s+/g,'-')}.pdf`,
                    content: dynamicPdfBuffer,
                }]
            });

            // Email to admin
            const adminEmailPromise = resend.emails.send({
                from: 'DV Social Notifications <noreply@dvsocial.nl>', // Adjust from email if needed
                to: 'danny@dvsocial.nl',
                subject: `🔔 Nieuwe Lead: ${bedrijfsnaam}`,
                text: `Nieuwe Lead binnengekomen:\n\nVoornaam: ${voornaam}\nAchternaam: ${achternaam}\nBedrijfsnaam: ${bedrijfsnaam}\nEmail: ${email}\nRisicoscore: ${risicoscore}\nRisiconiveau: ${risicoDisplay}`
            });

            await Promise.race([
                Promise.all([firestorePromise, leadEmailPromise, adminEmailPromise]),
                new Promise((_, reject) => {
                    controller.signal.addEventListener('abort', () => reject(new Error('TIMEOUT_EXCEEDED')));
                })
            ]);

            clearTimeout(timeoutId);

            return NextResponse.json({ success: true }, { status: 201 });
        } catch (error: any) {
            clearTimeout(timeoutId);
            return NextResponse.json(
                { message: "Uw rapport is onderweg. \nControleer uw inbox binnen 5 minuten." },
                { status: 200 }
            );
        }
    } catch (error: any) {
        return NextResponse.json(
            { message: "Uw rapport is onderweg. \nControleer uw inbox binnen 5 minuten." },
            { status: 200 }
        );
    }
}
