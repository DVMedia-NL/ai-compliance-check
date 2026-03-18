import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function GET(request: NextRequest) {
    const pw = request.nextUrl.searchParams.get('pw');

    if (!pw || pw !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auditsRef = collection(db, 'audits');
    const q = query(auditsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    const leads = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            naam: data.name ?? '',
            email: data.email ?? '',
            risicoscore: data.riskLevel ?? data.score ?? '',
            createdAt: data.timestamp?.toDate?.()?.toISOString() ?? '',
        };
    });

    return NextResponse.json({ leads });
}
