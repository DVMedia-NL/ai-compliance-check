import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Wrapper function to enforce strict execution timeouts.
 * 
 * @param {Promise<T>} promise - The primary async operation.
 * @param {number} ms - Timeout threshold in milliseconds.
 * @returns {Promise<T>} The resolved promise or rejects if timeout is exceeded.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), ms)
        ),
    ]);
}

/**
 * Handles the POST request to save a completed AI Compliance Scan.
 * Requires `email`, `company`, and `answers` in the JSON body.
 * Adheres strictly to resolving within the <800ms constraint.
 *
 * @param {Request} request - The inbound HTTP POST request.
 * @returns {Promise<NextResponse>} JSON Next.js response indicating success, or structured error output.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, company, answers } = body;

        // Strict validation ensuring payload meets the firestore.rules requirements
        if (!email || !company || !answers) {
            return NextResponse.json(
                { error: 'Missing required fields: email, company, or answers.' },
                { status: 400 }
            );
        }

        const scansCollection = collection(db, 'compliance_scans');

        // Firestore write operation wrapped in the strict timeout handler (< 800ms)
        // 750ms used to guarantee enough breathing room before routing overhead exceeds the 800ms total.
        const docRef = await withTimeout(
            addDoc(scansCollection, {
                email,
                company,
                answers,
                createdAt: serverTimestamp(),
            }),
            750
        );

        return NextResponse.json({ success: true, scanId: docRef.id }, { status: 201 });
    } catch (error: any) {
        // Handling strict constraints and specific known failure vectors
        if (error?.message === 'TIMEOUT_EXCEEDED') {
            return NextResponse.json({ error: 'Request connection timed out. Storage limits exceeded or network degraded.' }, { status: 504 });
        }

        // Handle ENOSPC (Out of space/quota metrics) from Google Cloud
        if (error?.code === 'resource-exhausted' || error?.message?.includes('ENOSPC')) {
            return NextResponse.json({ error: 'Storage quota exceeded (ENOSPC).' }, { status: 507 });
        }

        return NextResponse.json({ error: 'Internal server error processing scan payload.', details: error.message }, { status: 500 });
    }
}
