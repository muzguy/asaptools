/**
 * ASAPTools Media Converter Engine Manager
 * Manages Web Worker lifecycle, lazy FFmpeg WASM loading, progress tracking, and conversions.
 */

import {
  parseFfmpegError,
  getMimeTypeForExtension,
} from './media-converter-utils';

export interface LoadProgress {
  stage: 'checking_cache' | 'cache_hit' | 'downloading' | 'initializing' | 'ready';
  loaded?: number;
  total?: number;
  percent: number;
  message?: string;
  cached?: boolean;
}

export interface ConvertProgress {
  progress: number;
  percent: number;
  time?: number;
}

export interface MediaConversionResult {
  outputBuffer: ArrayBuffer;
  outputName: string;
  size: number;
  mimeType: string;
  blobUrl: string;
  cleanup: () => void;
}

export interface ConvertJobOptions {
  tool: 'gif-to-mp4' | 'mp4-to-gif' | 'video-to-mp3' | 'audio-converter';
  inputName: string;
  inputBuffer: ArrayBuffer;
  outputName: string;
  args: string[];
  onLoadProgress?: (progress: LoadProgress) => void;
  onConvertProgress?: (progress: ConvertProgress) => void;
  onLog?: (log: { type: string; message: string }) => void;
  signal?: AbortSignal;
}

export class MediaConverter {
  private worker: Worker | null = null;
  private currentRequestId: string | null = null;
  private activeReject: ((reason?: unknown) => void) | null = null;
  private isInitializing = false;
  private isReady = false;

  private getWorker(): Worker {
    if (this.worker) return this.worker;

    if (typeof window === 'undefined') {
      throw new Error('MediaConverter can only be executed in a browser environment.');
    }

    this.worker = new Worker('/workers/media-converter.worker.js');
    return this.worker;
  }

  /**
   * Preloads the FFmpeg WASM engine in the background
   */
  public async preload(onLoadProgress?: (progress: LoadProgress) => void): Promise<void> {
    if (this.isReady) return;

    const worker = this.getWorker();
    const id = `init_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return new Promise((resolve, reject) => {
      const handleMessage = (e: MessageEvent) => {
        const data = e.data;
        if (data.type === 'LOAD_PROGRESS') {
          onLoadProgress?.({
            stage: 'downloading',
            loaded: data.loaded,
            total: data.total,
            percent: data.percent,
            cached: data.cached,
          });
        } else if (data.type === 'STATUS') {
          onLoadProgress?.({
            stage: data.stage,
            percent: data.stage === 'ready' ? 100 : data.stage === 'cache_hit' ? 95 : 10,
            message: data.message,
          });
          if (data.stage === 'ready') {
            this.isReady = true;
          }
        } else if (data.type === 'INIT_SUCCESS' && data.id === id) {
          this.isReady = true;
          worker.removeEventListener('message', handleMessage);
          resolve();
        } else if (data.type === 'INIT_ERROR' && data.id === id) {
          worker.removeEventListener('message', handleMessage);
          reject(new Error(data.error || 'Failed to initialize FFmpeg engine.'));
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({ type: 'INIT', id });
    });
  }

  /**
   * Executes a media conversion job in the worker
   */
  public async convert(options: ConvertJobOptions): Promise<MediaConversionResult> {
    const {
      tool,
      inputName,
      inputBuffer,
      outputName,
      args,
      onLoadProgress,
      onConvertProgress,
      onLog,
      signal,
    } = options;

    if (signal?.aborted) {
      throw new DOMException('Conversion cancelled by user.', 'AbortError');
    }

    const worker = this.getWorker();
    const id = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.currentRequestId = id;

    return new Promise((resolve, reject) => {
      this.activeReject = reject;

      const abortHandler = () => {
        this.terminate();
        reject(new DOMException('Conversion cancelled by user.', 'AbortError'));
      };

      if (signal) {
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      const handleMessage = (e: MessageEvent) => {
        const data = e.data;

        if (data.type === 'LOAD_PROGRESS') {
          onLoadProgress?.({
            stage: 'downloading',
            loaded: data.loaded,
            total: data.total,
            percent: data.percent,
            cached: data.cached,
          });
          return;
        }

        if (data.type === 'STATUS') {
          onLoadProgress?.({
            stage: data.stage,
            percent: data.stage === 'ready' ? 100 : 10,
            message: data.message,
          });
          if (data.stage === 'ready') {
            this.isReady = true;
          }
          return;
        }

        // Check if message belongs to this job
        if (data.id !== id) return;

        if (data.type === 'PROGRESS') {
          onConvertProgress?.({
            progress: data.progress,
            percent: data.percent,
            time: data.time,
          });
        } else if (data.type === 'LOG') {
          onLog?.({ type: data.logType, message: data.message });
        } else if (data.type === 'SUCCESS') {
          cleanupListeners();
          this.currentRequestId = null;
          this.activeReject = null;

          const out = data.outputs?.find((o: { name: string }) => o.name === outputName) || data.outputs?.[0];
          if (!out || !out.data) {
            reject(new Error('Conversion finished but no output file was produced.'));
            return;
          }

          const targetExt = outputName.split('.').pop() || '';
          const mimeType = getMimeTypeForExtension(targetExt);
          const blob = new Blob([out.data], { type: mimeType });
          const blobUrl = URL.createObjectURL(blob);

          resolve({
            outputBuffer: out.data,
            outputName,
            size: out.size,
            mimeType,
            blobUrl,
            cleanup: () => {
              try {
                URL.revokeObjectURL(blobUrl);
              } catch {}
            },
          });
        } else if (data.type === 'ERROR') {
          cleanupListeners();
          this.currentRequestId = null;
          this.activeReject = null;

          const friendlyMessage = parseFfmpegError(data.stderr || data.error || '', tool);
          reject(new Error(friendlyMessage));
        }
      };

      const cleanupListeners = () => {
        worker.removeEventListener('message', handleMessage);
        if (signal) {
          signal.removeEventListener('abort', abortHandler);
        }
      };

      worker.addEventListener('message', handleMessage);

      // Send conversion payload with transferred ArrayBuffer
      worker.postMessage(
        {
          type: 'EXEC',
          id,
          args,
          inputFiles: [
            {
              name: inputName,
              data: inputBuffer,
            },
          ],
          outputFiles: [outputName],
        },
        [inputBuffer]
      );
    });
  }

  /**
   * Terminates the current worker immediately, reclaiming memory
   */
  public terminate(): void {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }

    if (this.activeReject) {
      const reject = this.activeReject;
      this.activeReject = null;
      reject(new DOMException('Operation cancelled by user.', 'AbortError'));
    }

    this.currentRequestId = null;
    this.isReady = false;
  }
}

// Global singleton instance for easy reuse across navigation
let globalConverter: MediaConverter | null = null;

export function getMediaConverter(): MediaConverter {
  if (!globalConverter) {
    globalConverter = new MediaConverter();
  }
  return globalConverter;
}
