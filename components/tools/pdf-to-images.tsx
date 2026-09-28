'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  PdfFileMeta,
  loadPdfMeta,
  createSamplePdf,
  parsePageRanges,
  safeRevokeUrl,
} from '@/lib/pdf-utils';
import {
  OutputImageFormat,
  ResolutionScale,
  ConvertedPageImage,
  getPdfJs,
  renderPageToImageBlob,
  createZipArchive,
  cleanupPageImages,
  formatPageImageFilename,
} from '@/lib/pdf-to-images-utils';
import {
  PdfExportIcon,
  UploadIcon,
  DownloadIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TrashIcon,
  ShieldIcon,
  ZapIcon,
  SlidersIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

export function PdfToImages() {
  const [sourcePdf, setSourcePdf] = useState<PdfFileMeta | null>(null);
  const [format, setFormat] = useState<OutputImageFormat>('image/png');
  const [scale, setScale] = useState<ResolutionScale>(1.5);
  const [pageScope, setPageScope] = useState<'all' | 'custom'>('all');
  const [rangeInput, setRangeInput] = useState('1');

  const [isConverting, setIsConverting] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number } | null>(null);
  const [convertedPages, setConvertedPages] = useState<ConvertedPageImage[]>([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      cleanupPageImages(convertedPages);
      safeRevokeUrl(zipUrl);
    };
  }, [convertedPages, zipUrl]);

  // Page range validation
  const parsedRange = useMemo(() => {
    if (!sourcePdf || sourcePdf.pageCount <= 0) {
      return { pages: [], isValid: false, errors: [], summary: '', totalPages: 0 };
    }
    return parsePageRanges(rangeInput, sourcePdf.pageCount);
  }, [rangeInput, sourcePdf]);

  const targetPagesToConvert = useMemo(() => {
    if (!sourcePdf) return [];
    if (pageScope === 'all') {
      const all: number[] = [];
      for (let i = 1; i <= sourcePdf.pageCount; i++) all.push(i);
      return all;
    }
    return parsedRange.isValid ? parsedRange.pages : [];
  }, [sourcePdf, pageScope, parsedRange]);

  const handleSelectFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please upload a valid PDF file (.pdf).');
      return;
    }

    setErrorMessage(null);
    cleanupPageImages(convertedPages);
    setConvertedPages([]);
    safeRevokeUrl(zipUrl);
    setZipUrl(null);

    try {
      const meta = await loadPdfMeta(file);
      if (meta.error) {
        setErrorMessage(meta.error);
        setSourcePdf(null);
        return;
      }

      setSourcePdf(meta);
      setRangeInput(meta.pageCount > 1 ? `1-${Math.min(3, meta.pageCount)}` : '1');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to inspect PDF.');
      setSourcePdf(null);
    }
  }, [convertedPages, zipUrl]);

  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    setErrorMessage(null);
    try {
      const sample = await createSamplePdf('Quarterly Portfolio Overview', 4);
      await handleSelectFile(sample);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not create sample PDF.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleClearAll = () => {
    cleanupPageImages(convertedPages);
    setConvertedPages([]);
    safeRevokeUrl(zipUrl);
    setZipUrl(null);
    setSourcePdf(null);
    setErrorMessage(null);
    setCurrentProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteConversion = async () => {
    if (!sourcePdf || targetPagesToConvert.length === 0) return;

    setIsConverting(true);
    setErrorMessage(null);
    cleanupPageImages(convertedPages);
    setConvertedPages([]);
    safeRevokeUrl(zipUrl);
    setZipUrl(null);

    const totalToConvert = targetPagesToConvert.length;
    setCurrentProgress({ current: 0, total: totalToConvert });

    try {
      const pdfjs = await getPdfJs();
      const arrayBuffer = sourcePdf.arrayBuffer || (await sourcePdf.file.arrayBuffer());
      const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      const results: ConvertedPageImage[] = [];
      const ext = format === 'image/png' ? 'png' : 'jpg';

      for (let i = 0; i < totalToConvert; i++) {
        const pageNum = targetPagesToConvert[i];
        setCurrentProgress({ current: i + 1, total: totalToConvert });

        const { blob, width, height } = await renderPageToImageBlob(pdfDoc, pageNum, {
          scale,
          format,
        });

        const objectUrl = URL.createObjectURL(blob);
        const filename = formatPageImageFilename(sourcePdf.name, pageNum, ext);

        results.push({
          pageNumber: pageNum,
          blob,
          objectUrl,
          filename,
          width,
          height,
          size: blob.size,
          formattedSize: (blob.size / 1024).toFixed(1) + ' KB',
          format,
        });
      }

      setConvertedPages(results);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to convert PDF pages to images.'
      );
    } finally {
      setIsConverting(false);
      setCurrentProgress(null);
    }
  };

  const handleDownloadZip = async () => {
    if (convertedPages.length === 0) return;

    if (zipUrl) {
      const a = document.createElement('a');
      a.href = zipUrl;
      const baseName = sourcePdf ? sourcePdf.name.replace(/\.pdf$/i, '') : 'document';
      a.download = `${baseName}-images.zip`;
      a.click();
      return;
    }

    setIsZipping(true);
    try {
      const zip = await createZipArchive(
        convertedPages.map((p) => ({ filename: p.filename, blob: p.blob }))
      );
      const url = URL.createObjectURL(zip);
      setZipUrl(url);

      const a = document.createElement('a');
      a.href = url;
      const baseName = sourcePdf ? sourcePdf.name.replace(/\.pdf$/i, '') : 'document';
      a.download = `${baseName}-images.zip`;
      a.click();
    } catch {
      setErrorMessage('Failed to generate ZIP archive.');
    } finally {
      setIsZipping(false);
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
        <span className="text-foreground font-medium">PDF to Images</span>
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
          PDF to Images
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
          Extract every page of your PDF as high-resolution PNG or JPG images. Download pages individually or package them all into a single ZIP archive without uploading files to any external server.
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
            <PdfExportIcon size={32} />
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-1">
            Drop your PDF here, or <span className="text-red-600 dark:text-red-400 underline decoration-red-500/30 underline-offset-4">browse</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-5">
            Render and extract crisp PNG or JPG pages with configurable resolutions and 1-click ZIP downloads.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
              High-Res PNG & JPG
            </span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
              ZIP Package Download
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
              {isLoadingSample ? 'Loading...' : 'Load 4-Page Sample PDF'}
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

      {/* Active Document Workspace */}
      {sourcePdf && (
        <div className="space-y-6">
          {/* File Overview Card */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border border-border/80 rounded-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20 shrink-0">
                <PdfExportIcon size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-foreground truncate max-w-sm sm:max-w-md" title={sourcePdf.name}>
                  {sourcePdf.name}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {sourcePdf.pageCount} {sourcePdf.pageCount === 1 ? 'page' : 'pages'} • {sourcePdf.formattedSize}
                </p>
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

          {/* Conversion Settings Controls */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-border/80">
              <SlidersIcon size={18} className="text-red-600 dark:text-red-400" />
              <h2 className="font-semibold text-sm text-foreground">
                Output Configuration
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Output Format */}
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Image Format
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-border/80">
                  <button
                    type="button"
                    onClick={() => setFormat('image/png')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      format === 'image/png'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    PNG (Lossless)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('image/jpeg')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      format === 'image/jpeg'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    JPG (Compressed)
                  </button>
                </div>
              </div>

              {/* Resolution Scale */}
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Render Resolution
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-border/80">
                  <button
                    type="button"
                    onClick={() => setScale(1.0)}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      scale === 1.0
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    1x (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScale(1.5)}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      scale === 1.5
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    1.5x (Crisp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScale(2.0)}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      scale === 2.0
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    2x (High-Res)
                  </button>
                </div>
              </div>

              {/* Page Selection */}
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Pages to Render
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-border/80">
                  <button
                    type="button"
                    onClick={() => setPageScope('all')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      pageScope === 'all'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All ({sourcePdf.pageCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageScope('custom')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      pageScope === 'custom'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Custom Range
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Range Input (if selected) */}
            {pageScope === 'custom' && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-border/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="customRange" className="font-semibold text-foreground">
                    Custom Page Range
                  </label>
                  <span className="text-muted-foreground font-mono">
                    Total Pages: 1 - {sourcePdf.pageCount}
                  </span>
                </div>
                <input
                  id="customRange"
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-2, 4"
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-background border border-border/80 text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-red-500/40"
                />
                <div className="text-xs">
                  {parsedRange.isValid ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ {parsedRange.summary}
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      ✕ {parsedRange.errors[0] || 'Please enter valid page numbers.'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action Button & Progress */}
            <div className="pt-4 border-t border-border/80 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground">
                Will extract <strong className="text-foreground">{targetPagesToConvert.length} {targetPagesToConvert.length === 1 ? 'image' : 'images'}</strong> at {scale}x resolution into {format === 'image/png' ? 'PNG' : 'JPG'}.
              </div>

              <button
                type="button"
                onClick={handleExecuteConversion}
                disabled={isConverting || targetPagesToConvert.length === 0}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-red-600 hover:bg-red-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 dark:disabled:text-zinc-600 shadow-sm transition-all"
              >
                {isConverting ? (
                  <>
                    <RefreshCwIcon size={16} className="animate-spin" />
                    <span>
                      Converting Page {currentProgress?.current || 1} of {currentProgress?.total || targetPagesToConvert.length}...
                    </span>
                  </>
                ) : (
                  <>
                    <PdfExportIcon size={16} />
                    <span>Convert {targetPagesToConvert.length} Pages</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Converted Results Gallery */}
          {convertedPages.length > 0 && (
            <div className="space-y-6">
              {/* Batch Actions Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircleIcon size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">
                      Successfully Extracted {convertedPages.length} {convertedPages.length === 1 ? 'Page' : 'Pages'}!
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ready to download individually or bundle into a single ZIP archive.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={isZipping}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all"
                  >
                    {isZipping ? (
                      <>
                        <RefreshCwIcon size={15} className="animate-spin" />
                        <span>Packaging ZIP...</span>
                      </>
                    ) : (
                      <>
                        <DownloadIcon size={15} />
                        <span>Download All as ZIP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Grid of Rendered Page Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {convertedPages.map((page) => (
                  <div
                    key={page.pageNumber}
                    className="flex flex-col justify-between p-3.5 bg-card border border-border/80 rounded-2xl hover:border-border transition-all"
                  >
                    <div>
                      {/* Image Preview Container */}
                      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-border/60 flex items-center justify-center mb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={page.objectUrl}
                          alt={`Page ${page.pageNumber}`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white font-mono text-[11px] font-semibold backdrop-blur-xs">
                          Page {page.pageNumber}
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-semibold text-foreground truncate" title={page.filename}>
                          {page.filename}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                          <span>{page.width} × {page.height} px</span>
                          <span>•</span>
                          <span>{page.formattedSize}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={page.objectUrl}
                      download={page.filename}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-foreground bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/60 transition-colors"
                    >
                      <DownloadIcon size={13} />
                      Download Page {page.pageNumber}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Educational & Features Section */}
      <div className="mt-16 pt-12 border-t border-border/80">
        <h2 className="text-xl font-bold text-foreground mb-6">
          High-Fidelity Client-Side PDF Rasterization
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <ShieldIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              100% Private & Local
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your confidential documents never touch any cloud server. Every page is drawn directly onto your device&apos;s local HTML5 canvas.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <UploadIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              Flexible Output Resolutions
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose from standard 1x resolution for light web thumbnails or up to 2x (300 DPI) for crystal-clear print reproductions.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <DownloadIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              Single-Click ZIP Packaging
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Need to extract dozens of pages? Download every page at once packaged into a clean, organized ZIP archive with standardized file names.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
