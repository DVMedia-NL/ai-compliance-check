"use client";

import { useState, useEffect } from "react";

/**
 * Minimalist, non-intrusive cookie/consent banner for GDPR compliance.
 */
export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem("cookie_consent");
        if (!consent) {
            // Small delay for smooth entrance
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem("cookie_consent", "accepted");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 flex justify-center animate-in slide-in-from-bottom-5 fade-in duration-500">
            <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-white/10 bg-navy/90 px-6 py-4 shadow-2xl backdrop-blur-md">
                <p className="text-sm text-slate-secondary text-center sm:text-left">
                    Wij gebruiken functionele cookies om uw ervaring te verbeteren.
                    Dit assessment bewaart tijdelijk gegevens ten behoeve van de AI compliance check.
                </p>
                <div className="flex shrink-0 gap-3">
                    <button
                        onClick={handleAccept}
                        className="rounded-lg bg-gold/10 px-6 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-navy"
                    >
                        Accepteren
                    </button>
                </div>
            </div>
        </div>
    );
}
