/**
 * ASAPTools Client-Side MP3 & WAV Audio Processing Utilities
 *
 * Provides real, browser-compatible LAME MP3 encoding and RIFF WAVE packaging
 * for raw PCM audio data, completely client-side with zero external uploads.
 *
 * NOTE ON SPEECH SYNTHESIS & DOWNLOADABLE AUDIO:
 * Modern browsers provide native, high-quality speech synthesis via the W3C
 * Web Speech API (window.speechSynthesis). However, by specification, browser
 * speech synthesis streams directly to operating system hardware output and
 * does NOT expose raw audio sample buffers to JavaScript for direct MP3 file export.
 *
 * Neural client-side TTS engines (such as Piper or Kokoro) require 65 MB - 100 MB+
 * of ONNX model weights and WebAssembly phonemizer data, which cannot be bundled
 * into the initial web application bundle.
 *
 * This module handles pure audio encoding (PCM -> MP3 / WAV). It does NOT
 * attempt to generate fake pseudo-speech via crude tone/formant oscillators.
 */

import { Mp3Encoder } from '@breezystack/lamejs';

export interface Mp3EncodingOptions {
  sampleRate?: number; // default: 22050 Hz (or 44100 Hz)
  bitrate?: number; // default: 128 kbps
  channels?: 1 | 2; // default: 1 (mono)
}

export interface EncodedAudioResult {
  mp3Buffer: Uint8Array;
  wavBuffer: Uint8Array;
  sampleRate: number;
  durationSeconds: number;
  byteSize: number;
  channels: number;
}

/**
 * Creates a valid RIFF/WAVE header and encapsulates 16-bit PCM audio samples.
 */
export function createWavFromSamples(
  samples: Int16Array,
  sampleRate = 22050,
  numChannels = 1
): Uint8Array {
  const bytesPerSample = 2; // 16-bit PCM
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF Chunk Descriptor
  view.setUint8(0, 0x52); // 'R'
  view.setUint8(1, 0x49); // 'I'
  view.setUint8(2, 0x46); // 'F'
  view.setUint8(3, 0x46); // 'F'
  view.setUint32(4, 36 + dataSize, true); // Total file size - 8
  view.setUint8(8, 0x57);  // 'W'
  view.setUint8(9, 0x41);  // 'A'
  view.setUint8(10, 0x56); // 'V'
  view.setUint8(11, 0x45); // 'E'

  // "fmt " Subchunk
  view.setUint8(12, 0x66); // 'f'
  view.setUint8(13, 0x6d); // 'm'
  view.setUint8(14, 0x74); // 't'
  view.setUint8(15, 0x20); // ' '
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM format)
  view.setUint16(20, 1, true);  // AudioFormat (1 = uncompressed PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // ByteRate
  view.setUint16(32, numChannels * bytesPerSample, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // "data" Subchunk
  view.setUint8(36, 0x64); // 'd'
  view.setUint8(37, 0x61); // 'a'
  view.setUint8(38, 0x74); // 't'
  view.setUint8(39, 0x61); // 'a'
  view.setUint32(40, dataSize, true);

  // Write 16-bit PCM audio samples
  const uint8Output = new Uint8Array(buffer);
  const sampleBytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  uint8Output.set(sampleBytes, 44);

  return uint8Output;
}

/**
 * Encodes 16-bit PCM audio samples into standard MPEG-2 Layer III (MP3) binary frames using LAME.
 */
export function encodePcmToMp3(
  samples: Int16Array,
  sampleRate = 22050,
  bitrate = 128,
  channels = 1
): Uint8Array {
  if (samples.length === 0) {
    return new Uint8Array(0);
  }

  const encoder = new Mp3Encoder(channels, sampleRate, bitrate);
  const mp3Chunks: Uint8Array[] = [];

  // LAME processes in blocks of 1152 samples
  const chunkSize = 1152 * 4;
  for (let i = 0; i < samples.length; i += chunkSize) {
    const chunk = samples.subarray(i, i + chunkSize);
    const encoded = encoder.encodeBuffer(chunk);
    if (encoded.length > 0) {
      mp3Chunks.push(new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.byteLength));
    }
  }

  const flush = encoder.flush();
  if (flush.length > 0) {
    mp3Chunks.push(new Uint8Array(flush.buffer, flush.byteOffset, flush.byteLength));
  }

  // Concatenate MP3 frames
  let totalLength = 0;
  for (const c of mp3Chunks) totalLength += c.length;

  const mp3Result = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of mp3Chunks) {
    mp3Result.set(c, offset);
    offset += c.length;
  }

  return mp3Result;
}

/**
 * Converts standard Web Audio Float32Array (-1.0 to 1.0) into 16-bit PCM and encodes to MP3.
 */
export function encodeFloat32ToMp3(
  samples: Float32Array,
  sampleRate = 44100,
  bitrate = 128
): Uint8Array {
  if (samples.length === 0) {
    return new Uint8Array(0);
  }

  const pcm16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return encodePcmToMp3(pcm16, sampleRate, bitrate, 1);
}

/**
 * Generates an audio test tone for audio pipeline verification and calibration.
 * Clearly labeled as a test signal (NOT human speech).
 */
export function createTestTonePcm(
  frequency = 440,
  durationSeconds = 1.0,
  sampleRate = 22050,
  volume = 0.5
): Int16Array {
  const totalSamples = Math.round(durationSeconds * sampleRate);
  const samples = new Int16Array(totalSamples);
  const amplitude = Math.max(0, Math.min(1, volume)) * 32767;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Apply soft fade in / fade out (10ms) to avoid clicks
    const edge = Math.min(i, totalSamples - 1 - i);
    const envelope = Math.min(1.0, edge / (sampleRate * 0.01));
    const val = Math.sin(2 * Math.PI * frequency * t) * envelope;
    samples[i] = Math.round(val * amplitude);
  }

  return samples;
}

/**
 * Encodes audio samples to both MP3 and WAV buffers for playback preview and download.
 */
export function packagePcmAudio(
  samples: Int16Array,
  options?: Mp3EncodingOptions
): EncodedAudioResult {
  const sampleRate = options?.sampleRate || 22050;
  const bitrate = options?.bitrate || 128;
  const channels = options?.channels || 1;

  if (samples.length === 0) {
    throw new Error('Cannot package empty audio samples.');
  }

  const wavBuffer = createWavFromSamples(samples, sampleRate, channels);
  const mp3Buffer = encodePcmToMp3(samples, sampleRate, bitrate, channels);
  const durationSeconds = parseFloat((samples.length / (sampleRate * channels)).toFixed(2));

  return {
    mp3Buffer,
    wavBuffer,
    sampleRate,
    durationSeconds,
    byteSize: mp3Buffer.length,
    channels,
  };
}
