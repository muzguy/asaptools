'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  cleanText,
  TextCleanerOptions,
  TEXT_CLEANER_SAMPLE,
  formatByteSize,
} from '@/lib/text-utils';
import {
  TextIcon,
  CopyIcon,
  CheckIcon,
  TrashIcon,
  ArrowLeftRightIcon,
  ShieldIcon,
  ZapIcon,
  SparklesIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

export function TextCleaner() {
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [options, setOptions] = useState<TextCleanerOptions>({
    trimOverall: true,
    trimEachLine: true,
    removeExtraSpaces: true,
    removeEmptyLines: false,
    normalizeBlankLines: true,
    stripHtml: false,
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // Compute text statistics
  const inputChars = input.length;
  const inputLines = input ? input.split('\n').length : 0;
  const inputBytes = new TextEncoder().encode(input).length;

  const outputChars = output.length;
  const outputLines = output ? output.split('\n').length : 0;
  const outputBytes = new TextEncoder().encode(output).length;

  const charsDiff = inputChars - outputChars;
  const percentSaved =
    inputChars > 0 && charsDiff > 0
      ? ((charsDiff / inputChars) * 100).toFixed(1)
      : '0';

  // Apply cleaning transformation
  const applyCleaning = (textToClean: string, currentOptions: TextCleanerOptions) => {
    if (!textToClean) {
      setOutput('');
      return;
    }
    const cleaned = cleanText(textToClean, currentOptions);
    setOutput(cleaned);
  };

  // Handle Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    applyCleaning(val, options);
  };

  // Toggle Option
  const handleToggleOption = (key: keyof TextCleanerOptions) => {
    const next = { ...options, [key]: !options[key] };
    // Mutual exclusion: if removeEmptyLines is true, normalizeBlankLines is superseded
    if (key === 'removeEmptyLines' && next.removeEmptyLines) {
      next.normalizeBlankLines = false;
    } else if (key === 'normalizeBlankLines' && next.normalizeBlankLines) {
      next.removeEmptyLines = false;
    }

    setOptions(next);
    applyCleaning(input, next);
  };

  // Load Sample
  const handleLoadSample = () => {
    setInput(TEXT_CLEANER_SAMPLE);
    applyCleaning(TEXT_CLEANER_SAMPLE, options);
    inputRef.current?.focus();
  };

  // Clear
  const handleClear = () => {
    setInput('');
    setOutput('');
    setCopyFeedback(null);
    inputRef.current?.focus();
  };

  // Swap / Reuse Output as Input
  const handleReuseOutput = () => {
    if (!output) return;
    setInput(output);
    applyCleaning(output, options);
    inputRef.current?.focus();
  };

  // Copy Cleaned Output
  const handleCopy = async () => {
    if (!output) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(output);
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

    try {
      const textArea = document.createElement('textarea');
      textArea.value = output;
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

  const isInputEmpty = input.trim().length === 0;
  const isOutputEmpty = output.length === 0;

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
            Text Cleaner
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
                Text Cleaner
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Remove unwanted whitespace, extra spaces within lines, trailing blanks, and empty lines instantly. Choose your cleaning options with full control.
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
              <span>Instant Transformations</span>
            </div>
          </div>
        </div>

        {/* Cleaning Options Panel */}
        <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Cleaning Rules
            </span>

            {/* Quick Actions */}
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
                id="clear-btn"
                onClick={handleClear}
                disabled={isInputEmpty && isOutputEmpty}
                className={`p-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer touch-manipulation flex items-center gap-1 ${
                  isInputEmpty && isOutputEmpty
                    ? 'border-border text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                    : 'border-border text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                }`}
                title="Clear input and output"
              >
                <TrashIcon size={14} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>

          {/* Option Checkboxes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 1. Trim Overall Whitespace */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 hover:border-orange-500/30 transition-colors bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                id="opt-trim-overall"
                checked={options.trimOverall}
                onChange={() => handleToggleOption('trimOverall')}
                className="mt-0.5 w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-zinc-300 dark:border-zinc-700 accent-orange-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground block">
                  Trim overall whitespace
                </span>
                <span className="text-muted-foreground text-[11px] leading-relaxed">
                  Removes whitespace from beginning and end of text.
                </span>
              </div>
            </label>

            {/* 2. Trim Each Line */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 hover:border-orange-500/30 transition-colors bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                id="opt-trim-each-line"
                checked={options.trimEachLine}
                onChange={() => handleToggleOption('trimEachLine')}
                className="mt-0.5 w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-zinc-300 dark:border-zinc-700 accent-orange-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground block">
                  Trim each line
                </span>
                <span className="text-muted-foreground text-[11px] leading-relaxed">
                  Strips leading and trailing spaces from every line.
                </span>
              </div>
            </label>

            {/* 3. Remove Extra Spaces Within Lines */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 hover:border-orange-500/30 transition-colors bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                id="opt-remove-extra-spaces"
                checked={options.removeExtraSpaces}
                onChange={() => handleToggleOption('removeExtraSpaces')}
                className="mt-0.5 w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-zinc-300 dark:border-zinc-700 accent-orange-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground block">
                  Remove extra inline spaces
                </span>
                <span className="text-muted-foreground text-[11px] leading-relaxed">
                  Collapses multiple consecutive spaces into a single space.
                </span>
              </div>
            </label>

            {/* 4. Normalize Repeated Blank Lines */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 hover:border-orange-500/30 transition-colors bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                id="opt-normalize-blank-lines"
                checked={options.normalizeBlankLines}
                disabled={options.removeEmptyLines}
                onChange={() => handleToggleOption('normalizeBlankLines')}
                className="mt-0.5 w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-zinc-300 dark:border-zinc-700 accent-orange-500 cursor-pointer disabled:opacity-50"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground block">
                  Normalize blank lines
                </span>
                <span className="text-muted-foreground text-[11px] leading-relaxed">
                  Reduces multiple blank lines to a single empty line.
                </span>
              </div>
            </label>

            {/* 5. Remove Empty Lines */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 hover:border-orange-500/30 transition-colors bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                id="opt-remove-empty-lines"
                checked={options.removeEmptyLines}
                onChange={() => handleToggleOption('removeEmptyLines')}
                className="mt-0.5 w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-zinc-300 dark:border-zinc-700 accent-orange-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground block">
                  Remove all empty lines
                </span>
                <span className="text-muted-foreground text-[11px] leading-relaxed">
                  Completely eliminates blank lines and line gaps.
                </span>
              </div>
            </label>

            {/* 6. Strip HTML Tags */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 hover:border-orange-500/30 transition-colors bg-zinc-50/50 dark:bg-zinc-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                id="opt-strip-html"
                checked={options.stripHtml}
                onChange={() => handleToggleOption('stripHtml')}
                className="mt-0.5 w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-zinc-300 dark:border-zinc-700 accent-orange-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground block">
                  Strip HTML tags
                </span>
                <span className="text-muted-foreground text-[11px] leading-relaxed">
                  Removes markup tags like &lt;p&gt; or &lt;div&gt; to leave plain text.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Statistics & Savings Comparison Bar */}
        <div className="mt-4 p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Original:{' '}
              <strong className="text-foreground font-semibold">
                {inputChars} chars
              </strong>{' '}
              ({inputLines} lines, {formatByteSize(inputBytes)})
            </span>
            <span>→</span>
            <span>
              Cleaned:{' '}
              <strong className="text-foreground font-semibold">
                {outputChars} chars
              </strong>{' '}
              ({outputLines} lines, {formatByteSize(outputBytes)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {charsDiff > 0 ? (
              <Badge variant="success">
                Saved {charsDiff} characters ({percentSaved}%)
              </Badge>
            ) : isInputEmpty ? (
              <Badge variant="muted">Awaiting text</Badge>
            ) : (
              <Badge variant="muted">Already clean</Badge>
            )}
          </div>
        </div>

        {/* Dual-Pane Editors */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Pane: Original Text */}
          <div className="flex flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wider uppercase text-foreground">
                  Original Text
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (navigator.clipboard?.readText) {
                        const pasted = await navigator.clipboard.readText();
                        if (pasted) {
                          setInput(pasted);
                          applyCleaning(pasted, options);
                        }
                      }
                    } catch {}
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Paste from clipboard"
                >
                  Paste
                </button>
              </div>
            </div>

            {/* Input Textarea */}
            <div className="relative flex-1 min-h-[340px] sm:min-h-[420px]">
              <textarea
                ref={inputRef}
                id="cleaner-input"
                name="cleaner-input"
                value={input}
                onChange={handleInputChange}
                placeholder="Type or paste messy text here to clean extra spaces and blank lines..."
                spellCheck={false}
                aria-label="Raw text to clean"
                className="w-full h-full p-4 font-mono text-xs sm:text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-y min-h-[340px] sm:min-h-[420px] leading-relaxed"
              />
            </div>
          </div>

          {/* Right Pane: Cleaned Output */}
          <div className="flex flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wider uppercase text-foreground">
                  Cleaned Output
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="reuse-btn"
                  onClick={handleReuseOutput}
                  disabled={isOutputEmpty}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    isOutputEmpty
                      ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                      : 'text-muted-foreground hover:text-foreground hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                  }`}
                  title="Use this cleaned output as next input"
                >
                  <ArrowLeftRightIcon size={12} />
                  <span className="hidden sm:inline">Use as Input</span>
                </button>

                <button
                  type="button"
                  id="copy-btn"
                  onClick={handleCopy}
                  disabled={isOutputEmpty}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isOutputEmpty
                      ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                      : copied
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 shadow-2xs'
                  }`}
                  title="Copy cleaned text to clipboard"
                >
                  {copied ? (
                    <>
                      <CheckIcon size={12} className="text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon size={12} />
                      <span>Copy Output</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Output Textarea */}
            <div className="relative flex-1 min-h-[340px] sm:min-h-[420px]">
              <textarea
                ref={outputRef}
                id="cleaner-output"
                name="cleaner-output"
                value={output}
                readOnly
                placeholder="Cleaned text will appear here automatically based on your selected rules..."
                spellCheck={false}
                aria-label="Cleaned text output"
                className="w-full h-full p-4 font-mono text-xs sm:text-sm bg-zinc-50/50 dark:bg-zinc-950/40 text-foreground placeholder:text-muted-foreground focus:outline-none resize-y min-h-[340px] sm:min-h-[420px] leading-relaxed select-all"
              />

              {copyFeedback && !copied && (
                <div className="absolute bottom-4 right-4 bg-rose-900 text-white px-3 py-1.5 rounded-lg text-xs shadow-lg animate-in fade-in">
                  {copyFeedback}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Documentation & Usage Guide Section */}
        <section className="mt-16 pt-12 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-4">
              How the Text Cleaner Works
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Copying text from PDFs, OCR documents, web pages, or email threads frequently introduces irregular spacing, trailing tabs, and inconsistent line gaps. ASAPTools provides surgical cleaning rules that allow you to sanitize data without destroying its underlying meaning.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm mb-3">
                  <SparklesIcon size={16} />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  Whitespace Sanitization
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Removes accidental trailing spaces that cause diff noise in git commits and collapses multiple consecutive spaces into single clean word spaces.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm mb-3">
                  <ZapIcon size={16} />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  Line Break Normalization
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Choose between normalizing repeated blank lines to single line breaks or completely eliminating all empty lines for compact data pipelines.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm mb-3">
                  <ShieldIcon size={16} />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  Zero Data Leakage
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All text sanitization executes locally inside your browser session. Your confidential documents, notes, and credentials are never transmitted over the network.
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
                  Confidential &amp; Secure
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ASAPTools processes all text entirely within your browser using native JavaScript regex execution. No external AI APIs, databases, or analytics engines receive your data.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
