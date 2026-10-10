/**
 * ASAPTools Media Converter Utilities
 * Validation, argument construction, format metadata, and error parsing for FFmpeg WASM conversions.
 */

export const MAX_GIF_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_AUDIO_SIZE_BYTES = 75 * 1024 * 1024; // 75 MB

export type SupportedAudioFormat = 'mp3' | 'wav' | 'ogg' | 'm4a' | 'flac';

export type AudioBitrate = '128k' | '192k' | '256k' | '320k';
export type AudioSampleRate = 'original' | '44100' | '48000' | '96000';
export type AudioChannels = 'original' | '1' | '2';

export interface GifToMp4Options {
  backgroundColor?: string; // hex like '#ffffff' or 'default'
  fps?: number; // optional framerate cap
}

export const MAX_MP4_TO_GIF_SEGMENT_SECONDS = 30; // 30 seconds max duration to protect browser memory

export interface Mp4ToGifOptions {
  fps?: 10 | 15 | 20; // default 15
  width?: 320 | 480 | 640; // default 480
  startTime?: number; // seconds, >= 0
  duration?: number; // seconds, > 0
}

export interface VideoToMp3Options {
  bitrate?: AudioBitrate; // e.g. '192k'
  channels?: AudioChannels;
}

export interface AudioConverterOptions {
  targetFormat: SupportedAudioFormat;
  bitrate?: AudioBitrate;
  sampleRate?: AudioSampleRate;
  channels?: AudioChannels;
}

export interface AudioFormatMeta {
  format: SupportedAudioFormat;
  label: string;
  extension: string;
  mimeType: string;
  isLossless: boolean;
  tag: string;
  description: string;
  supportsBitrate: boolean;
}

export const AUDIO_FORMAT_CONFIGS: Record<SupportedAudioFormat, AudioFormatMeta> = {
  mp3: {
    format: 'mp3',
    label: 'MP3 (MPEG Audio Layer III)',
    extension: 'mp3',
    mimeType: 'audio/mpeg',
    isLossless: false,
    tag: 'Universal',
    description: 'Compatible with virtually every device, player, and car stereo.',
    supportsBitrate: true,
  },
  wav: {
    format: 'wav',
    label: 'WAV (Uncompressed PCM)',
    extension: 'wav',
    mimeType: 'audio/wav',
    isLossless: true,
    tag: 'Studio Master',
    description: 'Uncompressed CD-quality audio. Pristine fidelity with larger file size.',
    supportsBitrate: false,
  },
  m4a: {
    format: 'm4a',
    label: 'M4A / AAC (Advanced Audio Coding)',
    extension: 'm4a',
    mimeType: 'audio/mp4',
    isLossless: false,
    tag: 'Modern',
    description: 'High-efficiency codec delivering superior sound quality at lower bitrates.',
    supportsBitrate: true,
  },
  ogg: {
    format: 'ogg',
    label: 'OGG Vorbis',
    extension: 'ogg',
    mimeType: 'audio/ogg',
    isLossless: false,
    tag: 'Open Format',
    description: 'Open-source patent-free audio codec, popular for games and web apps.',
    supportsBitrate: true,
  },
  flac: {
    format: 'flac',
    label: 'FLAC (Free Lossless Audio Codec)',
    extension: 'flac',
    mimeType: 'audio/flac',
    isLossless: true,
    tag: 'Lossless',
    description: 'Lossless compression preserving 100% audio quality at ~50% WAV size.',
    supportsBitrate: false,
  },
};

export const AUDIO_BITRATE_OPTIONS: { value: AudioBitrate; label: string; desc: string }[] = [
  { value: '128k', label: '128 kbps', desc: 'Compact file size, standard speech & podcast quality' },
  { value: '192k', label: '192 kbps (Recommended)', desc: 'Optimal balance of crystal-clear music and reasonable file size' },
  { value: '256k', label: '256 kbps', desc: 'High-fidelity audio for quality headphones and speakers' },
  { value: '320k', label: '320 kbps (Maximum)', desc: 'Maximum MP3 quality, transparent studio sound' },
];

export const AUDIO_SAMPLE_RATE_OPTIONS: { value: AudioSampleRate; label: string }[] = [
  { value: 'original', label: 'Keep Original' },
  { value: '44100', label: '44.1 kHz (CD Quality)' },
  { value: '48000', label: '48 kHz (Broadcast / Video)' },
  { value: '96000', label: '96 kHz (High-Res)' },
];

/**
 * Validates whether an ArrayBuffer or Uint8Array has GIF magic bytes ('GIF87a' or 'GIF89a')
 */
export function isGifMagicBytes(buffer: ArrayBuffer | Uint8Array): boolean {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 6) return false;
  // GIF87a: 0x47 0x49 0x46 0x38 0x37 0x61
  // GIF89a: 0x47 0x49 0x46 0x38 0x39 0x61
  const isGifPrefix = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
  const isVersion = (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61;
  return isGifPrefix && isVersion;
}

/**
 * Validates GIF upload
 */
export function validateGifFile(file: { name: string; size: number }): { valid: boolean; error?: string } {
  if (!file.name) {
    return { valid: false, error: 'Please select a file to upload.' };
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'gif') {
    return { valid: false, error: `Invalid file type (.${ext}). Please select an animated .gif file.` };
  }
  if (file.size === 0) {
    return { valid: false, error: 'The selected GIF file is empty (0 bytes).' };
  }
  if (file.size > MAX_GIF_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 50 MB limit (${formatByteSize(file.size)}). Please choose a smaller GIF.`,
    };
  }
  return { valid: true };
}

/**
 * Supported video upload extensions
 */
export const SUPPORTED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'flv', 'wmv', 'm4v'];

/**
 * Validates Video upload
 */
export function validateVideoFile(file: { name: string; size: number }): { valid: boolean; error?: string } {
  if (!file.name) {
    return { valid: false, error: 'Please select a video file to upload.' };
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !SUPPORTED_VIDEO_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported video format (.${ext || 'unknown'}). Supported formats: ${SUPPORTED_VIDEO_EXTENSIONS.map((e) => `.${e}`).join(', ')}`,
    };
  }
  if (file.size === 0) {
    return { valid: false, error: 'The selected video file is empty (0 bytes).' };
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      error: `Video size exceeds the 100 MB limit (${formatByteSize(file.size)}). Please choose a smaller video.`,
    };
  }
  return { valid: true };
}

/**
 * Supported audio input extensions
 */
export const SUPPORTED_AUDIO_INPUT_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma', 'aiff', 'opus'];

/**
 * Validates Audio upload
 */
export function validateAudioFile(file: { name: string; size: number }): { valid: boolean; error?: string } {
  if (!file.name) {
    return { valid: false, error: 'Please select an audio file to upload.' };
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !SUPPORTED_AUDIO_INPUT_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported audio format (.${ext || 'unknown'}). Supported formats: ${SUPPORTED_AUDIO_INPUT_EXTENSIONS.map((e) => `.${e}`).join(', ')}`,
    };
  }
  if (file.size === 0) {
    return { valid: false, error: 'The selected audio file is empty (0 bytes).' };
  }
  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return {
      valid: false,
      error: `Audio file size exceeds the 75 MB limit (${formatByteSize(file.size)}). Please choose a smaller file.`,
    };
  }
  return { valid: true };
}

/**
 * Sanitizes and formats hex background color for FFmpeg
 * Accepts '#ffffff' or 'ffffff' or 'white' or '#1e293b'
 */
export function sanitizeFfmpegColor(color?: string): string {
  if (!color || color === 'default' || color === 'transparent') {
    return '0x000000'; // Default black background for MP4 video
  }
  const cleaned = color.trim().toLowerCase();
  if (cleaned.startsWith('#')) {
    const hex = cleaned.slice(1);
    if (/^[0-9a-f]{6}$/.test(hex)) {
      return `0x${hex}`;
    }
    if (/^[0-9a-f]{3}$/.test(hex)) {
      const expanded = hex.split('').map((c) => c + c).join('');
      return `0x${expanded}`;
    }
  }
  if (/^[0-9a-f]{6}$/.test(cleaned)) {
    return `0x${cleaned}`;
  }
  if (/^[a-z]+$/.test(cleaned)) {
    return cleaned;
  }
  return '0x000000';
}

/**
 * Builds FFmpeg CLI arguments for converting an animated GIF to MP4 video.
 * Handles odd pixel dimensions and transparency background blending.
 */
export function buildGifToMp4Args(
  inputName: string,
  outputName: string,
  options: GifToMp4Options = {}
): string[] {
  const { backgroundColor = '#ffffff', fps } = options;
  const ffmpegColor = sanitizeFfmpegColor(backgroundColor);

  // Filter graph:
  // 1. Format input as RGBA
  // 2. Generate a background matching color
  // 3. scale2ref matches background size to GIF size
  // 4. overlay composites transparent GIF frames over solid background
  // 5. scale=trunc(iw/2)*2:trunc(ih/2)*2 guarantees even dimensions required by H.264
  let filterGraph = `[0:v]format=rgba[fg];color=c=${ffmpegColor}[bg];[bg][fg]scale2ref[bg][fg];[bg][fg]overlay=shortest=1:format=auto,scale=trunc(iw/2)*2:trunc(ih/2)*2[out]`;

  if (fps && fps > 0) {
    filterGraph += `,fps=${fps}`;
  }

  return [
    '-i',
    inputName,
    '-filter_complex',
    filterGraph,
    '-map',
    '[out]',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputName,
  ];
}

/**
 * Validates MP4 to GIF segment boundaries and memory limits
 */
export function validateMp4ToGifSegment(
  startTime?: number,
  duration?: number,
  totalVideoDuration?: number
): { valid: boolean; error?: string } {
  if (startTime !== undefined && (isNaN(startTime) || startTime < 0)) {
    return { valid: false, error: 'Start time must be greater than or equal to 0 seconds.' };
  }

  if (duration !== undefined) {
    if (isNaN(duration) || duration <= 0) {
      return { valid: false, error: 'Segment duration must be greater than 0 seconds.' };
    }
    if (duration > MAX_MP4_TO_GIF_SEGMENT_SECONDS) {
      return {
        valid: false,
        error: `Segment duration cannot exceed ${MAX_MP4_TO_GIF_SEGMENT_SECONDS} seconds to protect browser memory.`,
      };
    }
  }

  if (startTime !== undefined && duration !== undefined && totalVideoDuration && totalVideoDuration > 0) {
    if (startTime >= totalVideoDuration) {
      return {
        valid: false,
        error: `Start time (${startTime.toFixed(1)}s) exceeds total video length (${totalVideoDuration.toFixed(1)}s).`,
      };
    }
    if (startTime + duration > totalVideoDuration + 0.5) {
      return {
        valid: false,
        error: `Selected segment (${startTime.toFixed(1)}s - ${(startTime + duration).toFixed(1)}s) exceeds total video duration (${totalVideoDuration.toFixed(1)}s).`,
      };
    }
  }

  return { valid: true };
}

/**
 * Builds FFmpeg CLI arguments for converting an MP4 video to high-quality animated GIF.
 * Uses palettegen and paletteuse for superior 256-color dithering and color preservation.
 */
export function buildMp4ToGifArgs(
  inputName: string,
  outputName: string,
  options: Mp4ToGifOptions = {}
): string[] {
  const { fps = 15, width = 480, startTime, duration } = options;
  const args: string[] = [];

  if (startTime !== undefined && startTime > 0) {
    args.push('-ss', startTime.toString());
  }

  if (duration !== undefined && duration > 0) {
    args.push('-t', duration.toString());
  }

  args.push('-i', inputName);

  // Lanczos scaling preserving aspect ratio + two-pass palettegen/paletteuse
  const filterGraph = `[0:v]fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a`;

  args.push('-filter_complex', filterGraph, outputName);
  return args;
}

/**
 * Checks if selected MP4 to GIF settings might create an oversized GIF file
 */
export function isLargeGifWarning(options: Mp4ToGifOptions, effectiveDuration?: number): {
  warning: boolean;
  message?: string;
} {
  const fps = options.fps || 15;
  const width = options.width || 480;
  const dur = options.duration || effectiveDuration || 5;

  if (width === 640 && dur > 8) {
    return {
      warning: true,
      message: 'High resolution (640px) over longer segments will create a large GIF (>20 MB). Consider 480px or a shorter clip.',
    };
  }

  if (fps === 20 && dur > 10) {
    return {
      warning: true,
      message: 'High frame rate (20 FPS) over 10+ seconds significantly increases GIF file size. 15 FPS is recommended.',
    };
  }

  if (dur > 15) {
    return {
      warning: true,
      message: 'Segment duration is over 15 seconds. GIFs store uncompressed frames and may exceed 25 MB.',
    };
  }

  return { warning: false };
}

/**
 * Builds FFmpeg CLI arguments for extracting audio from video to MP3.
 */
export function buildVideoToMp3Args(
  inputName: string,
  outputName: string,
  options: VideoToMp3Options = {}
): string[] {
  const { bitrate = '192k', channels } = options;

  const args = [
    '-i',
    inputName,
    '-vn', // Discard video stream
    '-c:a',
    'libmp3lame',
    '-b:a',
    bitrate,
  ];

  if (channels === '1') {
    args.push('-ac', '1');
  } else if (channels === '2') {
    args.push('-ac', '2');
  }

  args.push(outputName);
  return args;
}

/**
 * Builds FFmpeg CLI arguments for converting audio across supported formats.
 */
export function buildAudioConverterArgs(
  inputName: string,
  outputName: string,
  options: AudioConverterOptions
): string[] {
  const { targetFormat, bitrate = '192k', sampleRate = 'original', channels = 'original' } = options;

  const args = ['-i', inputName];

  switch (targetFormat) {
    case 'mp3':
      args.push('-c:a', 'libmp3lame', '-b:a', bitrate);
      break;
    case 'wav':
      args.push('-c:a', 'pcm_s16le');
      break;
    case 'm4a':
      args.push('-c:a', 'aac', '-b:a', bitrate);
      break;
    case 'ogg':
      args.push('-c:a', 'libvorbis', '-b:a', bitrate);
      break;
    case 'flac':
      args.push('-c:a', 'flac');
      break;
  }

  if (sampleRate !== 'original' && sampleRate) {
    args.push('-ar', sampleRate);
  }

  if (channels === '1') {
    args.push('-ac', '1');
  } else if (channels === '2') {
    args.push('-ac', '2');
  }

  args.push(outputName);
  return args;
}

/**
 * Generates the clean output filename based on input filename and desired extension.
 */
export function getConvertedFilename(inputName: string, targetExt: string): string {
  const base = inputName.replace(/\.[^/.]+$/, '');
  const cleanExt = targetExt.replace(/^\./, '').toLowerCase();
  return `${base}.${cleanExt}`;
}

/**
 * Maps format extension to standard browser MIME type
 */
export function getMimeTypeForExtension(ext: string): string {
  const clean = ext.replace(/^\./, '').toLowerCase();
  switch (clean) {
    case 'mp4':
      return 'video/mp4';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/mp4';
    case 'ogg':
      return 'audio/ogg';
    case 'flac':
      return 'audio/flac';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Returns an educational advisory when converting between lossy and lossless audio formats
 */
export function getAudioQualityNotice(sourceExt: string, targetFormat: SupportedAudioFormat): string | null {
  const sExt = sourceExt.replace(/^\./, '').toLowerCase();
  const lossyInputs = ['mp3', 'm4a', 'aac', 'ogg', 'wma', 'opus'];
  const isSourceLossy = lossyInputs.includes(sExt);
  const isTargetLossless = targetFormat === 'wav' || targetFormat === 'flac';

  if (isSourceLossy && isTargetLossless) {
    return `Note: Converting from a lossy format (${sExt.toUpperCase()}) to a lossless format (${targetFormat.toUpperCase()}) will increase file size, but cannot restore audio frequencies that were permanently discarded during original compression.`;
  }

  if (targetFormat === 'mp3' || targetFormat === 'ogg' || targetFormat === 'm4a') {
    return 'Lossy compression reduces file size by selectively discarding inaudible audio frequencies while maintaining high perceived quality.';
  }

  return null;
}

/**
 * Parses raw FFmpeg stderr logs to extract meaningful, human-friendly error messages
 */
export function parseFfmpegError(stderr: string, tool: 'gif-to-mp4' | 'mp4-to-gif' | 'video-to-mp3' | 'audio-converter'): string {
  if (!stderr) {
    return 'Conversion encountered an unexpected error.';
  }

  const lower = stderr.toLowerCase();

  if (tool === 'video-to-mp3') {
    if (
      lower.includes('does not contain any stream') ||
      lower.includes('matches no streams') ||
      lower.includes('no audio stream') ||
      lower.includes('output file #0 does not contain any stream')
    ) {
      return 'This video file does not contain an audio track to extract. Please select a video with recorded audio.';
    }
  }

  if (lower.includes('invalid data found when processing input') || lower.includes('corrupt input')) {
    return 'The input file appears to be corrupted, truncated, or formatted incorrectly.';
  }

  if (lower.includes('out of memory') || lower.includes('oom') || lower.includes('cannot allocate memory')) {
    return 'WebAssembly engine ran out of browser memory. Try closing unused browser tabs or processing a smaller file.';
  }

  if (lower.includes('unknown encoder') || lower.includes('codec not found')) {
    return 'The requested codec is not supported by the in-browser WebAssembly engine.';
  }

  // Look for FFmpeg error lines
  const lines = stderr.split('\n');
  const errorLines = lines.filter((l) => l.toLowerCase().includes('error') || l.toLowerCase().includes('failed'));
  if (errorLines.length > 0) {
    const lastErr = errorLines[errorLines.length - 1].trim();
    if (lastErr.length > 10 && lastErr.length < 150) {
      return lastErr;
    }
  }

  return 'Failed to convert file. Please verify the file is not damaged and try again.';
}

/**
 * Formats byte size into human-readable string (KB, MB, GB)
 */
export function formatByteSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
