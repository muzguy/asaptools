'use client';

import React, { useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import {
  formatJson,
  minifyJson,
  validateJson,
  calculateStats,
  SAMPLE_JSON,
  IndentationType,
  JsonErrorInfo,
  JsonStats,
} from '@/lib/json-utils';
import {
  CodeIcon,
  CheckIcon,
  CopyIcon,
  TrashIcon,
  ArrowLeftRightIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ZapIcon,
  ShieldIcon,
  SparklesIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

type ValidationStatus = 'untested' | 'valid' | 'invalid';

export function JsonFormatter() {
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [indent, setIndent] = useState<IndentationType>('2');
  const [status, setStatus] = useState<ValidationStatus>('untested');
  const [errorInfo, setErrorInfo] = useState<JsonErrorInfo | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  const inputStats: JsonStats = calculateStats(input);
  const outputStats: JsonStats = calculateStats(output);

  // Handle Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    setStatus('untested');
    setErrorInfo(null);
    setSuccessMessage(null);
  };

  // 1. Format / Beautify
  const handleFormat = () => {
    if (!input.trim()) {
      setStatus('untested');
      setErrorInfo(null);
      setOutput('');
      return;
    }

    startTransition(() => {
      const result = formatJson(input, indent);
      if (result.success) {
        setOutput(result.output);
        setStatus('valid');
        setErrorInfo(null);
        setSuccessMessage('JSON formatted and validated successfully!');
      } else {
        setStatus('invalid');
        setErrorInfo(result.error);
        setSuccessMessage(null);
      }
    });
  };

  // 2. Validate
  const handleValidate = () => {
    if (!input.trim()) {
      setStatus('untested');
      setErrorInfo(null);
      setSuccessMessage(null);
      return;
    }

    startTransition(() => {
      const result = validateJson(input);
      if (result.isValid) {
        setStatus('valid');
        setErrorInfo(null);
        setSuccessMessage('Valid JSON! Syntax is 100% compliant with RFC 8259.');
      } else {
        setStatus('invalid');
        setErrorInfo(result.error);
        setSuccessMessage(null);
      }
    });
  };

  // 3. Minify
  const handleMinify = () => {
    if (!input.trim()) {
      setStatus('untested');
      setErrorInfo(null);
      setOutput('');
      return;
    }

    startTransition(() => {
      const result = minifyJson(input);
      if (result.success) {
        setOutput(result.output);
        setStatus('valid');
        setErrorInfo(null);
        setSuccessMessage('JSON minified successfully! Whitespace compressed.');
      } else {
        setStatus('invalid');
        setErrorInfo(result.error);
        setSuccessMessage(null);
      }
    });
  };

  // 4. Load Sample
  const handleLoadSample = () => {
    setInput(SAMPLE_JSON);
    setStatus('untested');
    setErrorInfo(null);
    setSuccessMessage(null);

    // Auto format the sample on load
    const result = formatJson(SAMPLE_JSON, indent);
    if (result.success) {
      setOutput(result.output);
      setStatus('valid');
      setSuccessMessage('Sample JSON loaded and formatted!');
    }
    inputRef.current?.focus();
  };

  // 5. Clear Editor
  const handleClear = () => {
    setInput('');
    setOutput('');
    setStatus('untested');
    setErrorInfo(null);
    setSuccessMessage(null);
    setCopyFeedback(null);
    inputRef.current?.focus();
  };

  // 6. Swap / Reuse Output as Input
  const handleReuseOutput = () => {
    if (!output) return;
    setInput(output);
    setOutput('');
    setStatus('valid');
    setErrorInfo(null);
    setSuccessMessage('Formatted output moved to input editor for further editing.');
    inputRef.current?.focus();
  };

  // 7. Copy Output
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

    // Fallback for older browsers or restricted environments
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
            href="/#tools"
            className="hover:text-foreground transition-colors hover:underline underline-offset-4"
          >
            Developer Tools
          </Link>
          <span aria-hidden="true" className="text-zinc-400">/</span>
          <span className="text-foreground font-semibold" aria-current="page">
            JSON Formatter &amp; Validator
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                <CodeIcon size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                JSON Formatter &amp; Validator
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Format, validate, beautify, and minify JSON data instantly. Detect syntax errors with line and column precision, with 100% private, client-side processing.
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
              <span>Instant V8 Engine</span>
            </div>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="mt-6 p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Primary Operations */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="format-btn"
              onClick={handleFormat}
              disabled={isInputEmpty}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all touch-manipulation cursor-pointer ${
                isInputEmpty
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99]'
              }`}
              title="Format and beautify JSON"
            >
              <SparklesIcon size={16} />
              <span>Format JSON</span>
            </button>

            <button
              type="button"
              id="validate-btn"
              onClick={handleValidate}
              disabled={isInputEmpty}
              className={`px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 border transition-all touch-manipulation cursor-pointer ${
                isInputEmpty
                  ? 'border-border text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  : 'border-border bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-foreground'
              }`}
              title="Validate JSON syntax"
            >
              <CheckCircleIcon size={16} className="text-emerald-500" />
              <span>Validate</span>
            </button>

            <button
              type="button"
              id="minify-btn"
              onClick={handleMinify}
              disabled={isInputEmpty}
              className={`px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 border transition-all touch-manipulation cursor-pointer ${
                isInputEmpty
                  ? 'border-border text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  : 'border-border bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-foreground'
              }`}
              title="Remove whitespace and minify JSON"
            >
              <ZapIcon size={16} className="text-amber-500" />
              <span>Minify</span>
            </button>

            {/* Indentation Selector */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-border text-xs">
              <span className="px-2 text-muted-foreground font-medium hidden sm:inline">
                Indent:
              </span>
              <button
                type="button"
                onClick={() => {
                  setIndent('2');
                  if (!isInputEmpty) {
                    const res = formatJson(input, '2');
                    if (res.success) setOutput(res.output);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  indent === '2'
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="2 Spaces indentation"
              >
                2 spaces
              </button>
              <button
                type="button"
                onClick={() => {
                  setIndent('4');
                  if (!isInputEmpty) {
                    const res = formatJson(input, '4');
                    if (res.success) setOutput(res.output);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  indent === '4'
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="4 Spaces indentation"
              >
                4 spaces
              </button>
              <button
                type="button"
                onClick={() => {
                  setIndent('compact');
                  if (!isInputEmpty) {
                    const res = formatJson(input, 'compact');
                    if (res.success) setOutput(res.output);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  indent === 'compact'
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Compact / minified format"
              >
                Compact
              </button>
            </div>
          </div>

          {/* Secondary Utilities: Sample, Clear */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="sample-btn"
              onClick={handleLoadSample}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-foreground transition-colors cursor-pointer touch-manipulation flex items-center gap-1.5"
              title="Load realistic sample JSON data"
            >
              <span>Load Sample</span>
            </button>

            <button
              type="button"
              id="clear-btn"
              onClick={handleClear}
              disabled={isInputEmpty && isOutputEmpty}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer touch-manipulation flex items-center gap-1.5 ${
                isInputEmpty && isOutputEmpty
                  ? 'border-border text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  : 'border-border text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
              title="Clear input and output editors"
            >
              <TrashIcon size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Status & Messages Banner */}
        <div className="mt-4">
          {status === 'valid' && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircleIcon size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold">
                  {successMessage || 'Valid JSON. Syntax is clean and properly formatted.'}
                </span>
              </div>
              <Badge variant="success">Valid</Badge>
            </div>
          )}

          {status === 'invalid' && errorInfo && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs sm:text-sm space-y-2 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertCircleIcon size={18} className="text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Invalid JSON Syntax:</span>{' '}
                    <span>{errorInfo.message}</span>
                    {errorInfo.line !== null && (
                      <span className="ml-2 font-mono text-xs bg-rose-500/20 px-2 py-0.5 rounded-md font-semibold">
                        Line {errorInfo.line}, Column {errorInfo.column ?? 1}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="error">Error</Badge>
              </div>

              {errorInfo.snippet && (
                <div className="mt-2 p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-rose-900/40">
                  <div className="text-zinc-400 text-[11px] mb-1">
                    Line {errorInfo.line}:
                  </div>
                  <pre className="text-rose-300 whitespace-pre">{errorInfo.snippet}</pre>
                  {errorInfo.pointer && (
                    <pre className="text-amber-400 font-bold whitespace-pre">{errorInfo.pointer}</pre>
                  )}
                </div>
              )}
            </div>
          )}

          {status === 'untested' && (
            <div className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-border text-xs text-muted-foreground flex items-center justify-between">
              <span>
                {isInputEmpty
                  ? 'Paste or type JSON above, or click "Load Sample" to begin.'
                  : 'Input modified. Click "Format JSON" or "Validate" to check.'}
              </span>
              <Badge variant="muted">Untested</Badge>
            </div>
          )}
        </div>

        {/* Dual-Pane Editors */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Pane: Input Editor */}
          <div className="flex flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {/* Input Header */}
            <div className="px-4 py-3 border-b border-border bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wider uppercase text-foreground">
                  Input JSON
                </span>
                <span className="text-muted-foreground font-mono">
                  ({inputStats.characters} chars, {inputStats.lines} lines, {inputStats.sizeFormatted})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (navigator.clipboard?.readText) {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setInput(text);
                          setStatus('untested');
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
            <div className="relative flex-1 min-h-[360px] sm:min-h-[440px]">
              <textarea
                ref={inputRef}
                id="json-input"
                name="json-input"
                value={input}
                onChange={handleInputChange}
                placeholder={`Paste your JSON here...\n\nExample:\n{\n  "title": "ASAPTools",\n  "fast": true\n}`}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                aria-label="Raw JSON Input"
                className="w-full h-full p-4 font-mono text-xs sm:text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-y min-h-[360px] sm:min-h-[440px] leading-relaxed"
              />
            </div>
          </div>

          {/* Right Pane: Formatted Output */}
          <div className="flex flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {/* Output Header */}
            <div className="px-4 py-3 border-b border-border bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wider uppercase text-foreground">
                  Formatted Output
                </span>
                <span className="text-muted-foreground font-mono">
                  ({outputStats.characters} chars, {outputStats.lines} lines, {outputStats.sizeFormatted})
                </span>
              </div>

              {/* Action buttons inside output header */}
              <div className="flex items-center gap-2">
                {/* Swap / Reuse as input */}
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
                  title="Use this output as the next input"
                >
                  <ArrowLeftRightIcon size={12} />
                  <span className="hidden sm:inline">Use as Input</span>
                </button>

                {/* Copy Button */}
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
                      : 'bg-zinc-200/70 dark:bg-zinc-800 text-foreground hover:bg-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                  title="Copy formatted JSON to clipboard"
                >
                  {copied ? (
                    <>
                      <CheckIcon size={12} className="text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Output Viewer / Textarea */}
            <div className="relative flex-1 min-h-[360px] sm:min-h-[440px]">
              <textarea
                ref={outputRef}
                id="json-output"
                name="json-output"
                value={output}
                readOnly
                placeholder="Formatted output will appear here automatically when you click Format, Minify, or Load Sample..."
                spellCheck={false}
                aria-label="Formatted JSON Output"
                className="w-full h-full p-4 font-mono text-xs sm:text-sm bg-zinc-50/50 dark:bg-zinc-950/40 text-foreground placeholder:text-muted-foreground focus:outline-none resize-y min-h-[360px] sm:min-h-[440px] leading-relaxed select-all"
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
              How to Use the JSON Formatter &amp; Validator
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              JSON (JavaScript Object Notation) is the ubiquitous standard for APIs, configuration files, and data storage. Our online tool offers an ultra-fast, zero-friction developer experience for formatting, debugging, and preparing JSON for production.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm mb-3">
                  1
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  Paste or Load JSON
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Paste messy, unformatted, or minified JSON directly into the editor, or click <strong>Load Sample</strong> to test right away.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm mb-3">
                  2
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  Format, Validate, or Minify
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Choose your indentation preference (2 spaces, 4 spaces, or compact), then click <strong>Format</strong> or <strong>Minify</strong> to instantly parse your data.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm mb-3">
                  3
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  Copy or Continue Editing
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Copy clean output directly to your clipboard with one click, or use <strong>Use as Input</strong> to continue transforming your data.
                </p>
              </div>
            </div>

            {/* Common Errors Guide */}
            <div className="p-6 rounded-2xl bg-card border border-border mb-12">
              <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <AlertCircleIcon size={18} className="text-orange-500" />
                <span>Common JSON Syntax Errors &amp; Fixes</span>
              </h3>
              <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground shrink-0">• Trailing Commas:</span>
                  <span>
                    JSON strictly forbids trailing commas after the last property or array item (e.g., <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-rose-500 font-mono">&#123;&quot;a&quot;: 1,&#125;</code> is invalid).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground shrink-0">• Single Quotes:</span>
                  <span>
                    Unlike standard JavaScript, JSON specification (RFC 8259) requires double quotes (<code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-emerald-500 font-mono">&quot;key&quot;</code>) for all property keys and strings.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground shrink-0">• Unquoted Keys:</span>
                  <span>
                    Keys must always be wrapped in quotes. <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-rose-500 font-mono">&#123;name: &quot;John&quot;&#125;</code> is invalid; use <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-emerald-500 font-mono">&#123;&quot;name&quot;: &quot;John&quot;&#125;</code>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground shrink-0">• Comments:</span>
                  <span>
                    Standard JSON does not support JavaScript comments (<code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">{'//'}</code> or <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">{'/* */'}</code>). Remove them before validating.
                  </span>
                </li>
              </ul>
            </div>

            {/* Privacy Guarantee Box */}
            <div className="p-6 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-border flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldIcon size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  Your Data Stays Private
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ASAPTools processes all JSON entirely within your browser using your local V8 JavaScript engine. Your inputs, secrets, tokens, and payloads are never sent to our servers, logged, or shared with any third party.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
