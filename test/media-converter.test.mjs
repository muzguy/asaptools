import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import {
  MAX_GIF_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  MAX_AUDIO_SIZE_BYTES,
  AUDIO_FORMAT_CONFIGS,
  AUDIO_BITRATE_OPTIONS,
  isGifMagicBytes,
  validateGifFile,
  validateVideoFile,
  validateAudioFile,
  sanitizeFfmpegColor,
  buildGifToMp4Args,
  buildMp4ToGifArgs,
  validateMp4ToGifSegment,
  isLargeGifWarning,
  MAX_MP4_TO_GIF_SEGMENT_SECONDS,
  buildVideoToMp3Args,
  buildAudioConverterArgs,
  getConvertedFilename,
  getMimeTypeForExtension,
  getAudioQualityNotice,
  parseFfmpegError,
  formatByteSize,
} from '../lib/media-converter-utils.ts';

const require = createRequire(import.meta.url);

describe('Media Converter - File Validation & Limits', () => {
  test('defines valid format configurations and bitrate options', () => {
    assert.deepEqual(Object.keys(AUDIO_FORMAT_CONFIGS), ['mp3', 'wav', 'm4a', 'ogg', 'flac']);
    assert.equal(AUDIO_FORMAT_CONFIGS.wav.isLossless, true);
    assert.equal(AUDIO_FORMAT_CONFIGS.flac.isLossless, true);
    assert.equal(AUDIO_FORMAT_CONFIGS.mp3.isLossless, false);
    assert.ok(AUDIO_BITRATE_OPTIONS.some((b) => b.value === '192k'));
    assert.ok(AUDIO_BITRATE_OPTIONS.some((b) => b.value === '320k'));
  });

  test('validates animated GIF files properly', () => {
    // Valid GIF
    assert.deepEqual(validateGifFile({ name: 'animation.gif', size: 1024 * 1024 }), { valid: true });
    assert.deepEqual(validateGifFile({ name: 'my_clip.GIF', size: 5000 }), { valid: true });

    // Invalid extension
    assert.equal(validateGifFile({ name: 'photo.jpg', size: 1024 }).valid, false);
    assert.match(validateGifFile({ name: 'photo.png', size: 1024 }).error || '', /Invalid file type/);

    // Empty file
    assert.equal(validateGifFile({ name: 'empty.gif', size: 0 }).valid, false);
    assert.match(validateGifFile({ name: 'empty.gif', size: 0 }).error || '', /empty \(0 bytes\)/);

    // Exceeding size limit
    assert.equal(validateGifFile({ name: 'huge.gif', size: MAX_GIF_SIZE_BYTES + 1 }).valid, false);
    assert.match(validateGifFile({ name: 'huge.gif', size: MAX_GIF_SIZE_BYTES + 1 }).error || '', /exceeds the 50 MB limit/);
  });

  test('detects GIF87a and GIF89a magic bytes correctly', () => {
    // GIF87a: 47 49 46 38 37 61
    const gif87 = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00, 0x00]);
    assert.equal(isGifMagicBytes(gif87), true);

    // GIF89a: 47 49 46 38 39 61
    const gif89 = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);
    assert.equal(isGifMagicBytes(gif89), true);

    // PNG: 89 50 4E 47
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    assert.equal(isGifMagicBytes(png), false);

    // Truncated / empty
    assert.equal(isGifMagicBytes(new Uint8Array([0x47, 0x49])), false);
  });

  test('validates video file uploads', () => {
    // Valid video containers
    assert.deepEqual(validateVideoFile({ name: 'recording.mp4', size: 5 * 1024 * 1024 }), { valid: true });
    assert.deepEqual(validateVideoFile({ name: 'clip.webm', size: 10 * 1024 * 1024 }), { valid: true });
    assert.deepEqual(validateVideoFile({ name: 'raw.mov', size: 2 * 1024 * 1024 }), { valid: true });
    assert.deepEqual(validateVideoFile({ name: 'movie.mkv', size: 50 * 1024 * 1024 }), { valid: true });

    // Invalid format
    assert.equal(validateVideoFile({ name: 'document.pdf', size: 1024 }).valid, false);
    assert.match(validateVideoFile({ name: 'song.mp3', size: 1024 }).error || '', /Unsupported video format/);

    // Empty video
    assert.equal(validateVideoFile({ name: 'test.mp4', size: 0 }).valid, false);

    // Exceeding 100 MB limit
    assert.equal(validateVideoFile({ name: 'giant.mp4', size: MAX_VIDEO_SIZE_BYTES + 1 }).valid, false);
    assert.match(validateVideoFile({ name: 'giant.mp4', size: MAX_VIDEO_SIZE_BYTES + 1 }).error || '', /exceeds the 100 MB limit/);
  });

  test('validates audio file uploads', () => {
    // Valid audio files
    assert.deepEqual(validateAudioFile({ name: 'song.mp3', size: 4 * 1024 * 1024 }), { valid: true });
    assert.deepEqual(validateAudioFile({ name: 'sound.wav', size: 12 * 1024 * 1024 }), { valid: true });
    assert.deepEqual(validateAudioFile({ name: 'audio.ogg', size: 3 * 1024 * 1024 }), { valid: true });
    assert.deepEqual(validateAudioFile({ name: 'track.flac', size: 25 * 1024 * 1024 }), { valid: true });

    // Unsupported
    assert.equal(validateAudioFile({ name: 'app.exe', size: 1024 }).valid, false);
    assert.equal(validateAudioFile({ name: 'silent.mp3', size: 0 }).valid, false);

    // Exceeding 75 MB limit
    assert.equal(validateAudioFile({ name: 'huge.wav', size: MAX_AUDIO_SIZE_BYTES + 1 }).valid, false);
  });
});

describe('Media Converter - Color & Option Sanitization', () => {
  test('sanitizes background colors for FFmpeg filters', () => {
    assert.equal(sanitizeFfmpegColor('#ffffff'), '0xffffff');
    assert.equal(sanitizeFfmpegColor('ffffff'), '0xffffff');
    assert.equal(sanitizeFfmpegColor('#000'), '0x000000');
    assert.equal(sanitizeFfmpegColor('#0f172a'), '0x0f172a');
    assert.equal(sanitizeFfmpegColor('white'), 'white');
    assert.equal(sanitizeFfmpegColor('black'), 'black');
    assert.equal(sanitizeFfmpegColor('default'), '0x000000');
    assert.equal(sanitizeFfmpegColor(''), '0x000000');
    assert.equal(sanitizeFfmpegColor(undefined), '0x000000');
  });

  test('formats byte sizes cleanly', () => {
    assert.equal(formatByteSize(0), '0 B');
    assert.equal(formatByteSize(512), '512 B');
    assert.equal(formatByteSize(1024), '1.0 KB');
    assert.equal(formatByteSize(5 * 1024 * 1024), '5.0 MB');
  });

  test('generates converted filenames properly', () => {
    assert.equal(getConvertedFilename('my_cat.gif', 'mp4'), 'my_cat.mp4');
    assert.equal(getConvertedFilename('lecture.final.webm', 'mp3'), 'lecture.final.mp3');
    assert.equal(getConvertedFilename('audio_track.wav', '.flac'), 'audio_track.flac');
  });

  test('maps file extensions to standard MIME types', () => {
    assert.equal(getMimeTypeForExtension('mp4'), 'video/mp4');
    assert.equal(getMimeTypeForExtension('mp3'), 'audio/mpeg');
    assert.equal(getMimeTypeForExtension('wav'), 'audio/wav');
    assert.equal(getMimeTypeForExtension('ogg'), 'audio/ogg');
    assert.equal(getMimeTypeForExtension('m4a'), 'audio/mp4');
    assert.equal(getMimeTypeForExtension('flac'), 'audio/flac');
  });
});

describe('Media Converter - Argument Construction', () => {
  test('builds GIF to MP4 arguments with scale and background overlay', () => {
    const args = buildGifToMp4Args('input.gif', 'output.mp4', {
      backgroundColor: '#ffffff',
    });

    assert.equal(args[0], '-i');
    assert.equal(args[1], 'input.gif');
    assert.ok(args.includes('-filter_complex'));
    // Verify even dimension scale filter is present
    const filterIdx = args.indexOf('-filter_complex') + 1;
    assert.ok(args[filterIdx].includes('scale=trunc(iw/2)*2:trunc(ih/2)*2'));
    assert.ok(args[filterIdx].includes('color=c=0xffffff'));
    assert.ok(args.includes('-c:v'));
    assert.ok(args.includes('libx264'));
    assert.ok(args.includes('-pix_fmt'));
    assert.ok(args.includes('yuv420p'));
    assert.ok(args.includes('+faststart'));
    assert.equal(args[args.length - 1], 'output.mp4');
  });

  test('builds GIF to MP4 arguments with custom FPS cap', () => {
    const args = buildGifToMp4Args('anim.gif', 'anim.mp4', {
      backgroundColor: '#000000',
      fps: 30,
    });

    const filterIdx = args.indexOf('-filter_complex') + 1;
    assert.ok(args[filterIdx].includes('fps=30'));
  });

  test('builds Video to MP3 extraction arguments', () => {
    const args192 = buildVideoToMp3Args('input.mp4', 'output.mp3', { bitrate: '192k' });
    assert.deepEqual(args192, [
      '-i', 'input.mp4',
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      'output.mp3',
    ]);

    const args320Mono = buildVideoToMp3Args('stream.webm', 'stream.mp3', {
      bitrate: '320k',
      channels: '1',
    });
    assert.deepEqual(args320Mono, [
      '-i', 'stream.webm',
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', '320k',
      '-ac', '1',
      'stream.mp3',
    ]);
  });

  test('builds Audio Converter arguments across all supported codecs', () => {
    // MP3
    const mp3Args = buildAudioConverterArgs('in.wav', 'out.mp3', {
      targetFormat: 'mp3',
      bitrate: '320k',
    });
    assert.ok(mp3Args.includes('libmp3lame'));
    assert.ok(mp3Args.includes('320k'));

    // WAV
    const wavArgs = buildAudioConverterArgs('in.mp3', 'out.wav', {
      targetFormat: 'wav',
      sampleRate: '44100',
    });
    assert.ok(wavArgs.includes('pcm_s16le'));
    assert.ok(wavArgs.includes('-ar'));
    assert.ok(wavArgs.includes('44100'));

    // OGG
    const oggArgs = buildAudioConverterArgs('in.wav', 'out.ogg', {
      targetFormat: 'ogg',
      bitrate: '192k',
    });
    assert.ok(oggArgs.includes('libvorbis'));

    // M4A
    const m4aArgs = buildAudioConverterArgs('in.wav', 'out.m4a', {
      targetFormat: 'm4a',
      bitrate: '256k',
    });
    assert.ok(m4aArgs.includes('aac'));

    // FLAC
    const flacArgs = buildAudioConverterArgs('in.wav', 'out.flac', {
      targetFormat: 'flac',
    });
    assert.ok(flacArgs.includes('flac'));
  });

  test('builds MP4 to GIF arguments with palettegen/paletteuse and scaling', () => {
    const defaultArgs = buildMp4ToGifArgs('input.mp4', 'output.gif', {
      fps: 15,
      width: 480,
    });

    assert.equal(defaultArgs[0], '-i');
    assert.equal(defaultArgs[1], 'input.mp4');
    assert.ok(defaultArgs.includes('-filter_complex'));
    const filter = defaultArgs[defaultArgs.indexOf('-filter_complex') + 1];
    assert.ok(filter.includes('fps=15'));
    assert.ok(filter.includes('scale=480:-1:flags=lanczos'));
    assert.ok(filter.includes('palettegen=stats_mode=full'));
    assert.ok(filter.includes('paletteuse=dither=sierra2_4a'));
    assert.equal(defaultArgs[defaultArgs.length - 1], 'output.gif');
  });

  test('builds MP4 to GIF arguments with start time and duration segment trimming', () => {
    const trimArgs = buildMp4ToGifArgs('clip.mp4', 'clip.gif', {
      fps: 20,
      width: 320,
      startTime: 3.5,
      duration: 4,
    });

    assert.equal(trimArgs[0], '-ss');
    assert.equal(trimArgs[1], '3.5');
    assert.equal(trimArgs[2], '-t');
    assert.equal(trimArgs[3], '4');
    assert.equal(trimArgs[4], '-i');
    assert.equal(trimArgs[5], 'clip.mp4');
    const filter = trimArgs[trimArgs.indexOf('-filter_complex') + 1];
    assert.ok(filter.includes('fps=20'));
    assert.ok(filter.includes('scale=320:-1:flags=lanczos'));
  });
});

describe('Media Converter - MP4 to GIF Segment Validation & Large Output Warnings', () => {
  test('validates valid segments accurately', () => {
    assert.deepEqual(validateMp4ToGifSegment(0, 5, 20), { valid: true });
    assert.deepEqual(validateMp4ToGifSegment(10.5, 3, 30), { valid: true });
    assert.deepEqual(validateMp4ToGifSegment(undefined, undefined, 10), { valid: true });
  });

  test('rejects negative start time or non-numeric inputs', () => {
    assert.equal(validateMp4ToGifSegment(-1, 5, 10).valid, false);
    assert.match(validateMp4ToGifSegment(-1, 5, 10).error || '', /Start time must be greater than or equal to 0/);
  });

  test('rejects zero or negative segment duration', () => {
    assert.equal(validateMp4ToGifSegment(0, 0, 10).valid, false);
    assert.equal(validateMp4ToGifSegment(0, -2, 10).valid, false);
    assert.match(validateMp4ToGifSegment(0, 0, 10).error || '', /Segment duration must be greater than 0/);
  });

  test('rejects duration exceeding maximum memory safety ceiling (30s)', () => {
    assert.equal(validateMp4ToGifSegment(0, MAX_MP4_TO_GIF_SEGMENT_SECONDS + 1, 60).valid, false);
    assert.match(
      validateMp4ToGifSegment(0, MAX_MP4_TO_GIF_SEGMENT_SECONDS + 1, 60).error || '',
      /cannot exceed 30 seconds/
    );
  });

  test('rejects start time exceeding total video duration', () => {
    assert.equal(validateMp4ToGifSegment(15, 2, 10).valid, false);
    assert.match(validateMp4ToGifSegment(15, 2, 10).error || '', /Start time .* exceeds total video length/);
  });

  test('rejects segment range exceeding video duration', () => {
    assert.equal(validateMp4ToGifSegment(8, 5, 10).valid, false);
    assert.match(validateMp4ToGifSegment(8, 5, 10).error || '', /Selected segment .* exceeds total video duration/);
  });

  test('warns when settings will produce oversized GIFs', () => {
    // 640px wide over 9 seconds
    assert.equal(isLargeGifWarning({ width: 640, duration: 9 }).warning, true);
    // 20 fps over 12 seconds
    assert.equal(isLargeGifWarning({ fps: 20, duration: 12 }).warning, true);
    // duration over 16 seconds
    assert.equal(isLargeGifWarning({ duration: 18 }).warning, true);
    // modest settings (480px, 15fps, 5s)
    assert.equal(isLargeGifWarning({ width: 480, fps: 15, duration: 5 }).warning, false);
  });
});

describe('Media Converter - Educational Quality Notices & Error Parsing', () => {
  test('notifies user when converting lossy to lossless format', () => {
    const noticeMp3ToWav = getAudioQualityNotice('mp3', 'wav');
    assert.ok(noticeMp3ToWav?.includes('cannot restore audio frequencies'));

    const noticeM4aToFlac = getAudioQualityNotice('m4a', 'flac');
    assert.ok(noticeM4aToFlac?.includes('cannot restore audio frequencies'));

    const noticeWavToFlac = getAudioQualityNotice('wav', 'flac');
    assert.equal(noticeWavToFlac, null);
  });

  test('parses video-without-audio error into friendly message', () => {
    const stderr1 = 'Output file #0 does not contain any stream';
    const msg1 = parseFfmpegError(stderr1, 'video-to-mp3');
    assert.match(msg1, /does not contain an audio track/i);

    const stderr2 = 'Stream map matches no streams';
    const msg2 = parseFfmpegError(stderr2, 'video-to-mp3');
    assert.match(msg2, /does not contain an audio track/i);
  });

  test('parses corrupted file and memory errors', () => {
    assert.match(
      parseFfmpegError('Invalid data found when processing input', 'gif-to-mp4'),
      /corrupted, truncated, or formatted incorrectly/i
    );

    assert.match(
      parseFfmpegError('Cannot allocate memory, aborting', 'audio-converter'),
      /out of browser memory/i
    );
  });
});

describe('Media Converter - Real WebAssembly Smoke Test (Node Engine Verification)', () => {
  test('genuinely encodes synthetic PCM WAV to genuine MP3 with LAME codec', async () => {
    // Provide self environment expected by UMD wrapper
    global.self = { location: { href: 'http://localhost:3000/workers/media-converter.worker.js' } };

    const corePath = path.resolve(process.cwd(), 'public/ffmpeg/ffmpeg-core.js');
    const wasmPath = path.resolve(process.cwd(), 'public/ffmpeg/ffmpeg-core.wasm');

    assert.ok(fs.existsSync(corePath), 'ffmpeg-core.js must exist in public/ffmpeg/');
    assert.ok(fs.existsSync(wasmPath), 'ffmpeg-core.wasm must exist in public/ffmpeg/');

    const coreFactory = require(corePath);
    const wasmBinary = fs.readFileSync(wasmPath);

    // Verify wasm binary is ~32 MB
    assert.ok(wasmBinary.length > 30 * 1024 * 1024, 'ffmpeg-core.wasm size should be > 30 MB');

    const core = await coreFactory({ wasmBinary });
    assert.ok(core.FS, 'Emscripten FS should be initialized');
    assert.equal(typeof core.exec, 'function', 'core.exec should be a callable function');

    // Generate 0.1-second 44.1kHz mono sine wave in memory (4410 samples)
    const sampleRate = 44100;
    const numSamples = 4410;
    const dataSize = numSamples * 2;
    const wavBuffer = Buffer.alloc(44 + dataSize);

    // RIFF header
    wavBuffer.write('RIFF', 0);
    wavBuffer.writeUInt32LE(36 + dataSize, 4);
    wavBuffer.write('WAVE', 8);
    wavBuffer.write('fmt ', 12);
    wavBuffer.writeUInt32LE(16, 16);
    wavBuffer.writeUInt16LE(1, 20); // PCM format
    wavBuffer.writeUInt16LE(1, 22); // mono
    wavBuffer.writeUInt32LE(sampleRate, 24);
    wavBuffer.writeUInt32LE(sampleRate * 2, 28);
    wavBuffer.writeUInt16LE(2, 32);
    wavBuffer.writeUInt16LE(16, 34);
    wavBuffer.write('data', 36);
    wavBuffer.writeUInt32LE(dataSize, 40);

    for (let i = 0; i < numSamples; i++) {
      const sample = Math.floor(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 12000);
      wavBuffer.writeInt16LE(sample, 44 + i * 2);
    }

    const inName = 'test_smoke.wav';
    const outName = 'test_smoke.mp3';

    core.FS.writeFile(inName, wavBuffer);

    // Run real conversion
    const ret = core.exec('-i', inName, '-c:a', 'libmp3lame', '-b:a', '192k', outName);
    assert.equal(ret, 0, 'FFmpeg conversion exit code must be 0');

    const mp3Bytes = core.FS.readFile(outName);
    assert.ok(mp3Bytes.length > 500, 'Produced MP3 file must contain valid encoded frames');

    // Clean up
    core.FS.unlink(inName);
    core.FS.unlink(outName);
  });

  test('genuinely encodes synthetic MP4 video to genuine animated GIF with palettegen/paletteuse', async () => {
    global.self = { location: { href: 'http://localhost:3000/workers/media-converter.worker.js' } };

    const corePath = path.resolve(process.cwd(), 'public/ffmpeg/ffmpeg-core.js');
    const wasmPath = path.resolve(process.cwd(), 'public/ffmpeg/ffmpeg-core.wasm');

    const coreFactory = require(corePath);
    const wasmBinary = fs.readFileSync(wasmPath);
    const core = await coreFactory({ wasmBinary });

    // 1. Generate a 1-second 160x120 synthetic MP4 video in memory
    const genVideoRet = core.exec(
      '-f', 'lavfi',
      '-i', 'testsrc=duration=1:size=160x120:rate=10',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      'synth_input.mp4'
    );
    assert.equal(genVideoRet, 0, 'Synthetic MP4 video generation must succeed');

    const mp4Bytes = core.FS.readFile('synth_input.mp4');
    assert.ok(mp4Bytes.length > 1000, 'Synthetic MP4 must be valid non-empty video file');

    // 2. Run real MP4 -> GIF conversion using buildMp4ToGifArgs
    const gifArgs = buildMp4ToGifArgs('synth_input.mp4', 'synth_output.gif', {
      fps: 10,
      width: 320,
    });

    const retGif = core.exec(...gifArgs);
    assert.equal(retGif, 0, 'MP4 to GIF conversion return code must be 0');

    // 3. Verify produced GIF bytes and magic bytes
    const gifBytes = core.FS.readFile('synth_output.gif');
    assert.ok(gifBytes.length > 1000, 'Produced GIF must contain valid data');
    assert.equal(isGifMagicBytes(gifBytes), true, 'Output must start with valid GIF87a/GIF89a magic bytes');

    // 4. Test MP4 -> GIF with start time and duration segment trimming
    const segArgs = buildMp4ToGifArgs('synth_input.mp4', 'synth_seg.gif', {
      fps: 10,
      width: 320,
      startTime: 0.2,
      duration: 0.4,
    });
    const retSeg = core.exec(...segArgs);
    assert.equal(retSeg, 0, 'MP4 segment to GIF conversion return code must be 0');

    const segBytes = core.FS.readFile('synth_seg.gif');
    assert.ok(segBytes.length > 500, 'Segment GIF must contain valid data');
    assert.equal(isGifMagicBytes(segBytes), true, 'Segment GIF must have valid GIF magic bytes');

    // Clean up
    core.FS.unlink('synth_input.mp4');
    core.FS.unlink('synth_output.gif');
    core.FS.unlink('synth_seg.gif');
  });
});
