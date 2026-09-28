'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  formatByteSize,
  safeRevokeUrl,
  validateWordFile,
  getOutputPdfFilename,
  createSampleWordDocument,
} from '@/lib/word-to-pdf-utils';
import {
  WordToPdfIcon,
  DownloadIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TrashIcon,
  ShieldIcon,
  ZapIcon,
  CheckIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

export function WordToPdf() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'converting' | 'success' | 'error'>('idle');
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [resultPdf, setResultPdf] = useState<{
    blob: Blob;
    objectUrl: string;
    filename: string;
    size: number;
    originalSize: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isServerConfigured, setIsServerConfigured] = useState<boolean | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    activeObjectUrlRef.current = resultPdf?.objectUrl || null;
  }, [resultPdf]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      safeRevokeUrl(activeObjectUrlRef.current);
    };
  }, []);

  const [isCheckingConfig, setIsCheckingConfig] = useState(false);

  const handleRecheckConfig = async () => {
    setIsCheckingConfig(true);
    try {
      const res = await fetch('/api/convert/word-to-pdf');
      const data = await res.json();
      setIsServerConfigured(Boolean(data.configured));
    } catch {
      setIsServerConfigured(null);
    } finally {
      setIsCheckingConfig(false);
    }
  };

  // Check server configuration status on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/convert/word-to-pdf')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setIsServerConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (isMounted) setIsServerConfigured(null);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectFile = useCallback((file: File) => {
    setErrorMessage(null);
    setErrorDetails(null);
    safeRevokeUrl(activeObjectUrlRef.current);
    setResultPdf(null);
    setStatus('idle');

    const validation = validateWordFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file format.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    setErrorMessage(null);
    setErrorDetails(null);
    try {
      const sample = await createSampleWordDocument();
      handleSelectFile(sample);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not create sample Word document.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleClearAll = () => {
    safeRevokeUrl(activeObjectUrlRef.current);
    setResultPdf(null);
    setSelectedFile(null);
    setStatus('idle');
    setErrorMessage(null);
    setErrorDetails(null);
    setProgressMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setStatus('converting');
    setErrorMessage(null);
    setErrorDetails(null);
    setProgressMessage('Uploading document to conversion engine...');
    safeRevokeUrl(activeObjectUrlRef.current);
    setResultPdf(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setProgressMessage('Rendering layout & compiling PDF with CloudConvert...');
      const response = await fetch('/api/convert/word-to-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        setStatus('error');
        setErrorMessage(errorJson.error || `Conversion request failed with status ${response.status}`);
        setErrorDetails(errorJson.details || null);
        if (errorJson.code === 'MISSING_API_KEY') {
          setIsServerConfigured(false);
        }
        return;
      }

      setIsServerConfigured(true);
      const pdfBlob = await response.blob();
      const objectUrl = URL.createObjectURL(pdfBlob);
      const downloadFilename = getOutputPdfFilename(selectedFile.name);

      setResultPdf({
        blob: pdfBlob,
        objectUrl,
        filename: downloadFilename,
        size: pdfBlob.size,
        originalSize: selectedFile.size,
      });

      setStatus('success');
      setProgressMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'A network error occurred while communicating with the conversion server.'
      );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-zinc-500">PDF Documents</span>
        <span>/</span>
        <span className="text-foreground font-medium">Word to PDF</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <Badge variant="brand" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
            Office Utilities
          </Badge>
          <Badge variant="muted" className="text-xs">
            High-Fidelity Layout Engine
          </Badge>
          <Badge variant="muted" className="text-xs">
            CloudConvert Backend
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Word to PDF Converter
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
          Convert Word documents (.docx, .doc) to crisp, professional PDF files. Preserves exact margins, typography, custom fonts, complex tables, and page geometry with zero formatting loss.
        </p>
      </div>

      {/* CloudConvert API Key Notice (Only visible if key is not configured) */}
      {isServerConfigured === false && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-800 dark:text-amber-300 mb-6 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircleIcon size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Local Setup Notice: CLOUDCONVERT_API_KEY Required</span>
          </div>
          <p className="text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">
            Real Word to PDF conversion uses CloudConvert&apos;s genuine Microsoft Office layout engine. To enable conversion, add your free API key to <code className="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono font-semibold">.env.local</code>:
          </p>
          <div className="p-2.5 rounded-xl bg-background/80 dark:bg-zinc-900/80 border border-amber-500/20 font-mono text-xs select-all">
            CLOUDCONVERT_API_KEY=your_cloudconvert_api_key_here
          </div>
          <p className="text-[11px] text-muted-foreground">
            You can generate a free CloudConvert API key at{' '}
            <a
              href="https://cloudconvert.com/dashboard/api/v2/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:text-foreground"
            >
              cloudconvert.com/dashboard/api/v2/keys
            </a>{' '}
            (25 free conversions per day).
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleRecheckConfig}
              disabled={isCheckingConfig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 transition-colors"
            >
              <RefreshCwIcon size={12} className={isCheckingConfig ? 'animate-spin' : ''} />
              <span>{isCheckingConfig ? 'Checking server...' : 'Recheck Server Configuration'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm mb-6 space-y-1">
          <div className="flex items-start gap-2.5">
            <AlertCircleIcon size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Conversion Error:</strong> {errorMessage}
            </div>
          </div>
          {errorDetails && (
            <p className="text-xs pl-7 text-red-600/80 dark:text-red-400/80 leading-relaxed">
              {errorDetails}
            </p>
          )}
        </div>
      )}

      {/* Upload Dropzone (When no document selected) */}
      {!selectedFile && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.[0]) handleSelectFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border-2 border-dashed cursor-pointer transition-all ${
            isDragging
              ? 'border-red-500 bg-red-500/5 scale-[0.99]'
              : 'border-border/80 hover:border-red-500/50 bg-card hover:bg-card/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleSelectFile(e.target.files[0]);
            }}
          />

          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-red-500/20">
            <WordToPdfIcon size={32} />
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-1">
            Drop your Word document here, or <span className="text-red-600 dark:text-red-400 underline decoration-red-500/30 underline-offset-4">browse</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-5">
            Supports DOCX and DOC files up to 25 MB with 100% preservation of fonts, tables, and page layout.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
              DOCX &amp; DOC
            </span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
              Max 25 MB
            </span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
              High-Fidelity Vector PDF
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSample();
              }}
              disabled={isLoadingSample}
              className="text-[11px] font-semibold px-3 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 transition-colors flex items-center gap-1.5"
            >
              <ZapIcon size={12} />
              {isLoadingSample ? 'Generating Sample...' : 'Load Sample Word Document (.docx)'}
            </button>
          </div>
        </div>
      )}

      {/* Active Document Workspace */}
      {selectedFile && (
        <div className="space-y-6">
          {/* File Overview Card */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border border-border/80 rounded-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                <WordToPdfIcon size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-foreground truncate max-w-sm sm:max-w-md" title={selectedFile.name}>
                  {selectedFile.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                  <span className="font-semibold text-foreground">{formatByteSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span>{selectedFile.name.toLowerCase().endsWith('.docx') ? 'Word DOCX' : 'Word DOC'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={status === 'converting'}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground disabled:opacity-50 transition-colors"
              >
                <RefreshCwIcon size={13} />
                Replace Document
              </button>
              <button
                type="button"
                disabled={status === 'converting'}
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
              >
                <TrashIcon size={14} />
                Remove
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleSelectFile(e.target.files[0]);
            }}
          />

          {/* Conversion Action Card */}
          {status !== 'success' && (
            <div className="p-6 rounded-3xl bg-card border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    Convert to High-Fidelity PDF
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Target format: <strong>{getOutputPdfFilename(selectedFile.name)}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={status === 'converting'}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 shadow-md shadow-red-500/20 transition-all text-sm"
                >
                  {status === 'converting' ? (
                    <>
                      <RefreshCwIcon size={16} className="animate-spin" />
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <WordToPdfIcon size={16} />
                      <span>Convert Word to PDF</span>
                    </>
                  )}
                </button>
              </div>

              {/* Progress Bar / Indicator */}
              {status === 'converting' && (
                <div className="pt-2 space-y-2">
                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-red-600 rounded-full animate-pulse w-3/4 transition-all duration-500" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>{progressMessage}</span>
                    <span>Processing...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Panel */}
          {status === 'success' && resultPdf && (
            <div className="p-6 rounded-3xl bg-card border border-emerald-500/30 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-base">
                <CheckCircleIcon size={20} />
                <span>Conversion Complete</span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-border/60">
                  <div className="text-[11px] text-muted-foreground mb-0.5">Word File Size</div>
                  <div className="font-semibold text-sm text-foreground font-mono">
                    {formatByteSize(resultPdf.originalSize)}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-border/60">
                  <div className="text-[11px] text-muted-foreground mb-0.5">Converted PDF Size</div>
                  <div className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatByteSize(resultPdf.size)}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-border/60">
                  <div className="text-[11px] text-muted-foreground mb-0.5">Layout Quality</div>
                  <div className="font-semibold text-xs text-foreground flex items-center gap-1">
                    <CheckIcon size={14} className="text-emerald-500" />
                    100% Vector Parity
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={resultPdf.objectUrl}
                  download={resultPdf.filename}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all"
                >
                  <DownloadIcon size={16} />
                  Download Converted PDF
                </a>

                <a
                  href={resultPdf.objectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground border border-border/80 transition-colors"
                >
                  Preview Output ↗
                </a>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Convert Another Document
                </button>
              </div>

              <div className="pt-2 text-xs text-muted-foreground font-mono border-t border-border/40">
                Generated: {resultPdf.filename} • Ephemeral storage purged
              </div>
            </div>
          )}
        </div>
      )}

      {/* Educational & Features Section */}
      <div className="mt-16 pt-12 border-t border-border/80">
        <h2 className="text-xl font-bold text-foreground mb-6">
          Why ASAPTools Uses CloudConvert for Word Documents
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <CheckCircleIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              100% Formatting Fidelity
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Unlike simplistic JavaScript converters that strip tables and headers, CloudConvert uses genuine Office rendering engines to preserve page breaks, tab stops, and complex layouts.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <ShieldIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              Ephemeral &amp; Encrypted
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Documents are processed through secure TLS connections in isolated sandboxes and automatically deleted after conversion. No files are retained permanently.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <ZapIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              Vector Sharpness
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Converted PDFs contain selectable, searchable vector text and razor-sharp lines rather than blurry rasterized bitmaps.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 space-y-4">
          <h3 className="text-lg font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h3>

          <div className="p-4 rounded-2xl bg-card border border-border/80">
            <h4 className="font-semibold text-sm text-foreground mb-1">
              Which Word formats are supported?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ASAPTools supports standard Microsoft Word OpenXML documents (<strong>.docx</strong>) as well as legacy Word 97-2003 documents (<strong>.doc</strong>) up to 25 MB in size.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80">
            <h4 className="font-semibold text-sm text-foreground mb-1">
              Will my document fonts look the same in the PDF?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yes. The CloudConvert engine matches standard Windows, Microsoft 365, and web typography, embedding the font subsets directly into the PDF so it displays identically on any device.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80">
            <h4 className="font-semibold text-sm text-foreground mb-1">
              Can I convert password-protected Word files?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No. Password-protected and encrypted files cannot be opened by the conversion engine. Please remove password protection before uploading.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
