import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase client configuration, sourced exclusively from
 * NEXT_PUBLIC_ environment variables for browser-safe exposure.
 */
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Initialise (or reuse) the Firebase app instance.
 * The `getApps()` guard prevents double-initialisation
 * during Next.js hot-module replacement.
 */
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/** Shared Firestore database instance. */
export const db: Firestore = getFirestore(app);
