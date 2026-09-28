'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  PdfFileMeta,
  loadPdfMeta,
  safeRevokeUrl,
} from '@/lib/pdf-utils';
import {
  CompressionLevel,
  COMPRESSION_LEVELS,
  CompressionSettings,
  PdfCompressionResult,
  mapSliderToSettings,
  mapPresetToSlider,
  estimateDocumentSize,
  compressPdf,
  createSampleHeavyPdf,
  formatByteSize,
  getPdfJs,
  samplePageForPreview,
} from '@/lib/pdf-compressor-utils';
import {
  PdfCompressIcon,
  DownloadIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TrashIcon,
  ShieldIcon,
  ZapIcon,
  SlidersIcon,
  CheckIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

export function PdfCompressor() {
  const [sourcePdf, setSourcePdf] = useState<PdfFileMeta | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDocProxy, setPdfDocProxy] = useState<any | null>(null);

  // Slider State (0 - 100), default 50 = Balanced Compression
  const [sliderValue, setSliderValue] = useState<number>(50);
  const [customFilename, setCustomFilename] = useState('');

  // Page Preview & Inspection State
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [previewViewMode, setPreviewViewMode] = useState<'compressed' | 'original'>('compressed');
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [compressedPreviewUrl, setCompressedPreviewUrl] = useState<string | null>(null);
  const [samplePageBytes, setSamplePageBytes] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Compression Execution State
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [compressionResult, setCompressionResult] = useState<PdfCompressionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Upload Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRequestIdRef = useRef<number>(0);
  const activeOriginalUrlRef = useRef<string | null>(null);
  const activeCompressedUrlRef = useRef<string | null>(null);

  // Keep refs in sync for safe cleanup
  useEffect(() => {
    activeOriginalUrlRef.current = originalPreviewUrl;
  }, [originalPreviewUrl]);

  useEffect(() => {
    activeCompressedUrlRef.current = compressedPreviewUrl;
  }, [compressedPreviewUrl]);

  // Active Compression Settings computed from slider
  const activeSettings: CompressionSettings = useMemo(() => {
    return mapSliderToSettings(sliderValue);
  }, [sliderValue]);

  // Live Output Size Estimate
  const sizeEstimate = useMemo(() => {
    if (!sourcePdf) return null;
    return estimateDocumentSize(
      sourcePdf.size,
      sourcePdf.pageCount,
      activeSettings,
      samplePageBytes || undefined
    );
  }, [sourcePdf, activeSettings, samplePageBytes]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      safeRevokeUrl(activeOriginalUrlRef.current);
      safeRevokeUrl(activeCompressedUrlRef.current);
      safeRevokeUrl(compressionResult?.objectUrl);
    };
  }, [compressionResult]);

  // Load PDF into pdfjs proxy when a file is selected
  const handleSelectFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please upload a valid PDF document (.pdf).');
      return;
    }

    setErrorMessage(null);
    safeRevokeUrl(compressionResult?.objectUrl);
    safeRevokeUrl(activeOriginalUrlRef.current);
    safeRevokeUrl(activeCompressedUrlRef.current);
    setCompressionResult(null);
    setOriginalPreviewUrl(null);
    setCompressedPreviewUrl(null);
    setSamplePageBytes(null);
    setSelectedPage(1);

    try {
      const meta = await loadPdfMeta(file);
      if (meta.error) {
        setErrorMessage(meta.error);
        setSourcePdf(null);
        setPdfDocProxy(null);
        return;
      }

      setSourcePdf(meta);
      const baseName = file.name.replace(/\.pdf$/i, '');
      setCustomFilename(`${baseName}-compressed.pdf`);

      // Load with pdfjs for page previewing
      const arrayBuffer = await file.arrayBuffer();
      const pdfjs = await getPdfJs();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const proxy = await loadingTask.promise;
      setPdfDocProxy(proxy);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to inspect PDF file.');
      setSourcePdf(null);
      setPdfDocProxy(null);
    }
  }, [compressionResult]);

  // Debounced Page Preview Generator with Sequence Token Cancellation
  useEffect(() => {
    if (!pdfDocProxy || !sourcePdf) return;

    const reqId = ++previewRequestIdRef.current;

    const timer = setTimeout(async () => {
      setIsPreviewLoading(true);
      try {
        const preview = await samplePageForPreview(pdfDocProxy, selectedPage, activeSettings);

        // Stale request discarded
        if (reqId !== previewRequestIdRef.current) {
          safeRevokeUrl(preview.originalUrl);
          safeRevokeUrl(preview.compressedUrl);
          return;
        }

        // Revoke older URLs before updating state
        safeRevokeUrl(activeOriginalUrlRef.current);
        safeRevokeUrl(activeCompressedUrlRef.current);

        setOriginalPreviewUrl(preview.originalUrl);
        setCompressedPreviewUrl(preview.compressedUrl);
        setSamplePageBytes(preview.sampleBytes);
      } catch (err) {
        if (reqId === previewRequestIdRef.current) {
          // Log without breaking workspace
          console.warn('Page preview sampling error:', err);
        }
      } finally {
        if (reqId === previewRequestIdRef.current) {
          setIsPreviewLoading(false);
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [pdfDocProxy, sourcePdf, selectedPage, activeSettings]);

  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    setErrorMessage(null);
    try {
      const sample = await createSampleHeavyPdf();
      await handleSelectFile(sample);
      setSliderValue(50);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not create sample heavy PDF.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleClearAll = () => {
    safeRevokeUrl(compressionResult?.objectUrl);
    safeRevokeUrl(activeOriginalUrlRef.current);
    safeRevokeUrl(activeCompressedUrlRef.current);
    setCompressionResult(null);
    setOriginalPreviewUrl(null);
    setCompressedPreviewUrl(null);
    setPdfDocProxy(null);
    setSourcePdf(null);
    setErrorMessage(null);
    setProgress(null);
    setSamplePageBytes(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePresetSelect = (preset: CompressionLevel) => {
    const targetSlider = mapPresetToSlider(preset);
    setSliderValue(targetSlider);
  };

  const handleExecuteCompression = async () => {
    if (!sourcePdf) return;

    setIsCompressing(true);
    setErrorMessage(null);
    safeRevokeUrl(compressionResult?.objectUrl);
    setCompressionResult(null);

    try {
      const result = await compressPdf(sourcePdf.file, activeSettings, {
        outputFilename: customFilename,
        onProgress: (current, total) => setProgress({ current, total }),
      });

      setCompressionResult(result);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred during compression.'
      );
    } finally {
      setIsCompressing(false);
      setProgress(null);
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
        <span className="text-foreground font-medium">PDF Compressor</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <Badge variant="brand" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
            PDF Utilities
          </Badge>
          <Badge variant="muted" className="text-xs">
            100% Client-Side • Privacy-First
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          PDF Compressor
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
          Reduce PDF file sizes with an interactive compression slider, live visual comparison, real page previews, and honest size metrics. Zero document uploads.
        </p>
      </div>

      {/* Upload Dropzone (When no document loaded) */}
      {!sourcePdf && (
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
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleSelectFile(e.target.files[0]);
            }}
          />

          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-red-500/20">
            <PdfCompressIcon size={32} />
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-1">
            Drop your PDF here to compress, or <span className="text-red-600 dark:text-red-400 underline decoration-red-500/30 underline-offset-4">browse</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-5">
            Optimize reports, presentations, and scanned documents with genuine size reduction and instant downloads.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
              Interactive Slider
            </span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
              Live Comparison Bar
            </span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
              Page Inspection
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
              {isLoadingSample ? 'Generating Heavy Sample...' : 'Load Sample Heavy PDF (1.5 MB)'}
            </button>
          </div>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-3 text-sm mb-6">
          <AlertCircleIcon size={18} className="shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Notice:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Active Workspace */}
      {sourcePdf && (
        <div className="space-y-6">
          {/* File Overview Card */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border border-border/80 rounded-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20 shrink-0">
                <PdfCompressIcon size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-foreground truncate max-w-sm sm:max-w-md" title={sourcePdf.name}>
                  {sourcePdf.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                  <span className="font-semibold text-foreground">{sourcePdf.formattedSize}</span>
                  <span>•</span>
                  <span>{sourcePdf.pageCount} {sourcePdf.pageCount === 1 ? 'page' : 'pages'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground transition-colors"
              >
                <RefreshCwIcon size={13} />
                Replace PDF
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <TrashIcon size={14} />
                Remove
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleSelectFile(e.target.files[0]);
            }}
          />

          {/* Interactive Live Size Comparison Card */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <SlidersIcon size={18} className="text-red-600 dark:text-red-400" />
                <h2 className="font-semibold text-sm text-foreground">
                  Live Size Comparison
                </h2>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/40">
                {compressionResult ? 'Actual Measured Result' : 'Estimated Projection'}
              </span>
            </div>

            {/* Horizontal Visual Comparison Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">
                  Original: <strong className="text-foreground">{sourcePdf.formattedSize}</strong>
                </span>
                <span>
                  {compressionResult ? (
                    <strong className={compressionResult.isSmaller ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                      Final: {compressionResult.formattedCompressedSize}
                    </strong>
                  ) : sizeEstimate ? (
                    <span className="text-foreground font-semibold">
                      Expected: ~{sizeEstimate.formattedEstimatedSize}
                    </span>
                  ) : null}
                </span>
              </div>

              {/* Dual-layer horizontal comparison bar */}
              <div className="relative w-full h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-border/60">
                {/* Reference original size bar (100%) */}
                <div
                  className="absolute inset-0 bg-zinc-200/50 dark:bg-zinc-700/50"
                  title={`Original Size: ${sourcePdf.formattedSize}`}
                />

                {/* Compressed or Estimated bar */}
                {(() => {
                  const currentBytes = compressionResult
                    ? compressionResult.compressedSize
                    : sizeEstimate
                    ? sizeEstimate.estimatedBytes
                    : sourcePdf.size;

                  const ratio = sourcePdf.size > 0 ? currentBytes / sourcePdf.size : 1;
                  const clampedPercent = Math.min(100, Math.max(4, Math.round(ratio * 100)));
                  const isSmaller = currentBytes < sourcePdf.size;

                  return (
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isSmaller
                          ? 'bg-emerald-500 dark:bg-emerald-600'
                          : 'bg-amber-500 dark:bg-amber-600'
                      }`}
                      style={{ width: `${clampedPercent}%` }}
                    />
                  );
                })()}
              </div>

              {/* Status and Percentage Callout */}
              <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  {compressionResult ? (
                    compressionResult.isSmaller ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckIcon size={14} />
                        Reduced by {compressionResult.savingsPercentage}% ({formatByteSize(compressionResult.savingsBytes)} saved)
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <AlertCircleIcon size={14} />
                        No reduction achieved (+{compressionResult.savingsPercentage}% larger). Retaining original recommended.
                      </span>
                    )
                  ) : sizeEstimate ? (
                    sizeEstimate.isSmaller ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Estimated ~{sizeEstimate.estimatedPercentage}% space saved (~{sizeEstimate.formattedEstimatedSavings})
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        No reduction expected at these settings (vector text expands when rasterized).
                      </span>
                    )
                  ) : null}
                </div>

                <div className="text-[11px] text-muted-foreground">
                  {!compressionResult && sizeEstimate?.explanation}
                </div>
              </div>
            </div>
          </div>

          {/* Compression Configuration & Slider Card */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border/80">
              <div className="flex items-center gap-2">
                <SlidersIcon size={18} className="text-red-600 dark:text-red-400" />
                <h2 className="font-semibold text-sm text-foreground">
                  Adjust Compression Strength
                </h2>
              </div>

              <span className="text-xs px-3 py-1 rounded-full font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                {activeSettings.label}
              </span>
            </div>

            {/* Preset Buttons */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Quick Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {COMPRESSION_LEVELS.map((item) => {
                  const isSelected = activeSettings.preset === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isCompressing}
                      onClick={() => handlePresetSelect(item.id)}
                      className={`relative p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-red-500 bg-red-500/5 shadow-sm'
                          : 'border-border/80 hover:border-border hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-xs text-foreground">
                          {item.name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isSelected
                            ? 'bg-red-500 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-muted-foreground'
                        }`}>
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Compression Slider */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Custom Slider Adjustment</span>
                <span className="font-mono text-muted-foreground font-semibold">
                  Intensity: {sliderValue}%
                </span>
              </div>

              {/* Slider Track */}
              <div className="relative py-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={sliderValue}
                  disabled={isCompressing}
                  onChange={(e) => setSliderValue(Number(e.target.value))}
                  aria-label="Compression Strength Slider"
                  className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-600 disabled:opacity-50"
                />

                {/* Preset Tick Marks */}
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1.5 px-1">
                  <span className={sliderValue <= 15 ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                    | Lossless (0-15%)
                  </span>
                  <span className={sliderValue > 15 && sliderValue <= 65 ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                    | Balanced (50%)
                  </span>
                  <span className={sliderValue > 65 ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                    | Strong / Max (85-100%)
                  </span>
                </div>
              </div>

              {/* Trade-off Explanation */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-border/60 text-xs text-muted-foreground leading-relaxed space-y-1">
                <p>
                  <strong className="text-foreground">Quality vs. Size Trade-off:</strong>{' '}
                  {activeSettings.description}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Note: The slider indicates compression intensity, not a guaranteed percentage of file-size reduction.
                </p>
              </div>

              {/* Lossy Warning for Aggressive Modes */}
              {activeSettings.isLossy && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                  <AlertCircleIcon size={15} className="shrink-0 mt-0.5" />
                  <span>
                    Raster downsampling is active (~{activeSettings.dpiEstimate} DPI, {Math.round(activeSettings.quality * 100)}% JPEG quality). Text and vector graphics will be rendered as high-efficiency images to save space.
                  </span>
                </div>
              )}
            </div>

            {/* Output Filename */}
            <div className="pt-2">
              <label htmlFor="output-filename" className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Output PDF Filename
              </label>
              <input
                id="output-filename"
                type="text"
                value={customFilename}
                disabled={isCompressing}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="compressed-document.pdf"
                className="w-full max-w-md px-3.5 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          {/* PDF Page Inspection & Preview Section */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <EyeIcon size={18} className="text-red-600 dark:text-red-400" />
                <h2 className="font-semibold text-sm text-foreground">
                  Page Inspection & Quality Preview
                </h2>
              </div>

              {/* Page Navigation Controls */}
              {sourcePdf.pageCount > 1 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    disabled={selectedPage <= 1 || isPreviewLoading}
                    onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground disabled:opacity-40 transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeftIcon size={15} />
                  </button>
                  <span className="font-mono text-muted-foreground px-2">
                    Page <strong className="text-foreground">{selectedPage}</strong> of {sourcePdf.pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={selectedPage >= sourcePdf.pageCount || isPreviewLoading}
                    onClick={() => setSelectedPage((p) => Math.min(sourcePdf.pageCount, p + 1))}
                    className="p-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground disabled:opacity-40 transition-colors"
                    title="Next Page"
                  >
                    <ChevronRightIcon size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Toggle view between Compressed Preview and Original */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setPreviewViewMode('compressed')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    previewViewMode === 'compressed'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Compressed Preview (Page {selectedPage})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewMode('original')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    previewViewMode === 'original'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Original Page {selectedPage}
                </button>
              </div>

              <span className="text-[11px] text-muted-foreground font-mono">
                {previewViewMode === 'compressed' ? (
                  activeSettings.mode === 'structural'
                    ? '100% Vector Quality (Identical to original)'
                    : `Simulated ~${activeSettings.dpiEstimate} DPI (${Math.round(activeSettings.quality * 100)}% quality)`
                ) : (
                  'Original Unmodified Page'
                )}
              </span>
            </div>

            {/* Preview Canvas / Image Display */}
            <div className="relative min-h-[280px] max-h-[460px] flex items-center justify-center p-4 rounded-2xl bg-zinc-950/5 dark:bg-zinc-950/40 border border-border/60 overflow-hidden">
              {isPreviewLoading && (
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] flex items-center justify-center text-xs text-muted-foreground gap-2">
                  <RefreshCwIcon size={16} className="animate-spin text-red-500" />
                  <span>Updating page preview...</span>
                </div>
              )}

              {previewViewMode === 'compressed' ? (
                compressedPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={compressedPreviewUrl}
                    alt={`Compressed preview of page ${selectedPage}`}
                    className="max-h-[420px] w-auto object-contain rounded-lg shadow-md border border-border/40"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Rendering preview...</span>
                )
              ) : originalPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={originalPreviewUrl}
                  alt={`Original preview of page ${selectedPage}`}
                  className="max-h-[420px] w-auto object-contain rounded-lg shadow-md border border-border/40"
                />
              ) : (
                <span className="text-xs text-muted-foreground">Rendering preview...</span>
              )}
            </div>
          </div>

          {/* Action Trigger / Execution Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleExecuteCompression}
              disabled={isCompressing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 shadow-md shadow-red-500/20 transition-all text-sm"
            >
              {isCompressing ? (
                <>
                  <RefreshCwIcon size={18} className="animate-spin" />
                  {progress
                    ? `Compressing Page ${progress.current} of ${progress.total}...`
                    : 'Compressing Document...'}
                </>
              ) : (
                <>
                  <PdfCompressIcon size={18} />
                  Compress PDF Now ({activeSettings.label})
                </>
              )}
            </button>
          </div>

          {/* Results Panel */}
          {compressionResult && (
            <div className="p-6 rounded-3xl bg-card border border-emerald-500/30 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-base">
                <CheckCircleIcon size={20} />
                <span>Compression Finished</span>
              </div>

              {/* 4-Column Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-border/60">
                  <div className="text-[11px] text-muted-foreground mb-0.5">Original Size</div>
                  <div className="font-semibold text-sm text-foreground font-mono">
                    {compressionResult.formattedOriginalSize}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-border/60">
                  <div className="text-[11px] text-muted-foreground mb-0.5">Final Size</div>
                  <div className={`font-semibold text-sm font-mono ${
                    compressionResult.isSmaller
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {compressionResult.formattedCompressedSize}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-border/60">
                  <div className="text-[11px] text-muted-foreground mb-0.5">Total Saved</div>
                  <div className="font-semibold text-sm text-foreground font-mono">
                    {compressionResult.isSmaller
                      ? `-${compressionResult.savingsPercentage}% (${formatByteSize(compressionResult.savingsBytes)})`
                      : `+${compressionResult.savingsPercentage}% (No reduction)`}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-border/60">
                  <div className="text-[11px] text-muted-foreground mb-0.5">Settings Used</div>
                  <div className="font-semibold text-xs text-foreground truncate" title={compressionResult.methodDescription}>
                    {compressionResult.settings?.label || compressionResult.level}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {compressionResult.isSmaller ? (
                  <a
                    href={compressionResult.objectUrl}
                    download={compressionResult.downloadFilename}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all"
                  >
                    <DownloadIcon size={16} />
                    Download Compressed PDF
                  </a>
                ) : (
                  <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-2">
                    <p className="font-semibold">
                      Notice: No size reduction was achieved.
                    </p>
                    <p className="leading-relaxed">
                      This document already contains compact vector curves and text. Converting them to image streams increased the total size. We recommend retaining your original PDF or switching to <strong>Lossless Clean</strong> mode.
                    </p>
                    <button
                      type="button"
                      onClick={() => handlePresetSelect('structural')}
                      className="px-3.5 py-1.5 rounded-lg bg-background border border-border text-foreground font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Try Lossless Clean Mode
                    </button>
                  </div>
                )}

                <a
                  href={compressionResult.objectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground border border-border/80 transition-colors"
                >
                  Preview Output ↗
                </a>
              </div>

              <div className="pt-2 text-xs text-muted-foreground font-mono">
                Method: {compressionResult.methodDescription}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Educational & Features Section */}
      <div className="mt-16 pt-12 border-t border-border/80">
        <h2 className="text-xl font-bold text-foreground mb-6">
          How ASAPTools PDF Compression Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <ShieldIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              100% Client-Side Privacy
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your financial records, legal forms, and confidential files never leave your browser. All optimization happens in local device memory.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <SlidersIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              Custom Slider & Presets
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fine-tune the compression intensity to your exact needs. Choose between lossless structural cleanup or granular raster downsampling.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <CheckCircleIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              Honest Size Metrics
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We never report fake savings. If a document is already compacted and cannot be made smaller, we tell you transparently and recommend keeping your original.
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
              Why did my PDF stay the same size or get slightly larger?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If your PDF only contains raw text and vector lines without heavy photos, it is already extremely small (often just a few kilobytes). Re-encoding or rasterizing a vector PDF can sometimes add bitmap overhead. For text documents, use <strong>Lossless Clean</strong> mode.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80">
            <h4 className="font-semibold text-sm text-foreground mb-1">
              Can I compress password-protected PDFs?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No. Password-protected PDFs are encrypted. To compress an encrypted document, please unlock it and remove the password before uploading to ASAPTools.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80">
            <h4 className="font-semibold text-sm text-foreground mb-1">
              Will my document text remain searchable?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              In <strong>Lossless Clean</strong> mode, all text stays selectable and searchable vector data. In raster modes (slider &gt; 15%), pages with heavy graphics are re-encoded as high-efficiency image streams to shrink file size.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
