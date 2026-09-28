'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  loadImageMeta,
  resizeImage,
  createSampleImage,
  calculateAspectRatioDimension,
  scaleDimensionsByPercentage,
  validateResizeDimensions,
  ImageFileMeta,
  ResizeOptions,
  ResizeResult,
  SupportedOutputFormat,
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
  LockIcon,
  UnlockIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

interface DimensionPreset {
  label: string;
  desc: string;
  width: number;
  height: number;
}

const COMMON_PRESETS: DimensionPreset[] = [
  { label: 'Square (1:1)', desc: '1080 × 1080', width: 1080, height: 1080 },
  { label: 'Social Share (1.91:1)', desc: '1200 × 630', width: 1200, height: 630 },
  { label: 'Story / Reel (9:16)', desc: '1080 × 1920', width: 1080, height: 1920 },
  { label: 'Full HD (16:9)', desc: '1920 × 1080', width: 1920, height: 1080 },
  { label: 'Standard HD (16:9)', desc: '1280 × 720', width: 1280, height: 720 },
  { label: 'Thumbnail / Icon', desc: '512 × 512', width: 512, height: 512 },
];

export function ImageResizer() {
  const [meta, setMeta] = useState<ImageFileMeta | null>(null);
  const [result, setResult] = useState<ResizeResult | null>(null);

  // Dimension states
  const [targetWidth, setTargetWidth] = useState<number>(0);
  const [targetHeight, setTargetHeight] = useState<number>(0);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [activePercentage, setActivePercentage] = useState<number | null>(100);

  // Format & background states
  const [format, setFormat] = useState<SupportedOutputFormat>('original');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');

  // Process & UI states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef<number>(0);
  const activeMetaUrlRef = useRef<string | null>(null);
  const activeResultUrlRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Revoke object URLs on component unmount
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
    setTargetWidth(0);
    setTargetHeight(0);
    setActivePercentage(100);
    setErrorMessage(null);
    setIsProcessing(false);
    isInitialLoadRef.current = true;
  }, []);

  // Check if target format is JPEG
  const isTargetJpeg =
    format === 'image/jpeg' ||
    (format === 'original' && (meta?.type === 'image/jpeg' || meta?.type === 'image/jpg'));

  // Reactive debounced resizing effect:
  // Reprocesses whenever targetWidth, targetHeight, format, or backgroundColor changes.
  useEffect(() => {
    if (!meta || targetWidth <= 0 || targetHeight <= 0) return;

    const thisRequestId = ++requestIdRef.current;
    const delay = isInitialLoadRef.current ? 0 : 250;
    isInitialLoadRef.current = false;

    const timer = setTimeout(async () => {
      try {
        const validation = validateResizeDimensions(targetWidth, targetHeight);
        if (!validation.valid) {
          setErrorMessage(validation.error || 'Invalid dimensions.');
          setIsProcessing(false);
          return;
        }

        setIsProcessing(true);

        const options: ResizeOptions = {
          width: targetWidth,
          height: targetHeight,
          format,
          backgroundColor,
        };

        const newResult = await resizeImage(meta, options);

        // Discard stale result if a newer request was dispatched while this was encoding
        if (thisRequestId !== requestIdRef.current) {
          URL.revokeObjectURL(newResult.objectUrl);
          return;
        }

        // Clean up previous result's URL before assigning new one
        if (activeResultUrlRef.current && activeResultUrlRef.current !== newResult.objectUrl) {
          URL.revokeObjectURL(activeResultUrlRef.current);
        }
        activeResultUrlRef.current = newResult.objectUrl;

        setResult(newResult);
        setErrorMessage(null);
      } catch (err) {
        if (thisRequestId !== requestIdRef.current) return;
        setErrorMessage(err instanceof Error ? err.message : 'Resizing failed.');
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsProcessing(false);
        }
      }
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [meta, targetWidth, targetHeight, format, backgroundColor]);

  // Handle file selection
  const handleFileProcess = async (file: File) => {
    try {
      resetImageState();
      setIsProcessing(true);
      setErrorMessage(null);
      isInitialLoadRef.current = true;

      const imageMeta = await loadImageMeta(file);
      activeMetaUrlRef.current = imageMeta.objectUrl;

      setMeta(imageMeta);
      setTargetWidth(imageMeta.width);
      setTargetHeight(imageMeta.height);
      setActivePercentage(100);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load image.');
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

  // Dimension Change Handlers
  const handleWidthChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    setActivePercentage(null);

    if (isNaN(val)) {
      setTargetWidth(0);
      return;
    }

    if (lockAspectRatio && meta) {
      const calculated = calculateAspectRatioDimension('width', val, meta.width, meta.height);
      setTargetWidth(calculated.width);
      setTargetHeight(calculated.height);
    } else {
      setTargetWidth(val);
    }
    setIsProcessing(true);
  };

  const handleHeightChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    setActivePercentage(null);

    if (isNaN(val)) {
      setTargetHeight(0);
      return;
    }

    if (lockAspectRatio && meta) {
      const calculated = calculateAspectRatioDimension('height', val, meta.width, meta.height);
      setTargetWidth(calculated.width);
      setTargetHeight(calculated.height);
    } else {
      setTargetHeight(val);
    }
    setIsProcessing(true);
  };

  // Percentage Preset Handler
  const handlePercentageClick = (pct: number) => {
    if (!meta) return;
    const scaled = scaleDimensionsByPercentage(meta.width, meta.height, pct);
    setActivePercentage(pct);
    setTargetWidth(scaled.width);
    setTargetHeight(scaled.height);
    setIsProcessing(true);
  };

  // Common Dimension Preset Handler
  const handleCommonPresetClick = (preset: DimensionPreset) => {
    setActivePercentage(null);
    setTargetWidth(preset.width);
    setTargetHeight(preset.height);
    setIsProcessing(true);
  };

  // Format and Color Handlers
  const handleFormatChange = (newFormat: SupportedOutputFormat) => {
    setFormat(newFormat);
    setIsProcessing(true);
  };

  const handleBgColorChange = (newColor: string) => {
    setBackgroundColor(newColor);
    setIsProcessing(true);
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

  // Manual trigger for Apply Resize button
  const handleManualResize = async () => {
    if (!meta || targetWidth <= 0 || targetHeight <= 0) return;

    const validation = validateResizeDimensions(targetWidth, targetHeight);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid dimensions.');
      return;
    }

    const thisRequestId = ++requestIdRef.current;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const options: ResizeOptions = {
        width: targetWidth,
        height: targetHeight,
        format,
        backgroundColor,
      };

      const newResult = await resizeImage(meta, options);

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
      setErrorMessage(err instanceof Error ? err.message : 'Resizing failed.');
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setIsProcessing(false);
      }
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
            Image Resizer
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                <ImageIcon size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Image Resizer
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Resize JPG, PNG, and WebP images to exact pixel dimensions or percentage scale. Lock aspect ratios, select social media presets, and export directly in your browser.
            </p>
          </div>

          {/* Privacy & Engine Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-border text-xs text-zinc-600 dark:text-zinc-300">
              <ShieldIcon size={14} className="text-emerald-500" />
              <span>100% Client-Side Privacy</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-border text-xs text-zinc-600 dark:text-zinc-300">
              <ZapIcon size={14} className="text-blue-500" />
              <span>Native Canvas Bicubic</span>
            </div>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircleIcon size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold">Resizing Notice:</strong> {errorMessage}
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
          id="resizer-file-input"
          accept="image/jpeg,image/png,image/webp,image/avif,image/bmp,image/gif"
          onChange={onFileInputChange}
          className="hidden"
          aria-label="Upload image file to resize"
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
                  ? 'border-blue-500 bg-blue-500/5 scale-[1.005]'
                  : 'border-border hover:border-blue-500/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20 shadow-xs">
                <UploadIcon size={28} />
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight mb-2">
                Drop your image here, or browse files
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
                Supports JPG, PNG, WebP, AVIF, and BMP formats up to 50MB. Resized locally with high quality smoothing.
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

        {/* Active Resizing Workspace */}
        {meta && (
          <div className="mt-8 space-y-6">
            {/* Top Controls Bar */}
            <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                    <SlidersIcon size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-foreground tracking-tight">
                      Resize Controls
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      Set custom pixel dimensions, percentage scaling, or select common presets
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

              {/* Main Controls Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* 1. Custom Pixel Dimensions & Aspect Ratio Lock */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Pixel Dimensions
                    </span>
                    <button
                      type="button"
                      id="toggle-aspect-ratio-btn"
                      onClick={() => setLockAspectRatio(!lockAspectRatio)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        lockAspectRatio
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 border-border text-muted-foreground'
                      }`}
                      title={lockAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                    >
                      {lockAspectRatio ? <LockIcon size={13} /> : <UnlockIcon size={13} />}
                      <span>{lockAspectRatio ? 'Ratio Locked' : 'Ratio Free'}</span>
                    </button>
                  </div>

                  {/* Width & Height Inputs */}
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label htmlFor="target-width-input" className="block text-xs text-muted-foreground mb-1">
                        Width (px)
                      </label>
                      <input
                        type="number"
                        id="target-width-input"
                        min="1"
                        max="10000"
                        value={targetWidth || ''}
                        onChange={(e) => handleWidthChange(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-border text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        placeholder="Width"
                      />
                    </div>

                    <div>
                      <label htmlFor="target-height-input" className="block text-xs text-muted-foreground mb-1">
                        Height (px)
                      </label>
                      <input
                        type="number"
                        id="target-height-input"
                        min="1"
                        max="10000"
                        value={targetHeight || ''}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-border text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        placeholder="Height"
                      />
                    </div>
                  </div>

                  {/* Scale by Percentage */}
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                      Scale by Percentage
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[25, 50, 75, 100, 150, 200].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          id={`scale-${pct}-btn`}
                          onClick={() => handlePercentageClick(pct)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            activePercentage === pct
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                              : 'bg-zinc-100 dark:bg-zinc-800/80 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Common Presets */}
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                      Common Presets
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {COMMON_PRESETS.map((preset) => {
                        const isMatch = targetWidth === preset.width && targetHeight === preset.height;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleCommonPresetClick(preset)}
                            className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                              isMatch
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-300 ring-1 ring-blue-500/30'
                                : 'bg-zinc-50 dark:bg-zinc-900/60 border-border hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span className="block text-xs font-semibold">{preset.label}</span>
                            <span className="text-[11px] opacity-75">{preset.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Format Selector & Transparency Fill */}
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                    Output Format
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'original', name: 'Original', desc: meta.type.replace('image/', '').toUpperCase() },
                      { id: 'image/webp', name: 'WebP', desc: 'Modern & Light' },
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
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs ring-2 ring-blue-500/50'
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
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-border text-xs">
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
                              backgroundColor === color ? 'border-blue-500 scale-110' : 'border-border'
                            }`}
                            style={{ backgroundColor: color }}
                            title={`Background color ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Re-resize Manual Action Button */}
                  <button
                    type="button"
                    id="apply-resize-btn"
                    onClick={handleManualResize}
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Resizing...</span>
                      </>
                    ) : (
                      <>
                        <ZapIcon size={16} />
                        <span>Apply Resize</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Resized Summary Banner */}
            {result && (
              <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-900 dark:text-blue-300 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircleIcon size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    Resized from{' '}
                    <strong>
                      {meta.width} × {meta.height}
                    </strong>{' '}
                    ({meta.formattedSize}) to{' '}
                    <strong>
                      {result.width} × {result.height}
                    </strong>{' '}
                    ({result.formattedSize})
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="blue">
                    {result.width} × {result.height}
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

            {/* Side-by-Side Image Cards */}
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
                    <span className="font-semibold text-foreground">
                      {meta.width} × {meta.height}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                    <span className="text-[11px] text-muted-foreground block">Format</span>
                    <span className="font-semibold text-foreground uppercase">
                      {meta.type.replace('image/', '')}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                    <span className="text-[11px] text-muted-foreground block">Aspect Ratio</span>
                    <span className="font-semibold text-foreground">{meta.aspectRatio}</span>
                  </div>
                </div>
              </div>

              {/* 2. Resized Output Card */}
              <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-border bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold tracking-wider uppercase text-foreground">
                      Resized Output
                    </span>
                    {isProcessing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-medium border border-blue-500/20 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Updating...
                      </span>
                    )}
                  </div>
                  {result && <Badge variant="blue">{result.formattedSize}</Badge>}
                </div>

                {/* Preview Frame with Live Updating Overlay */}
                <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/50 flex-1 flex items-center justify-center min-h-[260px] sm:min-h-[320px] max-h-[460px] overflow-hidden relative">
                  {result ? (
                    <div className="relative w-full h-full min-h-[260px] flex items-center justify-center">
                      <Image
                        id="resized-preview-img"
                        key={result.objectUrl}
                        src={result.objectUrl}
                        alt="Resized output preview"
                        width={result.width}
                        height={result.height}
                        unoptimized
                        className="max-h-[360px] w-auto h-auto object-contain rounded-lg shadow-2xs"
                      />

                      {/* Reprocessing overlay keeps last valid preview visible while clearly indicating work in flight */}
                      {isProcessing && (
                        <div
                          id="resized-preview-updating"
                          className="absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-lg flex items-center justify-center z-10 transition-all animate-in fade-in duration-150"
                        >
                          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border shadow-lg text-xs font-semibold text-foreground">
                            <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span>Updating preview...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs p-8 flex flex-col items-center gap-2">
                      <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Generating resized preview...</span>
                    </div>
                  )}
                </div>

                {/* Metadata Specs */}
                {result && (
                  <div className="p-4 border-t border-border bg-card grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                      <span className="text-[11px] text-muted-foreground block">Dimensions</span>
                      <span className="font-semibold text-foreground">
                        {result.width} × {result.height}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                      <span className="text-[11px] text-muted-foreground block">Format</span>
                      <span className="font-semibold text-foreground uppercase">{result.extension}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                      <span className="text-[11px] text-muted-foreground block">File Size</span>
                      <span className="font-semibold text-foreground">{result.formattedSize}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Informational & FAQ Section */}
        <section className="mt-16 pt-12 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-4">
              High-Fidelity Client-Side Image Resizing
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Resizing images directly in your browser ensures instant results without uploading your media to remote servers. ASAPTools uses HTML5 Canvas bicubic interpolation to preserve edge contrast, text readability, and color fidelity.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  Aspect Ratio Lock
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Keep your image proportion intact. Modifying width automatically computes the matching height, preventing visual distortion, stretching, or squashing.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  Percentage Scaling
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Quickly scale your image by 25%, 50%, 75%, 150%, or 200%. Perfect for generating responsive website assets and email attachments.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  Format Versatility
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Export resized images to modern WebP for smaller payloads, universal JPEG, or lossless PNG. Transparency is preserved where supported.
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
                  100% Private &amp; Local
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All rendering, dimension transformations, and blob encoding happen entirely in your browser memory. Your files are never uploaded or tracked.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
