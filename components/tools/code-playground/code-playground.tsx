'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTheme } from '@/components/theme/theme-context';
import {
  SupportedLanguage,
  LANGUAGE_CONFIGS,
  ExecutionResult,
  formatExecutionTime,
  formatMemoryUsage,
} from '@/lib/code-playground-utils';
import { getPythonRunner } from '@/lib/python-runner';
import {
  CodeIcon,
  TerminalIcon,
  PlayIcon,
  StopIcon,
  CopyIcon,
  CheckIcon,
  TrashIcon,
  RotateCcwIcon,
  ShieldIcon,
  ZapIcon,
  AlertCircleIcon,
  InfoIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

// Dynamically import CodeMirror with SSR disabled to prevent hydration discrepancies
const CodeEditor = dynamic(
  () => import('./code-editor'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[480px] bg-zinc-900 flex items-center justify-center text-zinc-500 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <span>Loading code workspace...</span>
        </div>
      </div>
    ),
  }
);

interface TerminalEntry {
  id: string;
  type: 'stdout' | 'stderr' | 'stdin' | 'system';
  text: string;
}

export function CodePlayground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Active language: defaults to Python 3 which executes in-browser
  const [language, setLanguage] = useState<SupportedLanguage>('python');

  // Maintain separate code state per language so work is not lost on switch
  const [codeMap, setCodeMap] = useState<Record<SupportedLanguage, string>>({
    c: LANGUAGE_CONFIGS.c.defaultStarterCode,
    cpp: LANGUAGE_CONFIGS.cpp.defaultStarterCode,
    python: LANGUAGE_CONFIGS.python.defaultStarterCode,
  });

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [runningStage, setRunningStage] = useState<string>('Executing Python code...');
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Interactive Terminal stdin states
  const [terminalEntries, setTerminalEntries] = useState<TerminalEntry[]>([]);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string>('');
  const [currentInput, setCurrentInput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // User utility states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'terminal'>('editor');
  const [showWasmNote, setShowWasmNote] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const terminalInputRef = useRef<HTMLInputElement | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const currentCode = codeMap[language];

  const handleCodeChange = (newCode: string) => {
    setCodeMap((prev) => ({ ...prev, [language]: newCode }));
  };

  // Auto-scroll terminal when new entries arrive or prompt opens
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalEntries, isWaitingForInput]);

  // Focus terminal input field when waiting for input
  useEffect(() => {
    if (isWaitingForInput) {
      terminalInputRef.current?.focus();
    }
  }, [isWaitingForInput]);

  // Submit interactive terminal standard input
  const handleSubmitInput = () => {
    if (!isWaitingForInput) return;
    const value = currentInput;
    const promptText = activePrompt || '';

    // Append user input line to terminal transcript
    setTerminalEntries((prev) => [
      ...prev,
      {
        id: `in_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'stdin',
        text: `${promptText}${value}`,
      },
    ]);

    // Save to command history for arrow-key cycling
    if (value.trim()) {
      setCommandHistory((prev) => [...prev, value]);
      setHistoryIndex(-1);
    }

    setIsWaitingForInput(false);
    setActivePrompt('');
    setCurrentInput('');

    // Resume Python worker execution
    getPythonRunner().sendInput(value, false);
  };

  // Send EOF signal (Ctrl+D equivalent) to input()
  const handleSendEof = () => {
    if (!isWaitingForInput) return;
    const promptText = activePrompt || '';

    setTerminalEntries((prev) => [
      ...prev,
      {
        id: `eof_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'stdin',
        text: `${promptText}^D`,
      },
    ]);

    setIsWaitingForInput(false);
    setActivePrompt('');
    setCurrentInput('');

    getPythonRunner().sendInput('', true);
  };

  // Handle keyboard inputs in terminal input prompt (Enter, Ctrl+D, Up/Down arrow history)
  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSubmitInput();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      e.stopPropagation();
      handleSendEof();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCurrentInput(commandHistory[nextIndex]);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setCurrentInput('');
      } else {
        setHistoryIndex(nextIndex);
        setCurrentInput(commandHistory[nextIndex]);
      }
      return;
    }
  };

  // Run Code
  const handleRun = useCallback(async () => {
    if (isRunning) return;

    // Guard C and C++ coming soon
    if (language === 'c' || language === 'cpp') {
      setErrorMessage(
        `${LANGUAGE_CONFIGS[language].name} cloud compilation is coming soon. Switch to Python 3 to compile and run code immediately in your browser via WebAssembly.`
      );
      return;
    }

    if (!currentCode.trim()) {
      setErrorMessage('Please write some Python code before executing.');
      return;
    }

    setIsRunning(true);
    setIsWaitingForInput(false);
    setActivePrompt('');
    setCurrentInput('');
    setErrorMessage(null);
    setResult(null);
    setTerminalEntries([]);
    setRunningStage('Preparing Python WebAssembly environment...');
    setActiveMobileTab('terminal');

    try {
      // Execute Python genuinely in the browser Web Worker via Pyodide with streaming callbacks
      const runner = getPythonRunner();
      const execResult = await runner.run(currentCode, '', {
        timeoutMs: 15000,
        onStatus: (_stage, message) => {
          setRunningStage(message);
        },
        onStdout: (chunk) => {
          setTerminalEntries((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.type === 'stdout') {
              return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
            }
            return [
              ...prev,
              { id: `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type: 'stdout', text: chunk },
            ];
          });
        },
        onStderr: (chunk) => {
          setTerminalEntries((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.type === 'stderr') {
              return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
            }
            return [
              ...prev,
              { id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type: 'stderr', text: chunk },
            ];
          });
        },
        onInputRequest: (prompt) => {
          setIsWaitingForInput(true);
          setActivePrompt(prompt);
          setCurrentInput('');
        },
      });

      setResult(execResult);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setResult({
          status: 'error',
          statusDescription: 'Execution Cancelled',
          stdout: '',
          stderr: 'Execution was stopped by user.',
          provider: 'Pyodide (Browser Wasm)',
        });
        setTerminalEntries((prev) => [
          ...prev,
          { id: `stop_${Date.now()}`, type: 'system', text: '\n[Execution stopped by user]' },
        ]);
      } else {
        const msg = err instanceof Error ? err.message : 'Execution failed.';
        setErrorMessage(msg);
      }
    } finally {
      setIsRunning(false);
      setIsWaitingForInput(false);
    }
  }, [currentCode, isRunning, language]);

  // Stop Code
  const handleStop = () => {
    if (language === 'python') {
      getPythonRunner().terminate();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    setIsWaitingForInput(false);
    setResult({
      status: 'error',
      statusDescription: 'Execution Cancelled',
      stdout: '',
      stderr: 'Execution was stopped by user.',
      provider: 'Pyodide (Browser Wasm)',
    });
    setTerminalEntries((prev) => [
      ...prev,
      { id: `stop_${Date.now()}`, type: 'system', text: '\n[Execution stopped by user]' },
    ]);
  };

  // Reset to starter code
  const handleReset = () => {
    const config = LANGUAGE_CONFIGS[language];
    if (window.confirm(`Reset ${config.name} code to starter template? Your current edits will be replaced.`)) {
      setCodeMap((prev) => ({ ...prev, [language]: config.defaultStarterCode }));
      setTerminalEntries([]);
      setResult(null);
      setErrorMessage(null);
      setIsWaitingForInput(false);
    }
  };

  // Copy Code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  // Copy Output Transcript
  const handleCopyOutput = async () => {
    const lines = terminalEntries.map((e) => e.text).join('\n');
    const extraCompile = result?.compileOutput ? `\n[Syntax / Compilation Output]\n${result.compileOutput}` : '';
    const extraErr =
      result?.stderr && !terminalEntries.some((e) => e.type === 'stderr')
        ? `\n[Errors / Stderr]\n${result.stderr}`
        : '';
    const textToCopy = (lines + extraCompile + extraErr).trim() || result?.stdout || '';

    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    } catch {}
  };

  // Clear Terminal Output
  const handleClear = () => {
    setTerminalEntries([]);
    setResult(null);
    setErrorMessage(null);
    setIsWaitingForInput(false);
  };

  // Keyboard shortcut listener for Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun]);

  const activeLangConfig = LANGUAGE_CONFIGS[language];

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
            ASAPTools CodeLab
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                <TerminalIcon size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  ASAPTools CodeLab
                </h1>
              </div>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Fast, free coding playground. Run Python 3 with interactive terminal standard input, real-time output, and Pyodide WebAssembly with zero API keys.
            </p>
          </div>

          {/* Environment & Backend Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {language === 'python' ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>In-Browser WebAssembly (Python 3.12)</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-border text-xs text-zinc-600 dark:text-zinc-300">
                  <ShieldIcon size={14} className="text-emerald-500" />
                  <span>100% Free &amp; Private</span>
                </div>
              </>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-medium">
                <ZapIcon size={14} className="text-amber-500" />
                <span>Cloud Compiler Coming Soon</span>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="mt-6 p-3 sm:p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Left: Language Selection */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground mr-1 hidden sm:inline">
              Language:
            </span>
            {(['python', 'c', 'cpp'] as SupportedLanguage[]).map((langKey) => {
              const langConfig = LANGUAGE_CONFIGS[langKey];
              const isSelected = language === langKey;
              const isLive = langKey === 'python';
              return (
                <button
                  key={langKey}
                  type="button"
                  id={`lang-select-${langKey}`}
                  onClick={() => {
                    setLanguage(langKey);
                    setResult(null);
                    setErrorMessage(null);
                    setTerminalEntries([]);
                    setIsWaitingForInput(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 shadow-xs'
                      : 'border-border bg-zinc-100/80 dark:bg-zinc-800/60 text-muted-foreground hover:text-foreground hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80'
                  }`}
                >
                  <CodeIcon size={14} />
                  <span>{langConfig.name}</span>
                  {isLive ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      Live Wasm
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-border">
                      Coming Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Actions (Run, Stop, Reset, Copy, Clear) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Run Button */}
            {language !== 'python' ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-border"
                title="C & C++ cloud compiler is coming soon. Switch to Python 3 for live execution."
              >
                <PlayIcon size={15} />
                <span>Coming Soon</span>
              </button>
            ) : !isRunning ? (
              <button
                type="button"
                id="run-code-btn"
                onClick={handleRun}
                className="px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all touch-manipulation cursor-pointer bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                title="Run Python 3 locally in browser (Ctrl+Enter)"
              >
                <PlayIcon size={15} />
                <span>Run Code</span>
                <span className="text-[11px] opacity-80 font-mono hidden sm:inline ml-0.5">
                  Ctrl+↵
                </span>
              </button>
            ) : (
              <button
                type="button"
                id="stop-code-btn"
                onClick={handleStop}
                className="px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all touch-manipulation cursor-pointer bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-[0.99]"
                title="Stop execution and terminate worker"
              >
                <StopIcon size={15} />
                <span>Stop</span>
              </button>
            )}

            {/* Reset to starter code */}
            <button
              type="button"
              id="reset-code-btn"
              onClick={handleReset}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold border border-border bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-foreground transition-colors cursor-pointer touch-manipulation flex items-center gap-1.5"
              title="Reset code to default template"
            >
              <RotateCcwIcon size={14} />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Copy code */}
            <button
              type="button"
              id="copy-code-btn"
              onClick={handleCopyCode}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold border border-border bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-foreground transition-colors cursor-pointer touch-manipulation flex items-center gap-1.5"
              title="Copy code to clipboard"
            >
              {copiedCode ? (
                <>
                  <CheckIcon size={14} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                    Copied!
                  </span>
                </>
              ) : (
                <>
                  <CopyIcon size={14} />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>

            {/* Clear output */}
            <button
              type="button"
              id="clear-output-btn"
              onClick={handleClear}
              disabled={terminalEntries.length === 0 && !result && !errorMessage}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer touch-manipulation flex items-center gap-1.5 ${
                terminalEntries.length === 0 && !result && !errorMessage
                  ? 'border-border text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                  : 'border-border text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
              title="Clear terminal output"
            >
              <TrashIcon size={14} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden mt-4 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border">
          <button
            type="button"
            onClick={() => setActiveMobileTab('editor')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeMobileTab === 'editor'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Source Code ({activeLangConfig.extension})
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('terminal')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeMobileTab === 'terminal'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Interactive Terminal</span>
            {isWaitingForInput && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
            {!isWaitingForInput && result?.status === 'success' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
            {!isWaitingForInput &&
              (result?.status === 'compilation_error' || result?.status === 'runtime_error') && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              )}
          </button>
        </div>

        {/* Workspace Dual-Pane Grid */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[580px]">
          {/* Left Pane: Code Editor */}
          <div
            className={`lg:col-span-7 flex flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden ${
              activeMobileTab !== 'editor' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Editor Header Bar */}
            <div className="px-4 py-2.5 border-b border-border bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wider uppercase text-foreground">
                  Editor
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  ({activeLangConfig.name} • {activeLangConfig.version})
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                <span>{currentCode.split('\n').length} lines</span>
                <span>•</span>
                <span>{currentCode.length} chars</span>
              </div>
            </div>

            {/* CodeMirror Editor Area */}
            <div className="relative flex-1 min-h-[480px] sm:min-h-[560px]">
              <CodeEditor
                value={currentCode}
                onChange={handleCodeChange}
                language={language}
                isDark={isDark}
                onRun={handleRun}
              />
            </div>

            {/* Editor Footer Bar */}
            <div className="px-4 py-2 border-t border-border bg-zinc-50/60 dark:bg-zinc-900/60 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <div className="flex items-center gap-2">
                <span>Tab: 4 spaces</span>
                <span>•</span>
                <span>UTF-8</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWasmNote(!showWasmNote)}
                  className="hover:text-foreground text-orange-600 dark:text-orange-400 transition-colors flex items-center gap-1 cursor-pointer"
                  title="View WebAssembly sandbox information"
                >
                  <InfoIcon size={12} />
                  <span>Wasm &amp; Interactive details</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Pane: Unified Interactive Terminal Console */}
          <div
            className={`lg:col-span-5 flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-md overflow-hidden min-h-[500px] ${
              activeMobileTab !== 'terminal' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Terminal Window Header */}
            <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
              <div className="flex items-center gap-3">
                {/* Window Action Dots */}
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono font-semibold text-zinc-200 flex items-center gap-1.5">
                  <TerminalIcon size={14} className="text-orange-400" />
                  <span>Interactive Terminal</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Indicator */}
                {isWaitingForInput && (
                  <Badge variant="brand" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Waiting for Input</span>
                  </Badge>
                )}

                {!isWaitingForInput && isRunning && (
                  <Badge variant="brand" className="bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>Executing...</span>
                  </Badge>
                )}

                {!isRunning && result?.status === 'success' && (
                  <Badge variant="brand" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Success
                  </Badge>
                )}

                {!isRunning && result?.status === 'compilation_error' && (
                  <Badge variant="error" className="bg-rose-500/20 text-rose-400 border-rose-500/30">
                    Syntax Error
                  </Badge>
                )}

                {!isRunning && result?.status === 'runtime_error' && (
                  <Badge variant="error" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                    Runtime Error
                  </Badge>
                )}

                {!isRunning && result?.status === 'time_limit_exceeded' && (
                  <Badge variant="error" className="bg-rose-500/20 text-rose-400 border-rose-500/30">
                    Time Limit Exceeded
                  </Badge>
                )}

                {/* Copy output transcript */}
                {(terminalEntries.length > 0 || result) && (
                  <button
                    type="button"
                    onClick={handleCopyOutput}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                    title="Copy terminal transcript"
                  >
                    {copiedOutput ? (
                      <CheckIcon size={14} className="text-emerald-400" />
                    ) : (
                      <CopyIcon size={14} />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Execution Metrics Bar */}
            {result && (
              <div className="px-4 py-1.5 bg-zinc-900/50 border-b border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-3">
                  <span>
                    Time: <strong className="text-zinc-200">{formatExecutionTime(result.executionTimeMs)}</strong>
                  </span>
                  {result.memoryKb && (
                    <span>
                      Memory: <strong className="text-zinc-200">{formatMemoryUsage(result.memoryKb)}</strong>
                    </span>
                  )}
                  <span>
                    Exit:{' '}
                    <strong
                      className={
                        result.exitCode === 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }
                    >
                      {result.exitCode ?? 0}
                    </strong>
                  </span>
                </div>
                <div>
                  <span className="text-emerald-400 font-medium">Pyodide Wasm</span>
                </div>
              </div>
            )}

            {/* Terminal Screen Body */}
            <div
              className="flex-1 p-4 font-mono text-xs sm:text-sm text-zinc-100 overflow-y-auto leading-relaxed select-text space-y-2 flex flex-col justify-start"
              onClick={() => {
                if (isWaitingForInput) {
                  terminalInputRef.current?.focus();
                }
              }}
            >
              {/* 1. Language Coming Soon Banner (for C and C++) */}
              {language !== 'python' && (
                <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <ZapIcon size={16} />
                    <span>{activeLangConfig.name} Compiler In Development</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    C and C++ require a containerized GCC/G++ cloud environment and are currently in development.
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <strong className="text-emerald-400">Python 3 is 100% operational right now</strong> with genuinely interactive terminal standard input (<code className="text-zinc-300">input()</code>), live output streaming, and zero API keys.
                  </p>
                  <button
                    type="button"
                    onClick={() => setLanguage('python')}
                    className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <PlayIcon size={13} />
                    <span>Switch to Python 3 &amp; Run</span>
                  </button>
                </div>
              )}

              {/* 2. Initial Loading Spinner during Pyodide download / initialization */}
              {isRunning && terminalEntries.length === 0 && !isWaitingForInput && (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400 space-y-3">
                  <div className="w-7 h-7 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                  <p className="text-xs font-semibold text-zinc-200">
                    {runningStage}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Running client-side in a Web Worker via Pyodide WebAssembly
                  </p>
                </div>
              )}

              {/* 3. Error Message Banner */}
              {!isRunning && errorMessage && language === 'python' && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircleIcon size={16} className="text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <strong className="block text-xs font-bold text-rose-200">
                        Execution Request Error
                      </strong>
                      <p className="text-xs text-rose-300/90 mt-0.5 whitespace-pre-wrap">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Compilation / Syntax Error Display */}
              {!isRunning && result?.compileOutput && language === 'python' && (
                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-wider text-rose-400 font-bold">
                    Syntax / Compilation Error:
                  </div>
                  <pre className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/40 text-rose-300 whitespace-pre-wrap overflow-x-auto text-xs font-mono">
                    {result.compileOutput}
                  </pre>
                </div>
              )}

              {/* 5. Terminal Chronological Output Entries (stdout, stderr, stdin, system) */}
              {terminalEntries.map((entry) => {
                if (entry.type === 'stdout') {
                  return (
                    <span key={entry.id} className="text-zinc-100 whitespace-pre-wrap break-words inline">
                      {entry.text}
                    </span>
                  );
                }
                if (entry.type === 'stderr') {
                  return (
                    <div key={entry.id} className="text-amber-300 whitespace-pre-wrap break-words">
                      {entry.text}
                    </div>
                  );
                }
                if (entry.type === 'stdin') {
                  return (
                    <div key={entry.id} className="text-emerald-400 font-semibold whitespace-pre-wrap break-words">
                      {entry.text}
                    </div>
                  );
                }
                if (entry.type === 'system') {
                  return (
                    <div key={entry.id} className="text-zinc-500 text-[11px] italic">
                      {entry.text}
                    </div>
                  );
                }
                return null;
              })}

              {/* 6. Active Interactive Input Prompt */}
              {isWaitingForInput && (
                <div className="flex items-center gap-2 pt-2 mt-1 border-t border-zinc-800/80 bg-zinc-900/60 px-3 py-2 rounded-xl text-xs sm:text-sm font-mono animate-in fade-in duration-150">
                  <span className="text-orange-400 font-bold shrink-0 select-none flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{activePrompt || '❯'}</span>
                  </span>
                  <input
                    ref={terminalInputRef}
                    id="terminal-interactive-input"
                    name="terminal-interactive-input"
                    type="text"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={handleTerminalKeyDown}
                    placeholder="Type here and press Enter (or Ctrl+D for EOF)..."
                    aria-label="Terminal standard input prompt"
                    className="flex-1 bg-transparent border-none outline-none text-zinc-100 font-mono text-xs sm:text-sm placeholder:text-zinc-500 focus:ring-0 p-0"
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      id="terminal-submit-btn"
                      onClick={handleSubmitInput}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors cursor-pointer"
                      title="Submit input (Enter)"
                    >
                      Enter ↵
                    </button>
                    <button
                      type="button"
                      id="terminal-eof-btn"
                      onClick={handleSendEof}
                      className="px-2 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
                      title="Send EOF (Ctrl+D)"
                    >
                      EOF
                    </button>
                  </div>
                </div>
              )}

              {/* 7. Runtime Error Traceback (if not already streamed) */}
              {!isRunning &&
                result?.stderr &&
                !result.compileOutput &&
                !terminalEntries.some((e) => e.type === 'stderr') &&
                language === 'python' && (
                  <div className="space-y-1 mt-2">
                    <div className="text-[11px] uppercase tracking-wider text-amber-400 font-bold">
                      Python Traceback (stderr):
                    </div>
                    <pre className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/40 text-amber-300 whitespace-pre-wrap overflow-x-auto text-xs font-mono">
                      {result.stderr}
                    </pre>
                  </div>
                )}

              {/* 8. Success with empty output */}
              {!isRunning &&
                result &&
                terminalEntries.length === 0 &&
                !result.stdout &&
                !result.stderr &&
                !result.compileOutput &&
                language === 'python' && (
                  <div className="text-zinc-500 italic text-xs py-4">
                    Program finished with exit code {result.exitCode ?? 0} (no output produced).
                  </div>
                )}

              {/* 9. Idle Empty State */}
              {!isRunning && terminalEntries.length === 0 && !result && !errorMessage && language === 'python' && (
                <div className="py-8 text-zinc-500 text-xs space-y-2 font-mono">
                  <div className="text-zinc-400">
                    asaptools@codelab:~$ Ready. Pyodide WebAssembly Python 3 is active.
                  </div>
                  <p>
                    Click <strong className="text-zinc-300">Run Code</strong> (or press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">Ctrl+Enter</kbd>) to compile and run your code locally in your browser.
                  </p>
                  <p className="text-zinc-600 text-[11px]">
                    Interactive terminal combines real-time stdout, stderr, and inline keyboard prompts for <code className="text-orange-400">input()</code>.
                  </p>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>

        {/* WebAssembly Security & Capability Note */}
        {showWasmNote && (
          <div className="mt-6 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/90 border border-border text-xs text-muted-foreground space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <ShieldIcon size={16} className="text-emerald-500" />
              <span>Browser WebAssembly &amp; Interactive Input Details</span>
            </div>
            <p className="leading-relaxed">
              Python 3 executes client-side inside your browser using Pyodide (CPython 3.12 compiled to WebAssembly) within a dedicated Web Worker thread.
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li><strong>Interactive Terminal Bridge:</strong> Calls to <code>input()</code> and <code>sys.stdin</code> pause execution, display the prompt in the terminal, accept typed user input via Enter, and resume execution without locking the browser UI.</li>
              <li><strong>Safe &amp; Isolated:</strong> Automated 15-second execution timeout and instant Stop control ensure your browser tab stays responsive.</li>
              <li><strong>Supported Python Features:</strong> Standard library, mathematical algorithms, data processing, list comprehensions, classes, sequential interactive prompts, and tracebacks.</li>
              <li><strong>Async Transformation Scope:</strong> Interactive input is supported across top-level statements, nested functions, loops, and conditional branches. Class constructors (<code>__init__</code>) and synchronous higher-order callbacks (e.g. <code>map(lambda: input())</code>) cannot be made asynchronous due to standard Python language specifications.</li>
            </ul>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="mt-12 pt-8 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ZapIcon size={18} />
            </div>
            <h3 className="font-bold text-sm text-foreground">Pyodide WebAssembly</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Runs genuine Python 3.12 locally inside your browser via WebAssembly. Zero backend API calls, zero latency, and zero subscriptions required.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <TerminalIcon size={18} />
            </div>
            <h3 className="font-bold text-sm text-foreground">Interactive Terminal Input</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Real-time terminal with genuine <code>input()</code> pauses, interactive typing, sequential prompts, command history, and EOF signals.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ShieldIcon size={18} />
            </div>
            <h3 className="font-bold text-sm text-foreground">Worker Thread Safety</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Executes in a separate Web Worker thread with hard timeout enforcement and reliable Stop controls to keep your browser responsive at all times.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
