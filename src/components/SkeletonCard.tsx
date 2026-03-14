"use client";

/**
 * High-fidelity Skeleton Loader.
 * Uses Tailwind pulse animations to mimic the QuestionCard layout and completely prevent CLS.
 */
export default function SkeletonCard() {
    return (
        <div className="w-full rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            {/* Progress Bar Skeleton */}
            <div className="mb-8 h-1 w-full rounded-full bg-white/5 overflow-hidden">
                <div className="h-full w-1/3 animate-pulse bg-gold/20 rounded-full" />
            </div>

            {/* Category Chip Skeleton */}
            <div className="mb-6 h-6 w-24 animate-pulse rounded-full bg-white/5" />

            {/* Question Text Skeleton */}
            <div className="mb-8 space-y-3">
                <div className="h-6 w-3/4 animate-pulse rounded-md bg-white/10" />
                <div className="h-6 w-1/2 animate-pulse rounded-md bg-white/10" />
            </div>

            {/* Options Skeleton Grid */}
            <div className="space-y-4">
                <div className="h-16 w-full animate-pulse rounded-xl border border-white/5 bg-white/[0.03]" />
                <div className="h-16 w-full animate-pulse rounded-xl border border-white/5 bg-white/[0.03]" />
                <div className="h-16 w-full animate-pulse rounded-xl border border-white/5 bg-white/[0.03]" />
            </div>

            {/* Action Buttons Skeleton */}
            <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
                <div className="h-10 w-24 animate-pulse rounded-lg bg-white/5" />
                <div className="h-10 w-32 animate-pulse rounded-lg bg-gold/20" />
            </div>
        </div>
    );
}
