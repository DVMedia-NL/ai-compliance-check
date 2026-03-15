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
