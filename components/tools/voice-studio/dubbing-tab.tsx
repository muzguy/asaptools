'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  SUPPORTED_LANGUAGES,
  translateTextClientSide,
  downloadTextFile,
  SAMPLE_TTS_SCRIPTS,
} from '@/lib/voice-studio-utils';
import {
  LanguagesIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  DownloadIcon,
  CopyIcon,
  CheckCircleIcon,
  ShieldIcon,
  SparklesIcon,
  SlidersIcon,
} from '@/components/ui/icons';

interface DubbingTabProps {
  initialSourceText?: string;
}

export function DubbingTab({ initialSourceText }: DubbingTabProps) {
  const [sourceText, setSourceText] = useState<string>(
    initialSourceText || SAMPLE_TTS_SCRIPTS[0].text
  );
  const [targetLanguage, setTargetLanguage] = useState<string>('es'); // Default Spanish
  const [translatedText, setTranslatedText] = useState<string>(() => {
    const initial = initialSourceText || SAMPLE_TTS_SCRIPTS[0].text;
    return initial ? translateTextClientSide(initial, 'es') : '';
  });
  const [copiedTranslated, setCopiedTranslated] = useState<boolean>(false);

  // Voice synthesis state
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [rate, setRate] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Filter voices matching target language and resolve active voice URI
  const targetVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(targetLanguage.toLowerCase())
  );
  const defaultTargetVoice = targetVoices[0] || voices[0];
  const activeVoiceUri = selectedVoiceUri || defaultTargetVoice?.voiceURI || '';

  // Load and listen for available system voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Translation trigger
  const handleTranslate = () => {
    if (!sourceText.trim()) {
      setStatusMessage('Please enter source text to translate.');
      return;
    }
    const result = translateTextClientSide(sourceText, targetLanguage);
    setTranslatedText(result);
    setStatusMessage('Translation generated. You can review and edit below.');
  };

  // Target speech playback
  const handleSpeakTranslation = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setStatusMessage('Speech synthesis is not supported by your browser.');
      return;
    }

    const clean = translatedText.trim();
    if (!clean) {
      setStatusMessage('Please translate or enter text to speak.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utteranceRef.current = utterance;

    const voice = voices.find((v) => v.voiceURI === activeVoiceUri);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = targetLanguage;
    }

    utterance.rate = rate;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setStatusMessage('Speaking translated audio...');
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setStatusMessage('Playback completed.');
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        setStatusMessage(`Playback error: ${e.error}`);
      }
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePauseResume = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setStatusMessage('Resumed.');
    } else if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setStatusMessage('Paused.');
    }
  };

  const handleStop = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setStatusMessage('Stopped.');
  };

  const handleCopyTranslated = () => {
    navigator.clipboard.writeText(translatedText);
    setCopiedTranslated(true);
    setTimeout(() => setCopiedTranslated(false), 2000);
  };

  const handleDownloadTranslated = () => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage)?.name || targetLanguage;
    downloadTextFile(translatedText, `translated-${lang.toLowerCase()}.txt`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <LanguagesIcon className="w-5 h-5 text-primary" />
            Translation &amp; Dubbing Workflow
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Translate transcripts into foreign languages, review/edit the translation, and generate synthesized voiceover speech.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Source Text & Translation Config */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="source-text" className="text-sm font-semibold text-foreground">
              Source Transcript (Original)
            </label>
            <button
              onClick={() => {
                setSourceText(SAMPLE_TTS_SCRIPTS[0].text);
                handleTranslate();
              }}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              <SparklesIcon className="w-3 h-3" />
              Load Sample
            </button>
          </div>

          <textarea
            id="source-text"
            rows={7}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Enter or paste the original transcript here..."
            className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed resize-y"
          />

          {/* Target Language Selector */}
          <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
            <label htmlFor="target-language-picker" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <LanguagesIcon className="w-3.5 h-3.5 text-primary" />
              Select Target Dubbing Language
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setTargetLanguage(lang.code);
                    if (sourceText.trim()) {
                      const res = translateTextClientSide(sourceText, lang.code);
                      setTranslatedText(res);
                    }
                  }}
                  className={`p-2 rounded-lg border text-xs text-left transition-all flex items-center gap-2 ${
                    targetLanguage === lang.code
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <div className="min-w-0">
                    <div className="truncate">{lang.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {lang.nativeName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleTranslate}
            disabled={!sourceText.trim()}
            className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <LanguagesIcon className="w-4 h-4" />
            Translate Transcript
          </button>
        </div>

        {/* Right Column: Translated Script (Review & Edit) & Speech Generation */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="translated-text" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Translated Script (Review &amp; Edit)
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTranslated}
                disabled={!translatedText.trim()}
                className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-40"
              >
                {copiedTranslated ? (
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
              <button
                onClick={handleDownloadTranslated}
                disabled={!translatedText.trim()}
                className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-40"
              >
                <DownloadIcon className="w-3 h-3" />
                Download (.txt)
              </button>
            </div>
          </div>

          <textarea
            id="translated-text"
            rows={7}
            value={translatedText}
            onChange={(e) => setTranslatedText(e.target.value)}
            placeholder="Translated text will appear here. You can review and refine every line before speaking..."
            className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed resize-y"
          />

          {/* Voice Picker for Target Language */}
          <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
            <div className="space-y-1">
              <label htmlFor="target-voice-picker" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <SlidersIcon className="w-3.5 h-3.5 text-primary" />
                Target Language Voice Actor
              </label>
              <select
                id="target-voice-picker"
                value={activeVoiceUri}
                onChange={(e) => setSelectedVoiceUri(e.target.value)}
                className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {targetVoices.length > 0 ? (
                  targetVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))
                ) : (
                  <option value="">
                    No specific voice found for this language (using default system voice)
                  </option>
                )}
              </select>
            </div>

            {/* Speaking Rate */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Speaking Pace</span>
                <span className="font-semibold text-foreground">{rate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Replacement Speech Generation Controls */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            {!isPlaying ? (
              <button
                onClick={handleSpeakTranslation}
                disabled={!translatedText.trim()}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
              >
                <PlayIcon className="w-3.5 h-3.5 fill-current" />
                Speak Translated Audio
              </button>
            ) : (
              <>
                <button
                  onClick={handlePauseResume}
                  className="px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-semibold text-xs transition-all flex items-center gap-2"
                >
                  {isPaused ? (
                    <>
                      <PlayIcon className="w-3.5 h-3.5 fill-current text-primary" />
                      Resume
                    </>
                  ) : (
                    <>
                      <PauseIcon className="w-3.5 h-3.5 fill-current text-amber-500" />
                      Pause
                    </>
                  )}
                </button>
                <button
                  onClick={handleStop}
                  className="px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-destructive/10 hover:text-destructive text-foreground font-semibold text-xs transition-all flex items-center gap-2"
                >
                  <StopIcon className="w-3.5 h-3.5 fill-current" />
                  Stop
                </button>
              </>
            )}

            {statusMessage && (
              <span className="text-xs text-muted-foreground italic px-2">
                {statusMessage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Honest Dubbing Capabilities & Limitations Disclosure Card */}
      <div className="p-4 rounded-xl border border-border/80 bg-muted/20 text-xs space-y-3">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <ShieldIcon className="w-4 h-4 text-primary shrink-0" />
          Dubbing Foundation &amp; Technical Limitations
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-muted-foreground text-[11px] leading-relaxed">
          <div className="p-3 rounded-lg border border-border/60 bg-background/60 space-y-1">
            <span className="font-semibold text-foreground block">
              What Is Currently Working:
            </span>
            <ul className="list-disc list-inside space-y-1 opacity-90">
              <li>Instant client-side script translation across 9 major languages.</li>
              <li>Pre-dubbing review editor to correct names and terminology before speech synthesis.</li>
              <li>Synthesized target speech using your OS&apos;s native localized voice actors.</li>
            </ul>
          </div>
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400 space-y-1">
            <span className="font-semibold block">
              Known Limitations in Browser-Only Processing:
            </span>
            <ul className="list-disc list-inside space-y-1 opacity-90">
              <li><strong>Speaker Timbre:</strong> Replacement speech uses standard system voices; original speaker voice cloning is not performed.</li>
              <li><strong>Lip-Syncing &amp; Timing:</strong> Translations naturally vary in syllable count. Automated video lip-syncing and frame warping are not supported in browser-only runtimes.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
