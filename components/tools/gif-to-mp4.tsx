'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  validateGifFile,
  validateVideoFile,
  buildGifToMp4Args,
  buildMp4ToGifArgs,
  validateMp4ToGifSegment,
  isLargeGifWarning,
  formatByteSize,
  GifToMp4Options,
  Mp4ToGifOptions,
  MAX_MP4_TO_GIF_SEGMENT_SECONDS,
} from '@/lib/media-converter-utils';
import {
  getMediaConverter,
  LoadProgress,
  ConvertProgress,
  MediaConversionResult,
} from '@/lib/media-converter';
import {
  FilmIcon,
  VideoIcon,
  UploadIcon,
  DownloadIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TrashIcon,
  ShieldIcon,
  ZapIcon,
  RotateCcwIcon,
  InfoIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

type ConversionMode = 'gif-to-mp4' | 'mp4-to-gif';

interface BackgroundPreset {
  id: string;
  label: string;
  value: string;
  description: string;
}

const BG_PRESETS: BackgroundPreset[] = [
  { id: 'white', label: 'Pure White', value: '#ffffff', description: 'Clean white background (ideal for light sites)' },
  { id: 'dark', label: 'Dark Slate', value: '#0f172a', description: 'Modern dark background (ideal for dark mode)' },
  { id: 'black', label: 'Pure Black', value: '#000000', description: 'OLED pure black background' },
  { id: 'custom', label: 'Custom Color', value: '#6366f1', description: 'Choose any custom hex or accent color' },
];

const FPS_OPTIONS: (10 | 15 | 20)[] = [10, 15, 20];
const WIDTH_OPTIONS: { value: 320 | 480 | 640; label: string; desc: string }[] = [
  { value: 320, label: '320 px', desc: 'Compact file size, fast load' },
  { value: 480, label: '480 px (Recommended)', desc: 'Balanced resolution and quality' },
  { value: 640, label: '640 px', desc: 'High definition, larger file' },
];

export function GifToMp4Tool() {
  const [mode, setMode] = useState<ConversionMode>('gif-to-mp4');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [sourceBuffer, setSourceBuffer] = useState<ArrayBuffer | null>(null);

  // Video metadata for MP4 input
  const [videoMeta, setVideoMeta] = useState<{ duration: number; width: number; height: number } | null>(null);

  // GIF -> MP4 options
  const [bgPreset, setBgPreset] = useState<string>('white');
  const [customColor, setCustomColor] = useState<string>('#ffffff');
  const [fpsCap, setFpsCap] = useState<number>(0);

  // MP4 -> GIF options
  const [gifFps, setGifFps] = useState<10 | 15 | 20>(15);
  const [gifWidth, setGifWidth] = useState<320 | 480 | 640>(480);
  const [enableTrim, setEnableTrim] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [segmentDuration, setSegmentDuration] = useState<number>(5);

  // Processing & Engine states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);
  const [convertProgress, setConvertProgress] = useState<ConvertProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<MediaConversionResult | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeResultUrlRef = useRef<string | null>(null);
  const activeSourceUrlRef = useRef<string | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Clean all active object URLs on unmount
  useEffect(() => {
    return () => {
      if (activeSourceUrlRef.current) URL.revokeObjectURL(activeSourceUrlRef.current);
      if (activeResultUrlRef.current) URL.revokeObjectURL(activeResultUrlRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const resetState = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (activeSourceUrlRef.current) {
      URL.revokeObjectURL(activeSourceUrlRef.current);
      activeSourceUrlRef.current = null;
    }
    if (activeResultUrlRef.current) {
      URL.revokeObjectURL(activeResultUrlRef.current);
      activeResultUrlRef.current = null;
    }
    setSelectedFile(null);
    setSourcePreviewUrl(null);
    setSourceBuffer(null);
    setVideoMeta(null);
    setResult(null);
    setErrorMessage(null);
    setIsProcessing(false);
    setLoadProgress(null);
    setConvertProgress(null);
    setEnableTrim(false);
    setStartTime(0);
    setSegmentDuration(5);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleModeChange = (newMode: ConversionMode) => {
    if (newMode === mode) return;
    resetState();
    setMode(newMode);
  };

  const handleFileSelect = async (file: File) => {
    if (mode === 'gif-to-mp4') {
      const validation = validateGifFile(file);
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid GIF file.');
        return;
      }
    } else {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'mp4') {
        setErrorMessage('Please select a valid .mp4 video file.');
        return;
      }
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid video file.');
        return;
      }
    }

    resetState();
    setSelectedFile(file);
    setErrorMessage(null);

    const objectUrl = URL.createObjectURL(file);
    activeSourceUrlRef.current = objectUrl;
    setSourcePreviewUrl(objectUrl);

    try {
      const buffer = await file.arrayBuffer();
      setSourceBuffer(buffer);
    } catch {
      setErrorMessage('Failed to read the selected file into memory.');
    }
  };

  // Inspect video metadata when loaded in MP4 -> GIF mode
  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration && !isNaN(video.duration)) {
      setVideoMeta({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });

      // If video duration exceeds 30 seconds, automatically enable segment trimming
      if (video.duration > MAX_MP4_TO_GIF_SEGMENT_SECONDS) {
        setEnableTrim(true);
        setStartTime(0);
        setSegmentDuration(10);
      } else {
        setSegmentDuration(Math.min(Math.round(video.duration * 10) / 10, 10));
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleConvert = async () => {
    if (!selectedFile || !sourceBuffer) return;

    // Validate MP4 -> GIF segment if trimming is enabled
    if (mode === 'mp4-to-gif' && enableTrim) {
      const segValidation = validateMp4ToGifSegment(startTime, segmentDuration, videoMeta?.duration);
      if (!segValidation.valid) {
        setErrorMessage(segValidation.error || 'Invalid segment parameters.');
        return;
      }
    }

    // Protect against non-trimmed videos longer than 30s in MP4 -> GIF mode
    if (mode === 'mp4-to-gif' && !enableTrim && videoMeta && videoMeta.duration > MAX_MP4_TO_GIF_SEGMENT_SECONDS) {
      setErrorMessage(
        `Video duration (${videoMeta.duration.toFixed(1)}s) exceeds the 30-second GIF limit. Please enable segment selection to choose a clip up to 30 seconds.`
      );
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setResult(null);
    setConvertProgress(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const converter = getMediaConverter();
    const bufferCopy = sourceBuffer.slice(0);

    try {
      if (mode === 'gif-to-mp4') {
        const chosenColor = bgPreset === 'custom' ? customColor : (BG_PRESETS.find((p) => p.id === bgPreset)?.value || '#ffffff');
        const options: GifToMp4Options = {
          backgroundColor: chosenColor,
          fps: fpsCap > 0 ? fpsCap : undefined,
        };

        const inputName = 'input.gif';
        const outputName = selectedFile.name.replace(/\.[^/.]+$/, '') + '.mp4';
        const args = buildGifToMp4Args(inputName, outputName, options);

        const res = await converter.convert({
          tool: 'gif-to-mp4',
          inputName,
          inputBuffer: bufferCopy,
          outputName,
          args,
          onLoadProgress: (lp) => setLoadProgress(lp),
          onConvertProgress: (cp) => setConvertProgress(cp),
          signal: abortController.signal,
        });

        activeResultUrlRef.current = res.blobUrl;
        setResult(res);
      } else {
        // MP4 -> GIF
        const options: Mp4ToGifOptions = {
          fps: gifFps,
          width: gifWidth,
          startTime: enableTrim ? startTime : undefined,
          duration: enableTrim ? segmentDuration : undefined,
        };

        const inputName = 'input.mp4';
        const outputName = selectedFile.name.replace(/\.[^/.]+$/, '') + '.gif';
        const args = buildMp4ToGifArgs(inputName, outputName, options);

        const res = await converter.convert({
          tool: 'mp4-to-gif',
          inputName,
          inputBuffer: bufferCopy,
          outputName,
          args,
          onLoadProgress: (lp) => setLoadProgress(lp),
          onConvertProgress: (cp) => setConvertProgress(cp),
          signal: abortController.signal,
        });

        activeResultUrlRef.current = res.blobUrl;
        setResult(res);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorMessage('Conversion was cancelled.');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'An error occurred during conversion.');
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
      setErrorMessage('Conversion cancelled by user.');
    }
  };

  const activeColor = bgPreset === 'custom' ? customColor : (BG_PRESETS.find((p) => p.id === bgPreset)?.value || '#ffffff');
  const sizeDiff = result && selectedFile ? selectedFile.size - result.size : 0;
  const savingsPercent = result && selectedFile && sizeDiff > 0 ? Math.round((sizeDiff / selectedFile.size) * 100) : 0;

  // Warning check for MP4 -> GIF
  const largeGifAdvisory =
    mode === 'mp4-to-gif'
      ? isLargeGifWarning(
          { fps: gifFps, width: gifWidth, duration: enableTrim ? segmentDuration : videoMeta?.duration },
          videoMeta?.duration
        )
      : { warning: false };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold">
          <FilmIcon size={14} />
          <span>Bi-Directional Media Converter</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          GIF ↔ MP4 Converter
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          Convert animated GIFs to MP4 videos or MP4 videos to GIFs.
          100% private in-browser WebAssembly processing with zero server uploads.
        </p>

        {/* Two-Way Mode Segmented Selector */}
        <div className="pt-2 flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 border border-border backdrop-blur-sm shadow-inner">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleModeChange('gif-to-mp4')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                mode === 'gif-to-mp4'
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground'
              } disabled:opacity-50`}
            >
              <FilmIcon size={16} />
              <span>GIF → MP4</span>
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleModeChange('mp4-to-gif')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                mode === 'mp4-to-gif'
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground'
              } disabled:opacity-50`}
            >
              <VideoIcon size={16} />
              <span>MP4 → GIF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & Options */}
        <div className="lg:col-span-7 space-y-6">
          {/* Upload Card */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-orange-500 bg-orange-500/5 scale-[1.01]'
                  : 'border-border bg-card hover:border-orange-500/40 hover:bg-card/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={mode === 'gif-to-mp4' ? '.gif,image/gif' : '.mp4,video/mp4'}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-4">
                <UploadIcon size={32} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
                {mode === 'gif-to-mp4' ? 'Upload an animated GIF' : 'Upload an MP4 video'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                {mode === 'gif-to-mp4'
                  ? 'Drag and drop your .gif file or click to browse'
                  : 'Drag and drop your .mp4 video or click to browse'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {mode === 'gif-to-mp4' ? 'Max 50 MB' : 'Max 100 MB'}
                </Badge>
                <Badge variant="outline" className="text-xs uppercase">
                  {mode === 'gif-to-mp4' ? '.gif' : '.mp4'}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl border border-border bg-card space-y-5">
              {/* File details bar */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    {mode === 'gif-to-mp4' ? <FilmIcon size={20} /> : <VideoIcon size={20} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{selectedFile.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatByteSize(selectedFile.size)}</span>
                      {videoMeta && (
                        <>
                          <span>•</span>
                          <span>{videoMeta.duration.toFixed(1)}s</span>
                          <span>•</span>
                          <span>{videoMeta.width}×{videoMeta.height}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetState}
                  disabled={isProcessing}
                  className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="Remove file"
                >
                  <TrashIcon size={18} />
                </button>
              </div>

              {/* Source Previews */}
              {sourcePreviewUrl && mode === 'gif-to-mp4' && (
                <div className="relative rounded-xl overflow-hidden border border-border bg-zinc-950/20 flex items-center justify-center max-h-64 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sourcePreviewUrl}
                    alt="Source GIF preview"
                    className="max-h-56 object-contain rounded-lg"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-900/80 text-white backdrop-blur-sm border border-white/10">
                      Original GIF
                    </span>
                  </div>
                </div>
              )}

              {sourcePreviewUrl && mode === 'mp4-to-gif' && (
                <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video flex items-center justify-center">
                  <video
                    ref={videoElementRef}
                    src={sourcePreviewUrl}
                    controls
                    playsInline
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-900/80 text-white backdrop-blur-sm border border-white/10">
                      Source Video
                    </span>
                  </div>
                </div>
              )}

              {/* MODE 1: GIF -> MP4 OPTIONS */}
              {mode === 'gif-to-mp4' && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground">Transparency Background</h4>
                    <div className="w-5 h-5 rounded border border-border" style={{ backgroundColor: activeColor }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    MP4 video does not support alpha transparency. Choose a background color for any transparent GIF areas:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BG_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setBgPreset(preset.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          bgPreset === preset.id
                            ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500'
                            : 'border-border bg-card/50 hover:border-border/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20"
                            style={{ backgroundColor: preset.id === 'custom' ? customColor : preset.value }}
                          />
                          <span className="text-xs font-semibold text-foreground">{preset.label}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                          {preset.description}
                        </p>
                      </button>
                    ))}
                  </div>

                  {bgPreset === 'custom' && (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/40">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        disabled={isProcessing}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-border p-0 bg-transparent"
                      />
                      <div className="flex-1">
                        <label htmlFor="custom-hex-color" className="text-xs font-semibold text-foreground block">
                          Hex Color Code
                        </label>
                        <input
                          id="custom-hex-color"
                          type="text"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          placeholder="#6366f1"
                          className="text-xs bg-transparent border-0 p-0 text-foreground font-mono focus:ring-0"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="fps-cap-select" className="text-xs font-semibold text-foreground">
                        Framerate (FPS)
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {fpsCap === 0 ? 'Preserve Original Timing' : `${fpsCap} FPS`}
                      </span>
                    </div>
                    <select
                      id="fps-cap-select"
                      value={fpsCap}
                      onChange={(e) => setFpsCap(Number(e.target.value))}
                      disabled={isProcessing}
                      className="w-full text-xs rounded-xl border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value={0}>Preserve Original Timing (Recommended)</option>
                      <option value={15}>15 FPS (Ultra-compact)</option>
                      <option value={24}>24 FPS (Cinematic standard)</option>
                      <option value={30}>30 FPS (Smooth web playback)</option>
                      <option value={60}>60 FPS (High framerate)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* MODE 2: MP4 -> GIF OPTIONS */}
              {mode === 'mp4-to-gif' && (
                <div className="space-y-4 pt-2">
                  {/* Framerate Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">
                        Output Frame Rate
                      </label>
                      <span className="text-xs font-semibold text-orange-500">{gifFps} FPS</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {FPS_OPTIONS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setGifFps(f)}
                          className={`py-2 px-3 rounded-xl border text-center transition-all ${
                            gifFps === f
                              ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500 text-foreground font-bold'
                              : 'border-border bg-card/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span className="text-xs">{f} FPS</span>
                          {f === 15 && <span className="block text-[9px] text-orange-500 font-normal">Optimal</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Width / Resolution Selection */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">
                        Output Resolution (Width)
                      </label>
                      <span className="text-xs text-muted-foreground">{gifWidth} px wide</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {WIDTH_OPTIONS.map((w) => (
                        <button
                          key={w.value}
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setGifWidth(w.value)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            gifWidth === w.value
                              ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500'
                              : 'border-border bg-card/50 hover:border-border/80'
                          }`}
                        >
                          <p className="text-xs font-bold text-foreground">{w.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{w.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Segment Trimming Options */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-foreground block">
                          Convert Video Segment
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Trim a specific portion of the video (max {MAX_MP4_TO_GIF_SEGMENT_SECONDS}s)
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={enableTrim}
                        onChange={(e) => setEnableTrim(e.target.checked)}
                        disabled={isProcessing}
                        className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
                      />
                    </div>

                    {enableTrim && (
                      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border">
                        <div>
                          <label htmlFor="segment-start-time" className="text-[11px] font-semibold text-foreground block mb-1">
                            Start Time (seconds)
                          </label>
                          <input
                            id="segment-start-time"
                            type="number"
                            min="0"
                            step="0.5"
                            max={videoMeta ? Math.max(videoMeta.duration - 1, 0) : 3600}
                            value={startTime}
                            onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                            disabled={isProcessing}
                            className="w-full text-xs rounded-lg border border-border bg-card px-2.5 py-1.5 text-foreground"
                          />
                        </div>
                        <div>
                          <label htmlFor="segment-duration-time" className="text-[11px] font-semibold text-foreground block mb-1">
                            Clip Duration (seconds)
                          </label>
                          <input
                            id="segment-duration-time"
                            type="number"
                            min="0.5"
                            step="0.5"
                            max={MAX_MP4_TO_GIF_SEGMENT_SECONDS}
                            value={segmentDuration}
                            onChange={(e) =>
                              setSegmentDuration(
                                Math.min(MAX_MP4_TO_GIF_SEGMENT_SECONDS, Math.max(0.5, parseFloat(e.target.value) || 1))
                              )
                            }
                            disabled={isProcessing}
                            className="w-full text-xs rounded-lg border border-border bg-card px-2.5 py-1.5 text-foreground"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Large GIF Advisory Warning */}
                  {largeGifAdvisory.warning && (
                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-700 dark:text-orange-300 flex items-start gap-2.5">
                      <InfoIcon size={16} className="shrink-0 mt-0.5 text-orange-500" />
                      <p className="leading-relaxed">{largeGifAdvisory.message}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action button */}
              <div className="pt-3">
                {!isProcessing ? (
                  <button
                    type="button"
                    onClick={handleConvert}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-orange-600 hover:bg-orange-500 text-white shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ZapIcon size={16} />
                    <span>{mode === 'gif-to-mp4' ? 'Convert GIF to MP4' : 'Convert MP4 to GIF'}</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {loadProgress?.stage === 'downloading'
                          ? `Downloading WASM core (${loadProgress.percent}%)`
                          : loadProgress?.stage === 'initializing'
                          ? 'Compiling WebAssembly engine...'
                          : convertProgress
                          ? `Generating ${mode === 'gif-to-mp4' ? 'video' : 'palette & GIF'} (${convertProgress.percent}%)`
                          : 'Processing frames...'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="text-red-500 hover:underline font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all duration-200 rounded-full"
                        style={{
                          width: `${
                            loadProgress?.stage === 'downloading'
                              ? loadProgress.percent
                              : convertProgress
                              ? convertProgress.percent
                              : 50
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircleIcon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Conversion Error</p>
                <p className="mt-0.5 text-xs opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Output & Details */}
        <div className="lg:col-span-5 space-y-6">
          {result ? (
            <div className="p-6 rounded-2xl border border-green-500/30 bg-card space-y-5 shadow-sm">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircleIcon size={20} />
                <h3 className="font-bold text-base">Conversion Complete!</h3>
              </div>

              {/* Output Preview: Video for MP4, Image for GIF */}
              {mode === 'gif-to-mp4' ? (
                <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video flex items-center justify-center">
                  <video
                    src={result.blobUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-border bg-zinc-950/20 flex items-center justify-center p-2 max-h-72">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.blobUrl}
                    alt="Converted animated GIF preview"
                    className="max-h-64 object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Stats & Comparison */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {mode === 'gif-to-mp4' ? 'Original GIF' : 'Source MP4'}
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {selectedFile ? formatByteSize(selectedFile.size) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {mode === 'gif-to-mp4' ? 'MP4 Video' : 'Generated GIF'}
                  </p>
                  <p className="text-sm font-bold text-foreground">{formatByteSize(result.size)}</p>
                </div>
                {mode === 'gif-to-mp4' && savingsPercent > 0 && (
                  <div className="col-span-2 pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Compression reduction:</span>
                    <Badge variant="success" className="text-xs">
                      {savingsPercent}% smaller
                    </Badge>
                  </div>
                )}
              </div>

              {/* Download Button */}
              <a
                href={result.blobUrl}
                download={result.outputName}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-green-600 hover:bg-green-500 text-white shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <DownloadIcon size={18} />
                <span>Download {mode === 'gif-to-mp4' ? 'MP4 Video' : 'Animated GIF'}</span>
              </a>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resetState}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcwIcon size={12} />
                  <span>Convert another file</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-border bg-card/60 space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <InfoIcon size={16} className="text-orange-500" />
                <span>{mode === 'gif-to-mp4' ? 'GIF to MP4 Benefits' : 'MP4 to GIF Features'}</span>
              </h3>
              <ul className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                {mode === 'gif-to-mp4' ? (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      <span>
                        <strong>Up to 90% smaller files:</strong> Animated GIFs store uncompressed frames. H.264 video drastically shrinks file sizes.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      <span>
                        <strong>Smooth hardware playback:</strong> Hardware-accelerated decoding prevents browser lag and device heating.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      <span>
                        <strong>Universal streaming:</strong> Includes <code>faststart</code> metadata so MP4 playback starts immediately.
                      </span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      <span>
                        <strong>Palettegen & Paletteuse:</strong> Builds a dynamic 256-color palette customized for your video rather than generic dithering.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      <span>
                        <strong>Segment Selection:</strong> Convert specific clips up to 30 seconds with custom start times and durations.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      <span>
                        <strong>Lanczos Rescaling:</strong> Preserves sharp edges and details when scaling down video resolutions.
                      </span>
                    </li>
                  </>
                )}
              </ul>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center gap-2 text-xs text-foreground font-semibold">
                  <ShieldIcon size={14} className="text-green-500" />
                  <span>100% Client-Side Privacy</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Conversion runs locally in your browser via FFmpeg WebAssembly. Your media files are never uploaded to any server.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="pt-8 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <div>
          <span>Related Media Tools: </span>
          <Link href="/tools/video-to-mp3" className="text-orange-500 hover:underline font-medium ml-1">
            Video to MP3
          </Link>
          <span className="mx-2">•</span>
          <Link href="/tools/audio-converter" className="text-orange-500 hover:underline font-medium">
            Audio Converter
          </Link>
        </div>
        <Link href="/tools" className="hover:text-foreground transition-colors">
          Browse all tools &rarr;
        </Link>
      </div>
    </div>
  );
}
