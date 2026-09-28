'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  PdfFileMeta,
  PdfOperationResult,
  loadPdfMeta,
  mergePdfs,
  splitPdf,
  createSamplePdf,
  parsePageRanges,
  generatePresetRange,
  safeRevokeUrl,
  formatByteSize,
  getFilenameWithoutExtension,
} from '@/lib/pdf-utils';
import {
  PdfIcon,
  DownloadIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TrashIcon,
  ShieldIcon,
  ZapIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ScissorsIcon,
  LayersIcon,
  FilePlusIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

type ToolMode = 'merge' | 'split';

export function PdfTools() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Mode derived directly from URL query (?mode=merge | ?mode=split)
  const mode: ToolMode = searchParams.get('mode') === 'split' ? 'split' : 'merge';

  const switchMode = (newMode: ToolMode) => {
    router.replace(`/tools/pdf-tools?mode=${newMode}`, { scroll: false });
  };

  // ==========================================
  // MERGE MODE STATE
  // ==========================================
  const [mergeFiles, setMergeFiles] = useState<PdfFileMeta[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<PdfOperationResult | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeCustomFilename, setMergeCustomFilename] = useState('asaptools-merged.pdf');
  const [isMergeDragging, setIsMergeDragging] = useState(false);
  const [loadingMergePdfs, setLoadingMergePdfs] = useState(false);

  const mergeFileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // SPLIT MODE STATE
  // ==========================================
  const [splitFile, setSplitFile] = useState<PdfFileMeta[] | null>(null); // single file stored as 1-element array
  const [rangeInput, setRangeInput] = useState('1');
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitResult, setSplitResult] = useState<PdfOperationResult | null>(null);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [splitCustomFilename, setSplitCustomFilename] = useState('');
  const [isSplitDragging, setIsSplitDragging] = useState(false);
  const [loadingSplitPdf, setLoadingSplitPdf] = useState(false);

  const splitFileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount or new results
  useEffect(() => {
    return () => {
      safeRevokeUrl(mergeResult?.objectUrl);
      safeRevokeUrl(splitResult?.objectUrl);
    };
  }, [mergeResult, splitResult]);

  // Total pages across all valid merge files
  const mergeStats = useMemo(() => {
    let validFilesCount = 0;
    let totalPages = 0;
    let totalBytes = 0;
    let hasEncrypted = false;
    let hasErrors = false;

    for (const f of mergeFiles) {
      if (f.error) hasErrors = true;
      if (f.isEncrypted) hasEncrypted = true;
      if (!f.error && !f.isEncrypted && f.pageCount > 0) {
        validFilesCount++;
        totalPages += f.pageCount;
        totalBytes += f.size;
      }
    }

    return {
      validFilesCount,
      totalPages,
      totalBytes,
      formattedTotalBytes: formatByteSize(totalBytes),
      hasEncrypted,
      hasErrors,
      canMerge: validFilesCount >= 1 && !hasEncrypted && !hasErrors,
    };
  }, [mergeFiles]);

  // Parsed split ranges validation
  const currentSplitDoc = splitFile && splitFile.length > 0 ? splitFile[0] : null;
  const parsedRange = useMemo(() => {
    if (!currentSplitDoc || currentSplitDoc.pageCount <= 0) {
      return {
        pages: [],
        totalPages: 0,
        isValid: false,
        errors: [],
        summary: '',
      };
    }
    return parsePageRanges(rangeInput, currentSplitDoc.pageCount);
  }, [rangeInput, currentSplitDoc]);

  // ==========================================
  // MERGE HANDLERS
  // ==========================================
  const handleAddMergeFiles = useCallback(async (filesToAdd: FileList | File[]) => {
    const list = Array.from(filesToAdd).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (list.length === 0) {
      setMergeError('Please select valid PDF documents (.pdf).');
      return;
    }

    setMergeError(null);
    setLoadingMergePdfs(true);

    try {
      const loadedMetas: PdfFileMeta[] = [];
      for (const file of list) {
        const meta = await loadPdfMeta(file);
        loadedMetas.push(meta);
      }

      setMergeFiles((prev) => [...prev, ...loadedMetas]);
      setMergeResult(null);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Failed to inspect PDF documents.');
    } finally {
      setLoadingMergePdfs(false);
    }
  }, []);

  const handleMoveFile = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mergeFiles.length) return;

    setMergeFiles((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy;
    });
  };

  const handleRemoveMergeFile = (id: string) => {
    setMergeFiles((prev) => prev.filter((item) => item.id !== id));
    setMergeResult(null);
  };

  const handleClearMergeFiles = () => {
    setMergeFiles([]);
    setMergeResult(null);
    setMergeError(null);
    if (mergeFileInputRef.current) mergeFileInputRef.current.value = '';
  };

  const handleLoadSampleMergePdfs = async () => {
    setLoadingMergePdfs(true);
    setMergeError(null);
    setMergeResult(null);
    try {
      const docA = await createSamplePdf('Quarterly Report A', 2);
      const docB = await createSamplePdf('Appendix Summary B', 3);

      const metaA = await loadPdfMeta(docA);
      const metaB = await loadPdfMeta(docB);

      setMergeFiles([metaA, metaB]);
      setMergeCustomFilename('asaptools-quarterly-merged.pdf');
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Could not create sample PDFs.');
    } finally {
      setLoadingMergePdfs(false);
    }
  };

  const handleExecuteMerge = async () => {
    if (!mergeStats.canMerge) return;
    setIsMerging(true);
    setMergeError(null);

    try {
      const result = await mergePdfs(mergeFiles, mergeCustomFilename || 'asaptools-merged.pdf');
      setMergeResult(result);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'An error occurred while merging PDFs.');
    } finally {
      setIsMerging(false);
    }
  };

  // ==========================================
  // SPLIT HANDLERS
  // ==========================================
  const handleSetSplitFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setSplitError('Please upload a valid PDF document (.pdf).');
      return;
    }

    setSplitError(null);
    setLoadingSplitPdf(true);
    safeRevokeUrl(splitResult?.objectUrl);
    setSplitResult(null);

    try {
      const meta = await loadPdfMeta(file);
      setSplitFile([meta]);

      // Set default range suggestion
      if (meta.pageCount > 1) {
        setRangeInput(`1-${Math.min(3, meta.pageCount)}`);
      } else {
        setRangeInput('1');
      }

      const base = getFilenameWithoutExtension(file.name);
      setSplitCustomFilename(`${base}-extracted.pdf`);
    } catch (err) {
      setSplitError(err instanceof Error ? err.message : 'Failed to inspect PDF file.');
    } finally {
      setLoadingSplitPdf(false);
    }
  }, [splitResult]);

  const handleLoadSampleSplitPdf = async () => {
    setLoadingSplitPdf(true);
    setSplitError(null);
    safeRevokeUrl(splitResult?.objectUrl);
    setSplitResult(null);

    try {
      const sample = await createSamplePdf('Financial Overview', 4);
      await handleSetSplitFile(sample);
      setRangeInput('1-2, 4');
    } catch (err) {
      setSplitError(err instanceof Error ? err.message : 'Failed to create sample PDF.');
    } finally {
      setLoadingSplitPdf(false);
    }
  };

  const handleApplySplitPreset = (preset: 'all' | 'odd' | 'even' | 'first-half' | 'second-half') => {
    if (!currentSplitDoc) return;
    const presetStr = generatePresetRange(preset, currentSplitDoc.pageCount);
    setRangeInput(presetStr);
  };

  const handleExecuteSplit = async () => {
    if (!currentSplitDoc || !parsedRange.isValid || parsedRange.pages.length === 0) return;
    setIsSplitting(true);
    setSplitError(null);

    try {
      const result = await splitPdf(
        currentSplitDoc,
        parsedRange.pages,
        splitCustomFilename || undefined
      );
      setSplitResult(result);
    } catch (err) {
      setSplitError(err instanceof Error ? err.message : 'An error occurred while splitting the PDF.');
    } finally {
      setIsSplitting(false);
    }
  };

  const handleClearSplitFile = () => {
    setSplitFile(null);
    setSplitResult(null);
    setSplitError(null);
    setRangeInput('1');
    if (splitFileInputRef.current) splitFileInputRef.current.value = '';
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
        <span className="text-foreground font-medium">PDF Merge & Split</span>
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
          PDF Merge & Split
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
          Combine multiple PDF files into one clean document, or split and extract specific pages with custom ranges. Fast, free, and processed completely in your browser without uploading your documents to any server.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center p-1.5 bg-zinc-100 dark:bg-zinc-900 border border-border/80 rounded-2xl mb-8 max-w-md">
        <button
          type="button"
          onClick={() => switchMode('merge')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
            mode === 'merge'
              ? 'bg-background text-foreground shadow-sm border border-border/60'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-selected={mode === 'merge'}
          role="tab"
        >
          <LayersIcon size={16} className={mode === 'merge' ? 'text-red-600 dark:text-red-400' : ''} />
          <span>Merge PDFs</span>
          {mergeFiles.length > 0 && (
            <span className="ml-1 text-xs px-1.5 py-0.2 bg-zinc-200 dark:bg-zinc-800 rounded-full font-mono">
              {mergeFiles.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => switchMode('split')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
            mode === 'split'
              ? 'bg-background text-foreground shadow-sm border border-border/60'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-selected={mode === 'split'}
          role="tab"
        >
          <ScissorsIcon size={16} className={mode === 'split' ? 'text-red-600 dark:text-red-400' : ''} />
          <span>Split PDF</span>
          {currentSplitDoc && (
            <span className="ml-1 text-xs px-1.5 py-0.2 bg-zinc-200 dark:bg-zinc-800 rounded-full font-mono">
              {currentSplitDoc.pageCount}p
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* MODE 1: MERGE PDFS */}
      {/* ========================================================= */}
      {mode === 'merge' && (
        <div className="space-y-6">
          {/* Top Action Bar when files are loaded */}
          {mergeFiles.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border border-border/80 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20 shrink-0">
                  <PdfIcon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {mergeFiles.length} {mergeFiles.length === 1 ? 'Document' : 'Documents'} Queued
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {mergeStats.totalPages} total pages • {mergeStats.formattedTotalBytes}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => mergeFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground transition-colors"
                >
                  <FilePlusIcon size={14} />
                  Add More PDFs
                </button>
                <button
                  type="button"
                  onClick={handleClearMergeFiles}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <TrashIcon size={14} />
                  Clear List
                </button>
              </div>
            </div>
          )}

          {/* Upload Dropzone (empty state or append) */}
          {mergeFiles.length === 0 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsMergeDragging(true);
              }}
              onDragLeave={() => setIsMergeDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsMergeDragging(false);
                if (e.dataTransfer.files) handleAddMergeFiles(e.dataTransfer.files);
              }}
              onClick={() => mergeFileInputRef.current?.click()}
              className={`group relative flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border-2 border-dashed cursor-pointer transition-all ${
                isMergeDragging
                  ? 'border-red-500 bg-red-500/5 scale-[0.99]'
                  : 'border-border/80 hover:border-red-500/50 bg-card hover:bg-card/80'
              }`}
            >
              <input
                ref={mergeFileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleAddMergeFiles(e.target.files);
                }}
              />

              <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-red-500/20">
                <LayersIcon size={32} />
              </div>

              <h2 className="text-lg font-semibold text-foreground mb-1">
                Drop your PDF files here, or <span className="text-red-600 dark:text-red-400 underline decoration-red-500/30 underline-offset-4">browse</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-5">
                Select multiple PDF files to combine. You can reorder, preview page counts, and download the merged result instantly.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
                  Multiple PDFs Supported
                </span>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
                  Max 100 MB per file
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSampleMergePdfs();
                  }}
                  disabled={loadingMergePdfs}
                  className="text-[11px] font-semibold px-3 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 transition-colors flex items-center gap-1.5"
                >
                  <ZapIcon size={12} />
                  {loadingMergePdfs ? 'Generating Samples...' : 'Load 2 Sample PDFs'}
                </button>
              </div>
            </div>
          )}

          {/* Hidden input when files exist to allow "Add More PDFs" button to work */}
          {mergeFiles.length > 0 && (
            <input
              ref={mergeFileInputRef}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleAddMergeFiles(e.target.files);
              }}
            />
          )}

          {/* Merge Error Alert */}
          {mergeError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-3 text-sm">
              <AlertCircleIcon size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Merge Notice:</strong> {mergeError}
              </div>
            </div>
          )}

          {/* Merge List of Documents */}
          {mergeFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>Drag or use arrows to change the merge sequence (top = first pages):</span>
                <span>{mergeFiles.length} {mergeFiles.length === 1 ? 'file' : 'files'}</span>
              </div>

              <div className="space-y-2.5">
                {mergeFiles.map((fileMeta, index) => {
                  const isFirst = index === 0;
                  const isLast = index === mergeFiles.length - 1;

                  return (
                    <div
                      key={fileMeta.id}
                      className={`flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all ${
                        fileMeta.error
                          ? 'bg-red-500/5 border-red-500/30'
                          : 'bg-card border-border/80 hover:border-border'
                      }`}
                    >
                      {/* Left: Sequence index and Document Details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-foreground flex items-center justify-center font-mono font-semibold text-xs shrink-0 border border-border/60">
                          {index + 1}
                        </div>

                        <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-500/20">
                          <PdfIcon size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate max-w-xs sm:max-w-md" title={fileMeta.name}>
                            {fileMeta.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground font-mono">
                              {fileMeta.formattedSize}
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            {fileMeta.error ? (
                              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                {fileMeta.error}
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                {fileMeta.pageCount} {fileMeta.pageCount === 1 ? 'page' : 'pages'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Reorder and Delete Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveFile(index, 'up')}
                          disabled={isFirst}
                          title="Move up in merge sequence"
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          aria-label="Move up"
                        >
                          <ArrowUpIcon size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveFile(index, 'down')}
                          disabled={isLast}
                          title="Move down in merge sequence"
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          aria-label="Move down"
                        >
                          <ArrowDownIcon size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMergeFile(fileMeta.id)}
                          title="Remove file from merge list"
                          className="p-2 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          aria-label="Remove file"
                        >
                          <TrashIcon size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Merge Settings & Execution Box */}
              <div className="p-5 sm:p-6 rounded-3xl bg-zinc-50/80 dark:bg-zinc-900/80 border border-border/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label htmlFor="mergeFilename" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                      Output Filename
                    </label>
                    <input
                      id="mergeFilename"
                      type="text"
                      value={mergeCustomFilename}
                      onChange={(e) => setMergeCustomFilename(e.target.value)}
                      placeholder="asaptools-merged.pdf"
                      className="w-full px-3.5 py-2 text-sm rounded-xl bg-background border border-border/80 text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleExecuteMerge}
                      disabled={isMerging || !mergeStats.canMerge}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-red-600 hover:bg-red-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 dark:disabled:text-zinc-600 shadow-sm transition-all"
                    >
                      {isMerging ? (
                        <>
                          <RefreshCwIcon size={16} className="animate-spin" />
                          <span>Merging {mergeStats.totalPages} Pages...</span>
                        </>
                      ) : (
                        <>
                          <LayersIcon size={16} />
                          <span>Merge {mergeFiles.length} Documents ({mergeStats.totalPages} Pages)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {mergeFiles.length < 2 && !mergeStats.hasErrors && (
                  <p className="text-xs text-muted-foreground">
                    Tip: Add at least 2 PDF documents to combine them into one file.
                  </p>
                )}
              </div>

              {/* Merge Success Download Card */}
              {mergeResult && (
                <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-foreground space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircleIcon size={22} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-base text-foreground">
                          PDF Successfully Merged!
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Combined into {mergeResult.pageCount} pages • {mergeResult.formattedSize}
                        </p>
                      </div>
                    </div>

                    <a
                      href={mergeResult.objectUrl}
                      download={mergeResult.downloadFilename}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all"
                    >
                      <DownloadIcon size={16} />
                      Download Merged PDF
                    </a>
                  </div>

                  <div className="pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Generated file: <code className="font-mono text-foreground">{mergeResult.downloadFilename}</code></span>
                    <a
                      href={mergeResult.objectUrl}
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
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: SPLIT PDF */}
      {/* ========================================================= */}
      {mode === 'split' && (
        <div className="space-y-6">
          {/* Split Dropzone when no file loaded */}
          {!currentSplitDoc && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsSplitDragging(true);
              }}
              onDragLeave={() => setIsSplitDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsSplitDragging(false);
                if (e.dataTransfer.files?.[0]) handleSetSplitFile(e.dataTransfer.files[0]);
              }}
              onClick={() => splitFileInputRef.current?.click()}
              className={`group relative flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border-2 border-dashed cursor-pointer transition-all ${
                isSplitDragging
                  ? 'border-red-500 bg-red-500/5 scale-[0.99]'
                  : 'border-border/80 hover:border-red-500/50 bg-card hover:bg-card/80'
              }`}
            >
              <input
                ref={splitFileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleSetSplitFile(e.target.files[0]);
                }}
              />

              <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-red-500/20">
                <ScissorsIcon size={30} />
              </div>

              <h2 className="text-lg font-semibold text-foreground mb-1">
                Drop your PDF here to split, or <span className="text-red-600 dark:text-red-400 underline decoration-red-500/30 underline-offset-4">browse</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-5">
                Extract individual pages or custom ranges (such as 1-3, 5, 8-10) directly in your browser.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
                  Custom Range Syntax (e.g. 1-3, 5)
                </span>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border border-border/60">
                  100% Client-Side Privacy
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSampleSplitPdf();
                  }}
                  disabled={loadingSplitPdf}
                  className="text-[11px] font-semibold px-3 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 transition-colors flex items-center gap-1.5"
                >
                  <ZapIcon size={12} />
                  {loadingSplitPdf ? 'Loading Sample...' : 'Load 4-Page Sample PDF'}
                </button>
              </div>
            </div>
          )}

          {/* Split Error Alert */}
          {splitError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-3 text-sm">
              <AlertCircleIcon size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Split Notice:</strong> {splitError}
              </div>
            </div>
          )}

          {/* Split File Active Workspace */}
          {currentSplitDoc && (
            <div className="space-y-6">
              {/* Document Overview Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border border-border/80 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20 shrink-0">
                    <PdfIcon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground truncate max-w-md" title={currentSplitDoc.name}>
                      {currentSplitDoc.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {currentSplitDoc.pageCount} total {currentSplitDoc.pageCount === 1 ? 'page' : 'pages'} • {currentSplitDoc.formattedSize}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => splitFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground transition-colors"
                  >
                    <RefreshCwIcon size={13} />
                    Replace PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSplitFile}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <TrashIcon size={14} />
                    Remove
                  </button>
                </div>
              </div>

              <input
                ref={splitFileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleSetSplitFile(e.target.files[0]);
                }}
              />

              {/* Extraction Controls Card */}
              <div className="p-6 rounded-3xl bg-card border border-border/80 space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label htmlFor="rangeInput" className="text-sm font-semibold text-foreground">
                      Pages to Extract
                    </label>
                    <span className="text-xs text-muted-foreground font-mono">
                      Document Range: 1 - {currentSplitDoc.pageCount}
                    </span>
                  </div>

                  <input
                    id="rangeInput"
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="e.g. 1-3, 5, 8-10"
                    className={`w-full px-4 py-2.5 text-sm rounded-xl bg-background border text-foreground focus:outline-none focus:ring-2 font-mono transition-colors ${
                      parsedRange.isValid
                        ? 'border-border/80 focus:ring-red-500/40'
                        : 'border-red-500/50 focus:ring-red-500/50 bg-red-500/5'
                    }`}
                  />

                  {/* Range syntax feedback banner */}
                  <div className="mt-2.5 flex items-start gap-2 text-xs">
                    {parsedRange.isValid ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircleIcon size={14} />
                        {parsedRange.summary}
                      </span>
                    ) : (
                      <span className="inline-flex items-start gap-1.5 text-red-600 dark:text-red-400 font-medium">
                        <AlertCircleIcon size={14} className="shrink-0 mt-0.5" />
                        {parsedRange.errors[0] || 'Please specify valid page numbers.'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Quick Presets
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplySplitPreset('all')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground transition-colors"
                    >
                      All Pages (1-{currentSplitDoc.pageCount})
                    </button>
                    {currentSplitDoc.pageCount > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApplySplitPreset('odd')}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground transition-colors"
                        >
                          Odd Pages
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplySplitPreset('even')}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground transition-colors"
                        >
                          Even Pages
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplySplitPreset('first-half')}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground transition-colors"
                        >
                          First Half (1-{Math.ceil(currentSplitDoc.pageCount / 2)})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplySplitPreset('second-half')}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground transition-colors"
                        >
                          Second Half
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Output Filename & Split Button */}
                <div className="pt-4 border-t border-border/80 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label htmlFor="splitFilename" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                      Output Filename
                    </label>
                    <input
                      id="splitFilename"
                      type="text"
                      value={splitCustomFilename}
                      onChange={(e) => setSplitCustomFilename(e.target.value)}
                      placeholder="extracted-document.pdf"
                      className="w-full px-3.5 py-2 text-sm rounded-xl bg-background border border-border/80 text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleExecuteSplit}
                      disabled={isSplitting || !parsedRange.isValid || parsedRange.pages.length === 0}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-red-600 hover:bg-red-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 dark:disabled:text-zinc-600 shadow-sm transition-all"
                    >
                      {isSplitting ? (
                        <>
                          <RefreshCwIcon size={16} className="animate-spin" />
                          <span>Extracting {parsedRange.pages.length} Pages...</span>
                        </>
                      ) : (
                        <>
                          <ScissorsIcon size={16} />
                          <span>Extract {parsedRange.pages.length} Pages</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Split Success Download Card */}
              {splitResult && (
                <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-foreground space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircleIcon size={22} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-base text-foreground">
                          Pages Successfully Extracted!
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Extracted {splitResult.pageCount} {splitResult.pageCount === 1 ? 'page' : 'pages'} into a new PDF • {splitResult.formattedSize}
                        </p>
                      </div>
                    </div>

                    <a
                      href={splitResult.objectUrl}
                      download={splitResult.downloadFilename}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all"
                    >
                      <DownloadIcon size={16} />
                      Download Extracted PDF
                    </a>
                  </div>

                  <div className="pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Generated file: <code className="font-mono text-foreground">{splitResult.downloadFilename}</code></span>
                    <a
                      href={splitResult.objectUrl}
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
        </div>
      )}

      {/* ========================================================= */}
      {/* Educational & Features Section */}
      {/* ========================================================= */}
      <div className="mt-16 pt-12 border-t border-border/80">
        <h2 className="text-xl font-bold text-foreground mb-6">
          Why Use ASAPTools for PDF Management?
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
              Your confidential documents, contracts, and financial PDFs never leave your device. All parsing, merging, and splitting execute locally in your browser memory.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <LayersIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              Exact Sequence Reordering
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Organize multiple documents with intuitive Move Up and Move Down controls. Every page is merged in the exact order you specify.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/80">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
              <ScissorsIcon size={20} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1.5">
              Flexible Page Range Syntax
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Isolate any combination of pages with syntax like <code className="font-mono text-xs">1-3, 5, 8-10</code> or use 1-click presets for odd, even, and document halves.
            </p>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="mt-12 space-y-4">
          <h3 className="text-lg font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h3>

          <div className="p-4 rounded-2xl bg-card border border-border/80">
            <h4 className="font-semibold text-sm text-foreground mb-1">
              Can I merge or split password-protected PDFs?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              For security reasons, password-protected (encrypted) PDFs cannot be read without their password. Please remove the password protection from the document before merging or splitting it in ASAPTools.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80">
            <h4 className="font-semibold text-sm text-foreground mb-1">
              Are there any page count or file size limits?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ASAPTools supports PDF files up to 100 MB each and documents with hundreds of pages. Because processing runs in your browser, performance depends on your device&apos;s available memory.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80">
            <h4 className="font-semibold text-sm text-foreground mb-1">
              How does the page range syntax work in Split mode?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You can specify single pages (e.g. <code className="font-mono">4</code>), continuous ranges (e.g. <code className="font-mono">1-5</code>), or a comma-separated combination (e.g. <code className="font-mono">1-3, 5, 8-10</code>). Duplicates are automatically filtered, and out-of-bounds page numbers are caught instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
