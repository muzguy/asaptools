'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  validateImageFile,
  validateDimensions,
  formatByteSize,
  formatResolution,
  generateOutputFilename,
  parseProgress,
  compositeImageWithBackground,
  createSamplePortraitImage,
  MODEL_OPTIONS,
  PRESET_BACKDROPS,
  ImageFileMeta,
  BackgroundRemovalModelKey,
  ProgressState,
} from '@/lib/ai-background-remover-utils';
import {
  ScissorsIcon,
  UploadIcon,
  DownloadIcon,
  RefreshCwIcon,
  TrashIcon,
  ShieldIcon,
  ZapIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SparklesIcon,
  LayersIcon,
  EyeIcon,
  SlidersIcon,
  LockIcon,
  ImageIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

interface BackgroundRemovalResult {
  blob: Blob;
  objectUrl: string;
  size: number;
  formattedSize: string;
  width: number;
  height: number;
  type: string;
  downloadFilename: string;
}

export function AIBackgroundRemover() {
  const [meta, setMeta] = useState<ImageFileMeta | null>(null);
  const [result, setResult] = useState<BackgroundRemovalResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressState, setProgressState] = useState<ProgressState>({
    stage: 'idle',
    percent: 0,
    label: 'Ready',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<BackgroundRemovalModelKey>('isnet_quint8');
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'side-by-side' | 'result' | 'original'>('slider');
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [selectedBackdrop, setSelectedBackdrop] = useState<string>('transparent');
  const [customColor, setCustomColor] = useState<string>('#2563eb');
  const [isCompositing, setIsCompositing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingSliderRef = useRef<boolean>(false);
  const activeMetaUrlRef = useRef<string | null>(null);
  const activeResultUrlRef = useRef<string | null>(null);
  const sessionIdRef = useRef<number>(0);

  // Clean all active object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (activeMetaUrlRef.current) URL.revokeObjectURL(activeMetaUrlRef.current);
      if (activeResultUrlRef.current) URL.revokeObjectURL(activeResultUrlRef.current);
    };
  }, []);

  // Reset entire tool state and cleanup resources
  const handleReset = useCallback(() => {
    sessionIdRef.current++;
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
    setWarningMessage(null);
    setIsProcessing(false);
    setProgressState({ stage: 'idle', percent: 0, label: 'Ready' });
    setSliderPosition(50);
  }, []);

  // Execute in-browser AI inference using dynamic lazy-loaded @imgly/background-removal
  const executeBackgroundRemoval = useCallback(
    async (targetMeta: ImageFileMeta, modelKey: BackgroundRemovalModelKey) => {
      const thisSessionId = ++sessionIdRef.current;
      setIsProcessing(true);
      setErrorMessage(null);
      setProgressState({
        stage: 'downloading',
        percent: 5,
        label: 'Initializing neural runtime...',
        detail: 'Connecting to model repository',
      });

      try {
        // Dynamically import the package only when processing starts (0 initial bundle bloat)
        const { removeBackground } = await import('@imgly/background-removal');

        if (thisSessionId !== sessionIdRef.current) return;

        const outputBlob = await removeBackground(targetMeta.file, {
          model: modelKey,
          output: {
            format: 'image/png',
            quality: 1.0,
          },
          progress: (key: string, current: number, total: number) => {
            if (thisSessionId !== sessionIdRef.current) return;
            const updated = parseProgress(key, current, total);
            setProgressState(updated);
          },
        });

        if (thisSessionId !== sessionIdRef.current) return;

        // Measure output dimensions to verify full-resolution preservation
        const outputObjectUrl = URL.createObjectURL(outputBlob);
        const img = new window.Image();

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to verify output image dimensions.'));
          img.src = outputObjectUrl;
        });

        const outputWidth = img.naturalWidth || img.width || targetMeta.width;
        const outputHeight = img.naturalHeight || img.height || targetMeta.height;

        // Cleanup old result URL
        if (activeResultUrlRef.current && activeResultUrlRef.current !== outputObjectUrl) {
          URL.revokeObjectURL(activeResultUrlRef.current);
        }
        activeResultUrlRef.current = outputObjectUrl;

        const downloadFilename = generateOutputFilename(targetMeta.name);

        setResult({
          blob: outputBlob,
          objectUrl: outputObjectUrl,
          size: outputBlob.size,
          formattedSize: formatByteSize(outputBlob.size),
          width: outputWidth,
          height: outputHeight,
          type: 'image/png',
          downloadFilename,
        });

        setProgressState({
          stage: 'complete',
          percent: 100,
          label: 'Background removed successfully!',
          detail: `Preserved full resolution: ${outputWidth} × ${outputHeight} px`,
        });
      } catch (err: unknown) {
        if (thisSessionId !== sessionIdRef.current) return;

        const error = err as Error;
        let userFriendlyMsg = 'Background removal failed. Please check your browser connection and retry.';

        if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          userFriendlyMsg =
            'Failed to download the AI model assets. Please check your internet connection or network filters and try again.';
        } else if (error.message?.includes('memory') || error.message?.includes('OutOfMemory') || error.message?.includes('RangeError')) {
          userFriendlyMsg =
            'Browser memory limit reached while segmenting this photo. Try using the Fast (Quantized) model or close high-memory background tabs.';
        } else if (error.message) {
          userFriendlyMsg = error.message;
        }

        setErrorMessage(userFriendlyMsg);
        setProgressState({
          stage: 'error',
          percent: 0,
          label: 'Processing encountered an error',
        });
      } finally {
        if (thisSessionId === sessionIdRef.current) {
          setIsProcessing(false);
        }
      }
    },
    []
  );

  // Process user-selected image file
  const handleFileProcess = useCallback(
    async (file: File) => {
      // 1. File validation
      const fileValidation = validateImageFile(file);
      if (!fileValidation.valid) {
        setErrorMessage(fileValidation.error || 'Invalid image file.');
        return;
      }

      setErrorMessage(null);
      setWarningMessage(null);

      // Clean existing state
      if (activeMetaUrlRef.current) {
        URL.revokeObjectURL(activeMetaUrlRef.current);
        activeMetaUrlRef.current = null;
      }
      if (activeResultUrlRef.current) {
        URL.revokeObjectURL(activeResultUrlRef.current);
        activeResultUrlRef.current = null;
      }
      setResult(null);

      const objectUrl = URL.createObjectURL(file);
      activeMetaUrlRef.current = objectUrl;

      // 2. Measure dimensions
      const img = new window.Image();
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        const dimValidation = validateDimensions(width, height);
        if (!dimValidation.valid) {
          setErrorMessage(dimValidation.error || 'Invalid dimensions.');
          URL.revokeObjectURL(objectUrl);
          activeMetaUrlRef.current = null;
          return;
        }

        if (dimValidation.warning) {
          setWarningMessage(dimValidation.warning);
        }

        const newMeta: ImageFileMeta = {
          file,
          name: file.name,
          size: file.size,
          formattedSize: formatByteSize(file.size),
          type: file.type || 'image/jpeg',
          width,
          height,
          aspectRatio: `${width}:${height}`,
          objectUrl,
        };

        setMeta(newMeta);
        // Start AI background removal
        executeBackgroundRemoval(newMeta, selectedModel);
      };

      img.onerror = () => {
        setErrorMessage('Failed to decode the selected image file. The file may be corrupted.');
        URL.revokeObjectURL(objectUrl);
        activeMetaUrlRef.current = null;
      };

      img.src = objectUrl;
    },
    [executeBackgroundRemoval, selectedModel]
  );

  // File input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  // Drag-and-drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  // Sample image loader
  const handleLoadSample = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const sampleFile = await createSamplePortraitImage();
      await handleFileProcess(sampleFile);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to generate sample image.');
      setIsProcessing(false);
    }
  };

  // Re-run with changed model
  const handleModelChange = (newModel: BackgroundRemovalModelKey) => {
    setSelectedModel(newModel);
    if (meta && !isProcessing) {
      executeBackgroundRemoval(meta, newModel);
    }
  };

  // Split slider interactive drag handling (Mouse and Touch)
  const updateSliderFromClientX = useCallback((clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setSliderPosition(Math.round(percentage));
  }, []);

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    isDraggingSliderRef.current = true;
    updateSliderFromClientX(e.clientX);
  };

  const handleSliderTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      isDraggingSliderRef.current = true;
      updateSliderFromClientX(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSliderRef.current) return;
      updateSliderFromClientX(e.clientX);
    };

    const handleMouseUp = () => {
      isDraggingSliderRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingSliderRef.current || !e.touches[0]) return;
      updateSliderFromClientX(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      isDraggingSliderRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [updateSliderFromClientX]);

  // Keyboard accessibility for before/after slider
  const handleSliderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + 5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPosition(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPosition(100);
    }
  };

  // Download Transparent PNG
  const handleDownloadTransparent = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.objectUrl;
    a.download = result.downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download with current selected backdrop color
  const handleDownloadBackdrop = async () => {
    if (!result || !meta) return;
    const backdrop = PRESET_BACKDROPS.find((b) => b.id === selectedBackdrop);
    const bgColor = selectedBackdrop === 'custom' ? customColor : backdrop?.color || '#ffffff';

    setIsCompositing(true);
    try {
      const compositedBlob = await compositeImageWithBackground(result.blob, bgColor);
      const url = URL.createObjectURL(compositedBlob);
      const cleanName = meta.name.replace(/\.[^/.]+$/, '');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanName}-backdrop.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to composite background.');
    } finally {
      setIsCompositing(false);
    }
  };

  // Determine active backdrop style
  const currentBackdropOption = PRESET_BACKDROPS.find((b) => b.id === selectedBackdrop);
  const activeBgStyle: React.CSSProperties =
    selectedBackdrop === 'transparent'
      ? {}
      : selectedBackdrop === 'custom'
      ? { backgroundColor: customColor }
      : { backgroundColor: currentBackdropOption?.color || 'transparent' };

  return (
    <div className="py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition-colors hover:underline underline-offset-4">
            Home
          </Link>
          <span aria-hidden="true" className="text-zinc-400">
            /
          </span>
          <Link href="/#categories" className="hover:text-foreground transition-colors hover:underline underline-offset-4">
            Image Utilities
          </Link>
          <span aria-hidden="true" className="text-zinc-400">
            /
          </span>
          <span className="text-foreground font-semibold" aria-current="page">
            AI Background Remover
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                <ScissorsIcon size={22} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                AI Background Remover
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Remove image backgrounds 100% privately in your browser using local AI neural networks. Zero server uploads, instant full-resolution transparent PNG downloads, and zero subscriptions.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="brand" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1.5 py-1">
              <ShieldIcon size={12} />
              100% Client-Side Privacy
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1 text-zinc-600 dark:text-zinc-300">
              <ZapIcon size={12} className="text-amber-500" />
              WebAssembly & WebGPU
            </Badge>
          </div>
        </div>

        {/* Global Warnings & Error Alerts */}
        {errorMessage && (
          <div role="alert" className="mt-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 flex items-start gap-3 text-xs sm:text-sm">
            <AlertCircleIcon size={18} className="shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold">Processing Notice</p>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
            {meta && !isProcessing && (
              <button
                type="button"
                onClick={() => executeBackgroundRemoval(meta, selectedModel)}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <RefreshCwIcon size={12} />
                Retry
              </button>
            )}
          </div>
        )}

        {warningMessage && (
          <div role="status" className="mt-4 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 flex items-start gap-2.5 text-xs">
            <AlertCircleIcon size={16} className="shrink-0 text-amber-500 mt-0.5" />
            <p className="leading-relaxed">{warningMessage}</p>
          </div>
        )}

        {/* Main Workspace Area */}
        <div className="mt-8 space-y-8">
          {/* State 1: Upload Dropzone (When no image is loaded) */}
          {!meta && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition-all cursor-pointer group ${
                isDragging
                  ? 'border-orange-500 bg-orange-500/5 shadow-xl scale-[0.99]'
                  : 'border-border/80 hover:border-orange-500/50 bg-card hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 shadow-xs'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInputChange}
                className="hidden"
                aria-label="Upload image for AI background removal"
              />

              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto border border-orange-500/20 group-hover:scale-105 transition-transform shadow-xs">
                  <UploadIcon size={28} />
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-bold text-lg text-foreground">
                    Drop your image here, or <span className="text-orange-600 dark:text-orange-400 underline decoration-orange-500/30">browse</span>
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Supports JPG, PNG, and WebP up to 25 MB.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                  <span className="inline-flex items-center gap-1">
                    <ShieldIcon size={13} className="text-emerald-500" />
                    100% Private in Browser
                  </span>
                  <span>•</span>
                  <span>No Server Uploads</span>
                  <span>•</span>
                  <span>Full Resolution Output</span>
                </div>

                {/* 1-Click Sample Image Tester */}
                <div className="pt-4 border-t border-border/60">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSample();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground border border-border transition-all"
                  >
                    <SparklesIcon size={14} className="text-orange-500" />
                    Try with a sample image
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* State 2: Image Loaded & Working Area */}
          {meta && (
            <div className="space-y-6">
              {/* Top Controls Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs">
                {/* Image Meta Chip */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                    <ImageIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs" title={meta.name}>
                      {meta.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {formatResolution(meta.width, meta.height)} • {meta.formattedSize}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground border border-border transition-colors disabled:opacity-50"
                  >
                    <UploadIcon size={13} />
                    Replace Image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleInputChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors disabled:opacity-50"
                  >
                    <TrashIcon size={13} />
                    Clear
                  </button>
                </div>
              </div>

              {/* Progress & Processing Indicator */}
              {isProcessing && (
                <div className="p-6 rounded-2xl border border-orange-500/30 bg-orange-500/5 space-y-4">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <RefreshCwIcon size={16} className="text-orange-500 animate-spin" />
                      <span className="font-semibold text-foreground">{progressState.label}</span>
                    </div>
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                      {progressState.percent}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 rounded-full transition-all duration-300"
                      style={{ width: `${progressState.percent}%` }}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted-foreground gap-1">
                    <span>
                      {progressState.detail || 'Neural inference executing in local WebAssembly runtime.'}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Model files are cached locally for future instant runs.
                    </span>
                  </div>
                </div>
              )}

              {/* Model Quality Selector */}
              <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersIcon size={15} className="text-orange-500" />
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Neural Network Model
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Model: <strong className="text-foreground">{MODEL_OPTIONS.find((m) => m.key === selectedModel)?.name}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {MODEL_OPTIONS.map((opt) => {
                    const isSelected = selectedModel === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleModelChange(opt.key)}
                        disabled={isProcessing}
                        className={`p-3.5 rounded-xl border text-left transition-all relative ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500/30'
                            : 'border-border/80 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40'
                        } disabled:opacity-60`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-xs text-foreground">{opt.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {opt.sizeLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {opt.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Result & Preview Area */}
              {result && (
                <div className="space-y-6">
                  {/* View Mode & Backdrop Controls */}
                  <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* View Modes */}
                    <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-border text-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => setComparisonMode('slider')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                          comparisonMode === 'slider'
                            ? 'bg-card text-foreground shadow-2xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <SlidersIcon size={12} />
                        Split Slider
                      </button>
                      <button
                        type="button"
                        onClick={() => setComparisonMode('side-by-side')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                          comparisonMode === 'side-by-side'
                            ? 'bg-card text-foreground shadow-2xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <LayersIcon size={12} />
                        Side-by-Side
                      </button>
                      <button
                        type="button"
                        onClick={() => setComparisonMode('result')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                          comparisonMode === 'result'
                            ? 'bg-card text-foreground shadow-2xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <EyeIcon size={12} />
                        Cutout Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setComparisonMode('original')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                          comparisonMode === 'original'
                            ? 'bg-card text-foreground shadow-2xs font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Original Only
                      </button>
                    </div>

                    {/* Backdrop Selector Swatches */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                        Backdrop:
                      </span>
                      {PRESET_BACKDROPS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBackdrop(b.id)}
                          title={b.name}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                            selectedBackdrop === b.id
                              ? 'ring-2 ring-orange-500 scale-105 border-transparent shadow-xs'
                              : 'border-border hover:scale-105'
                          } ${b.type === 'transparent' ? 'bg-checkerboard' : ''}`}
                          style={b.type === 'solid' ? { backgroundColor: b.color } : {}}
                          aria-label={`Preview with ${b.name}`}
                        >
                          {selectedBackdrop === b.id && b.type !== 'transparent' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                          )}
                        </button>
                      ))}

                      {/* Custom Color Picker Swatch */}
                      <label
                        title="Pick custom color"
                        className={`relative w-7 h-7 rounded-lg border border-border cursor-pointer flex items-center justify-center overflow-hidden transition-all hover:scale-105 ${
                          selectedBackdrop === 'custom' ? 'ring-2 ring-orange-500' : ''
                        }`}
                        style={{ backgroundColor: customColor }}
                      >
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => {
                            setCustomColor(e.target.value);
                            setSelectedBackdrop('custom');
                          }}
                          className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                          aria-label="Pick custom background color"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Interactive Visual Preview Display */}
                  <div className="relative rounded-3xl border border-border bg-card shadow-sm overflow-hidden p-2 sm:p-4">
                    {/* Mode 1: Split Slider View */}
                    {comparisonMode === 'slider' && (
                      <div
                        ref={sliderContainerRef}
                        onMouseDown={handleSliderMouseDown}
                        onTouchStart={handleSliderTouchStart}
                        onKeyDown={handleSliderKeyDown}
                        role="slider"
                        aria-label="Before and after background removal comparison slider"
                        aria-valuenow={sliderPosition}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        tabIndex={0}
                        className="relative w-full max-h-[640px] flex items-center justify-center select-none cursor-ew-resize overflow-hidden rounded-2xl bg-zinc-950/20 outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                        style={{ aspectRatio: `${meta.width} / ${meta.height}` }}
                      >
                        {/* Layer 1 (Underneath): AI Cutout with Selected Backdrop */}
                        <div
                          className={`absolute inset-0 w-full h-full flex items-center justify-center ${
                            selectedBackdrop === 'transparent' ? 'bg-checkerboard' : ''
                          }`}
                          style={activeBgStyle}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={result.objectUrl}
                            alt="AI background removed cutout result"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Layer 2 (Clipped on Left): Original Image */}
                        <div
                          className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
                          style={{
                            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={meta.objectUrl}
                            alt="Original uploaded photo"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Slider Divider Bar */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl pointer-events-none z-10"
                          style={{ left: `${sliderPosition}%` }}
                        >
                          {/* Draggable Circle Knob */}
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-zinc-900 shadow-xl flex items-center justify-center border-2 border-orange-500 font-bold text-xs">
                            ↔
                          </div>
                        </div>

                        {/* Floating Labels */}
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold pointer-events-none z-20">
                          Original
                        </div>
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold pointer-events-none z-20">
                          AI Cutout
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Side-by-Side View */}
                    {comparisonMode === 'side-by-side' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                            <span>Original Image</span>
                            <span className="font-mono">{formatResolution(meta.width, meta.height)}</span>
                          </div>
                          <div className="rounded-2xl border border-border bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center p-2 max-h-[500px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={meta.objectUrl}
                              alt="Original image"
                              className="max-w-full max-h-[480px] object-contain rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                            <span className="text-orange-600 dark:text-orange-400">AI Background Removed</span>
                            <span className="font-mono">{formatResolution(result.width, result.height)}</span>
                          </div>
                          <div
                            className={`rounded-2xl border border-border overflow-hidden flex items-center justify-center p-2 max-h-[500px] ${
                              selectedBackdrop === 'transparent' ? 'bg-checkerboard' : ''
                            }`}
                            style={activeBgStyle}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={result.objectUrl}
                              alt="AI background removed"
                              className="max-w-full max-h-[480px] object-contain rounded-xl"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mode 3: Cutout Only View */}
                    {comparisonMode === 'result' && (
                      <div
                        className={`rounded-2xl border border-border overflow-hidden flex items-center justify-center p-4 min-h-[380px] max-h-[640px] ${
                          selectedBackdrop === 'transparent' ? 'bg-checkerboard' : ''
                        }`}
                        style={activeBgStyle}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.objectUrl}
                          alt="AI background removed cutout"
                          className="max-w-full max-h-[600px] object-contain rounded-xl"
                        />
                      </div>
                    )}

                    {/* Mode 4: Original Only View */}
                    {comparisonMode === 'original' && (
                      <div className="rounded-2xl border border-border bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center p-4 min-h-[380px] max-h-[640px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={meta.objectUrl}
                          alt="Original uploaded photo"
                          className="max-w-full max-h-[600px] object-contain rounded-xl"
                        />
                      </div>
                    )}
                  </div>

                  {/* Export & Download Action Bar */}
                  <div className="p-6 rounded-3xl border border-border bg-card shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                    {/* Resolution & File Meta */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon size={16} className="text-emerald-500 shrink-0" />
                        <h4 className="font-bold text-sm text-foreground">
                          Ready for High-Resolution Export
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Output: <strong className="text-foreground">{formatResolution(result.width, result.height)}</strong> • Lossless Transparent PNG ({result.formattedSize})
                      </p>
                    </div>

                    {/* Download Buttons */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {selectedBackdrop !== 'transparent' && (
                        <button
                          type="button"
                          onClick={handleDownloadBackdrop}
                          disabled={isCompositing}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground border border-border transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <DownloadIcon size={14} />
                          {isCompositing ? 'Compositing...' : 'Download with Backdrop'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleDownloadTransparent}
                        className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
                      >
                        <DownloadIcon size={16} />
                        Download Transparent PNG
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Informational & Educational Sections */}
        <div className="mt-16 pt-12 border-t border-border space-y-16">
          {/* How It Works */}
          <section className="space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                How ASAP AI Background Removal Works
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Three effortless steps to isolate any subject with zero external server dependencies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-sm border border-orange-500/20">
                  1
                </div>
                <h3 className="font-semibold text-sm text-foreground">Upload Your Photo</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Drag and drop any JPG, PNG, or WebP photo up to 25 MB. Your file remains strictly on your device inside browser memory.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-sm border border-orange-500/20">
                  2
                </div>
                <h3 className="font-semibold text-sm text-foreground">Local Neural Segmentation</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Our WebAssembly neural engine calculates pixel-perfect alpha mattes using Dichotomous Image Segmentation (ISNet) models.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-sm border border-orange-500/20">
                  3
                </div>
                <h3 className="font-semibold text-sm text-foreground">Export Full-Resolution PNG</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Compare with before/after split sliders, preview on custom color backdrops, and download crisp transparent PNGs instantly.
                </p>
              </div>
            </div>
          </section>

          {/* Privacy Guarantee & Technical Specs */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <LockIcon size={20} />
              </div>
              <h3 className="text-base font-bold text-foreground">
                100% Client-Side Privacy Guarantee
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Unlike commercial background removal APIs that silently upload your personal photos to remote cloud servers, ASAPTools executes the neural network entirely inside your browser tab via WebAssembly and WebGPU. Your photos never leave your device.
              </p>
              <ul className="text-xs text-muted-foreground space-y-2 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon size={14} className="text-emerald-500" />
                  <span>Zero server-side image transfers or storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon size={14} className="text-emerald-500" />
                  <span>No account creation, API tokens, or credit cards</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon size={14} className="text-emerald-500" />
                  <span>Works safely with confidential documents & personal portraits</span>
                </li>
              </ul>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                <ZapIcon size={20} />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Technical Specifications & Architecture
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Powered by state-of-the-art open-source ISNet (DIS) models and optimized ONNX runtime bindings for modern browsers.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-border/80">
                  <span className="block text-[11px] text-muted-foreground">Model Architecture</span>
                  <strong className="text-foreground font-mono">ISNet / DIS</strong>
                </div>
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-border/80">
                  <span className="block text-[11px] text-muted-foreground">Execution Engine</span>
                  <strong className="text-foreground font-mono">ONNX WebAssembly</strong>
                </div>
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-border/80">
                  <span className="block text-[11px] text-muted-foreground">Hardware Acceleration</span>
                  <strong className="text-foreground font-mono">WebGPU / SIMD</strong>
                </div>
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-border/80">
                  <span className="block text-[11px] text-muted-foreground">Output Format</span>
                  <strong className="text-foreground font-mono">Lossless PNG</strong>
                </div>
              </div>
            </div>
          </section>

          {/* Frequently Asked Questions */}
          <section className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center">
              Frequently Asked Questions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
                <h3 className="font-semibold text-sm text-foreground">
                  Is there any limit on how many images I can process?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No. Because computation runs entirely on your local computer or phone hardware, there are no artificial credits, paywalls, or daily limits.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
                <h3 className="font-semibold text-sm text-foreground">
                  Does it reduce my image&apos;s resolution?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No. The neural segmentation alpha mask is bilinearly upsampled to match the exact original dimensions of your source file, preserving original pixel resolution.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
                <h3 className="font-semibold text-sm text-foreground">
                  Does the tool work offline?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The first run downloads the AI model weights (~42 MB for Fast mode). Once loaded, the model is cached in browser storage, so subsequent removals do not re-download weights.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
                <h3 className="font-semibold text-sm text-foreground">
                  Which image formats are supported?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Standard JPG, JPEG, PNG, and WebP images up to 25 MB are fully supported. Results are exported as high-fidelity transparent PNG files.
                </p>
              </div>
            </div>
          </section>

          {/* Related Tools */}
          <section className="p-6 rounded-3xl border border-border bg-zinc-50/50 dark:bg-zinc-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-foreground">Need other image transformations?</h3>
              <p className="text-xs text-muted-foreground">Explore our complete suite of browser-based image utilities.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/tools/image-compressor"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground border border-border transition-colors"
              >
                Image Compressor →
              </Link>
              <Link
                href="/tools/image-resizer"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground border border-border transition-colors"
              >
                Image Resizer →
              </Link>
              <Link
                href="/tools/image-converter"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground border border-border transition-colors"
              >
                Format Converter →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
