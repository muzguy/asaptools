// ASAPTools Media Converter - In-Browser WebAssembly Worker (FFmpeg Core v0.12.10)
/* eslint-disable no-restricted-globals */

const CORE_VERSION = '0.12.10';
const LOCAL_WASM_PATH = '/ffmpeg/ffmpeg-core.wasm';
const LOCAL_JS_PATH = '/ffmpeg/ffmpeg-core.js';
const CDN_WASM_PATH = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd/ffmpeg-core.wasm`;
const CDN_JS_PATH = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd/ffmpeg-core.js`;

const DB_NAME = 'asaptools_ffmpeg_cache';
const DB_VERSION = 1;
const STORE_NAME = 'wasm_binaries';
const CACHE_KEY = `ffmpeg_core_wasm_${CORE_VERSION}`;

let coreInstance = null;
let coreLoadingPromise = null;
let activeRunId = null;
let lastProgress = 0;

/**
 * IndexedDB helper to get cached WASM binary
 */
function getCachedWasmBinary() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const getReq = store.get(CACHE_KEY);
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * IndexedDB helper to store WASM binary
 */
function storeCachedWasmBinary(binary) {
  if (typeof indexedDB === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = (e) => {
        const db = e.target.result;
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(binary, CACHE_KEY);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      };
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Downloads WASM binary with progressive streaming
 */
async function fetchWasmWithProgress(url, totalExpected = 32500000) {
  let response;
  try {
    response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (err) {
    if (url === LOCAL_WASM_PATH) {
      // Fallback to CDN if local fetch fails
      response = await fetch(CDN_WASM_PATH);
      if (!response.ok) throw new Error(`Fallback HTTP ${response.status}`);
    } else {
      throw err;
    }
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : totalExpected;

  if (!response.body || typeof response.body.getReader !== 'function') {
    const arrayBuffer = await response.arrayBuffer();
    self.postMessage({
      type: 'LOAD_PROGRESS',
      loaded: arrayBuffer.byteLength,
      total: arrayBuffer.byteLength,
      percent: 100,
    });
    return new Uint8Array(arrayBuffer);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;

    const percent = Math.min(Math.round((loaded / total) * 100), 99);
    self.postMessage({
      type: 'LOAD_PROGRESS',
      loaded,
      total,
      percent,
    });
  }

  const wasmBinary = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    wasmBinary.set(chunk, offset);
    offset += chunk.length;
  }

  self.postMessage({
    type: 'LOAD_PROGRESS',
    loaded,
    total: loaded,
    percent: 100,
  });

  return wasmBinary;
}

/**
 * Loads the FFmpeg core and WASM binary
 */
async function initFFmpegCore() {
  if (coreInstance) return coreInstance;
  if (coreLoadingPromise) return coreLoadingPromise;

  coreLoadingPromise = (async () => {
    // 1. Check IndexedDB cache for WASM
    self.postMessage({
      type: 'STATUS',
      stage: 'checking_cache',
      message: 'Checking local engine cache...',
    });

    let wasmBinary = await getCachedWasmBinary();

    if (wasmBinary) {
      self.postMessage({
        type: 'LOAD_PROGRESS',
        loaded: wasmBinary.byteLength,
        total: wasmBinary.byteLength,
        percent: 100,
        cached: true,
      });
      self.postMessage({
        type: 'STATUS',
        stage: 'cache_hit',
        message: 'Engine loaded from local storage cache.',
      });
    } else {
      self.postMessage({
        type: 'STATUS',
        stage: 'downloading',
        message: 'Downloading FFmpeg WebAssembly engine (~32 MB)...',
      });

      wasmBinary = await fetchWasmWithProgress(LOCAL_WASM_PATH);

      // Cache asynchronously in background
      storeCachedWasmBinary(wasmBinary).catch(() => {});
    }

    // 2. Load the JS core loader via importScripts if not already loaded
    if (typeof self.createFFmpegCore !== 'function') {
      try {
        importScripts(LOCAL_JS_PATH);
      } catch {
        importScripts(CDN_JS_PATH);
      }
    }

    if (typeof self.createFFmpegCore !== 'function') {
      throw new Error('Failed to load FFmpeg WebAssembly core factory.');
    }

    self.postMessage({
      type: 'STATUS',
      stage: 'initializing',
      message: 'Compiling WebAssembly modules...',
    });

    // 3. Instantiate the core
    const core = await self.createFFmpegCore({
      wasmBinary,
    });

    coreInstance = core;
    self.postMessage({
      type: 'STATUS',
      stage: 'ready',
      message: 'FFmpeg WebAssembly engine ready.',
    });

    return core;
  })();

  try {
    return await coreLoadingPromise;
  } catch (err) {
    coreLoadingPromise = null;
    throw err;
  }
}

/**
 * Main message handler
 */
self.onmessage = async (event) => {
  const { type, id, args, inputFiles, outputFiles } = event.data;

  if (type === 'INIT') {
    try {
      await initFFmpegCore();
      self.postMessage({ type: 'INIT_SUCCESS', id });
    } catch (err) {
      self.postMessage({
        type: 'INIT_ERROR',
        id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return;
  }

  if (type === 'EXEC') {
    activeRunId = id;
    lastProgress = 0;

    let core;
    try {
      core = await initFFmpegCore();
    } catch (err) {
      self.postMessage({
        type: 'ERROR',
        id,
        error: `Engine initialization failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      activeRunId = null;
      return;
    }

    const logMessages = [];

    // Attach logger
    core.setLogger(({ type: logType, message }) => {
      if (activeRunId === id) {
        logMessages.push(`[${logType}] ${message}`);
        self.postMessage({
          type: 'LOG',
          id,
          logType,
          message,
        });
      }
    });

    // Attach progress
    core.setProgress(({ progress, time }) => {
      if (activeRunId === id) {
        // FFmpeg progress is 0.0 to 1.0 (sometimes beyond or slightly inaccurate)
        const normalized = Math.min(Math.max(progress || 0, 0), 1);
        if (normalized >= lastProgress) {
          lastProgress = normalized;
          self.postMessage({
            type: 'PROGRESS',
            id,
            progress: normalized,
            percent: Math.round(normalized * 100),
            time,
          });
        }
      }
    });

    // Write input files into virtual filesystem
    try {
      if (Array.isArray(inputFiles)) {
        for (const file of inputFiles) {
          const uint8 = new Uint8Array(file.data);
          core.FS.writeFile(file.name, uint8);
        }
      }
    } catch (err) {
      self.postMessage({
        type: 'ERROR',
        id,
        error: `Failed to prepare input file: ${err instanceof Error ? err.message : String(err)}`,
      });
      activeRunId = null;
      return;
    }

    // Execute FFmpeg CLI command
    let ret = -1;
    try {
      ret = core.exec(...args);
    } catch (err) {
      ret = -1;
      logMessages.push(`Exception during exec: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Process output or errors
    if (ret === 0) {
      const outputs = [];
      const transferList = [];

      try {
        if (Array.isArray(outputFiles)) {
          for (const outName of outputFiles) {
            const dataUint8 = core.FS.readFile(outName);
            const buffer = dataUint8.buffer.slice(
              dataUint8.byteOffset,
              dataUint8.byteOffset + dataUint8.byteLength
            );
            outputs.push({
              name: outName,
              data: buffer,
              size: buffer.byteLength,
            });
            transferList.push(buffer);
            // Clean up virtual FS
            try {
              core.FS.unlink(outName);
            } catch {}
          }
        }
      } catch (err) {
        self.postMessage({
          type: 'ERROR',
          id,
          error: `Failed to read generated media output: ${err instanceof Error ? err.message : String(err)}`,
          stderr: logMessages.join('\n'),
        });
        activeRunId = null;
        return;
      }

      // Cleanup inputs
      if (Array.isArray(inputFiles)) {
        for (const file of inputFiles) {
          try {
            core.FS.unlink(file.name);
          } catch {}
        }
      }

      self.postMessage(
        {
          type: 'SUCCESS',
          id,
          outputs,
        },
        transferList
      );
    } else {
      // Clean up virtual files
      if (Array.isArray(inputFiles)) {
        for (const file of inputFiles) {
          try {
            core.FS.unlink(file.name);
          } catch {}
        }
      }
      if (Array.isArray(outputFiles)) {
        for (const outName of outputFiles) {
          try {
            core.FS.unlink(outName);
          } catch {}
        }
      }

      self.postMessage({
        type: 'ERROR',
        id,
        exitCode: ret,
        error: 'FFmpeg command execution failed.',
        stderr: logMessages.join('\n'),
      });
    }

    activeRunId = null;
  }
};
