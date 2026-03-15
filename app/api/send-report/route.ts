import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';


// Cache the PDF buffer at module level to ensure <800ms response
let pdfBuffer: Buffer | null = null;
try {
    const filePath = path.join(process.cwd(), 'public', 'auditrapport.pdf');
    pdfBuffer = fs.readFileSync(filePath);
} catch (error) {
    console.error('Error loading auditrapport.pdf:', error);
}

interface LeadData {
    voornaam: string;
    achternaam: string;
    bedrijfsnaam: string;
    email: string;
    risicoscore: number;
    risiconiveau: string;
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
<body style="margin:0; padding:0; background:#0A0A0A; font-family:Georgia,serif;">
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
            <div style="font-family:Georgia,'Times New Roman',serif; font-size:13px; color:#C9A84C; letter-spacing:4px; text-transform:uppercase; margin-bottom:4px;">DV SOCIAL</div>
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
            <div style="font-family:Georgia,serif; font-size:16px; color:#E74C3C; font-weight:bold; letter-spacing:1px;">${risiconiveau.toUpperCase()}</div>
            <div style="font-family:Georgia,serif; font-size:11px; color:#888; margin-top:4px;">Uw organisatie vereist directe compliancemaatregelen vóór 2 augustus 2026.</div>
          </td>
          <td align="right" style="padding:16px 20px; white-space:nowrap;">
            <div style="font-family:'Courier New',monospace; font-size:9px; color:#555; letter-spacing:1px;">DEADLINE</div>
            <div style="font-family:Georgia,serif; font-size:13px; color:#C9A84C; font-weight:bold;">2 AUG 2026</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:32px 48px 0 48px;">
      <div style="font-family:Georgia,serif; font-size:13px; color:#C9A84C; letter-spacing:1px; margin-bottom:6px;">Beste ${voornaam},</div>
      <div style="font-family:Georgia,serif; font-size:14px; color:#E0E0E0; line-height:1.8; margin-bottom:20px;">
        Bedankt voor het invullen van de <span style="color:#C9A84C;">AI Compliance Check</span>. Op basis van uw antwoorden heeft onze analyse een <strong style="color:#E74C3C;">hoog risicoprofiel</strong> vastgesteld voor uw organisatie.
      </div>
      <div style="font-family:Georgia,serif; font-size:14px; color:#E0E0E0; line-height:1.8; margin-bottom:24px;">
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
              <td style="padding-bottom:10px; padding-left:10px;"><div style="font-family:Georgia,serif; font-size:12px; color:#E0E0E0; font-weight:bold;">Voorlopige Gap-Analyse</div><div style="font-family:Georgia,serif; font-size:11px; color:#888; margin-top:2px;">8 compliance-verplichtingen beoordeeld op status en risico</div></td>
            </tr>
            <tr>
              <td width="20" valign="top" style="padding-bottom:10px;"><div style="width:6px; height:6px; background:#C9A84C; margin-top:5px;">&nbsp;</div></td>
              <td style="padding-bottom:10px; padding-left:10px;"><div style="font-family:Georgia,serif; font-size:12px; color:#E0E0E0; font-weight:bold;">Persoonlijke Aansprakelijkheid (Art. 25)</div><div style="font-family:Georgia,serif; font-size:11px; color:#888; margin-top:2px;">Wat uw rol als HR Director juridisch betekent</div></td>
            </tr>
            <tr>
              <td width="20" valign="top" style="padding-bottom:10px;"><div style="width:6px; height:6px; background:#C9A84C; margin-top:5px;">&nbsp;</div></td>
              <td style="padding-bottom:10px; padding-left:10px;"><div style="font-family:Georgia,serif; font-size:12px; color:#E0E0E0; font-weight:bold;">Maximale Sancties</div><div style="font-family:Georgia,serif; font-size:11px; color:#888; margin-top:2px;">Tot €35 miljoen of 7% jaaromzet — wie is aansprakelijk</div></td>
            </tr>
            <tr>
              <td width="20" valign="top"><div style="width:6px; height:6px; background:#C9A84C; margin-top:5px;">&nbsp;</div></td>
              <td style="padding-left:10px;"><div style="font-family:Georgia,serif; font-size:12px; color:#E0E0E0; font-weight:bold;">Concrete Vervolgstap</div><div style="font-family:Georgia,serif; font-size:11px; color:#888; margin-top:2px;">Wat u nu kunt doen vóór de deadline van 2 augustus 2026</div></td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:28px 48px 0 48px;">
      <div style="font-family:Georgia,serif; font-size:13px; color:#888; line-height:1.8; border-left:2px solid #C9A84C; padding-left:16px; font-style:italic;">
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
      <div style="font-family:Georgia,serif; font-size:11px; color:#555; margin-top:12px; text-align:center;">45 minuten · Kosteloos · Zonder verdere verplichting</div>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:24px 48px 0 48px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0D1A0D; border:1px solid #1a3a1a;">
        <tr><td style="padding:14px 20px;">
          <div style="font-family:Georgia,serif; font-size:12px; color:#E0E0E0; line-height:1.6;">
            <span style="color:#C9A84C; font-weight:bold;">Beschikbaarheid Q2 2026:</span> Er zijn nog <strong style="color:#C9A84C;">2 intakeposities beschikbaar</strong> voor Q2 2026.
          </div>
        </td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#0A0A0A; padding:32px 48px 0 48px;">
      <div style="font-family:Georgia,serif; font-size:13px; color:#E0E0E0; line-height:1.8; margin-bottom:8px;">Met vriendelijke groet,</div>
      <div style="font-family:Georgia,serif; font-size:14px; color:#C9A84C; font-weight:bold;">Danny Verbeek</div>
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
                attachments: pdfBuffer ? [
                    {
                        filename: 'auditrapport.pdf',
                        content: pdfBuffer,
                    }
                ] : undefined
            });

            // Email to admin
            const adminEmailPromise = resend.emails.send({
                from: 'DV Social Notifications <noreply@dvsocial.nl>', // Adjust from email if needed
                to: 'danny@dvsocial.nl',
                subject: `🔔 Nieuwe Lead: ${bedrijfsnaam}`,
                text: `Nieuwe Lead binnengekomen:\n\nVoornaam: ${voornaam}\nAchternaam: ${achternaam}\nBedrijfsnaam: ${bedrijfsnaam}\nEmail: ${email}\nRisicoscore: ${risicoscore}\nRisiconiveau: ${risiconiveau}`
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
