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

/**
 * Wrapper function to enforce strict execution timeouts.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), ms)
        ),
    ]);
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
            { error: "Email service not configured" },
            { status: 503 }
        );
    }
    const resend = new Resend(resendKey);

    try {
        const body: LeadData = await request.json();
        const { voornaam, achternaam, bedrijfsnaam, email, risicoscore, risiconiveau } = body;

        if (!voornaam || !bedrijfsnaam || !email) {
            return NextResponse.json(
                { error: 'Zorg dat alle verplichte velden zijn ingevuld.' },
                { status: 400 }
            );
        }

        // Run both Firestore and Resend in parallel to stay under 800ms
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

        await withTimeout(
            Promise.all([firestorePromise, leadEmailPromise, adminEmailPromise]),
            750
        );

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error: any) {
        if (error?.message === 'TIMEOUT_EXCEEDED') {
            return NextResponse.json({ error: 'Verzoek duurde te lang.' }, { status: 504 });
        }
        return NextResponse.json({ error: 'Interne server fout.', details: error.message }, { status: 500 });
    }
}
