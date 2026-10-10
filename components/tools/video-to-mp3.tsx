'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  validateVideoFile,
  buildVideoToMp3Args,
  formatByteSize,
  AudioBitrate,
  AUDIO_BITRATE_OPTIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
} from '@/lib/media-converter-utils';
import {
  getMediaConverter,
  LoadProgress,
  ConvertProgress,
  MediaConversionResult,
} from '@/lib/media-converter';
import {
  MusicIcon,
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

export function VideoToMp3Tool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [sourceBuffer, setSourceBuffer] = useState<ArrayBuffer | null>(null);

  // Conversion options
  const [bitrate, setBitrate] = useState<AudioBitrate>('192k');

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
  const activeVideoUrlRef = useRef<string | null>(null);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      if (activeVideoUrlRef.current) URL.revokeObjectURL(activeVideoUrlRef.current);
      if (activeResultUrlRef.current) URL.revokeObjectURL(activeResultUrlRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const resetState = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (activeVideoUrlRef.current) {
      URL.revokeObjectURL(activeVideoUrlRef.current);
      activeVideoUrlRef.current = null;
    }
    if (activeResultUrlRef.current) {
      URL.revokeObjectURL(activeResultUrlRef.current);
      activeResultUrlRef.current = null;
    }
    setSelectedFile(null);
    setVideoPreviewUrl(null);
    setSourceBuffer(null);
    setResult(null);
    setErrorMessage(null);
    setIsProcessing(false);
    setLoadProgress(null);
    setConvertProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFileSelect = async (file: File) => {
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file.');
      return;
    }

    resetState();
    setSelectedFile(file);
    setErrorMessage(null);

    const objectUrl = URL.createObjectURL(file);
    activeVideoUrlRef.current = objectUrl;
    setVideoPreviewUrl(objectUrl);

    try {
      const buffer = await file.arrayBuffer();
      setSourceBuffer(buffer);
    } catch {
      setErrorMessage('Failed to read the video file into memory.');
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

  const handleExtractAudio = async () => {
    if (!selectedFile || !sourceBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setResult(null);
    setConvertProgress(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const inputName = 'input_video.' + (selectedFile.name.split('.').pop() || 'mp4');
    const outputName = selectedFile.name.replace(/\.[^/.]+$/, '') + '.mp3';
    const args = buildVideoToMp3Args(inputName, outputName, { bitrate });

    try {
      const converter = getMediaConverter();
      // Clone buffer because postMessage transfers the buffer
      const bufferCopy = sourceBuffer.slice(0);

      const res = await converter.convert({
        tool: 'video-to-mp3',
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
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorMessage('Audio extraction was cancelled.');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'An error occurred during audio extraction.');
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
      setErrorMessage('Extraction cancelled by user.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold">
          <MusicIcon size={14} />
          <span>High-Fidelity LAME MP3 Audio</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Video to MP3 Converter
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          Extract pristine audio tracks from MP4, WebM, MOV, and MKV videos directly into genuine MP3 files.
          Processed 100% locally in your browser with zero server uploads.
        </p>
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
                accept="video/*,.mp4,.webm,.mov,.mkv,.avi,.flv,.wmv,.m4v"
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
                Upload a video from your device
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Drag and drop MP4, WebM, MOV, or MKV video files
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {SUPPORTED_VIDEO_EXTENSIONS.slice(0, 5).map((ext) => (
                  <Badge key={ext} variant="outline" className="text-[11px] uppercase">
                    .{ext}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-[11px]">
                  Max 100 MB
                </Badge>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl border border-border bg-card space-y-5">
              {/* File details bar */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <VideoIcon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatByteSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetState}
                  disabled={isProcessing}
                  className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="Remove video"
                >
                  <TrashIcon size={18} />
                </button>
              </div>

              {/* Video Player Preview (if supported container) */}
              {videoPreviewUrl && (
                <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video flex items-center justify-center">
                  <video
                    src={videoPreviewUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-900/80 text-white backdrop-blur-sm border border-white/10">
                      Input Video
                    </span>
                  </div>
                </div>
              )}

              {/* Bitrate Options */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">Audio Bitrate Quality</h4>
                  <span className="text-xs font-semibold text-orange-500">{bitrate}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select the target MP3 encoding bitrate. Higher bitrates preserve richer sound details:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AUDIO_BITRATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setBitrate(opt.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        bitrate === opt.value
                          ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500'
                          : 'border-border bg-card/50 hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground">{opt.label}</span>
                        {opt.value === '192k' && (
                          <Badge variant="brand" className="text-[10px] py-0">
                            Recommended
                          </Badge>
                        )}
                        {opt.value === '320k' && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            Studio
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Action button */}
                <div className="pt-3">
                  {!isProcessing ? (
                    <button
                      type="button"
                      onClick={handleExtractAudio}
                      className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-orange-600 hover:bg-orange-500 text-white shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ZapIcon size={16} />
                      <span>Extract & Encode MP3</span>
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
                            ? `Encoding MP3 (${convertProgress.percent}%)`
                            : 'Demuxing audio stream...'}
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
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircleIcon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Audio Extraction Error</p>
                <p className="mt-0.5 text-xs opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Output & Audio Player */}
        <div className="lg:col-span-5 space-y-6">
          {result ? (
            <div className="p-6 rounded-2xl border border-green-500/30 bg-card space-y-5 shadow-sm">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircleIcon size={20} />
                <h3 className="font-bold text-base">MP3 Extracted Successfully!</h3>
              </div>

              {/* Native Audio Player Preview */}
              <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground truncate max-w-[200px]">
                    {result.outputName}
                  </span>
                  <Badge variant="brand" className="text-[10px]">
                    {bitrate} MP3
                  </Badge>
                </div>
                <audio src={result.blobUrl} controls className="w-full outline-none" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Original Video
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {selectedFile ? formatByteSize(selectedFile.size) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Extracted MP3
                  </p>
                  <p className="text-sm font-bold text-foreground">{formatByteSize(result.size)}</p>
                </div>
              </div>

              {/* Download Button */}
              <a
                href={result.blobUrl}
                download={result.outputName}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-green-600 hover:bg-green-500 text-white shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <DownloadIcon size={18} />
                <span>Download MP3 Audio</span>
              </a>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resetState}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcwIcon size={12} />
                  <span>Convert another video</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-border bg-card/60 space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <InfoIcon size={16} className="text-orange-500" />
                <span>Audio Extraction Details</span>
              </h3>
              <ul className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>
                    <strong>Genuine MP3 Encoding:</strong> Uses industry-standard LAME MP3 codec inside WebAssembly rather than merely renaming file extensions.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>
                    <strong>Smart Audio Detection:</strong> Automatically validates the input stream. Videos recorded without audio tracks are identified with clear explanations.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>
                    <strong>File Uploads Only:</strong> For security and copyright compliance, this tool only processes files from your local storage. It does not accept third-party social media URLs.
                  </span>
                </li>
              </ul>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center gap-2 text-xs text-foreground font-semibold">
                  <ShieldIcon size={14} className="text-green-500" />
                  <span>100% Client-Side Privacy</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Your video is decoded entirely inside your browser. No video frames or audio data are ever uploaded to any server.
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
          <Link href="/tools/gif-to-mp4" className="text-orange-500 hover:underline font-medium ml-1">
            GIF to MP4
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
