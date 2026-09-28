'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ImageToPdfItem,
  PageSizeOption,
  PageOrientation,
  MarginOption,
  ImagesToPdfResult,
  loadImageInfo,
  convertImagesToPdf,
  createSampleImages,
} from '@/lib/images-to-pdf-utils';
import { formatByteSize, safeRevokeUrl } from '@/lib/pdf-utils';
import {
  ImagesToPdfIcon,
  DownloadIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TrashIcon,
  ShieldIcon,
  ZapIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FilePlusIcon,
  SlidersIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

export function ImagesToPdf() {
  const [images, setImages] = useState<ImageToPdfItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeOption>('a4');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [margin, setMargin] = useState<MarginOption>('small');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [outputFilename, setOutputFilename] = useState('asaptools-converted.pdf');

  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<ImagesToPdfResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => safeRevokeUrl(img.previewUrl));
      safeRevokeUrl(conversionResult?.objectUrl);
    };
  }, [images, conversionResult]);

  const totalBytes = useMemo(() => {
    return images.reduce((acc, curr) => acc + curr.size, 0);
  }, [images]);

  const handleAddFiles = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setErrorMessage(null);
    const newItems: ImageToPdfItem[] = [];

    for (const f of fileList) {
      try {
        const item = await loadImageInfo(f);
        newItems.push(item);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : `Failed to load image "${f.name}".`);
      }
    }

    if (newItems.length > 0) {
      setImages((prev) => [...prev, ...newItems]);
      setConversionResult(null);
    }
  }, []);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    setImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy;
    });
  };

  const handleRemove = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) safeRevokeUrl(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
    setConversionResult(null);
  };

  const handleClearAll = () => {
    images.forEach((i) => safeRevokeUrl(i.previewUrl));
    setImages([]);
    safeRevokeUrl(conversionResult?.objectUrl);
    setConversionResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    setErrorMessage(null);
    try {
      const sampleFiles = await createSampleImages();
      await handleAddFiles(sampleFiles);
      setOutputFilename('asaptools-sample-doc.pdf');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not create sample images.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleExecuteConversion = async () => {
    if (images.length === 0) return;

    setIsConverting(true);
    setErrorMessage(null);

    try {
      const result = await convertImagesToPdf(images, {
        pageSize,
        orientation,
        margin,
        backgroundColor,
        outputFilename,
      });

      safeRevokeUrl(conversionResult?.objectUrl);
      setConversionResult(result);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate PDF document.');
    } finally {
      setIsConverting(false);
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
        <span className="text-foreground font-medium">Images to PDF</span>
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
          Images to PDF
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
          Combine multiple JPG, PNG, and WebP images into a single professional PDF. Customize paper sizes, margins, orientation, and reorder pages with instant client-side conversion.
        </p>
      </div>

      {/* Top Action Bar when images are loaded */}
      {images.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border border-border/80 rounded-2xl mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20 shrink-0">
              <ImagesToPdfIcon size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground">
                {images.length} {images.length === 1 ? 'Image' : 'Images'} Queued
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Total size: {formatByteSize(totalBytes)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground transition-colors"
            >
              <FilePlusIcon size={14} />
              Add More Images
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <TrashIcon size={14} />
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Upload Dropzone (when empty) */}
      {images.length === 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) handleAddFiles(e.dataTransfer.files);
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
            multiple
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleAddFiles(e.target.files);
            }}
          />

          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-red-500/20">
            <ImagesToPdfIcon size={32} />
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-1">
            Drop your images here, or <span className="text-red-600 dark:text-red-400 underline decoration-red-500/30 underline-offset-4">browse</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-5">
            Convert JPG, PNG, and WebP photos into an organized, high-quality PDF document.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
              Multiple Images Supported
            </span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
              A4, Letter & Fit Sizing
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
              {isLoadingSample ? 'Loading...' : 'Load 3 Sample Images'}
            </button>
          </div>
        </div>
      )}

      {/* Hidden input when files exist */}
      {images.length > 0 && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleAddFiles(e.target.files);
          }}
        />
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-3 text-sm my-6">
          <AlertCircleIcon size={18} className="shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Notice:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Active Images Workspace */}
      {images.length > 0 && (
        <div className="space-y-6">
          {/* Reorderable Image Cards Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>Use arrows to organize page sequence (page 1 at top):</span>
              <span>{images.length} {images.length === 1 ? 'image' : 'images'}</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {images.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === images.length - 1;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-card border border-border/80 hover:border-border transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-foreground flex items-center justify-center font-mono font-semibold text-xs shrink-0 border border-border/60">
                        {index + 1}
                      </div>

                      {/* Image Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-border/60 shrink-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate max-w-xs sm:max-w-md" title={item.name}>
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono">
                          <span>{item.width} × {item.height} px</span>
                          <span>•</span>
                          <span>{item.formattedSize}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'up')}
                        disabled={isFirst}
                        title="Move page up"
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        aria-label="Move up"
                      >
                        <ArrowUpIcon size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'down')}
                        disabled={isLast}
                        title="Move page down"
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        aria-label="Move down"
                      >
                        <ArrowDownIcon size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        title="Remove image"
                        className="p-2 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Remove image"
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PDF Layout & Page Options Card */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-border/80">
              <SlidersIcon size={18} className="text-red-600 dark:text-red-400" />
              <h2 className="font-semibold text-sm text-foreground">
                Document Page Layout
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Page Size */}
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Page Size
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-border/80">
                  <button
                    type="button"
                    onClick={() => setPageSize('a4')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      pageSize === 'a4'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize('letter')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      pageSize === 'letter'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Letter
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize('fit')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      pageSize === 'fit'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Fit Image
                  </button>
                </div>
              </div>

              {/* Orientation */}
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Orientation
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-border/80">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      orientation === 'portrait'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      orientation === 'landscape'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('auto')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      orientation === 'auto'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Auto
                  </button>
                </div>
              </div>

              {/* Margins */}
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Page Margins
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-border/80">
                  <button
                    type="button"
                    onClick={() => setMargin('none')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      margin === 'none'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => setMargin('small')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      margin === 'small'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Small
                  </button>
                  <button
                    type="button"
                    onClick={() => setMargin('medium')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      margin === 'medium'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Med
                  </button>
                  <button
                    type="button"
                    onClick={() => setMargin('large')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      margin === 'large'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Large
                  </button>
                </div>
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Page Fill
                </label>
                <div className="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-border/80">
                  <button
                    type="button"
                    onClick={() => setBackgroundColor('#ffffff')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 ${
                      backgroundColor === '#ffffff'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-white border border-zinc-300" />
                    White
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackgroundColor('#000000')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 ${
                      backgroundColor === '#000000'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-black border border-zinc-600" />
                    Black
                  </button>
                </div>
              </div>
            </div>

            {/* Output Filename & Generate Button */}
            <div className="pt-4 border-t border-border/80 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label htmlFor="outputFilename" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Output Filename
                </label>
                <input
                  id="outputFilename"
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="asaptools-converted.pdf"
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-background border border-border/80 text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleExecuteConversion}
                  disabled={isConverting || images.length === 0}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-red-600 hover:bg-red-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 dark:disabled:text-zinc-600 shadow-sm transition-all"
                >
                  {isConverting ? (
                    <>
                      <RefreshCwIcon size={16} className="animate-spin" />
                      <span>Creating PDF Document...</span>
                    </>
                  ) : (
                    <>
                      <ImagesToPdfIcon size={16} />
                      <span>Generate PDF ({images.length} Pages)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Conversion Success Card */}
          {conversionResult && (
            <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-foreground space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircleIcon size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-foreground">
                      PDF Document Generated Successfully!
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Compiled {conversionResult.pageCount} pages • {conversionResult.formattedSize}
                    </p>
                  </div>
                </div>

                <a
                  href={conversionResult.objectUrl}
                  download={conversionResult.downloadFilename}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all"
                >
                  <DownloadIcon size={16} />
                  Download PDF Document
                </a>
              </div>

              <div className="pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs text-muted-foreground">
                <span>File: <code className="font-mono text-foreground">{conversionResult.downloadFilename}</code></span>
                <a
                  href={conversionResult.objectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  Open in Browser Tab ↗
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Educational & Features Section */}
      <div className="mt-16 pt-12 border-t border-border/80">
        <h2 className="text-xl font-bold text-foreground mb-6">
          Professional In-Browser PDF Compilation
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <ShieldIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              Zero Server Uploads
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your photographs, receipts, and personal scans remain completely private. All image compression and document assembly run directly on your CPU.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <SlidersIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              Proportional Aspect Ratios
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Never worry about stretched or squashed pictures. Every image is mathematically centered and scaled to fit within page margins while preserving original proportions.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <ImagesToPdfIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              Universal Image Support
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mix and match PNG, JPEG, and WebP files in a single document with smooth transparency handling and customizable page borders.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
