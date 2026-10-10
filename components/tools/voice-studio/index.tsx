'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { VoiceStudioMode } from '@/lib/voice-studio-utils';
import { TtsTab } from './tts-tab';
import { TranscribeTab } from './transcribe-tab';
import { DubbingTab } from './dubbing-tab';
import {
  VolumeIcon,
  MicIcon,
  LanguagesIcon,
  ShieldIcon,
  ZapIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

export function VoiceStudio() {
  const [activeMode, setActiveMode] = useState<VoiceStudioMode>('tts');
  const [dubbingInitialText, setDubbingInitialText] = useState<string>('');

  const handleSendToDubbing = (text: string) => {
    setDubbingInitialText(text);
    setActiveMode('dubbing');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/tools/pdf-tools" className="hover:text-foreground transition-colors">
          Media &amp; Audio
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Voice Studio</span>
      </nav>

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <MicIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                ASAPTools Voice Studio
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                All-in-one private audio studio: Text-to-Speech, Audio/Video Transcription &amp; Subtitles, and Translation Dubbing.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy & Speed Badges */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Badge variant="outline" className="text-xs py-1 px-2.5 flex items-center gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
            <ShieldIcon className="w-3.5 h-3.5" />
            100% In-Browser Privacy
          </Badge>
          <Badge variant="outline" className="text-xs py-1 px-2.5 flex items-center gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">
            <ZapIcon className="w-3.5 h-3.5" />
            Zero Server Uploads
          </Badge>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center border-b border-border gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveMode('tts')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeMode === 'tts'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <VolumeIcon className="w-4 h-4" />
          <span>Text to Speech</span>
          <Badge variant="neutral" className="text-[10px] py-0 px-1.5 ml-1">
            Synthesizer
          </Badge>
        </button>

        <button
          onClick={() => setActiveMode('transcribe')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeMode === 'transcribe'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <MicIcon className="w-4 h-4" />
          <span>Audio/Video to Text</span>
          <Badge variant="neutral" className="text-[10px] py-0 px-1.5 ml-1">
            SRT Subtitles
          </Badge>
        </button>

        <button
          onClick={() => setActiveMode('dubbing')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeMode === 'dubbing'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <LanguagesIcon className="w-4 h-4" />
          <span>Translation &amp; Dubbing</span>
          <Badge variant="neutral" className="text-[10px] py-0 px-1.5 ml-1">
            Workflow
          </Badge>
        </button>
      </div>

      {/* Active Mode Workspace */}
      <div className="pt-2">
        {activeMode === 'tts' && <TtsTab />}
        {activeMode === 'transcribe' && (
          <TranscribeTab onSendToDubbing={handleSendToDubbing} />
        )}
        {activeMode === 'dubbing' && (
          <DubbingTab initialSourceText={dubbingInitialText} />
        )}
      </div>
    </div>
  );
}
