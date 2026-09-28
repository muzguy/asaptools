'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  CaseMode,
  convertCase,
  CASE_CONVERTER_SAMPLE,
  toUppercase,
  toLowercase,
  toTitleCase,
  toSentenceCase,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
} from '@/lib/text-utils';
import {
  TextCaseIcon,
  CopyIcon,
  CheckIcon,
  TrashIcon,
  ArrowLeftRightIcon,
  ShieldIcon,
  ZapIcon,
  SparklesIcon,
} from '@/components/ui/icons';

interface CaseOption {
  id: CaseMode;
  name: string;
  example: string;
  description: string;
  fn: (s: string) => string;
}

const CASE_OPTIONS: CaseOption[] = [
  {
    id: 'uppercase',
    name: 'UPPERCASE',
    example: 'HELLO WORLD',
    description: 'Converts all characters to capital letters.',
    fn: toUppercase,
  },
  {
    id: 'lowercase',
    name: 'lowercase',
    example: 'hello world',
    description: 'Converts all characters to small letters.',
    fn: toLowercase,
  },
  {
    id: 'titlecase',
    name: 'Title Case',
    example: 'Hello World',
    description: 'Capitalizes the first letter of each major word.',
    fn: toTitleCase,
  },
  {
    id: 'sentencecase',
    name: 'Sentence case',
    example: 'Hello world. Example here.',
    description: 'Capitalizes the first character of each sentence.',
    fn: toSentenceCase,
  },
  {
    id: 'camelcase',
    name: 'camelCase',
    example: 'helloWorld',
    description: 'Combines words with lowercase first letter and capitalized following words.',
    fn: toCamelCase,
  },
  {
    id: 'pascalcase',
    name: 'PascalCase',
    example: 'HelloWorld',
    description: 'Combines words with every word capitalized.',
    fn: toPascalCase,
  },
  {
    id: 'snakecase',
    name: 'snake_case',
    example: 'hello_world',
    description: 'Lowercases words joined with underscores. Common in Python and databases.',
    fn: toSnakeCase,
  },
  {
    id: 'kebabcase',
    name: 'kebab-case',
    example: 'hello-world',
    description: 'Lowercases words joined with hyphens. Common in URLs and CSS classes.',
    fn: toKebabCase,
  },
];

export function CaseConverter() {
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [activeMode, setActiveMode] = useState<CaseMode>('uppercase');
  const [copiedMode, setCopiedMode] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // Handle Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    setOutput(convertCase(val, activeMode));
  };

  // Switch Case Mode
  const handleModeChange = (mode: CaseMode) => {
    setActiveMode(mode);
    setOutput(convertCase(input, mode));
  };

  // Load Sample
  const handleLoadSample = () => {
    setInput(CASE_CONVERTER_SAMPLE);
    setOutput(convertCase(CASE_CONVERTER_SAMPLE, activeMode));
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
    setOutput(convertCase(output, activeMode));
    inputRef.current?.focus();
  };

  // Copy Main Output
  const handleCopyOutput = async (textToCopy: string, modeLabel = 'main') => {
    if (!textToCopy) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        setCopiedMode(modeLabel);
        setTimeout(() => setCopiedMode(null), 2000);
        return;
      }
    } catch {
      // Proceed to fallback
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopiedMode(modeLabel);
        setTimeout(() => setCopiedMode(null), 2000);
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
            Case Converter
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                <TextCaseIcon size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Case Converter
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Instantly convert text to UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, and kebab-case with client-side privacy.
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
              <span>8 Conversion Formats</span>
            </div>
          </div>
        </div>

        {/* Mode Selector Toolbar */}
        <div className="mt-6 p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Transformation
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

          {/* 8 Casing Mode Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {CASE_OPTIONS.map((opt) => {
              const isActive = activeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  id={`case-btn-${opt.id}`}
                  onClick={() => handleModeChange(opt.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all touch-manipulation cursor-pointer flex flex-col items-center justify-center text-center ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs ring-2 ring-orange-500/50'
                      : 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-muted-foreground hover:text-foreground border border-transparent hover:border-border'
                  }`}
                  title={opt.description}
                >
                  <span className="truncate w-full">{opt.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dual-Pane Editors */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Pane: Input Text */}
          <div className="flex flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wider uppercase text-foreground">
                  Original Text
                </span>
                <span className="text-muted-foreground font-mono">
                  ({input.length} chars)
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
                          setOutput(convertCase(pasted, activeMode));
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
            <div className="relative flex-1 min-h-[320px] sm:min-h-[400px]">
              <textarea
                ref={inputRef}
                id="case-input"
                name="case-input"
                value={input}
                onChange={handleInputChange}
                placeholder="Type or paste your text here to convert into any case..."
                spellCheck={false}
                aria-label="Raw text for case conversion"
                className="w-full h-full p-4 font-sans text-sm sm:text-base bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-y min-h-[320px] sm:min-h-[400px] leading-relaxed"
              />
            </div>
          </div>

          {/* Right Pane: Converted Output */}
          <div className="flex flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wider uppercase text-foreground">
                  Converted Output
                </span>
                <span className="text-orange-600 dark:text-orange-400 font-semibold uppercase">
                  ({activeMode})
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
                  title="Use this converted output as next input"
                >
                  <ArrowLeftRightIcon size={12} />
                  <span className="hidden sm:inline">Use as Input</span>
                </button>

                <button
                  type="button"
                  id="copy-main-btn"
                  onClick={() => handleCopyOutput(output, 'main')}
                  disabled={isOutputEmpty}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isOutputEmpty
                      ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                      : copiedMode === 'main'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 shadow-2xs'
                  }`}
                  title="Copy converted text to clipboard"
                >
                  {copiedMode === 'main' ? (
                    <>
                      <CheckIcon size={12} className="text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon size={12} />
                      <span>Copy Result</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Output Textarea */}
            <div className="relative flex-1 min-h-[320px] sm:min-h-[400px]">
              <textarea
                ref={outputRef}
                id="case-output"
                name="case-output"
                value={output}
                readOnly
                placeholder="Converted text will appear here automatically as you type or change cases..."
                spellCheck={false}
                aria-label="Converted text output"
                className="w-full h-full p-4 font-sans text-sm sm:text-base bg-zinc-50/50 dark:bg-zinc-950/40 text-foreground placeholder:text-muted-foreground focus:outline-none resize-y min-h-[320px] sm:min-h-[400px] leading-relaxed select-all"
              />

              {copyFeedback && !copiedMode && (
                <div className="absolute bottom-4 right-4 bg-rose-900 text-white px-3 py-1.5 rounded-lg text-xs shadow-lg animate-in fade-in">
                  {copyFeedback}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* All Formats at a Glance Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <SparklesIcon size={18} className="text-orange-500" />
              <span>All Formats at a Glance</span>
            </h2>
            <span className="text-xs text-muted-foreground">
              Click &quot;Copy&quot; on any card to copy that specific format directly
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {CASE_OPTIONS.map((opt) => {
              const convertedValue = isInputEmpty
                ? opt.example
                : opt.fn(input);
              const isCopiedThis = copiedMode === opt.id;

              return (
                <div
                  key={opt.id}
                  className="p-4 rounded-xl bg-card border border-border shadow-2xs flex flex-col justify-between hover:border-orange-500/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                        {opt.name}
                      </span>
                      <button
                        type="button"
                        id={`copy-card-${opt.id}`}
                        onClick={() => handleCopyOutput(convertedValue, opt.id)}
                        disabled={isInputEmpty}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          isInputEmpty
                            ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                            : isCopiedThis
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground'
                        }`}
                        title={`Copy ${opt.name}`}
                      >
                        {isCopiedThis ? (
                          <>
                            <CheckIcon size={11} className="text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <CopyIcon size={11} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="font-mono text-xs text-muted-foreground bg-zinc-50 dark:bg-zinc-900/80 p-2.5 rounded-lg border border-border/80 break-all line-clamp-3">
                      {convertedValue}
                    </p>
                  </div>

                  <p className="mt-2 text-[11px] text-zinc-500 leading-normal">
                    {opt.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Documentation & Limitations Section */}
        <section className="mt-16 pt-12 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-4">
              Case Formatting Conventions &amp; Documented Limitations
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Text transformation algorithms apply programmatic rules across words and punctuation. Understanding these conventions ensures you achieve the exact formatting required for programming languages, database schemas, and publishing standards.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-2">
                  Developer Casing Conventions
                </h3>
                <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <li>
                    <strong className="text-foreground">camelCase:</strong> Standard for JavaScript, TypeScript, and Java variable and function names (e.g. <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">getUserProfile</code>).
                  </li>
                  <li>
                    <strong className="text-foreground">PascalCase:</strong> Standard for React components, TypeScript interfaces, and C# class names (e.g. <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">UserProfileCard</code>).
                  </li>
                  <li>
                    <strong className="text-foreground">snake_case:</strong> Standard for Python variables, SQL database columns, and JSON API keys (e.g. <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">user_profile_id</code>).
                  </li>
                  <li>
                    <strong className="text-foreground">kebab-case:</strong> Standard for URL slugs, REST paths, and CSS class names (e.g. <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">user-profile-header</code>).
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-2">
                  Important Limitations &amp; Edge Cases
                </h3>
                <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <li>
                    <strong className="text-foreground">Sentence Boundaries:</strong> Abbreviations with periods (e.g. <em>Dr.</em>, <em>U.S.A.</em>) can sometimes mimic sentence ends; always review sentence case output on technical prose.
                  </li>
                  <li>
                    <strong className="text-foreground">Title Case Small Words:</strong> Short prepositions and conjunctions (<em>a</em>, <em>the</em>, <em>and</em>, <em>in</em>, <em>of</em>) remain lowercase unless positioned at the beginning or end of a title.
                  </li>
                  <li>
                    <strong className="text-foreground">Language-Specific Casing:</strong> Conversions use standard Unicode casing. Languages with context-sensitive rules (e.g. Turkish dotted vs. dotless <em>i</em>/<em>İ</em>) map to standard Latin mappings.
                  </li>
                </ul>
              </div>
            </div>

            {/* Privacy Guarantee Box */}
            <div className="p-6 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-border flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldIcon size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  Client-Side Processing Guarantee
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All case transformations happen instantly on your device via client-side JavaScript. No text is sent to our servers, stored in databases, or analyzed by third-party tracking scripts.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
