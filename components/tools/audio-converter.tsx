'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  validateAudioFile,
  buildAudioConverterArgs,
  formatByteSize,
  SupportedAudioFormat,
  AudioBitrate,
  AudioSampleRate,
  AUDIO_FORMAT_CONFIGS,
  AUDIO_BITRATE_OPTIONS,
  AUDIO_SAMPLE_RATE_OPTIONS,
  SUPPORTED_AUDIO_INPUT_EXTENSIONS,
  getAudioQualityNotice,
} from '@/lib/media-converter-utils';
import {
  getMediaConverter,
  LoadProgress,
  ConvertProgress,
  MediaConversionResult,
} from '@/lib/media-converter';
import {
  VolumeIcon,
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

export function AudioConverterTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [sourceBuffer, setSourceBuffer] = useState<ArrayBuffer | null>(null);

  // Conversion options
  const [targetFormat, setTargetFormat] = useState<SupportedAudioFormat>('mp3');
  const [bitrate, setBitrate] = useState<AudioBitrate>('192k');
  const [sampleRate, setSampleRate] = useState<AudioSampleRate>('original');

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

  // Revoke object URLs on unmount
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
    setAudioPreviewUrl(null);
    setSourceBuffer(null);
    setResult(null);
    setErrorMessage(null);
    setIsProcessing(false);
    setLoadProgress(null);
    setConvertProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFileSelect = async (file: File) => {
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid audio file.');
      return;
    }

    resetState();
    setSelectedFile(file);
    setErrorMessage(null);

    const sourceExt = file.name.split('.').pop()?.toLowerCase();
    // Default to MP3 unless input is already MP3, then default to WAV
    if (sourceExt === 'mp3') {
      setTargetFormat('wav');
    } else {
      setTargetFormat('mp3');
    }

    const objectUrl = URL.createObjectURL(file);
    activeSourceUrlRef.current = objectUrl;
    setAudioPreviewUrl(objectUrl);

    try {
      const buffer = await file.arrayBuffer();
      setSourceBuffer(buffer);
    } catch {
      setErrorMessage('Failed to read the audio file into memory.');
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

  const handleConvertAudio = async () => {
    if (!selectedFile || !sourceBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setResult(null);
    setConvertProgress(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const sourceExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'audio';
    const inputName = `input_${Date.now()}.${sourceExt}`;
    const outputName = selectedFile.name.replace(/\.[^/.]+$/, '') + `.${targetFormat}`;

    const args = buildAudioConverterArgs(inputName, outputName, {
      targetFormat,
      bitrate,
      sampleRate,
    });

    try {
      const converter = getMediaConverter();
      // Clone buffer because postMessage transfers the buffer
      const bufferCopy = sourceBuffer.slice(0);

      const res = await converter.convert({
        tool: 'audio-converter',
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
        setErrorMessage('Audio conversion was cancelled.');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'An error occurred during audio conversion.');
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

  const sourceExt = selectedFile ? selectedFile.name.split('.').pop() || '' : '';
  const currentFormatMeta = AUDIO_FORMAT_CONFIGS[targetFormat];
  const qualityNotice = selectedFile ? getAudioQualityNotice(sourceExt, targetFormat) : null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold">
          <VolumeIcon size={14} />
          <span>Multi-Format Audio Transcoder</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Audio Format Converter
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          Convert audio between MP3, WAV, AAC/M4A, OGG, and FLAC formats with genuine decoding and encoding.
          Fully private, in-browser WebAssembly processing.
        </p>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & Configuration */}
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
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.wma,.opus,.aiff"
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
                Upload audio file
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Drag and drop MP3, WAV, OGG, M4A, or FLAC audio files
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {SUPPORTED_AUDIO_INPUT_EXTENSIONS.slice(0, 6).map((ext) => (
                  <Badge key={ext} variant="outline" className="text-[11px] uppercase">
                    .{ext}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-[11px]">
                  Max 75 MB
                </Badge>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl border border-border bg-card space-y-5">
              {/* File details bar */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <VolumeIcon size={20} />
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
                  title="Remove audio"
                >
                  <TrashIcon size={18} />
                </button>
              </div>

              {/* Source Audio Player Preview */}
              {audioPreviewUrl && (
                <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Original Audio</span>
                    <span className="uppercase text-[11px] font-bold tracking-wider">{sourceExt}</span>
                  </div>
                  <audio src={audioPreviewUrl} controls className="w-full outline-none" />
                </div>
              )}

              {/* Target Format Selector */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">Target Format</h4>
                  <Badge variant="brand" className="text-xs uppercase">
                    {targetFormat}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(AUDIO_FORMAT_CONFIGS) as SupportedAudioFormat[]).map((fmt) => {
                    const cfg = AUDIO_FORMAT_CONFIGS[fmt];
                    const isSelected = targetFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setTargetFormat(fmt)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500'
                            : 'border-border bg-card/50 hover:border-border/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold uppercase text-foreground">{cfg.extension}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                              cfg.isLossless
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {cfg.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                          {cfg.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bitrate Options (for lossy formats) */}
              {currentFormatMeta.supportsBitrate && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label htmlFor="bitrate-select" className="text-xs font-semibold text-foreground">
                      Bitrate Quality
                    </label>
                    <span className="text-xs text-orange-500 font-semibold">{bitrate}</span>
                  </div>
                  <select
                    id="bitrate-select"
                    value={bitrate}
                    onChange={(e) => setBitrate(e.target.value as AudioBitrate)}
                    disabled={isProcessing}
                    className="w-full text-xs rounded-xl border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {AUDIO_BITRATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sample Rate Options */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <label htmlFor="sample-rate-select" className="text-xs font-semibold text-foreground">
                    Sample Rate
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {AUDIO_SAMPLE_RATE_OPTIONS.find((s) => s.value === sampleRate)?.label}
                  </span>
                </div>
                <select
                  id="sample-rate-select"
                  value={sampleRate}
                  onChange={(e) => setSampleRate(e.target.value as AudioSampleRate)}
                  disabled={isProcessing}
                  className="w-full text-xs rounded-xl border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {AUDIO_SAMPLE_RATE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quality Educational Advisory */}
              {qualityNotice && (
                <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-xs text-orange-700 dark:text-orange-300 flex items-start gap-2.5">
                  <InfoIcon size={16} className="shrink-0 mt-0.5 text-orange-500" />
                  <p className="leading-relaxed">{qualityNotice}</p>
                </div>
              )}

              {/* Action button */}
              <div className="pt-2">
                {!isProcessing ? (
                  <button
                    type="button"
                    onClick={handleConvertAudio}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-orange-600 hover:bg-orange-500 text-white shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ZapIcon size={16} />
                    <span>Convert to {targetFormat.toUpperCase()}</span>
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
                          ? `Transcoding audio (${convertProgress.percent}%)`
                          : 'Processing audio stream...'}
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

        {/* Right Column: Output & Converted Audio Player */}
        <div className="lg:col-span-5 space-y-6">
          {result ? (
            <div className="p-6 rounded-2xl border border-green-500/30 bg-card space-y-5 shadow-sm">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircleIcon size={20} />
                <h3 className="font-bold text-base">Converted Successfully!</h3>
              </div>

              {/* Converted Audio Player Preview */}
              <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground truncate max-w-[200px]">
                    {result.outputName}
                  </span>
                  <Badge variant="brand" className="text-[10px] uppercase">
                    {targetFormat}
                  </Badge>
                </div>
                <audio src={result.blobUrl} controls className="w-full outline-none" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Original File
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {selectedFile ? formatByteSize(selectedFile.size) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Converted File
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
                <span>Download {targetFormat.toUpperCase()} Audio</span>
              </a>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resetState}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcwIcon size={12} />
                  <span>Convert another audio file</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-border bg-card/60 space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <InfoIcon size={16} className="text-orange-500" />
                <span>Supported Audio Encoders</span>
              </h3>
              <ul className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>
                    <strong>MP3 (LAME):</strong> Ubiquitous lossy audio format with customizable bitrates (128k to 320k).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>
                    <strong>WAV (PCM 16-bit):</strong> Uncompressed studio-grade audio suitable for DAW editing and master archives.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>
                    <strong>AAC / M4A:</strong> Modern high-fidelity lossy codec optimized for Apple ecosystem and web streaming.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>
                    <strong>OGG Vorbis:</strong> Open-source codec providing excellent fidelity for gaming engines and web applications.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>
                    <strong>FLAC:</strong> Lossless compressed audio preserving bit-for-bit accuracy of original recordings.
                  </span>
                </li>
              </ul>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex items-center gap-2 text-xs text-foreground font-semibold">
                  <ShieldIcon size={14} className="text-green-500" />
                  <span>100% Client-Side Privacy</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  All audio transcoding happens locally in your web browser. No tracks or audio clips are uploaded to any server.
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
          <Link href="/tools/video-to-mp3" className="text-orange-500 hover:underline font-medium">
            Video to MP3
          </Link>
        </div>
        <Link href="/tools" className="hover:text-foreground transition-colors">
          Browse all tools &rarr;
        </Link>
      </div>
    </div>
  );
}
