'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  loadImageMeta,
  compressImage,
  createSampleImage,
  ImageFileMeta,
  CompressionOptions,
  CompressionResult,
  SupportedOutputFormat,
  formatByteSize,
} from '@/lib/image-utils';
import {
  ImageIcon,
  UploadIcon,
  DownloadIcon,
  RefreshCwIcon,
  SlidersIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TrashIcon,
  ShieldIcon,
  ZapIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

export function ImageCompressor() {
  const [meta, setMeta] = useState<ImageFileMeta | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [quality, setQuality] = useState<number>(75);
  const [format, setFormat] = useState<SupportedOutputFormat>('original');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef<number>(0);
  const activeMetaUrlRef = useRef<string | null>(null);
  const activeResultUrlRef = useRef<string | null>(null);
  const isInitialImageRef = useRef<boolean>(true);

  // Clean all active object URLs on unmount
  useEffect(() => {
    return () => {
      if (activeMetaUrlRef.current) URL.revokeObjectURL(activeMetaUrlRef.current);
      if (activeResultUrlRef.current) URL.revokeObjectURL(activeResultUrlRef.current);
    };
  }, []);

  // Clean previous image state
  const resetImageState = useCallback(() => {
    requestIdRef.current++;
    if (activeMetaUrlRef.current) {
      URL.revokeObjectURL(activeMetaUrlRef.current);
      activeMetaUrlRef.current = null;
    }
    if (activeResultUrlRef.current) {
      URL.revokeObjectURL(activeResultUrlRef.current);
      activeResultUrlRef.current = null;
    }
    setMeta(null);
    setResult(null);
    setErrorMessage(null);
    setIsProcessing(false);
    isInitialImageRef.current = true;
  }, []);

  // Check if target format is PNG or JPEG
  const isTargetPng =
    format === 'image/png' || (format === 'original' && meta?.type === 'image/png');
  const isTargetJpeg =
    format === 'image/jpeg' ||
    (format === 'original' && (meta?.type === 'image/jpeg' || meta?.type === 'image/jpg'));

  // User input handlers that immediately signal processing state
  const handleQualityChange = (newQuality: number) => {
    setQuality(newQuality);
    setIsProcessing(true);
  };

  const handleFormatChange = (newFormat: SupportedOutputFormat) => {
    setFormat(newFormat);
    setIsProcessing(true);
  };

  const handleBgColorChange = (newColor: string) => {
    setBackgroundColor(newColor);
    setIsProcessing(true);
  };

  // Reactive debounced compression effect:
  // Automatically reprocesses whenever quality, format, or background color changes.
  // Employs a sequence token (requestIdRef) to prevent race conditions from quick user inputs.
  useEffect(() => {
    if (!meta) return;

    const thisRequestId = ++requestIdRef.current;

    // Initial load runs immediately; slider dragging and toggle changes are debounced to avoid overloading canvas
    const delay = isInitialImageRef.current ? 0 : 250;
    isInitialImageRef.current = false;

    const timer = setTimeout(async () => {
      try {
        setIsProcessing(true);
        const options: CompressionOptions = {
          quality,
          format,
          backgroundColor,
        };

        const newResult = await compressImage(meta, options);

        // Discard stale result if a newer request was dispatched while this was encoding
        if (thisRequestId !== requestIdRef.current) {
          URL.revokeObjectURL(newResult.objectUrl);
          return;
        }

        // Revoke the old result URL and assign the new active URL
        if (activeResultUrlRef.current && activeResultUrlRef.current !== newResult.objectUrl) {
          URL.revokeObjectURL(activeResultUrlRef.current);
        }
        activeResultUrlRef.current = newResult.objectUrl;

        setResult(newResult);
        setErrorMessage(null);
      } catch (err) {
        if (thisRequestId !== requestIdRef.current) {
          return;
        }
        setErrorMessage(err instanceof Error ? err.message : 'Compression failed.');
        // Retain the last valid result on error
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsProcessing(false);
        }
      }
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [meta, quality, format, backgroundColor]);

  // Handle file selection
  const handleFileProcess = async (file: File) => {
    try {
      resetImageState();
      setIsProcessing(true);
      setErrorMessage(null);
      isInitialImageRef.current = true;

      const imageMeta = await loadImageMeta(file);
      activeMetaUrlRef.current = imageMeta.objectUrl;
      setMeta(imageMeta);
      // Changing meta triggers the reactive debounced compression effect
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to process image.');
      setMeta(null);
      setResult(null);
      setIsProcessing(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    // reset input value so re-uploading same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  // Manual trigger for Re-compress button
  const handleCompress = async () => {
    if (!meta) return;

    const thisRequestId = ++requestIdRef.current;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const options: CompressionOptions = {
        quality,
        format,
        backgroundColor,
      };

      const newResult = await compressImage(meta, options);

      if (thisRequestId !== requestIdRef.current) {
        URL.revokeObjectURL(newResult.objectUrl);
        return;
      }

      if (activeResultUrlRef.current && activeResultUrlRef.current !== newResult.objectUrl) {
        URL.revokeObjectURL(activeResultUrlRef.current);
      }
      activeResultUrlRef.current = newResult.objectUrl;

      setResult(newResult);
    } catch (err) {
      if (thisRequestId !== requestIdRef.current) return;
      setErrorMessage(err instanceof Error ? err.message : 'Compression failed.');
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setIsProcessing(false);
      }
    }
  };

  // Load sample image
  const handleLoadSample = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const sampleFile = await createSampleImage();
      await handleFileProcess(sampleFile);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load sample image.');
      setIsProcessing(false);
    }
  };

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
            Image Utilities
          </Link>
          <span aria-hidden="true" className="text-zinc-400">/</span>
          <span className="text-foreground font-semibold" aria-current="page">
            Image Compressor
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                <ImageIcon size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Image Compressor
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Compress JPG, PNG, and WebP images directly in your browser. Reduce file size without sacrificing visual clarity, with 100% client-side privacy.
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
              <span>Native Canvas Engine</span>
            </div>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircleIcon size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold">Compression Notice:</strong> {errorMessage}
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold hover:underline text-rose-600 dark:text-rose-400 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          id="image-file-input"
          accept="image/jpeg,image/png,image/webp,image/avif,image/bmp,image/gif"
          onChange={onFileInputChange}
          className="hidden"
          aria-label="Upload image file"
        />

        {/* Initial Empty Upload State */}
        {!meta && (
          <div className="mt-8">
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 sm:p-16 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-orange-500 bg-orange-500/5 scale-[1.005]'
                  : 'border-border hover:border-orange-500/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4 border border-orange-500/20 shadow-xs">
                <UploadIcon size={28} />
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight mb-2">
                Drop your image here, or browse files
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
                Supports JPG, PNG, WebP, AVIF, and BMP formats up to 50MB. Processed entirely inside your browser.
              </p>

              <div className="flex items-center gap-3 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-xs cursor-pointer touch-manipulation"
                >
                  Select Image File
                </button>

                <button
                  type="button"
                  id="sample-image-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSample();
                  }}
                  className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border border-border bg-card text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer touch-manipulation"
                >
                  Try Sample Image
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Compression Workspace */}
        {meta && (
          <div className="mt-8 space-y-6">
            {/* Top Controls Bar */}
            <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                    <SlidersIcon size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-foreground tracking-tight">
                      Compression Settings
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      Adjust quality and format to find the optimal balance
                    </span>
                  </div>
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="replace-image-btn"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-foreground transition-colors cursor-pointer touch-manipulation flex items-center gap-1.5"
                  >
                    <RefreshCwIcon size={13} />
                    <span>Replace Image</span>
                  </button>

                  <button
                    type="button"
                    id="reset-tool-btn"
                    onClick={resetImageState}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-border text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer touch-manipulation flex items-center gap-1"
                  >
                    <TrashIcon size={13} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Quality & Format Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* 1. Quality Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="quality-slider" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Compression Quality:{' '}
                      {isTargetPng ? (
                        <span className="text-muted-foreground font-normal lowercase">(lossless format — n/a)</span>
                      ) : (
                        <span className="text-orange-600 dark:text-orange-400">{quality}%</span>
                      )}
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {isTargetPng
                        ? 'Lossless Deflate'
                        : quality >= 85
                        ? 'High Visual Fidelity'
                        : quality >= 65
                        ? 'Balanced (Recommended)'
                        : 'Maximum Compression'}
                    </span>
                  </div>

                  <input
                    type="range"
                    id="quality-slider"
                    min="5"
                    max="100"
                    step="1"
                    value={quality}
                    disabled={isTargetPng}
                    onChange={(e) => handleQualityChange(parseInt(e.target.value, 10))}
                    className={`w-full h-2 rounded-lg appearance-none accent-orange-500 ${
                      isTargetPng
                        ? 'opacity-40 cursor-not-allowed bg-zinc-200 dark:bg-zinc-800'
                        : 'cursor-pointer bg-zinc-200 dark:bg-zinc-800'
                    }`}
                    aria-label="Compression quality slider"
                  />

                  {/* Preset Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {[
                      { label: 'Max (50%)', val: 50 },
                      { label: 'Balanced (75%)', val: 75 },
                      { label: 'High (85%)', val: 85 },
                      { label: 'Lossless-like (95%)', val: 95 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        disabled={isTargetPng}
                        onClick={() => handleQualityChange(preset.val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          isTargetPng
                            ? 'opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/60 text-muted-foreground'
                            : quality === preset.val
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs cursor-pointer'
                            : 'bg-zinc-100 dark:bg-zinc-800/80 text-muted-foreground hover:text-foreground cursor-pointer'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {isTargetPng && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2">
                      <AlertCircleIcon size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>PNG Format Notice:</strong> PNG uses lossless Deflate compression, so lossy quality adjustments do not apply. For significant file reductions with transparency support, switch to <strong>WebP</strong>.
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Format Selector & Transparency Fill */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                    Output Format
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'original', name: 'Original', desc: meta.type.replace('image/', '').toUpperCase() },
                      { id: 'image/webp', name: 'WebP', desc: 'Best Savings' },
                      { id: 'image/jpeg', name: 'JPEG', desc: 'Universal' },
                      { id: 'image/png', name: 'PNG', desc: 'Lossless' },
                    ].map((fmt) => {
                      const isSelected = format === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          id={`format-${fmt.name.toLowerCase()}`}
                          onClick={() => handleFormatChange(fmt.id as SupportedOutputFormat)}
                          className={`p-2.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs ring-2 ring-orange-500/50'
                              : 'bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span className="block">{fmt.name}</span>
                          <span className="text-[10px] opacity-75 font-normal block">{fmt.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* JPEG Transparency Background Color */}
                  {isTargetJpeg && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-border text-xs">
                      <span className="text-muted-foreground">
                        JPEG Background Fill (for transparency):
                      </span>
                      <div className="flex items-center gap-2">
                        {['#ffffff', '#000000', '#f4f4f5'].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleBgColorChange(color)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                              backgroundColor === color ? 'border-orange-500 scale-110' : 'border-border'
                            }`}
                            style={{ backgroundColor: color }}
                            title={`Background color ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Apply Compression Button */}
                  <button
                    type="button"
                    id="apply-compress-btn"
                    onClick={handleCompress}
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Compressing...</span>
                      </>
                    ) : (
                      <>
                        <ZapIcon size={16} />
                        <span>Re-compress with Current Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Savings / Increase Comparison Banner */}
            {result && (
              <div
                className={`p-4 rounded-2xl border text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
                  result.isSmaller
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {result.isSmaller ? (
                    <CheckCircleIcon size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircleIcon size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  )}

                  <div>
                    {result.isSmaller ? (
                      <span>
                        Compressed from <strong>{meta.formattedSize}</strong> to{' '}
                        <strong>{result.formattedSize}</strong> — saved{' '}
                        <strong>{formatByteSize(result.savingsBytes)}</strong> ({result.savingsPercentage}% reduction)!
                      </span>
                    ) : (
                      <span>
                        Output is <strong>{result.formattedSize}</strong> ({result.savingsPercentage}% larger than original {meta.formattedSize}). Try reducing quality or choosing WebP.
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={result.isSmaller ? 'success' : 'amber'}>
                    {result.isSmaller ? `-${result.savingsPercentage}%` : `+${result.savingsPercentage}%`}
                  </Badge>

                  {/* Primary Download Action */}
                  <a
                    id="download-btn"
                    href={result.objectUrl}
                    download={result.downloadFilename}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-xs flex items-center gap-1.5 touch-manipulation cursor-pointer"
                  >
                    <DownloadIcon size={14} />
                    <span>Download ({result.formattedSize})</span>
                  </a>
                </div>
              </div>
            )}

            {/* Side-by-Side Image Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Original Image Card */}
              <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-border bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between text-xs">
                  <span className="font-bold tracking-wider uppercase text-foreground">
                    Original Image
                  </span>
                  <Badge variant="muted">{meta.formattedSize}</Badge>
                </div>

                {/* Preview Frame */}
                <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/50 flex-1 flex items-center justify-center min-h-[260px] sm:min-h-[320px] max-h-[460px] overflow-hidden">
                  <div className="relative w-full h-full min-h-[260px] flex items-center justify-center">
                    <Image
                      id="original-preview-img"
                      src={meta.objectUrl}
                      alt={`Original image ${meta.name}`}
                      width={meta.width}
                      height={meta.height}
                      unoptimized
                      className="max-h-[360px] w-auto h-auto object-contain rounded-lg shadow-2xs"
                    />
                  </div>
                </div>

                {/* Metadata Specs */}
                <div className="p-4 border-t border-border bg-card grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                    <span className="text-[11px] text-muted-foreground block">Dimensions</span>
                    <span className="font-semibold text-foreground">{meta.width} × {meta.height}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                    <span className="text-[11px] text-muted-foreground block">Format</span>
                    <span className="font-semibold text-foreground uppercase">{meta.type.replace('image/', '')}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                    <span className="text-[11px] text-muted-foreground block">Aspect Ratio</span>
                    <span className="font-semibold text-foreground">{meta.aspectRatio}</span>
                  </div>
                </div>
              </div>

              {/* 2. Compressed Image Card */}
              <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-border bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold tracking-wider uppercase text-foreground">
                      Compressed Output
                    </span>
                    {isProcessing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-medium border border-orange-500/20 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        Updating...
                      </span>
                    )}
                  </div>
                  {result && (
                    <Badge variant={result.isSmaller ? 'success' : 'amber'}>
                      {result.formattedSize}
                    </Badge>
                  )}
                </div>

                {/* Preview Frame with Live Updating Overlay */}
                <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/50 flex-1 flex items-center justify-center min-h-[260px] sm:min-h-[320px] max-h-[460px] overflow-hidden relative">
                  {result ? (
                    <div className="relative w-full h-full min-h-[260px] flex items-center justify-center">
                      <Image
                        id="compressed-preview-img"
                        key={result.objectUrl}
                        src={result.objectUrl}
                        alt="Compressed output preview"
                        width={result.width}
                        height={result.height}
                        unoptimized
                        className="max-h-[360px] w-auto h-auto object-contain rounded-lg shadow-2xs"
                      />

                      {/* Reprocessing overlay keeps last valid preview visible while clearly indicating work in flight */}
                      {isProcessing && (
                        <div
                          id="compressed-preview-updating"
                          className="absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-lg flex items-center justify-center z-10 transition-all animate-in fade-in duration-150"
                        >
                          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border shadow-lg text-xs font-semibold text-foreground">
                            <span className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            <span>Updating preview...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs p-8 flex flex-col items-center gap-2">
                      <span className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span>Generating compressed preview...</span>
                    </div>
                  )}
                </div>

                {/* Metadata Specs */}
                {result && (
                  <div className="p-4 border-t border-border bg-card grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                      <span className="text-[11px] text-muted-foreground block">Dimensions</span>
                      <span className="font-semibold text-foreground">{result.width} × {result.height}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                      <span className="text-[11px] text-muted-foreground block">Format</span>
                      <span className="font-semibold text-foreground uppercase">{result.extension}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                      <span className="text-[11px] text-muted-foreground block">Reduction</span>
                      <span className={`font-semibold ${result.isSmaller ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {result.isSmaller ? `-${result.savingsPercentage}%` : `+${result.savingsPercentage}%`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Documentation & FAQ Section */}
        <section className="mt-16 pt-12 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-4">
              How In-Browser Image Compression Works
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Digital images often contain hidden metadata, color profiles, and inefficient compression algorithms that bloat file sizes. ASAPTools decodes and re-encodes images directly on your device using hardware-accelerated Canvas pipelines without sending your photos across the web.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  WebP (Recommended)
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  WebP provides both lossy and lossless compression with alpha transparency support. It typically achieves 25–35% smaller file sizes than JPEG at equivalent visual quality.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  JPEG / JPG
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  JPEG is the universal standard for photographic imagery. It uses discrete cosine transform lossy compression. Note that JPEG does not support transparency.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  PNG (Lossless)
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  PNG preserves every pixel exactly as authored using Deflate compression. Because it is lossless, adjusting lossy quality sliders does not reduce its file size.
                </p>
              </div>
            </div>

            {/* Why did my image get larger? */}
            <div className="p-6 rounded-2xl bg-card border border-border mb-12">
              <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <AlertCircleIcon size={18} className="text-orange-500" />
                <span>Why did my compressed image become larger than the original?</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                If an image is already highly optimized or compressed with an aggressive encoder, re-encoding it at a high quality setting (e.g. 85–100%) can occasionally produce a slightly larger output.
              </p>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <li>• <strong>Lower the Quality:</strong> Try adjusting the quality slider to 70% or 60%.</li>
                <li>• <strong>Switch to WebP:</strong> WebP uses more efficient predictive coding than older JPEG encoders.</li>
                <li>• <strong>Format Conversion:</strong> Converting a small PNG to JPEG can add canvas metadata that exceeds the original size.</li>
              </ul>
            </div>

            {/* Privacy Guarantee Box */}
            <div className="p-6 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-border flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldIcon size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  100% Private &amp; Local
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your photos, screenshots, and confidential images never touch a server. All canvas encoding, rendering, and compression happen entirely within your local browser.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
