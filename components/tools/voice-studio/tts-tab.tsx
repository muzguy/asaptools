'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  SAMPLE_TTS_SCRIPTS,
  getSpeechStats,
  downloadTextFile,
  downloadJsonFile,
  downloadBinaryFile,
  encodePcmToMp3,
  createTestTonePcm,
} from '@/lib/voice-studio-utils';
import {
  VolumeIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  DownloadIcon,
  SlidersIcon,
  SparklesIcon,
  RotateCcwIcon,
  InfoIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

export function TtsTab() {
  const [text, setText] = useState<string>(SAMPLE_TTS_SCRIPTS[0].text);

  // System Voice Selection
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');

  // Speech Tuning Controls
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);

  // Playback & Status States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Download MP3 Notice & Options Modal / Panel
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [isDownloadingSampleMp3, setIsDownloadingSampleMp3] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load and listen for available system voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      if (available.length > 0 && !selectedVoiceUri) {
        const defaultVoice =
          available.find((v) => v.default) ||
          available.find((v) => v.lang.startsWith('en')) ||
          available[0];
        if (defaultVoice) {
          setSelectedVoiceUri(defaultVoice.voiceURI);
        }
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedVoiceUri]);

  // Clean speech synthesis resources on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stats = getSpeechStats(text, Math.round(150 * rate));

  // Handler: Speak Text via native browser speech synthesis
  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setErrorMessage('Speech synthesis is not supported by your browser.');
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      setErrorMessage('Please enter some text to speak.');
      return;
    }

    setErrorMessage(null);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    const chosenVoice = voices.find((v) => v.voiceURI === selectedVoiceUri);
    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setStatusMessage(`Speaking with "${chosenVoice?.name || 'System Voice'}"...`);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setStatusMessage('Speech completed.');
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        setStatusMessage(`Playback note: ${e.error}`);
      }
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onpause = () => {
      setIsPaused(true);
      setStatusMessage('Playback paused.');
    };

    utterance.onresume = () => {
      setIsPaused(false);
      setStatusMessage('Playback resumed.');
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePauseResume = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setStatusMessage('Resumed playback.');
    } else if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setStatusMessage('Paused.');
    }
  };

  const handleStop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setStatusMessage('Playback stopped.');
  };

  // Handler: Download MP3 Button Click
  const handleDownloadMp3Click = () => {
    setShowDownloadModal(true);
  };

  // Handler: Generate and download client-side test MP3 file
  const handleDownloadSampleMp3 = () => {
    setIsDownloadingSampleMp3(true);
    try {
      // Generate a 1-second 440 Hz standard test tone and encode via LAME to MP3
      const sampleRate = 22050;
      const samples = createTestTonePcm(440, 1.5, sampleRate, 0.4);
      const mp3Bytes = encodePcmToMp3(samples, sampleRate, 128);

      downloadBinaryFile(mp3Bytes, 'asaptools-test-audio.mp3', 'audio/mpeg');
      setStatusMessage('Sample 128 kbps MP3 generated and downloaded successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to encode MP3.';
      setErrorMessage(msg);
    } finally {
      setIsDownloadingSampleMp3(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadScript = () => {
    downloadTextFile(text, 'voice-studio-script.txt');
  };

  const handleExportProfile = () => {
    const profile = {
      tool: 'ASAPTools Voice Studio',
      mode: 'Text to Speech',
      date: new Date().toISOString(),
      script: text,
      voice: {
        uri: selectedVoiceUri,
        name: voices.find((v) => v.voiceURI === selectedVoiceUri)?.name || 'Default',
        lang: voices.find((v) => v.voiceURI === selectedVoiceUri)?.lang || 'en',
      },
      settings: {
        rate,
        pitch,
        volume,
      },
      stats: {
        characters: stats.characterCount,
        words: stats.wordCount,
        estimatedDuration: stats.estimatedDurationLabel,
      },
    };
    downloadJsonFile(profile, 'voice-studio-profile.json');
  };

  // Group system voices by language
  const groupedVoices = voices.reduce<Record<string, SpeechSynthesisVoice[]>>((acc, v) => {
    const langPrefix = v.lang.split('-')[0].toUpperCase();
    if (!acc[langPrefix]) acc[langPrefix] = [];
    acc[langPrefix].push(v);
    return acc;
  }, {});

  const currentVoiceObj = voices.find((v) => v.voiceURI === selectedVoiceUri);

  return (
    <div className="space-y-6">
      {/* Top Description & Quick Scripts Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <VolumeIcon className="w-5 h-5 text-primary" />
            Text to Speech Studio
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Synthesize genuine, natural speech in real-time using installed system voices with 100% client-side privacy.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Quick Scripts:</span>
          {SAMPLE_TTS_SCRIPTS.map((script) => (
            <button
              key={script.id}
              onClick={() => {
                handleStop();
                setText(script.text);
              }}
              className="text-xs px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              <SparklesIcon className="w-3 h-3 text-primary" />
              {script.title}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircleIcon className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-xs underline font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Script Editor & Primary Controls (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="tts-text-input" className="text-sm font-semibold text-foreground">
                Script Content
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setText('')}
                  disabled={!text}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={handleCopyScript}
                  disabled={!text}
                  className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  {copiedScript ? (
                    <>
                      <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    'Copy Script'
                  )}
                </button>
              </div>
            </div>

            <textarea
              id="tts-text-input"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter script text here to synthesize natural speech..."
              className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed resize-y"
            />

            {/* Live Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60 text-center">
              <div className="p-2 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Characters</div>
                <div className="text-sm font-bold text-foreground">{stats.characterCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Words</div>
                <div className="text-sm font-bold text-foreground">{stats.wordCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Speaking Pace</div>
                <div className="text-sm font-bold text-foreground">{Math.round(150 * rate)} WPM</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Est. Duration</div>
                <div className="text-sm font-bold text-primary">{stats.estimatedDurationLabel}</div>
              </div>
            </div>
          </div>

          {/* Primary Action Controls Strip */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* PROMINENT DOWNLOAD MP3 BUTTON */}
                <button
                  id="tts-download-mp3-button"
                  onClick={handleDownloadMp3Click}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  title="Audio export information and options"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Download MP3</span>
                </button>

                {/* SPEAK TEXT BUTTON */}
                {!isPlaying ? (
                  <button
                    id="tts-speak-button"
                    onClick={handleSpeak}
                    disabled={!text.trim()}
                    className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <PlayIcon className="w-4 h-4 fill-current" />
                    <span>Speak Text</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handlePauseResume}
                      className="px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isPaused ? (
                        <>
                          <PlayIcon className="w-4 h-4 fill-current text-primary" />
                          Resume
                        </>
                      ) : (
                        <>
                          <PauseIcon className="w-4 h-4 fill-current text-amber-500" />
                          Pause
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleStop}
                      className="px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-destructive/10 hover:text-destructive text-foreground font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <StopIcon className="w-4 h-4 fill-current" />
                      Stop
                    </button>
                  </>
                )}
              </div>

              {/* Script & Profile Export Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadScript}
                  disabled={!text.trim()}
                  title="Download script as .txt"
                  className="px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  Script (.txt)
                </button>
                <button
                  onClick={handleExportProfile}
                  disabled={!text.trim()}
                  title="Export voice configuration and script as JSON"
                  className="px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  Profile (.json)
                </button>
              </div>
            </div>

            {statusMessage && (
              <div className="text-xs text-muted-foreground italic pt-1 flex items-center gap-1.5">
                <InfoIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>

          {/* DOWNLOAD MP3 INFORMATION & EXPORT OPTIONS MODAL/CARD */}
          {showDownloadModal && (
            <div className="rounded-xl border border-emerald-500/40 bg-card p-5 space-y-4 shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <DownloadIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Downloadable MP3 Speech Audio Status
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Technical overview of browser-native audio export and client-side options
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded-md border border-border hover:bg-muted transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Technical Architecture Explanation */}
              <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2 text-xs leading-relaxed text-muted-foreground">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Why Browser Voices Cannot Export Raw Audio Buffers Directly
                </div>
                <p>
                  The natural voices you hear through <strong>&ldquo;Speak Text&rdquo;</strong> are powered by your operating system&apos;s native speech engine (such as Apple Siri, Microsoft Natural Voices, or Android Google TTS).
                </p>
                <p>
                  Under the W3C Web Speech specification, browsers route speech output directly to your physical speakers/headphones. For security and anti-fingerprinting reasons, browsers do not permit web scripts to intercept raw PCM audio buffers from system speech synthesis without system audio recording.
                </p>
              </div>

              {/* Neural TTS Evaluation Note */}
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3.5 space-y-2 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <AlertCircleIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  Client-Side Neural TTS Engine Investigation
                </div>
                <p>
                  We evaluated open-source neural TTS models (such as Piper and Kokoro) to synthesize downloadable audio. However, neural TTS models require downloading between <strong>65 MB to 100 MB</strong> of ONNX weights and WebAssembly modules from third-party CDNs on every session.
                </p>
                <p>
                  ASAPTools is committed to 100% privacy, instant loading, and zero deceptive synthetic hiss/buzz generators. We do not bundle massive model files into your initial JavaScript or upload your private scripts to external paid servers.
                </p>
              </div>

              {/* Practical Solutions Strip */}
              <div className="space-y-2.5 pt-1">
                <span className="text-xs font-semibold text-foreground block">
                  Available Export Workarounds:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-lg border border-border bg-background space-y-1">
                    <div className="font-semibold text-foreground">1. System / Mic Recording</div>
                    <p className="text-[11px] text-muted-foreground">
                      Use the <em>Audio to Text &amp; Recorder</em> tab or OS audio capture to record natural speech directly into a downloadable audio file.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-background space-y-1">
                    <div className="font-semibold text-foreground">2. Script &amp; Profile Export</div>
                    <p className="text-[11px] text-muted-foreground">
                      Download the formatted script (.txt) or settings profile (.json) containing voice pacing and character metrics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Client-side MP3 Encoder Verification */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                <span className="text-[11px] text-muted-foreground">
                  Verify pure client-side LAME MP3 encoding in this browser:
                </span>
                <button
                  onClick={handleDownloadSampleMp3}
                  disabled={isDownloadingSampleMp3}
                  className="px-3.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  {isDownloadingSampleMp3 ? 'Encoding...' : 'Download Verified Test MP3'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Voice Actor & Speech Parameter Tuning (1 col) */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <SlidersIcon className="w-4 h-4 text-primary" />
                Voice &amp; Tuning
              </h3>
              <Badge variant="neutral" className="text-[10px]">
                {voices.length} System Voices
              </Badge>
            </div>

            {/* System Voice Selection */}
            <div className="space-y-1.5">
              <label htmlFor="voice-picker" className="text-xs font-medium text-muted-foreground">
                Voice Actor (Natural Speech)
              </label>
              <select
                id="voice-picker"
                value={selectedVoiceUri}
                onChange={(e) => {
                  setSelectedVoiceUri(e.target.value);
                  if (isPlaying) handleStop();
                }}
                className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 truncate cursor-pointer"
              >
                {voices.length === 0 ? (
                  <option value="">Detecting available voices...</option>
                ) : (
                  Object.entries(groupedVoices).map(([langCode, langVoices]) => (
                    <optgroup key={langCode} label={`${langCode} Voices`}>
                      {langVoices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>

              {currentVoiceObj && (
                <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-0.5">
                  <span>Language: {currentVoiceObj.lang}</span>
                  {currentVoiceObj.default && (
                    <span className="text-primary font-medium">Default OS Voice</span>
                  )}
                </div>
              )}
            </div>

            {/* Speed / Rate Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Speed (Rate)</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{rate.toFixed(1)}x</span>
                  <button
                    onClick={() => setRate(1.0)}
                    title="Reset to 1.0x"
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <RotateCcwIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.5x Slow</span>
                <span>1.0x Normal</span>
                <span>2.0x Fast</span>
              </div>
            </div>

            {/* Pitch Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Pitch</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{pitch.toFixed(1)}</span>
                  <button
                    onClick={() => setPitch(1.0)}
                    title="Reset to 1.0"
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <RotateCcwIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Deeper</span>
                <span>Standard</span>
                <span>Higher</span>
              </div>
            </div>

            {/* Volume Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Volume</span>
                <span className="font-semibold text-foreground">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Privacy & Engine Architecture Disclosure Card */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldIcon className="w-4 h-4 text-emerald-500 shrink-0" />
              100% Client-Side Privacy
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              All text-to-speech rendering occurs locally on your computer using installed operating system voices. Your script is never sent to any external server or third-party AI provider.
            </p>
            <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 text-[11px] space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                Zero Cloud Logging
              </div>
              <p className="leading-relaxed opacity-90">
                Safe for confidential scripts, proprietary transcripts, and sensitive spoken content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
