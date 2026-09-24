import React from 'react';
import { SparklesIcon, PdfIcon, TextIcon, ImageIcon, LockIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

export function AICapabilities() {
  const capabilities = [
    {
      title: 'AI Document Summarizer & Q&A',
      category: 'PDF & Documents',
      icon: PdfIcon,
      description:
        'Ask questions and summarize multi-page documents, research papers, and reports directly in your browser without reading hundreds of pages.',
      workflow: 'Upload PDF → Get instant bulleted takeaways & ask follow-up questions',
    },
    {
      title: 'AI OCR & Data Extraction',
      category: 'Images & Scans',
      icon: ImageIcon,
      description:
        'Extract clean, editable text and tabular data from low-resolution screenshots, receipts, or scanned documents with high contextual accuracy.',
      workflow: 'Drop image or scan → Receive structured JSON or clean Markdown',
    },
    {
      title: 'Context-Aware Text Rewriter',
      category: 'Text & Content',
      icon: TextIcon,
      description:
        'Refactor technical prose, fix tone inconsistencies, and clarify complex explanations without losing original meaning or intent.',
      workflow: 'Paste draft → Choose target tone (concise, technical, formal) → Export',
    },
  ];

  return (
    <section id="ai-vision" className="py-16 sm:py-20 border-t border-border bg-zinc-50/50 dark:bg-zinc-950/40 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-4">
            <SparklesIcon size={14} />
            <span>Product Vision</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
            Workflow-first AI.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
              Not a generic chatbot.
            </span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
            AI should eliminate tedious manual steps inside real tasks. We are engineering focused AI utilities designed to save time without cognitive overhead or unpredictable costs.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div
                key={idx}
                className="relative flex flex-col justify-between p-6 rounded-2xl border border-border bg-card shadow-sm hover:border-amber-500/30 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                      <Icon size={20} />
                    </div>
                    <Badge variant="amber">AI Vision</Badge>
                  </div>

                  <h3 className="text-base font-semibold text-foreground tracking-tight mb-2">
                    {cap.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                    {cap.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/80">
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                    Target Workflow
                  </span>
                  <p className="text-xs text-foreground font-mono bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1.5 rounded-lg border border-border break-words">
                    {cap.workflow}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Responsible AI Commitment Callout */}
        <div className="mt-10 p-5 rounded-2xl border border-border/80 bg-zinc-100/70 dark:bg-zinc-900/60 max-w-3xl mx-auto flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="p-2.5 rounded-xl bg-card border border-border text-foreground shrink-0">
            <LockIcon size={20} className="text-orange-500" />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-semibold text-foreground">
              Privacy and Cost Protection
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              All AI features will operate with explicit limits, zero hidden usage bills, and strict document deletion policies. Your files will never be retained for third-party model training.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
