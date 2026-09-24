import React from 'react';
import { ZapIcon, ShieldIcon, SparklesIcon } from '@/components/ui/icons';

export function Hero() {
  return (
    <section className="relative pt-12 pb-8 sm:pt-20 sm:pb-12 overflow-hidden">
      {/* Subtle ambient gradient backdrop */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-full max-w-7xl h-96 opacity-40 dark:opacity-20 pointer-events-none blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(249, 115, 22, 0.25) 0%, rgba(251, 146, 60, 0.1) 40%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
          <span>Need a tool? ASAP, use it.</span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15] break-words">
          Everyday digital tools.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600">
            Engineered for speed.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 sm:mt-5 text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Clean, fast utilities for developers, professionals, and creators. Format data, convert files, edit PDFs, and calculate metrics without friction.
        </p>

        {/* Key Product Value Chips */}
        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/90 border border-border">
            <ZapIcon size={14} className="text-orange-500" />
            <span>Sub-second execution</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/90 border border-border">
            <ShieldIcon size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Privacy-first architecture</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/90 border border-border">
            <SparklesIcon size={14} className="text-amber-500" />
            <span>No clutter or forced signups</span>
          </div>
        </div>
      </div>
    </section>
  );
}
