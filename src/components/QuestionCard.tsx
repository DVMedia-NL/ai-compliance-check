"use client";

import { ReactNode } from "react";

/**
 * A highly modular component to display individual compliance questions with elegant hover and active states.
 */
interface QuestionCardProps {
    children: ReactNode;
    className?: string;
}

export default function QuestionCard({ children, className = "" }: QuestionCardProps) {
    return (
        <div className={`w-full rounded-2xl border border-slate-secondary/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl sm:p-8 transition-all duration-300 hover:border-gold/20 ${className}`}>
            {children}
        </div>
    );
}
