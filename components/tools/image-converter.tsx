'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  loadImageMeta,
  convertImage,
  createSampleTransparentPng,
  ImageFileMeta,
  ConvertOptions,
  ConvertResult,
  TargetConvertFormat,
  formatByteSize,
} from '@/lib/image-utils';
import {
  ImageRotateIcon,
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

interface FormatOption {
  id: TargetConvertFormat;
  name: string;
  extension: string;
  tag: string;
  desc: string;
  supportsAlpha: boolean;
  lossy: boolean;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'image/webp',
    name: 'WebP',
    extension: 'webp',
    tag: 'Recommended',
    desc: 'Modern, highly compressed format with transparency support',
    supportsAlpha: true,
    lossy: true,
  },
  {
    id: 'image/jpeg',
    name: 'JPEG / JPG',
    extension: 'jpg',
    tag: 'Universal',
    desc: 'Widely compatible photographic format (no transparency)',
    supportsAlpha: false,
    lossy: true,
  },
  {
    id: 'image/png',
    name: 'PNG',
    extension: 'png',
    tag: 'Lossless',
    desc: 'Pixel-perfect lossless graphics with full alpha transparency',
    supportsAlpha: true,
    lossy: false,
  },
];

export function ImageConverter() {
  const [meta, setMeta] = useState<ImageFileMeta | null>(null);
  const [result, setResult] = useState<ConvertResult | null>(null);

  // Conversion options
  const [targetFormat, setTargetFormat] = useState<TargetConvertFormat>('image/webp');
  const [quality, setQuality] = useState<number>(92);
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
    isInitialLoadRef.current = true;
  }, []);

  // Check if target is JPEG and if transparency needs background fill
  const isTargetJpeg = targetFormat === 'image/jpeg';
  const isTargetPng = targetFormat === 'image/png';
  const transparencyNoticeRequired = isTargetJpeg && Boolean(meta?.hasAlpha);

  // Reactive debounced conversion effect:
  // Automatically reprocesses whenever targetFormat, quality, or backgroundColor changes.
  useEffect(() => {
    if (!meta) return;

    const thisRequestId = ++requestIdRef.current;
    const delay = isInitialLoadRef.current ? 0 : 250;
    isInitialLoadRef.current = false;

    const timer = setTimeout(async () => {
      try {
        setIsProcessing(true);

        const options: ConvertOptions = {
          format: targetFormat,
          quality,
          backgroundColor,
        };

        const newResult = await convertImage(meta, options);

        // Discard stale result if a newer request was dispatched while this was converting
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
        if (thisRequestId !== requestIdRef.current) return;
        setErrorMessage(err instanceof Error ? err.message : 'Format conversion failed.');
      } finally {
        if (thisRequestId === requestIdRef.current) {
          setIsProcessing(false);
        }
      }
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [meta, targetFormat, quality, backgroundColor]);

  // Handle file selection
  const handleFileProcess = async (file: File) => {
    try {
      resetImageState();
      setIsProcessing(true);
      setErrorMessage(null);
      isInitialLoadRef.current = true;

      const imageMeta = await loadImageMeta(file);
      activeMetaUrlRef.current = imageMeta.objectUrl;

      // Suggest appropriate default target format based on source
      if (imageMeta.type === 'image/webp') {
        setTargetFormat('image/png');
      } else if (imageMeta.type === 'image/png') {
        setTargetFormat('image/webp');
      } else {
        setTargetFormat('image/webp');
      }

      setMeta(imageMeta);
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

  // Format selection handler
  const handleFormatChange = (fmt: TargetConvertFormat) => {
    setTargetFormat(fmt);
    setIsProcessing(true);
  };

  // Quality slider handler
  const handleQualityChange = (val: number) => {
    setQuality(val);
    setIsProcessing(true);
  };

  // Background color change handler
  const handleBgColorChange = (color: string) => {
    setBackgroundColor(color);
    setIsProcessing(true);
  };

  // Load sample image with transparency
  const handleLoadSample = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const sampleFile = await createSampleTransparentPng();
      await handleFileProcess(sampleFile);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load sample image.');
      setIsProcessing(false);
    }
  };

  // Manual trigger for Convert Image button
  const handleManualConvert = async () => {
    if (!meta) return;

    const thisRequestId = ++requestIdRef.current;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const options: ConvertOptions = {
        format: targetFormat,
        quality,
        backgroundColor,
      };

      const newResult = await convertImage(meta, options);

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
      setErrorMessage(err instanceof Error ? err.message : 'Conversion failed.');
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
            Image Format Converter
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                <ImageRotateIcon size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Image Format Converter
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Convert PNG, JPEG, WebP, AVIF, and BMP images instantly in your browser. Preserve transparency, customize JPEG background fills, and export verified image files with zero server uploads.
            </p>
          </div>

          {/* Privacy & Engine Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-border text-xs text-zinc-600 dark:text-zinc-300">
              <ShieldIcon size={14} className="text-emerald-500" />
              <span>100% Client-Side Privacy</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-border text-xs text-zinc-600 dark:text-zinc-300">
              <ZapIcon size={14} className="text-purple-500" />
              <span>Native Canvas Pipeline</span>
            </div>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircleIcon size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold">Conversion Notice:</strong> {errorMessage}
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
          id="converter-file-input"
          accept="image/jpeg,image/png,image/webp,image/avif,image/bmp,image/gif"
          onChange={onFileInputChange}
          className="hidden"
          aria-label="Upload image file to convert"
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
                  ? 'border-purple-500 bg-purple-500/5 scale-[1.005]'
                  : 'border-border hover:border-purple-500/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20 shadow-xs">
                <UploadIcon size={28} />
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight mb-2">
                Drop your image here, or browse files
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
                Convert between WebP, PNG, and JPG. Also accepts AVIF, BMP, and GIF formats up to 50MB. Processed entirely inside your device.
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
                  className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border border-border bg-card text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer touch-manipulation flex items-center gap-2"
                >
                  <span>Try Sample Transparent PNG</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Converter Workspace */}
        {meta && (
          <div className="mt-8 space-y-6">
            {/* Top Controls Bar */}
            <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                    <SlidersIcon size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-foreground tracking-tight">
                      Conversion Settings
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      Source: <strong className="uppercase text-foreground">{meta.type.replace('image/', '')}</strong> ({meta.width} × {meta.height} • {meta.formattedSize})
                      {meta.hasAlpha ? ' • Alpha Transparency Detected' : ''}
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

              {/* Format & Controls Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* 1. Target Format Cards */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                    Choose Target Format
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {FORMAT_OPTIONS.map((fmt) => {
                      const isSelected = targetFormat === fmt.id;
                      const isSameAsSource = meta.type === fmt.id;

                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          id={`format-${fmt.extension}`}
                          onClick={() => handleFormatChange(fmt.id)}
                          className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-purple-500/10 border-purple-500/30 ring-2 ring-purple-500/40 text-foreground shadow-xs'
                              : 'bg-zinc-50 dark:bg-zinc-900/60 border-border hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-sm text-foreground">{fmt.name}</span>
                              <Badge variant={isSelected ? 'brand' : 'muted'} size="sm">
                                {isSameAsSource ? 'Current' : fmt.tag}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {fmt.desc}
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
                            <span>{fmt.supportsAlpha ? '✓ Alpha Alpha' : '✕ No Alpha'}</span>
                            <span>{fmt.lossy ? 'Lossy/Adjustable' : 'Lossless'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Transparency Warning when Converting to JPEG */}
                  {transparencyNoticeRequired && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2.5 animate-in fade-in">
                      <AlertCircleIcon size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Transparency Notice:</strong> This image contains transparent pixels. Because JPEG does not support transparency, transparent areas will be filled with the background color selected below.
                      </div>
                    </div>
                  )}

                  {/* JPEG Background Fill Color Picker */}
                  {isTargetJpeg && (
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-border space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          JPEG Background Fill Color:
                        </span>
                        <span className="font-mono text-muted-foreground">{backgroundColor}</span>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        {[
                          { label: 'White', color: '#ffffff' },
                          { label: 'Black', color: '#000000' },
                          { label: 'Light Gray', color: '#f4f4f5' },
                          { label: 'Dark Slate', color: '#0f172a' },
                        ].map((swatch) => (
                          <button
                            key={swatch.color}
                            type="button"
                            onClick={() => handleBgColorChange(swatch.color)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                              backgroundColor === swatch.color
                                ? 'border-purple-500 ring-2 ring-purple-500/30 bg-card text-foreground'
                                : 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: swatch.color }}
                            />
                            <span>{swatch.label}</span>
                          </button>
                        ))}

                        {/* Custom Color Input */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <input
                            type="color"
                            id="custom-bg-color-picker"
                            value={backgroundColor}
                            onChange={(e) => handleBgColorChange(e.target.value)}
                            className="w-7 h-7 rounded-lg border border-border cursor-pointer bg-transparent"
                            title="Pick custom background color"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Quality & Output Compression Controls */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="quality-slider" className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Output Encoding Quality:{' '}
                        {isTargetPng ? (
                          <span className="text-muted-foreground font-normal lowercase">(lossless format — n/a)</span>
                        ) : (
                          <span className="text-purple-600 dark:text-purple-400">{quality}%</span>
                        )}
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {isTargetPng
                          ? 'Lossless Deflate'
                          : quality >= 90
                          ? 'High Fidelity (Recommended)'
                          : quality >= 75
                          ? 'Balanced'
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
                      className={`w-full h-2 rounded-lg appearance-none accent-purple-500 ${
                        isTargetPng
                          ? 'opacity-40 cursor-not-allowed bg-zinc-200 dark:bg-zinc-800'
                          : 'cursor-pointer bg-zinc-200 dark:bg-zinc-800'
                      }`}
                      aria-label="Conversion quality slider"
                    />

                    {/* Quality Preset Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {[
                        { label: 'Balanced (75%)', val: 75 },
                        { label: 'High (85%)', val: 85 },
                        { label: 'Standard (92%)', val: 92 },
                        { label: 'Max (98%)', val: 98 },
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
                      <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-border text-muted-foreground text-xs leading-relaxed">
                        PNG uses lossless Deflate compression to maintain original pixel values. To adjust lossy compression levels, select <strong>WebP</strong> or <strong>JPEG</strong>.
                      </div>
                    )}
                  </div>

                  {/* Manual Re-convert Action Button */}
                  <button
                    type="button"
                    id="apply-convert-btn"
                    onClick={handleManualConvert}
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Converting...</span>
                      </>
                    ) : (
                      <>
                        <ZapIcon size={16} />
                        <span>Re-convert with Current Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Conversion Result Summary Banner */}
            {result && (
              <div
                className={`p-4 rounded-2xl border text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
                  result.isSmaller
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-300'
                    : 'bg-purple-500/10 border-purple-500/20 text-purple-900 dark:text-purple-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircleIcon
                    size={20}
                    className={`shrink-0 ${result.isSmaller ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}
                  />
                  <div>
                    Converted from <strong className="uppercase">{meta.type.replace('image/', '')}</strong> ({meta.formattedSize}) to{' '}
                    <strong className="uppercase">{result.extension}</strong> ({result.formattedSize})
                    {result.isSmaller ? (
                      <span> — saved <strong>{formatByteSize(result.savingsBytes)}</strong> ({result.savingsPercentage}% reduction)</span>
                    ) : (
                      <span> ({result.savingsPercentage}% change)</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={result.isSmaller ? 'success' : 'brand'}>
                    {result.extension.toUpperCase()}
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
                    Original Source
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
                    <span className="text-[11px] text-muted-foreground block">Format</span>
                    <span className="font-semibold text-foreground uppercase">{meta.type.replace('image/', '')}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                    <span className="text-[11px] text-muted-foreground block">Dimensions</span>
                    <span className="font-semibold text-foreground">{meta.width} × {meta.height}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                    <span className="text-[11px] text-muted-foreground block">Alpha Transparency</span>
                    <span className="font-semibold text-foreground">{meta.hasAlpha ? 'Detected' : 'None'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Converted Image Card */}
              <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-border bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold tracking-wider uppercase text-foreground">
                      Converted Output
                    </span>
                    {isProcessing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[11px] font-medium border border-purple-500/20 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Converting...
                      </span>
                    )}
                  </div>
                  {result && (
                    <Badge variant={result.isSmaller ? 'success' : 'brand'}>
                      {result.formattedSize}
                    </Badge>
                  )}
                </div>

                {/* Preview Frame with Live Updating Overlay */}
                <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/50 flex-1 flex items-center justify-center min-h-[260px] sm:min-h-[320px] max-h-[460px] overflow-hidden relative">
                  {result ? (
                    <div className="relative w-full h-full min-h-[260px] flex items-center justify-center">
                      <Image
                        id="converted-preview-img"
                        key={result.objectUrl}
                        src={result.objectUrl}
                        alt="Converted output preview"
                        width={result.width}
                        height={result.height}
                        unoptimized
                        className="max-h-[360px] w-auto h-auto object-contain rounded-lg shadow-2xs"
                      />

                      {/* Reprocessing overlay keeps last valid preview visible while clearly indicating work in flight */}
                      {isProcessing && (
                        <div
                          id="converted-preview-updating"
                          className="absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-lg flex items-center justify-center z-10 transition-all animate-in fade-in duration-150"
                        >
                          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border shadow-lg text-xs font-semibold text-foreground">
                            <span className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <span>Converting preview...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs p-8 flex flex-col items-center gap-2">
                      <span className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <span>Generating converted preview...</span>
                    </div>
                  )}
                </div>

                {/* Metadata Specs */}
                {result && (
                  <div className="p-4 border-t border-border bg-card grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                      <span className="text-[11px] text-muted-foreground block">Format</span>
                      <span className="font-semibold text-foreground uppercase">{result.extension}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60">
                      <span className="text-[11px] text-muted-foreground block">Dimensions</span>
                      <span className="font-semibold text-foreground">{result.width} × {result.height}</span>
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

        {/* Documentation & FAQ Section */}
        <section className="mt-16 pt-12 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-4">
              Image Format Comparison &amp; Conversion Guide
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Choosing the right image format depends on your intended use case, whether you need transparent backgrounds, photography compression, or high-definition graphics.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-1.5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>WebP (Recommended)</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  WebP provides superior lossy and lossless compression for web images. Developed by Google, it produces files 25–35% smaller than JPEG with identical visual quality and full alpha transparency support.
                </p>
                <div className="text-[11px] text-muted-foreground">
                  <strong>Best for:</strong> Modern websites, digital apps, transparent logos.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-1.5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span>JPEG / JPG</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  JPEG is the universal photographic standard supported across all browsers, operating systems, and image viewers. Note that JPEG does not support alpha transparency.
                </p>
                <div className="text-[11px] text-muted-foreground">
                  <strong>Best for:</strong> Photos, email newsletters, legacy device compatibility.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold text-foreground text-sm mb-1.5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>PNG</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  PNG is a lossless format that preserves every authored pixel with Deflate compression. It supports 8-bit and 24-bit color depth with smooth alpha transparency.
                </p>
                <div className="text-[11px] text-muted-foreground">
                  <strong>Best for:</strong> Screenshots, icons, logos, sharp line art.
                </div>
              </div>
            </div>

            {/* Privacy Guarantee Box */}
            <div className="p-6 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-border flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldIcon size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  100% Private Client-Side Conversion
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your files are never transmitted to external servers. All image decoding, format translation, canvas rendering, and blob construction occur directly within your device’s browser memory.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
