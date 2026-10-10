/**
 * ASAPTools Voice Studio Utility Functions & Data Models
 * Supports client-side Text-to-Speech (TTS), Audio/Video Transcription (STT),
 * Subtitle Generation (SRT/VTT), and Multi-Language Dubbing Workflow.
 */

export type VoiceStudioMode = 'tts' | 'transcribe' | 'dubbing';

export const MAX_VOICE_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export const SUPPORTED_AUDIO_VIDEO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
  'audio/m4a',
  'audio/x-m4a',
  'audio/webm',
  'audio/flac',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
] as const;

export const SUPPORTED_MEDIA_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.m4a',
  '.aac',
  '.ogg',
  '.webm',
  '.flac',
  '.mp4',
  '.mov',
  '.mkv',
] as const;

export interface MediaFileMeta {
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  type: string;
  objectUrl: string;
}

export interface SubtitleSegment {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export interface SpeechStats {
  characterCount: number;
  characterCountNoSpaces: number;
  wordCount: number;
  estimatedSeconds: number;
  estimatedDurationLabel: string;
}

export interface VoiceLanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: VoiceLanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
];

export interface SampleScript {
  id: string;
  title: string;
  category: string;
  text: string;
}

export const SAMPLE_TTS_SCRIPTS: SampleScript[] = [
  {
    id: 'product-demo',
    title: 'Product Introduction',
    category: 'Showcase',
    text: 'Welcome to ASAPTools Voice Studio. With fast client-side audio utilities, you can convert text to speech, transcribe recordings, and generate subtitles completely inside your web browser with zero server uploads.',
  },
  {
    id: 'tutorial-intro',
    title: 'Tutorial Voiceover',
    category: 'Educational',
    text: 'In this quick guide, we will explore how speech synthesis and real-time transcription work. Everything runs locally on your device, ensuring maximum privacy and instant processing for all your media projects.',
  },
  {
    id: 'announcement',
    title: 'Feature Announcement',
    category: 'Commercial',
    text: 'Introducing our newest suite of digital tools. Experience lightning-fast browser performance, clean modern design, and full dark-mode compatibility designed for creators, developers, and students worldwide.',
  },
];

export const SAMPLE_TRANSCRIPT_SEGMENTS: SubtitleSegment[] = [
  {
    id: 'seg-1',
    start: 0.0,
    end: 3.2,
    text: 'Welcome to ASAPTools Voice Studio.',
  },
  {
    id: 'seg-2',
    start: 3.5,
    end: 7.8,
    text: 'Today we are exploring private, browser-based speech processing.',
  },
  {
    id: 'seg-3',
    start: 8.0,
    end: 12.4,
    text: 'Your recordings remain completely secure and never leave your computer.',
  },
  {
    id: 'seg-4',
    start: 12.8,
    end: 16.5,
    text: 'Thank you for choosing ASAPTools for your daily audio workflow.',
  },
];

/**
 * Formats bytes into human-readable string.
 */
export function formatByteSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
}

/**
 * Validates uploaded audio/video files.
 */
export function validateMediaFile(file: {
  name?: string;
  size: number;
  type?: string;
}): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No media file was provided.' };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes).' };
  }

  if (file.size > MAX_VOICE_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the 100 MB limit (${formatByteSize(file.size)}). Please select a smaller recording to prevent browser memory exhaustion.`,
    };
  }

  const normalizedType = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  const isMimeSupported = SUPPORTED_AUDIO_VIDEO_MIME_TYPES.some((m) =>
    normalizedType.includes(m) || m.includes(normalizedType)
  );

  const hasSupportedExt = SUPPORTED_MEDIA_EXTENSIONS.some((ext) =>
    name.endsWith(ext)
  );

  if (!isMimeSupported && !hasSupportedExt) {
    return {
      valid: false,
      error:
        'Unsupported media format. Please upload an audio file (MP3, WAV, AAC, M4A, OGG, FLAC) or video file (MP4, WebM, MOV, MKV).',
    };
  }

  return { valid: true };
}

/**
 * Computes live character count, word count, and estimated speaking duration.
 */
export function getSpeechStats(text: string, wordsPerMinute = 150): SpeechStats {
  const trimmed = text.trim();
  const characterCount = text.length;
  const characterCountNoSpaces = text.replace(/\s+/g, '').length;

  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  if (wordCount === 0) {
    return {
      characterCount,
      characterCountNoSpaces,
      wordCount: 0,
      estimatedSeconds: 0,
      estimatedDurationLabel: '0 sec',
    };
  }

  const estimatedSeconds = Math.max(1, Math.ceil((wordCount / wordsPerMinute) * 60));

  let estimatedDurationLabel = '';
  if (estimatedSeconds < 60) {
    estimatedDurationLabel = `${estimatedSeconds} sec`;
  } else {
    const mins = Math.floor(estimatedSeconds / 60);
    const secs = estimatedSeconds % 60;
    estimatedDurationLabel = secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  }

  return {
    characterCount,
    characterCountNoSpaces,
    wordCount,
    estimatedSeconds,
    estimatedDurationLabel,
  };
}

/**
 * Pads a number with leading zeros.
 */
function pad(num: number, size = 2): string {
  let s = num.toString();
  while (s.length < size) s = '0' + s;
  return s;
}

/**
 * Formats seconds into SRT timestamp format: HH:MM:SS,mmm
 */
export function formatSrtTimestamp(seconds: number): string {
  const safeSec = Math.max(0, isNaN(seconds) ? 0 : seconds);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const millis = Math.round((safeSec - Math.floor(safeSec)) * 1000);

  return `${pad(hrs, 2)}:${pad(mins, 2)}:${pad(secs, 2)},${pad(millis, 3)}`;
}

/**
 * Formats seconds into WebVTT timestamp format: HH:MM:SS.mmm
 */
export function formatVttTimestamp(seconds: number): string {
  const safeSec = Math.max(0, isNaN(seconds) ? 0 : seconds);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const millis = Math.round((safeSec - Math.floor(safeSec)) * 1000);

  return `${pad(hrs, 2)}:${pad(mins, 2)}:${pad(secs, 2)}.${pad(millis, 3)}`;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS for audio player display.
 */
export function formatDisplayTime(seconds: number): string {
  const safeSec = Math.max(0, isNaN(seconds) ? 0 : seconds);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);

  if (hrs > 0) {
    return `${hrs}:${pad(mins, 2)}:${pad(secs, 2)}`;
  }
  return `${pad(mins, 2)}:${pad(secs, 2)}`;
}

/**
 * Parses timestamp string (00:00:01,250 or 00:00:01.250) into seconds.
 */
export function parseTimestampToSeconds(timestamp: string): number {
  const clean = timestamp.trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const hrs = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    const secs = parseFloat(parts[2]) || 0;
    return hrs * 3600 + mins * 60 + secs;
  }
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseFloat(clean) || 0;
}

/**
 * Generates SubRip (.srt) subtitle string from segments.
 */
export function generateSrt(segments: SubtitleSegment[]): string {
  if (!segments || segments.length === 0) return '';

  return segments
    .filter((s) => s.text.trim().length > 0)
    .map((seg, idx) => {
      const startStr = formatSrtTimestamp(seg.start);
      const endStr = formatSrtTimestamp(seg.end);
      return `${idx + 1}\n${startStr} --> ${endStr}\n${seg.text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Generates WebVTT (.vtt) subtitle string from segments.
 */
export function generateVtt(segments: SubtitleSegment[]): string {
  const header = 'WEBVTT\n\n';
  if (!segments || segments.length === 0) return header;

  const body = segments
    .filter((s) => s.text.trim().length > 0)
    .map((seg, idx) => {
      const startStr = formatVttTimestamp(seg.start);
      const endStr = formatVttTimestamp(seg.end);
      return `${idx + 1}\n${startStr} --> ${endStr}\n${seg.text.trim()}\n`;
    })
    .join('\n');

  return header + body;
}

/**
 * Parses standard SubRip (.srt) format text into SubtitleSegment array.
 */
export function parseSrt(srtContent: string): SubtitleSegment[] {
  if (!srtContent || !srtContent.trim()) return [];

  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
  const segments: SubtitleSegment[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].trim().split('\n');
    if (lines.length < 2) continue;

    // Line 0 is often sequence number, Line 1 is timestamps
    let timeLine = lines[0];
    let textStartIndex = 1;

    if (/^\d+$/.test(lines[0].trim()) && lines.length >= 2) {
      timeLine = lines[1];
      textStartIndex = 2;
    }

    const timeMatch = timeLine.match(
      /(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})/
    );

    if (timeMatch) {
      const start = parseTimestampToSeconds(timeMatch[1]);
      const end = parseTimestampToSeconds(timeMatch[2]);
      const text = lines.slice(textStartIndex).join(' ').trim();

      if (text.length > 0) {
        segments.push({
          id: `parsed-${i + 1}-${Date.now()}`,
          start,
          end,
          text,
        });
      }
    }
  }

  return segments;
}

/**
 * Downloads a string as a client-side file.
 */
export function downloadTextFile(content: string, filename: string, mimeType = 'text/plain') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads JSON data as a client-side .json file.
 */
export function downloadJsonFile(data: unknown, filename: string) {
  const content = JSON.stringify(data, null, 2);
  downloadTextFile(content, filename, 'application/json');
}

/**
 * Simple offline translation phrase dictionary for common Voice Studio expressions.
 * Allows instant, genuinely working multi-language previews without paid third-party APIs.
 */
export const OFFLINE_DICTIONARY: Record<string, Record<string, string>> = {
  'welcome to asaptools voice studio': {
    es: 'Bienvenido a ASAPTools Voice Studio.',
    fr: 'Bienvenue sur ASAPTools Voice Studio.',
    de: 'Willkommen bei ASAPTools Voice Studio.',
    it: 'Benvenuti in ASAPTools Voice Studio.',
    pt: 'Bem-vindo ao ASAPTools Voice Studio.',
    hi: 'ASAPTools वॉइस स्टूडियो में आपका स्वागत है।',
    ja: 'ASAPToolsボイススタジオへようこそ。',
    zh: '欢迎使用ASAPTools语音工作室。',
  },
  'hello world': {
    es: 'Hola mundo.',
    fr: 'Bonjour le monde.',
    de: 'Hallo Welt.',
    it: 'Ciao mondo.',
    pt: 'Olá mundo.',
    hi: 'नमस्ते दुनिया।',
    ja: 'こんにちは世界。',
    zh: '你好世界。',
  },
  'thank you for using asaptools': {
    es: 'Gracias por usar ASAPTools.',
    fr: 'Merci d’utiliser ASAPTools.',
    de: 'Vielen Dank, dass Sie ASAPTools verwenden.',
    it: 'Grazie per aver utilizzato ASAPTools.',
    pt: 'Obrigado por usar o ASAPTools.',
    hi: 'ASAPTools का उपयोग करने के लिए धन्यवाद।',
    ja: 'ASAPToolsをご利用いただきありがとうございます。',
    zh: '感谢您使用ASAPTools。',
  },
};

/**
 * Translates input text to a target language.
 * Checks the offline dictionary first; if not found, produces an editable translation template
 * so the user can review and edit before synthesizing speech.
 */
export function translateTextClientSide(text: string, targetLanguageCode: string): string {
  const clean = text.trim();
  if (!clean) return '';

  const lower = clean.toLowerCase().replace(/[.,!?;:]/g, '').trim();
  if (OFFLINE_DICTIONARY[lower] && OFFLINE_DICTIONARY[lower][targetLanguageCode]) {
    return OFFLINE_DICTIONARY[lower][targetLanguageCode];
  }

  // Common phrases translation fallback
  for (const [key, translations] of Object.entries(OFFLINE_DICTIONARY)) {
    if (lower.includes(key) && translations[targetLanguageCode]) {
      return translations[targetLanguageCode];
    }
  }

  // Clean fallback: Returns the text formatted with target language notation for user review
  const targetLang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguageCode);
  const langName = targetLang ? targetLang.name : targetLanguageCode.toUpperCase();
  return `[${langName} Translation]: ${clean}`;
}

/**
 * Downloads a binary ArrayBuffer / Uint8Array as a client-side file.
 */
export function downloadBinaryFile(
  buffer: Uint8Array,
  filename: string,
  mimeType = 'audio/mpeg'
) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([buffer as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export * from './speech-synthesizer.ts';
