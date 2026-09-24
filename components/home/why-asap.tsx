import React from 'react';
import { ZapIcon, ShieldIcon, SparklesIcon, CheckIcon } from '@/components/ui/icons';

export function WhyASAP() {
  const pillars = [
    {
      icon: ZapIcon,
      title: 'Instant Execution',
      subtitle: 'Need a tool? ASAP, use it.',
      description:
        'Small digital tasks should take seconds, not minutes. We engineer tools to load instantly with zero bloat, allowing you to format, calculate, or convert right away.',
      highlights: [
        'Optimized client-side execution where possible',
        'Sub-second response times',
        'Zero mandatory software installations',
      ],
    },
    {
      icon: ShieldIcon,
      title: 'Privacy by Default',
      subtitle: 'Your files remain yours.',
      description:
        'We believe in minimizing data retention. Where technically feasible, your data is processed directly inside your browser and never sent to a remote database.',
      highlights: [
        'Local in-browser processing prioritized',
        'No unnecessary data collection',
        'Short-lived, transient processing for heavy tasks',
      ],
    },
    {
      icon: SparklesIcon,
      title: 'No Clutter or Distraction',
      subtitle: 'Clean engineering, clear intent.',
      description:
        'Most free tool sites are covered in misleading download buttons, confusing popups, and aggressive advertising. ASAPTools is built with clean SaaS craftsmanship.',
      highlights: [
        'No deceptive download banners',
        'No forced signups for basic utility',
        'Transparent limits and clear controls',
      ],
    },
  ];

  return (
    <section id="why-asap" className="py-16 sm:py-24 border-t border-border scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
            Why ASAPTools Exists
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Everyday web utilities have become bloated, spammy, and frustrating. We are rebuilding digital tools the way they should have been built from the start.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="flex flex-col justify-between p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-5 border border-orange-500/20">
                    <Icon size={24} />
                  </div>

                  <h3 className="text-lg font-bold text-foreground tracking-tight">
                    {pillar.title}
                  </h3>
                  <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-3">
                    {pillar.subtitle}
                  </p>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                    {pillar.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/80">
                  <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {pillar.highlights.map((item, hIdx) => (
                      <li key={hIdx} className="flex items-start gap-2">
                        <CheckIcon
                          size={14}
                          className="text-emerald-500 shrink-0 mt-0.5"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
