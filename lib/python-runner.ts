import type { ExecutionResult } from './code-playground-utils.ts';
import {
  MAX_SOURCE_LENGTH,
  MAX_STDIN_LENGTH,
  truncateOutput,
} from './code-playground-utils.ts';

export interface PythonRunOptions {
  timeoutMs?: number;
  onStatus?: (stage: 'downloading' | 'initializing' | 'ready' | 'running', message: string) => void;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
  onInputRequest?: (prompt: string) => void;
}

export type PythonWorkerMessage =
  | { type: 'STATUS'; id: string; stage: 'downloading' | 'initializing' | 'ready' | 'running'; message: string }
  | { type: 'STREAM'; id: string; stream: 'stdout' | 'stderr'; chunk: string }
  | { type: 'INPUT_REQUEST'; id: string; prompt: string }
  | { type: 'SUCCESS'; id: string; stdout: string; stderr: string; executionTimeMs: number }
  | {
      type: 'ERROR';
      id: string;
      errorType: 'compilation_error' | 'runtime_error' | 'init_error';
      error: string;
      traceback?: string;
      stdout: string;
      stderr: string;
      executionTimeMs: number;
    }
  | { type: 'INIT_SUCCESS'; id: string }
  | { type: 'INIT_ERROR'; id: string; error: string };

/**
 * Handles Pyodide WebAssembly execution in a dedicated background Web Worker
 * with interactive standard input bridge and real-time streaming.
 */
export class PythonRunner {
  private worker: Worker | null = null;
  private currentRequestId: string | null = null;
  private activeReject: ((reason?: unknown) => void) | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private currentTimeoutMs = 10000;

  private getWorker(): Worker {
    if (this.worker) return this.worker;

    if (typeof window === 'undefined') {
      throw new Error('PythonRunner can only be executed in a browser environment.');
    }

    this.worker = new Worker('/workers/python-worker.js');
    return this.worker;
  }

  public terminate(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }

    if (this.activeReject) {
      const reject = this.activeReject;
      this.activeReject = null;
      reject(new DOMException('Execution cancelled by user.', 'AbortError'));
    }

    this.currentRequestId = null;
  }

  /**
   * Sends user-typed standard input response to the waiting Python input() prompt.
   */
  public sendInput(value: string, eof = false): void {
    if (this.worker && this.currentRequestId) {
      this.worker.postMessage({
        type: 'INPUT_RESPONSE',
        id: this.currentRequestId,
        value,
        eof,
      });

      // Reset / extend timeout while user is actively interacting
      this.resetTimeout();
    }
  }

  private resetTimeout(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    if (!this.currentRequestId) return;

    const reqId = this.currentRequestId;
    this.timeoutTimer = setTimeout(() => {
      if (this.currentRequestId === reqId) {
        this.handleTimeout();
      }
    }, this.currentTimeoutMs);
  }

  private handleTimeout(): void {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }
    this.timeoutTimer = null;
    this.currentRequestId = null;
    this.activeReject = null;
  }

  public async run(
    sourceCode: string,
    stdin = '',
    options?: PythonRunOptions
  ): Promise<ExecutionResult> {
    // 1. Client-side input validation
    if (typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
      throw new Error('Source code cannot be empty.');
    }

    if (sourceCode.length > MAX_SOURCE_LENGTH) {
      throw new Error(`Source code exceeds maximum permitted length of ${MAX_SOURCE_LENGTH / 1024} KB.`);
    }

    if (stdin && stdin.length > MAX_STDIN_LENGTH) {
      throw new Error(`Standard input exceeds maximum permitted length of ${MAX_STDIN_LENGTH / 1024} KB.`);
    }

    // Terminate any previous execution before starting fresh
    this.terminate();

    const worker = this.getWorker();
    const requestId = `py_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.currentRequestId = requestId;

    const timeoutMs = options?.timeoutMs ?? 10000;
    this.currentTimeoutMs = timeoutMs;

    let accumulatedStdout = '';
    let accumulatedStderr = '';

    return new Promise<ExecutionResult>((resolve, reject) => {
      this.activeReject = reject;

      // Arm execution timeout
      this.timeoutTimer = setTimeout(() => {
        if (this.currentRequestId === requestId) {
          if (this.worker) {
            try {
              this.worker.terminate();
            } catch {}
            this.worker = null;
          }
          this.activeReject = null;
          this.currentRequestId = null;
          this.timeoutTimer = null;

          resolve({
            status: 'time_limit_exceeded',
            statusDescription: 'Time Limit Exceeded (10s)',
            stdout: truncateOutput(accumulatedStdout),
            stderr: 'Execution timed out after 10 seconds. The WebAssembly worker was terminated to preserve browser responsiveness.',
            executionTimeMs: timeoutMs,
            exitCode: 124,
            provider: 'Pyodide (Browser Wasm)',
          });
        }
      }, timeoutMs);

      worker.onmessage = (event: MessageEvent<PythonWorkerMessage>) => {
        const msg = event.data;
        if (!msg || msg.id !== requestId) {
          // Discard stale messages from previous executions
          return;
        }

        if (msg.type === 'STATUS') {
          options?.onStatus?.(msg.stage, msg.message);
          return;
        }

        if (msg.type === 'STREAM') {
          if (msg.stream === 'stdout') {
            accumulatedStdout += msg.chunk;
            options?.onStdout?.(msg.chunk);
          } else {
            accumulatedStderr += msg.chunk;
            options?.onStderr?.(msg.chunk);
          }
          return;
        }

        if (msg.type === 'INPUT_REQUEST') {
          // Re-arm timeout when waiting for input so user has time to type
          this.resetTimeout();
          options?.onInputRequest?.(msg.prompt);
          return;
        }

        // Cleanup timer on completion
        if (this.timeoutTimer) {
          clearTimeout(this.timeoutTimer);
          this.timeoutTimer = null;
        }
        this.currentRequestId = null;
        this.activeReject = null;

        if (msg.type === 'SUCCESS') {
          const finalStdout = msg.stdout || accumulatedStdout;
          const finalStderr = msg.stderr || accumulatedStderr;
          resolve({
            status: 'success',
            statusDescription: 'Success',
            stdout: truncateOutput(finalStdout),
            stderr: truncateOutput(finalStderr),
            executionTimeMs: msg.executionTimeMs,
            exitCode: 0,
            provider: 'Pyodide (Browser Wasm)',
          });
          return;
        }

        if (msg.type === 'ERROR') {
          const finalStdout = msg.stdout || accumulatedStdout;
          const finalStderr = msg.stderr || accumulatedStderr;
          if (msg.errorType === 'compilation_error') {
            resolve({
              status: 'compilation_error',
              statusDescription: 'Syntax / Compilation Error',
              stdout: truncateOutput(finalStdout),
              stderr: '',
              compileOutput: truncateOutput(msg.traceback || msg.error),
              executionTimeMs: msg.executionTimeMs,
              exitCode: 1,
              provider: 'Pyodide (Browser Wasm)',
            });
          } else {
            resolve({
              status: 'runtime_error',
              statusDescription: 'Runtime Error',
              stdout: truncateOutput(finalStdout),
              stderr: truncateOutput(msg.traceback || msg.error || finalStderr),
              executionTimeMs: msg.executionTimeMs,
              exitCode: 1,
              provider: 'Pyodide (Browser Wasm)',
            });
          }
        }
      };

      worker.onerror = (err) => {
        if (this.timeoutTimer) {
          clearTimeout(this.timeoutTimer);
          this.timeoutTimer = null;
        }
        this.currentRequestId = null;
        this.activeReject = null;

        const errorMsg = err.message || 'Python WebAssembly Worker crashed or failed to load.';
        this.terminate();

        resolve({
          status: 'error',
          statusDescription: 'Worker Error',
          stdout: truncateOutput(accumulatedStdout),
          stderr: `${errorMsg}\n\nPlease check your internet connection (needed on first run to download Pyodide) and try again.`,
          provider: 'Pyodide (Browser Wasm)',
        });
      };

      // Dispatch execution payload to worker
      worker.postMessage({
        type: 'RUN',
        id: requestId,
        sourceCode,
        stdin,
      });
    });
  }
}

// Global runner singleton instance for CodeLab UI
let globalPythonRunner: PythonRunner | null = null;

export function getPythonRunner(): PythonRunner {
  if (!globalPythonRunner) {
    globalPythonRunner = new PythonRunner();
  }
  return globalPythonRunner;
}
