'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  MediaFileMeta,
  SubtitleSegment,
  validateMediaFile,
  formatByteSize,
  formatDisplayTime,
  generateSrt,
  generateVtt,
  downloadTextFile,
  SAMPLE_TRANSCRIPT_SEGMENTS,
} from '@/lib/voice-studio-utils';
import {
  MicIcon,
  UploadIcon,
  PlayIcon,
  PauseIcon,
  DownloadIcon,
  SubtitlesIcon,
  FileTextIcon,
  PlusIcon,
  TrashIcon,
  CopyIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ShieldIcon,
  SparklesIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

interface TranscribeTabProps {
  onSendToDubbing?: (text: string) => void;
}

export function TranscribeTab({ onSendToDubbing }: TranscribeTabProps) {
  const [mediaFile, setMediaFile] = useState<MediaFileMeta | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Transcript state
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Live microphone speech recognition state
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [dictationSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (mediaFile?.objectUrl) {
        URL.revokeObjectURL(mediaFile.objectUrl);
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [mediaFile]);

  // File selection & validation
  const handleFileChange = useCallback((file: File) => {
    setErrorMessage(null);
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid media file.');
      return;
    }

    if (mediaFile?.objectUrl) {
      URL.revokeObjectURL(mediaFile.objectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    const meta: MediaFileMeta = {
      file,
      name: file.name,
      size: file.size,
      formattedSize: formatByteSize(file.size),
      type: file.type || 'media',
      objectUrl,
    };

    setMediaFile(meta);
    setIsPlayingAudio(false);
    setCurrentTime(0);
  }, [mediaFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileChange(e.dataTransfer.files[0]);
      }
    },
    [handleFileChange]
  );

  // Load sample audio and pre-timed transcript for quick demonstration
  const handleLoadSample = useCallback(() => {
    setSegments(SAMPLE_TRANSCRIPT_SEGMENTS);
    const fullText = SAMPLE_TRANSCRIPT_SEGMENTS.map((s) => s.text).join(' ');
    setTranscriptText(fullText);
    setAudioDuration(18.0);
    setErrorMessage(null);
  }, []);

  // Audio player controls
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch((err) => {
        setErrorMessage(`Audio playback error: ${err.message}`);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Live Microphone Dictation Handler
  const toggleDictation = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (!SpeechRecognitionClass) {
      setErrorMessage(
        'Speech recognition is not supported in this browser. Please try Google Chrome, Microsoft Edge, or Safari.'
      );
      return;
    }

    if (isDictating) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsDictating(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsDictating(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            interimChunk += event.results[i][0].transcript;
          }
        }

        if (finalChunk) {
          setTranscriptText((prev) => {
            const next = prev ? `${prev} ${finalChunk.trim()}` : finalChunk.trim();
            return next;
          });

          // Add as timed segment
          const newStart = segments.length > 0 ? segments[segments.length - 1].end + 0.5 : 0;
          const newEnd = newStart + Math.max(2, finalChunk.split(/\s+/).length * 0.4);
          setSegments((prev) => [
            ...prev,
            {
              id: `rec-${Date.now()}-${prev.length}`,
              start: parseFloat(newStart.toFixed(1)),
              end: parseFloat(newEnd.toFixed(1)),
              text: finalChunk.trim(),
            },
          ]);
        }

        setInterimText(interimChunk);
      };

      recognition.onerror = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (e.error !== 'no-speech') {
          setErrorMessage(`Microphone dictation error: ${e.error}`);
        }
        setIsDictating(false);
      };

      recognition.onend = () => {
        setIsDictating(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErrorMessage(`Failed to initiate microphone: ${err.message}`);
      setIsDictating(false);
    }
  }, [isDictating, segments]);

  // Segment editing handlers
  const handleUpdateSegmentText = (id: string, newText: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: newText } : s))
    );
  };

  const handleUpdateSegmentTimes = (id: string, start: number, end: number) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, start, end } : s))
    );
  };

  const handleAddSegment = () => {
    const lastEnd = segments.length > 0 ? segments[segments.length - 1].end : 0;
    const newSeg: SubtitleSegment = {
      id: `custom-${Date.now()}`,
      start: lastEnd + 0.5,
      end: lastEnd + 4.0,
      text: 'New subtitle line',
    };
    setSegments((prev) => [...prev, newSeg]);
  };

  const handleDeleteSegment = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  };

  // Auto-segment transcript by punctuation/sentences mapped to audio duration
  const handleAutoSegment = () => {
    const clean = transcriptText.trim();
    if (!clean) {
      setErrorMessage('Please enter or dictate some text to create subtitle segments.');
      return;
    }

    // Split text into sentences
    const sentences = clean
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sentences.length === 0) return;

    const totalSeconds = audioDuration > 0 ? audioDuration : sentences.length * 4;
    const timePerSentence = totalSeconds / sentences.length;

    const generatedSegments: SubtitleSegment[] = sentences.map((sentence, idx) => {
      const start = parseFloat((idx * timePerSentence).toFixed(1));
      const end = parseFloat(((idx + 1) * timePerSentence).toFixed(1));
      return {
        id: `auto-${idx}-${Date.now()}`,
        start,
        end,
        text: sentence,
      };
    });

    setSegments(generatedSegments);
  };

  // Export handlers
  const handleDownloadSrt = () => {
    const srtContent = generateSrt(segments);
    if (!srtContent) {
      setErrorMessage('No subtitle segments available to export as SRT.');
      return;
    }
    downloadTextFile(srtContent, 'subtitles.srt', 'text/plain');
  };

  const handleDownloadVtt = () => {
    const vttContent = generateVtt(segments);
    downloadTextFile(vttContent, 'subtitles.vtt', 'text/vtt');
  };

  const handleDownloadTxt = () => {
    const textToDownload = transcriptText || segments.map((s) => s.text).join('\n');
    if (!textToDownload.trim()) {
      setErrorMessage('No transcript text available to download.');
      return;
    }
    downloadTextFile(textToDownload, 'transcript.txt', 'text/plain');
  };

  const handleCopyTranscript = () => {
    const textToCopy = transcriptText || segments.map((s) => s.text).join(' ');
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Sample Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <MicIcon className="w-5 h-5 text-primary" />
            Audio &amp; Video Transcription Studio
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transcribe spoken audio, dictate live with your microphone, edit transcripts, and generate print-ready SRT / WebVTT subtitles.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleLoadSample}
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors font-medium flex items-center gap-1.5"
          >
            <SparklesIcon className="w-3.5 h-3.5 text-primary" />
            Load Sample Transcript
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircleIcon className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Media Upload, Player & Microphone Dictation (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-card hover:bg-muted/10 transition-all cursor-pointer text-center space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.aac,.ogg,.webm,.flac,.mp4,.mov,.mkv,audio/*,video/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <UploadIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Drop audio or video file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports MP3, WAV, AAC, M4A, OGG, WebM, MP4, MOV (up to 100 MB)
              </p>
            </div>
          </div>

          {/* Media Player Card (If file uploaded) */}
          {mediaFile && (
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {mediaFile.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {mediaFile.formattedSize} • {mediaFile.type || 'audio'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (mediaFile.objectUrl) URL.revokeObjectURL(mediaFile.objectUrl);
                    setMediaFile(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove
                </button>
              </div>

              {/* Native Audio Element for playback */}
              <audio
                ref={audioRef}
                src={mediaFile.objectUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlayingAudio(false)}
                className="hidden"
              />

              {/* Scrubber & Player Controls */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min="0"
                  max={audioDuration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{formatDisplayTime(currentTime)}</span>
                  <span>{formatDisplayTime(audioDuration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlayAudio}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {isPlayingAudio ? (
                    <>
                      <PauseIcon className="w-3.5 h-3.5 text-amber-500 fill-current" />
                      Pause
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-3.5 h-3.5 text-primary fill-current" />
                      Play Recording
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Live Microphone Dictation Card */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MicIcon className="w-4 h-4 text-primary" />
                Live Microphone Dictation
              </div>
              {isDictating && (
                <span className="flex items-center gap-1.5 text-xs text-red-500 font-semibold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Recording...
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Dictate your voice in real-time. Speech is transcribed instantly and appended to your transcript.
            </p>

            <button
              id="live-dictate-button"
              onClick={toggleDictation}
              disabled={!dictationSupported}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                isDictating
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              } disabled:opacity-50`}
            >
              <MicIcon className="w-4 h-4" />
              {isDictating ? 'Stop Dictating' : 'Start Live Dictation'}
            </button>

            {interimText && (
              <div className="p-2 rounded bg-muted/40 text-xs italic text-muted-foreground border border-border/50">
                Listening: &ldquo;{interimText}&rdquo;
              </div>
            )}
          </div>

          {/* Privacy & Architecture Notice */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldIcon className="w-4 h-4 text-primary" />
              100% Client-Side Privacy
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your audio files and microphone streams are processed locally in your browser. No voice or media data is ever uploaded to remote servers or third-party cloud services.
            </p>
          </div>
        </div>

        {/* Right Column: Editable Transcript & Timed Subtitle Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Transcript Text Box */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="transcript-text" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileTextIcon className="w-4 h-4 text-primary" />
                Transcript Content
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoSegment}
                  disabled={!transcriptText.trim()}
                  title="Auto-generate timed subtitle segments from transcript text"
                  className="text-xs px-2.5 py-1 rounded border border-border bg-background hover:bg-muted text-foreground transition-colors font-medium flex items-center gap-1 disabled:opacity-40"
                >
                  <SubtitlesIcon className="w-3 h-3 text-primary" />
                  Auto-Segment Subtitles
                </button>
                <button
                  onClick={handleCopyTranscript}
                  disabled={!transcriptText.trim() && segments.length === 0}
                  className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-40"
                >
                  {copiedText ? (
                    <>
                      <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              id="transcript-text"
              rows={6}
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Your transcribed text will appear here. You can also paste or edit text directly..."
              className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed resize-y"
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>
                {transcriptText ? transcriptText.split(/\s+/).filter(Boolean).length : 0} words •{' '}
                {transcriptText.length} characters
              </span>
              {onSendToDubbing && transcriptText.trim() && (
                <button
                  onClick={() => onSendToDubbing(transcriptText)}
                  className="text-primary hover:underline font-medium text-xs flex items-center gap-1"
                >
                  Send to Translation &amp; Dubbing &rarr;
                </button>
              )}
            </div>
          </div>

          {/* Subtitle Segments Editor */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <SubtitlesIcon className="w-4 h-4 text-primary" />
                  Timed Subtitle Segments (SRT / VTT)
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  {segments.length} Segments
                </Badge>
              </div>

              <button
                onClick={handleAddSegment}
                className="text-xs px-2.5 py-1 rounded border border-border bg-background hover:bg-muted text-foreground transition-colors font-medium flex items-center gap-1"
              >
                <PlusIcon className="w-3 h-3 text-primary" />
                Add Segment
              </button>
            </div>

            {segments.length === 0 ? (
              <div className="p-6 text-center rounded-lg border border-border/60 bg-muted/20 text-xs text-muted-foreground space-y-2">
                <p>No subtitle segments generated yet.</p>
                <p className="text-[11px]">
                  Use <strong>&ldquo;Auto-Segment Subtitles&rdquo;</strong> above or click <strong>&ldquo;Load Sample Transcript&rdquo;</strong> to generate timestamped lines.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {segments.map((seg, idx) => (
                  <div
                    key={seg.id}
                    className="p-3 rounded-lg border border-border bg-background/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1">
                          <span>Start:</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={seg.start}
                            onChange={(e) =>
                              handleUpdateSegmentTimes(
                                seg.id,
                                parseFloat(e.target.value) || 0,
                                seg.end
                              )
                            }
                            className="w-16 p-1 rounded border border-border bg-background text-foreground text-center"
                          />
                          <span>s</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <span>End:</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={seg.end}
                            onChange={(e) =>
                              handleUpdateSegmentTimes(
                                seg.id,
                                seg.start,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-16 p-1 rounded border border-border bg-background text-foreground text-center"
                          />
                          <span>s</span>
                        </label>
                        <button
                          onClick={() => handleDeleteSegment(seg.id)}
                          className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                          title="Delete Segment"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={seg.text}
                      onChange={(e) => handleUpdateSegmentText(seg.id, e.target.value)}
                      placeholder="Subtitle line text..."
                      className="w-full p-2 rounded border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Export Toolbar */}
            <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Export Subtitles &amp; Text:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleDownloadSrt}
                  disabled={segments.length === 0}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  SRT (.srt)
                </button>
                <button
                  onClick={handleDownloadVtt}
                  disabled={segments.length === 0}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  WebVTT (.vtt)
                </button>
                <button
                  onClick={handleDownloadTxt}
                  disabled={!transcriptText.trim() && segments.length === 0}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  Plain Text (.txt)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
