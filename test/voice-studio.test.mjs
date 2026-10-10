import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMediaFile,
  formatByteSize,
  getSpeechStats,
  formatSrtTimestamp,
  formatVttTimestamp,
  formatDisplayTime,
  parseTimestampToSeconds,
  generateSrt,
  generateVtt,
  parseSrt,
  translateTextClientSide,
  MAX_VOICE_FILE_SIZE,
  SUPPORTED_LANGUAGES,
  SAMPLE_TTS_SCRIPTS,
  SAMPLE_TRANSCRIPT_SEGMENTS,
  createWavFromSamples,
  encodePcmToMp3,
  encodeFloat32ToMp3,
  createTestTonePcm,
  packagePcmAudio,
} from '../lib/voice-studio-utils.ts';
import { TOOLS_REGISTRY, POPULAR_TOOL_IDS } from '../lib/tools-registry.ts';

describe('Voice Studio - Media File Validation & Sizing', () => {
  test('rejects missing or empty files', () => {
    assert.equal(validateMediaFile(null).valid, false);
    assert.equal(validateMediaFile({ size: 0, name: 'empty.mp3' }).valid, false);
  });

  test('rejects files exceeding 100 MB limit', () => {
    const oversized = {
      name: 'large_recording.wav',
      size: MAX_VOICE_FILE_SIZE + 1024,
      type: 'audio/wav',
    };
    const result = validateMediaFile(oversized);
    assert.equal(result.valid, false);
    assert.ok(result.error.includes('100 MB'));
  });

  test('rejects unsupported extensions', () => {
    const invalidFile = {
      name: 'script.pdf',
      size: 500000,
      type: 'application/pdf',
    };
    const result = validateMediaFile(invalidFile);
    assert.equal(result.valid, false);
    assert.ok(result.error.includes('Unsupported media format'));
  });

  test('accepts valid audio files', () => {
    const mp3 = validateMediaFile({ name: 'podcast.mp3', size: 1024 * 1024, type: 'audio/mpeg' });
    const wav = validateMediaFile({ name: 'interview.wav', size: 2 * 1024 * 1024, type: 'audio/wav' });
    const m4a = validateMediaFile({ name: 'voice_memo.m4a', size: 500 * 1024, type: 'audio/m4a' });
    assert.equal(mp3.valid, true);
    assert.equal(wav.valid, true);
    assert.equal(m4a.valid, true);
  });

  test('accepts valid video files', () => {
    const mp4 = validateMediaFile({ name: 'presentation.mp4', size: 15 * 1024 * 1024, type: 'video/mp4' });
    const webm = validateMediaFile({ name: 'screen_recording.webm', size: 8 * 1024 * 1024, type: 'video/webm' });
    assert.equal(mp4.valid, true);
    assert.equal(webm.valid, true);
  });

  test('formats byte sizes accurately', () => {
    assert.equal(formatByteSize(0), '0 B');
    assert.equal(formatByteSize(1024), '1 KB');
    assert.equal(formatByteSize(1024 * 1024 * 2.5), '2.5 MB');
  });
});

describe('Voice Studio - Speech Statistics & Duration Calculation', () => {
  test('returns zeros for empty text', () => {
    const stats = getSpeechStats('');
    assert.equal(stats.characterCount, 0);
    assert.equal(stats.wordCount, 0);
    assert.equal(stats.estimatedSeconds, 0);
    assert.equal(stats.estimatedDurationLabel, '0 sec');
  });

  test('accurately counts characters and words', () => {
    const text = 'Welcome to ASAPTools Voice Studio.';
    const stats = getSpeechStats(text, 150);
    assert.equal(stats.characterCount, 34);
    assert.equal(stats.characterCountNoSpaces, 30);
    assert.equal(stats.wordCount, 5);
    assert.ok(stats.estimatedSeconds >= 1);
  });

  test('formats duration into seconds and minutes correctly', () => {
    // 150 words at 150 WPM = 60 seconds (1 min)
    const longText = new Array(150).fill('word').join(' ');
    const stats = getSpeechStats(longText, 150);
    assert.equal(stats.wordCount, 150);
    assert.equal(stats.estimatedSeconds, 60);
    assert.equal(stats.estimatedDurationLabel, '1 min');

    // 225 words at 150 WPM = 90 seconds (1m 30s)
    const longerText = new Array(225).fill('word').join(' ');
    const longerStats = getSpeechStats(longerText, 150);
    assert.equal(longerStats.estimatedSeconds, 90);
    assert.equal(longerStats.estimatedDurationLabel, '1m 30s');
  });
});

describe('Voice Studio - Timestamp Formatting & Parsing', () => {
  test('formats SRT timestamp with commas for milliseconds', () => {
    assert.equal(formatSrtTimestamp(0), '00:00:00,000');
    assert.equal(formatSrtTimestamp(1.25), '00:00:01,250');
    assert.equal(formatSrtTimestamp(65.5), '00:01:05,500');
    assert.equal(formatSrtTimestamp(3661.123), '01:01:01,123');
  });

  test('formats WebVTT timestamp with periods for milliseconds', () => {
    assert.equal(formatVttTimestamp(0), '00:00:00.000');
    assert.equal(formatVttTimestamp(1.25), '00:00:01.250');
    assert.equal(formatVttTimestamp(72.8), '00:01:12.800');
  });

  test('formats display time for audio player', () => {
    assert.equal(formatDisplayTime(0), '00:00');
    assert.equal(formatDisplayTime(45), '00:45');
    assert.equal(formatDisplayTime(125), '02:05');
    assert.equal(formatDisplayTime(3665), '1:01:05');
  });

  test('parses timestamp strings back into float seconds', () => {
    assert.equal(parseTimestampToSeconds('00:00:01,250'), 1.25);
    assert.equal(parseTimestampToSeconds('00:01:05.500'), 65.5);
    assert.equal(parseTimestampToSeconds('01:01:01,000'), 3661);
  });
});

describe('Voice Studio - Subtitle Generation & Parsing (SRT & VTT)', () => {
  test('generates valid SRT formatted string from segments', () => {
    const segments = [
      { id: '1', start: 0, end: 2.5, text: 'First line.' },
      { id: '2', start: 2.8, end: 5.0, text: 'Second line.' },
    ];
    const srt = generateSrt(segments);
    assert.ok(srt.includes('1\n00:00:00,000 --> 00:00:02,500\nFirst line.'));
    assert.ok(srt.includes('2\n00:00:02,800 --> 00:00:05,000\nSecond line.'));
  });

  test('generates valid WebVTT header and cue structure', () => {
    const segments = [{ id: '1', start: 1.0, end: 3.5, text: 'Hello VTT.' }];
    const vtt = generateVtt(segments);
    assert.ok(vtt.startsWith('WEBVTT\n\n'));
    assert.ok(vtt.includes('00:00:01.000 --> 00:00:03.500'));
    assert.ok(vtt.includes('Hello VTT.'));
  });

  test('parses SRT text back into structured segments', () => {
    const srt = `1
00:00:01,000 --> 00:00:04,500
Hello world

2
00:00:05,000 --> 00:00:08,200
Welcome to Voice Studio`;

    const parsed = parseSrt(srt);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].start, 1.0);
    assert.equal(parsed[0].end, 4.5);
    assert.equal(parsed[0].text, 'Hello world');
    assert.equal(parsed[1].start, 5.0);
    assert.equal(parsed[1].end, 8.2);
    assert.equal(parsed[1].text, 'Welcome to Voice Studio');
  });

  test('handles empty or blank subtitle arrays cleanly', () => {
    assert.equal(generateSrt([]), '');
    assert.equal(generateVtt([]), 'WEBVTT\n\n');
    assert.deepEqual(parseSrt(''), []);
  });
});

describe('Voice Studio - Translation & Dubbing Logic', () => {
  test('matches offline dictionary translations accurately', () => {
    const translatedEs = translateTextClientSide('Welcome to ASAPTools Voice Studio', 'es');
    assert.equal(translatedEs, 'Bienvenido a ASAPTools Voice Studio.');

    const translatedFr = translateTextClientSide('Hello world', 'fr');
    assert.equal(translatedFr, 'Bonjour le monde.');

    const translatedJa = translateTextClientSide('Thank you for using ASAPTools', 'ja');
    assert.equal(translatedJa, 'ASAPToolsをご利用いただきありがとうございます。');
  });

  test('provides formatted translation review template for arbitrary text', () => {
    const custom = translateTextClientSide('Custom unmapped technical sentence', 'de');
    assert.ok(custom.includes('[German Translation]'));
    assert.ok(custom.includes('Custom unmapped technical sentence'));
  });

  test('provides 9 supported dubbing languages', () => {
    assert.equal(SUPPORTED_LANGUAGES.length, 9);
    assert.ok(SUPPORTED_LANGUAGES.some((l) => l.code === 'es'));
    assert.ok(SUPPORTED_LANGUAGES.some((l) => l.code === 'fr'));
    assert.ok(SUPPORTED_LANGUAGES.some((l) => l.code === 'hi'));
    assert.ok(SUPPORTED_LANGUAGES.some((l) => l.code === 'ja'));
  });

  test('provides valid sample TTS scripts and transcript segments', () => {
    assert.ok(SAMPLE_TTS_SCRIPTS.length >= 3);
    assert.ok(SAMPLE_TTS_SCRIPTS[0].text.length > 20);
    assert.ok(SAMPLE_TRANSCRIPT_SEGMENTS.length >= 3);
    assert.ok(SAMPLE_TRANSCRIPT_SEGMENTS[0].end > SAMPLE_TRANSCRIPT_SEGMENTS[0].start);
  });
});

describe('Voice Studio - Registry & Popular Tools Integration', () => {
  test('is registered in TOOLS_REGISTRY with category media and status available', () => {
    const tool = TOOLS_REGISTRY.find((t) => t.id === 'voice-studio');
    assert.ok(tool, 'voice-studio should exist in TOOLS_REGISTRY');
    assert.equal(tool.category, 'media');
    assert.equal(tool.status, 'available');
    assert.equal(tool.slug, '/tools/voice-studio');
    assert.equal(tool.icon, 'mic');
    assert.ok(tool.keywords.includes('text to speech'));
    assert.ok(tool.keywords.includes('transcription'));
  });

  test('is included in POPULAR_TOOL_IDS', () => {
    assert.ok(
      POPULAR_TOOL_IDS.includes('voice-studio'),
      'voice-studio should be featured in POPULAR_TOOL_IDS'
    );
  });
});

describe('Voice Studio - Real MP3 Audio Encoding & Packaging', () => {
  // NOTE: Automated tests verify binary structure, RIFF headers, and MPEG sync frames.
  // Human speech intelligibility cannot be evaluated by unit tests and requires acoustic listening.

  test('encodes 16-bit PCM audio samples into valid MPEG Audio Layer III (MP3) frames', () => {
    const sampleRate = 22050;
    const testSamples = createTestTonePcm(440, 1.0, sampleRate, 0.5);
    const mp3Buffer = encodePcmToMp3(testSamples, sampleRate, 128);

    assert.ok(mp3Buffer.length > 1000, 'MP3 buffer should contain encoded frames (> 1 KB)');

    // Verify standard MPEG Audio frame sync word (0xFF and top 3 bits of byte 1 set)
    const b0 = mp3Buffer[0];
    const b1 = mp3Buffer[1];
    const isMpegSync = b0 === 0xFF && (b1 & 0xE0) === 0xE0;
    assert.ok(
      isMpegSync,
      `First two bytes [0x${b0.toString(16)}, 0x${b1.toString(16)}] must be MPEG sync word`
    );
  });

  test('encodes Web Audio Float32Array into valid MP3 bytes', () => {
    const sampleRate = 44100;
    const floatSamples = new Float32Array(sampleRate); // 1 second
    for (let i = 0; i < floatSamples.length; i++) {
      floatSamples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5;
    }

    const mp3Buffer = encodeFloat32ToMp3(floatSamples, sampleRate, 128);
    assert.ok(mp3Buffer.length > 2000, 'Float32 audio must encode to valid MP3 bytes');
    const isMpegSync = mp3Buffer[0] === 0xFF && (mp3Buffer[1] & 0xE0) === 0xE0;
    assert.ok(isMpegSync, 'Float32 MP3 must begin with MPEG sync header');
  });

  test('creates valid standard RIFF WAVE headers', () => {
    const sampleRate = 22050;
    const testSamples = createTestTonePcm(880, 0.5, sampleRate, 0.5);
    const wav = createWavFromSamples(testSamples, sampleRate);

    // Verify RIFF and WAVE magic headers
    const tagRiff = String.fromCharCode(wav[0], wav[1], wav[2], wav[3]);
    const tagWave = String.fromCharCode(wav[8], wav[9], wav[10], wav[11]);
    const tagFmt = String.fromCharCode(wav[12], wav[13], wav[14], wav[15]);
    const tagData = String.fromCharCode(wav[36], wav[37], wav[38], wav[39]);

    assert.equal(tagRiff, 'RIFF');
    assert.equal(tagWave, 'WAVE');
    assert.equal(tagFmt, 'fmt ');
    assert.equal(tagData, 'data');

    // Verify data chunk size matches samples byte length
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    const dataSize = view.getUint32(40, true);
    assert.equal(dataSize, testSamples.length * 2);
  });

  test('generates calibrated sinusoidal test tones with expected sample counts', () => {
    const tone = createTestTonePcm(440, 2.0, 22050, 0.5);
    assert.equal(tone.length, 44100, '2 seconds at 22050 Hz should equal 44100 samples');

    // Peak amplitude should not exceed volume limit (0.5 * 32767 ≈ 16383)
    let maxAmp = 0;
    for (let i = 0; i < tone.length; i++) {
      const abs = Math.abs(tone[i]);
      if (abs > maxAmp) maxAmp = abs;
    }
    assert.ok(maxAmp > 10000 && maxAmp <= 16384, `Peak amplitude should be near 16383, was ${maxAmp}`);
  });

  test('packages PCM audio into both MP3 and WAV with duration metadata', () => {
    const sampleRate = 22050;
    const samples = createTestTonePcm(440, 1.5, sampleRate, 0.5);
    const result = packagePcmAudio(samples, { sampleRate, bitrate: 128 });

    assert.equal(result.sampleRate, 22050);
    assert.equal(result.durationSeconds, 1.5);
    assert.ok(result.byteSize > 1000, 'MP3 byte size should be > 1 KB');
    assert.ok(result.mp3Buffer.length > 0);
    assert.ok(result.wavBuffer.length > samples.length * 2);
  });

  test('gracefully handles empty sample arrays without crashing', () => {
    const emptyPcm = new Int16Array(0);
    const emptyMp3 = encodePcmToMp3(emptyPcm);
    assert.equal(emptyMp3.length, 0);

    const emptyFloat = new Float32Array(0);
    const emptyFloatMp3 = encodeFloat32ToMp3(emptyFloat);
    assert.equal(emptyFloatMp3.length, 0);

    assert.throws(() => {
      packagePcmAudio(emptyPcm);
    }, /Cannot package empty audio samples/);
  });
});
