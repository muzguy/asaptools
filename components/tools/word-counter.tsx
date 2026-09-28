'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  countTextStats,
  WORD_COUNTER_SAMPLE,
  WordCountStats,
} from '@/lib/text-utils';
import {
  TextIcon,
  CopyIcon,
  CheckIcon,
  TrashIcon,
  ShieldIcon,
  ZapIcon,
} from '@/components/ui/icons';

export function WordCounter() {
  const [text, setText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const stats: WordCountStats = countTextStats(text);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleLoadSample = () => {
    setText(WORD_COUNTER_SAMPLE);
    textareaRef.current?.focus();
  };

  const handleClear = () => {
    setText('');
    setCopyFeedback(null);
    textareaRef.current?.focus();
  };

  const handleCopy = async () => {
    if (!text) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setCopyFeedback('Copied to clipboard!');
        setTimeout(() => {
          setCopied(false);
          setCopyFeedback(null);
        }, 2000);
        return;
      }
    } catch {
      // Proceed to fallback
    }

    // Fallback for older browsers or restricted environments
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopied(true);
        setCopyFeedback('Copied to clipboard!');
        setTimeout(() => {
          setCopied(false);
          setCopyFeedback(null);
        }, 2000);
      } else {
        setCopyFeedback('Copy failed. Please copy manually.');
        setTimeout(() => setCopyFeedback(null), 3000);
      }
    } catch {
      setCopyFeedback('Clipboard access denied. Please copy manually.');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  const isTextEmpty = text.length === 0;

  // Additional metrics
  const avgWordLength =
    stats.words > 0
      ? (stats.charactersNoSpaces / stats.words).toFixed(1)
      : '0';
  const wordsPerSentence =
    stats.sentences > 0 ? (stats.words / stats.sentences).toFixed(1) : '0';

  return (
    <div className="py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground mb-6"
        >
          <Link
            href="/"
            className="hover:text-foreground transition-colors hover:underline underline-offset-4"
          >
            Home
          </Link>
          <span aria-hidden="true" className="text-zinc-400">/</span>
          <Link
            href="/#categories"
            className="hover:text-foreground transition-colors hover:underline underline-offset-4"
          >
            Text &amp; Content
          </Link>
          <span aria-hidden="true" className="text-zinc-400">/</span>
          <span className="text-foreground font-semibold" aria-current="page">
            Word &amp; Character Counter
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                <TextIcon size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Word &amp; Character Counter
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Real-time word and character counter with instant sentence analysis, paragraph counts, and estimated reading time. 100% private and calculated in your browser.
            </p>
          </div>

          {/* Privacy & Engine Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-border text-xs text-zinc-600 dark:text-zinc-300">
              <ShieldIcon size={14} className="text-emerald-500" />
              <span>100% Client-Side Privacy</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-border text-xs text-zinc-600 dark:text-zinc-300">
              <ZapIcon size={14} className="text-orange-500" />
              <span>Instant Live Counts</span>
            </div>
          </div>
        </div>

        {/* Primary Statistics Grid */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Words */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-orange-500/40 transition-colors">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Words
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {stats.words.toLocaleString()}
            </span>
          </div>

          {/* Characters with spaces */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-orange-500/40 transition-colors">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Characters
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {stats.characters.toLocaleString()}
            </span>
          </div>

          {/* Characters without spaces */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-orange-500/40 transition-colors">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              No Spaces
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {stats.charactersNoSpaces.toLocaleString()}
            </span>
          </div>

          {/* Sentences */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-orange-500/40 transition-colors">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Sentences
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {stats.sentences.toLocaleString()}
            </span>
          </div>

          {/* Paragraphs */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-orange-500/40 transition-colors">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Paragraphs
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {stats.paragraphs.toLocaleString()}
            </span>
          </div>

          {/* Reading Time */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-orange-500/40 transition-colors">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Reading Time
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-orange-600 dark:text-orange-400 tracking-tight block truncate">
              {stats.readingTimeFormatted}
            </span>
          </div>
        </div>

        {/* Editor Card */}
        <div className="mt-6 rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          {/* Editor Header Toolbar */}
          <div className="px-4 py-3 border-b border-border bg-zinc-50/80 dark:bg-zinc-900/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider uppercase text-foreground">
                Editor
              </span>
              <span className="text-muted-foreground font-mono">
                ({stats.lines} lines, {stats.sizeFormatted})
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="load-sample-btn"
                onClick={handleLoadSample}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-foreground transition-colors cursor-pointer touch-manipulation"
              >
                Load Sample
              </button>

              <button
                type="button"
                id="copy-text-btn"
                onClick={handleCopy}
                disabled={isTextEmpty}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation ${
                  isTextEmpty
                    ? 'border border-border text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                    : copied
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 shadow-2xs'
                }`}
                title="Copy text to clipboard"
              >
                {copied ? (
                  <>
                    <CheckIcon size={13} className="text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <CopyIcon size={13} />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="clear-text-btn"
                onClick={handleClear}
                disabled={isTextEmpty}
                className={`p-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer touch-manipulation flex items-center gap-1 ${
                  isTextEmpty
                    ? 'border-border text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                    : 'border-border text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                }`}
                title="Clear text editor"
              >
                <TrashIcon size={14} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>

          {/* Textarea Area */}
          <div className="relative min-h-[380px] sm:min-h-[460px]">
            <textarea
              ref={textareaRef}
              id="word-counter-input"
              name="word-counter-input"
              value={text}
              onChange={handleTextChange}
              placeholder="Type or paste your text here to begin instant word and character analysis..."
              spellCheck={true}
              aria-label="Text content for word and character counting"
              className="w-full h-full p-4 sm:p-6 font-sans text-sm sm:text-base bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-y min-h-[380px] sm:min-h-[460px] leading-relaxed"
            />

            {copyFeedback && !copied && (
              <div className="absolute bottom-4 right-4 bg-rose-900 text-white px-3 py-1.5 rounded-lg text-xs shadow-lg animate-in fade-in">
                {copyFeedback}
              </div>
            )}
          </div>

          {/* Reading & Speech Breakdown Footer */}
          <div className="px-4 sm:px-6 py-3 border-t border-border bg-zinc-50/50 dark:bg-zinc-900/40 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              <span>
                Avg. Word Length:{' '}
                <strong className="text-foreground font-semibold">{avgWordLength}</strong>{' '}
                chars
              </span>
              <span>•</span>
              <span>
                Avg. Sentence Length:{' '}
                <strong className="text-foreground font-semibold">{wordsPerSentence}</strong>{' '}
                words
              </span>
              <span>•</span>
              <span>
                Estimated Speaking Time (130 WPM):{' '}
                <strong className="text-foreground font-semibold">
                  {stats.speakingTimeFormatted}
                </strong>
              </span>
            </div>

            <span className="text-[11px] text-zinc-500">
              Reading speed assumes 200 WPM
            </span>
          </div>
        </div>

        {/* Documentation & Usage Guide Section */}
        <section className="mt-16 pt-12 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-4">
              Understanding Word &amp; Character Counting Conventions
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Word counters across the web frequently produce inconsistent results due to differences in whitespace handling, hyphenated terms, and sentence detection. ASAPTools adheres to clear, standardized counting conventions designed for writers, editors, and developers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  Words &amp; Hyphenated Terms
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Words are defined as contiguous sequences of alphanumeric characters. Hyphenated compound terms (e.g. <em>state-of-the-art</em>) and apostrophe contractions (e.g. <em>don&apos;t</em>) are counted as single words in accordance with standard publishing style guides.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  Sentence &amp; Period Detection
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sentences terminate with periods, question marks, exclamation marks, or ellipses. Our counter filters out common honorifics (<em>Dr.</em>, <em>Mr.</em>), abbreviations (<em>e.g.</em>, <em>i.e.</em>), and decimal numbers (<em>3.14</em>) to prevent artificial sentence inflation.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  Reading &amp; Speaking Rates
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Estimated reading time is calculated at <strong>200 words per minute (WPM)</strong>, which is the established average silent reading speed for adults. Estimated speaking time uses <strong>130 WPM</strong>, standard for public speaking and podcasting.
                </p>
              </div>
            </div>

            {/* Privacy Guarantee Box */}
            <div className="p-6 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-border flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldIcon size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  Zero Server Transmission
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your text never leaves your device. All calculations, character tallies, and estimations execute instantly and locally inside your browser. No cookies, trackers, or server logging are used.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
