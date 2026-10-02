import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  PythonRunner,
} from '../lib/python-runner.ts';
import { MAX_SOURCE_LENGTH, MAX_STDIN_LENGTH, MAX_OUTPUT_LENGTH } from '../lib/code-playground-utils.ts';

// Mock Worker registry and implementation for Node.js test environment
const createdWorkers = [];

class MockWorker {
  constructor(scriptUrl) {
    this.scriptUrl = scriptUrl;
    this.terminated = false;
    this.onmessage = null;
    this.onerror = null;
    this.lastPostedMessage = null;
    this.postedMessages = [];
    createdWorkers.push(this);
  }

  static getLatest() {
    return createdWorkers[createdWorkers.length - 1];
  }

  static reset() {
    createdWorkers.length = 0;
  }

  postMessage(data) {
    this.lastPostedMessage = data;
    this.postedMessages.push(data);
  }

  terminate() {
    this.terminated = true;
  }
}

describe('PythonRunner - Input Validation', () => {
  const runner = new PythonRunner();

  test('rejects empty or whitespace-only Python code', async () => {
    await assert.rejects(
      async () => {
        await runner.run('');
      },
      /Source code cannot be empty/
    );

    await assert.rejects(
      async () => {
        await runner.run('   \n\t  ');
      },
      /Source code cannot be empty/
    );
  });

  test('rejects source code exceeding 64 KB limit', async () => {
    const oversizedCode = 'x = 1\n'.repeat(12000); // > 64 KB
    assert.ok(oversizedCode.length > MAX_SOURCE_LENGTH);

    await assert.rejects(
      async () => {
        await runner.run(oversizedCode);
      },
      /Source code exceeds maximum permitted length/
    );
  });

  test('rejects standard input exceeding 16 KB limit', async () => {
    const oversizedStdin = 'input_line\n'.repeat(2000); // > 16 KB
    assert.ok(oversizedStdin.length > MAX_STDIN_LENGTH);

    await assert.rejects(
      async () => {
        await runner.run('print(1)', oversizedStdin);
      },
      /Standard input exceeds maximum permitted length/
    );
  });
});

describe('PythonRunner - Worker Execution Protocol (Mocked)', () => {
  const originalWorker = globalThis.Worker;
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.Worker = originalWorker;
    globalThis.window = originalWindow;
    MockWorker.reset();
  });

  test('executes code and handles SUCCESS message from worker', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    const runner = new PythonRunner();
    const runPromise = runner.run('name = input()\nprint(f"Hello, {name}!")', 'Ada Lovelace\n');

    const mockWorkerInstance = MockWorker.getLatest();
    assert.ok(mockWorkerInstance, 'Worker should be instantiated');
    assert.equal(mockWorkerInstance.lastPostedMessage.type, 'RUN');
    assert.equal(mockWorkerInstance.lastPostedMessage.sourceCode, 'name = input()\nprint(f"Hello, {name}!")');

    const reqId = mockWorkerInstance.lastPostedMessage.id;

    // Simulate worker returning SUCCESS
    mockWorkerInstance.onmessage({
      data: {
        type: 'SUCCESS',
        id: reqId,
        stdout: 'Hello, Ada Lovelace!\n',
        stderr: '',
        executionTimeMs: 120,
      },
    });

    const result = await runPromise;
    assert.equal(result.status, 'success');
    assert.equal(result.stdout, 'Hello, Ada Lovelace!\n');
    assert.equal(result.stderr, '');
    assert.equal(result.executionTimeMs, 120);
    assert.equal(result.exitCode, 0);
    assert.equal(result.provider, 'Pyodide (Browser Wasm)');
  });

  test('dispatches STATUS updates during initialization', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    const stages = [];
    const runner = new PythonRunner();
    const runPromise = runner.run('print(42)', '', {
      onStatus: (stage, message) => {
        stages.push({ stage, message });
      },
    });

    const mockWorkerInstance = MockWorker.getLatest();
    const reqId = mockWorkerInstance.lastPostedMessage.id;

    // Send stage updates
    mockWorkerInstance.onmessage({
      data: {
        type: 'STATUS',
        id: reqId,
        stage: 'downloading',
        message: 'Downloading Pyodide...',
      },
    });

    mockWorkerInstance.onmessage({
      data: {
        type: 'STATUS',
        id: reqId,
        stage: 'running',
        message: 'Executing Python code...',
      },
    });

    mockWorkerInstance.onmessage({
      data: {
        type: 'SUCCESS',
        id: reqId,
        stdout: '42\n',
        stderr: '',
        executionTimeMs: 15,
      },
    });

    await runPromise;

    assert.equal(stages.length, 2);
    assert.equal(stages[0].stage, 'downloading');
    assert.equal(stages[1].stage, 'running');
  });

  test('maps syntax/compilation error with traceback correctly', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    const runner = new PythonRunner();
    const runPromise = runner.run('def incomplete(');

    const mockWorkerInstance = MockWorker.getLatest();
    const reqId = mockWorkerInstance.lastPostedMessage.id;

    mockWorkerInstance.onmessage({
      data: {
        type: 'ERROR',
        id: reqId,
        errorType: 'compilation_error',
        error: 'SyntaxError: was never closed',
        traceback: '  File "<input>", line 1\n    def incomplete(\n                  ^\nSyntaxError: was never closed',
        stdout: '',
        stderr: '',
        executionTimeMs: 5,
      },
    });

    const result = await runPromise;
    assert.equal(result.status, 'compilation_error');
    assert.ok(result.compileOutput?.includes('SyntaxError'));
    assert.equal(result.exitCode, 1);
  });

  test('maps runtime error with exception traceback correctly', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    const runner = new PythonRunner();
    const runPromise = runner.run('1 / 0');

    const mockWorkerInstance = MockWorker.getLatest();
    const reqId = mockWorkerInstance.lastPostedMessage.id;

    mockWorkerInstance.onmessage({
      data: {
        type: 'ERROR',
        id: reqId,
        errorType: 'runtime_error',
        error: 'ZeroDivisionError: division by zero',
        traceback: 'Traceback (most recent call last):\n  File "<input>", line 1, in <module>\nZeroDivisionError: division by zero',
        stdout: '',
        stderr: '',
        executionTimeMs: 8,
      },
    });

    const result = await runPromise;
    assert.equal(result.status, 'runtime_error');
    assert.ok(result.stderr.includes('ZeroDivisionError: division by zero'));
    assert.equal(result.exitCode, 1);
  });

  test('discards stale responses with mismatched request IDs', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    const runner = new PythonRunner();
    const runPromise = runner.run('print("active")');

    const mockWorkerInstance = MockWorker.getLatest();
    const activeId = mockWorkerInstance.lastPostedMessage.id;

    // Send a message with an old / stale request ID
    mockWorkerInstance.onmessage({
      data: {
        type: 'SUCCESS',
        id: 'stale_id_9999',
        stdout: 'STALE OUTPUT',
        stderr: '',
        executionTimeMs: 50,
      },
    });

    // Now send the response for the active request ID
    mockWorkerInstance.onmessage({
      data: {
        type: 'SUCCESS',
        id: activeId,
        stdout: 'active output\n',
        stderr: '',
        executionTimeMs: 25,
      },
    });

    const result = await runPromise;
    assert.equal(result.stdout, 'active output\n');
  });

  test('handles execution timeout and terminates worker', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    const runner = new PythonRunner();
    // Run with a very short timeout of 50ms for test speed
    const runPromise = runner.run('while True: pass', '', { timeoutMs: 50 });

    const mockWorkerInstance = MockWorker.getLatest();
    const result = await runPromise;

    assert.equal(result.status, 'time_limit_exceeded');
    assert.ok(result.stderr.includes('Execution timed out'));
    assert.equal(result.exitCode, 124);
    assert.equal(mockWorkerInstance.terminated, true);
  });

  test('handles worker crash (onerror)', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    const runner = new PythonRunner();
    const runPromise = runner.run('print(1)');

    const mockWorkerInstance = MockWorker.getLatest();
    mockWorkerInstance.onerror({ message: 'Out of WebAssembly memory' });

    const result = await runPromise;
    assert.equal(result.status, 'error');
    assert.ok(result.stderr.includes('Out of WebAssembly memory'));
    assert.equal(mockWorkerInstance.terminated, true);
  });

  test('manual terminate cancels active execution without unhandled rejections', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    const runner = new PythonRunner();
    const runPromise = runner.run('import time; time.sleep(10)');

    const mockWorkerInstance = MockWorker.getLatest();
    assert.ok(mockWorkerInstance);
    runner.terminate();

    assert.equal(mockWorkerInstance.terminated, true);

    await assert.rejects(
      async () => {
        await runPromise;
      },
      (err) => err instanceof DOMException && err.name === 'AbortError'
    );
  });

  test('truncates oversized worker stdout to prevent browser freezing', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    const runner = new PythonRunner();
    const runPromise = runner.run('print("x" * 50000)');

    const mockWorkerInstance = MockWorker.getLatest();
    const reqId = mockWorkerInstance.lastPostedMessage.id;
    const hugeOutput = 'x'.repeat(MAX_OUTPUT_LENGTH + 2000);

    mockWorkerInstance.onmessage({
      data: {
        type: 'SUCCESS',
        id: reqId,
        stdout: hugeOutput,
        stderr: '',
        executionTimeMs: 15,
      },
    });

    const result = await runPromise;
    assert.equal(result.status, 'success');
    assert.ok(result.stdout.includes('[Output truncated: exceeded 32 KB display limit]'));
  });
});

describe('PythonRunner - Interactive Terminal Stdin Protocol (Mocked)', () => {
  const originalWorker = globalThis.Worker;
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.Worker = originalWorker;
    globalThis.window = originalWindow;
    MockWorker.reset();
  });

  test('handles one interactive input() request and resumes execution with entered text', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    let receivedPrompt = null;
    const runner = new PythonRunner();
    const runPromise = runner.run('name = input("Enter your name: ")\nprint(f"Hello {name}")', '', {
      onInputRequest: (prompt) => {
        receivedPrompt = prompt;
        // User types "Ada Lovelace" and hits Enter
        runner.sendInput('Ada Lovelace');
      },
    });

    const mockWorker = MockWorker.getLatest();
    const reqId = mockWorker.lastPostedMessage.id;

    // 1. Worker emits INPUT_REQUEST
    mockWorker.onmessage({
      data: {
        type: 'INPUT_REQUEST',
        id: reqId,
        prompt: 'Enter your name: ',
      },
    });

    assert.equal(receivedPrompt, 'Enter your name: ');

    // 2. Verify runner posted INPUT_RESPONSE back to the worker
    const lastMsg = mockWorker.lastPostedMessage;
    assert.equal(lastMsg.type, 'INPUT_RESPONSE');
    assert.equal(lastMsg.id, reqId);
    assert.equal(lastMsg.value, 'Ada Lovelace');
    assert.equal(lastMsg.eof, false);

    // 3. Worker resumes and returns SUCCESS
    mockWorker.onmessage({
      data: {
        type: 'SUCCESS',
        id: reqId,
        stdout: 'Hello Ada Lovelace\n',
        stderr: '',
        executionTimeMs: 40,
      },
    });

    const result = await runPromise;
    assert.equal(result.status, 'success');
    assert.equal(result.stdout, 'Hello Ada Lovelace\n');
  });

  test('handles multiple sequential interactive input() calls', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    const requestedPrompts = [];
    const runner = new PythonRunner();

    const runPromise = runner.run(
      'x = input("Num 1: ")\ny = input("Num 2: ")\nprint(f"Sum={int(x)+int(y)}")',
      '',
      {
        onInputRequest: (prompt) => {
          requestedPrompts.push(prompt);
          if (requestedPrompts.length === 1) {
            runner.sendInput('10');
          } else if (requestedPrompts.length === 2) {
            runner.sendInput('25');
          }
        },
      }
    );

    const mockWorker = MockWorker.getLatest();
    const reqId = mockWorker.lastPostedMessage.id;

    // Prompt 1
    mockWorker.onmessage({
      data: {
        type: 'INPUT_REQUEST',
        id: reqId,
        prompt: 'Num 1: ',
      },
    });

    assert.equal(requestedPrompts.length, 1);
    assert.equal(mockWorker.lastPostedMessage.value, '10');

    // Prompt 2
    mockWorker.onmessage({
      data: {
        type: 'INPUT_REQUEST',
        id: reqId,
        prompt: 'Num 2: ',
      },
    });

    assert.equal(requestedPrompts.length, 2);
    assert.equal(mockWorker.lastPostedMessage.value, '25');

    // Worker finishes
    mockWorker.onmessage({
      data: {
        type: 'SUCCESS',
        id: reqId,
        stdout: 'Sum=35\n',
        stderr: '',
        executionTimeMs: 65,
      },
    });

    const result = await runPromise;
    assert.equal(result.status, 'success');
    assert.equal(result.stdout, 'Sum=35\n');
  });

  test('handles empty input line submission', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    let requested = false;
    const runner = new PythonRunner();
    const runPromise = runner.run('line = input("Optional: ")\nprint(f"Got empty: {line == \'\'}")', '', {
      onInputRequest: () => {
        requested = true;
        // User presses Enter without typing any text
        runner.sendInput('');
      },
    });

    const mockWorker = MockWorker.getLatest();
    const reqId = mockWorker.lastPostedMessage.id;

    mockWorker.onmessage({
      data: {
        type: 'INPUT_REQUEST',
        id: reqId,
        prompt: 'Optional: ',
      },
    });

    assert.equal(requested, true);
    assert.equal(mockWorker.lastPostedMessage.type, 'INPUT_RESPONSE');
    assert.equal(mockWorker.lastPostedMessage.value, '');
    assert.equal(mockWorker.lastPostedMessage.eof, false);

    mockWorker.onmessage({
      data: {
        type: 'SUCCESS',
        id: reqId,
        stdout: 'Got empty: True\n',
        stderr: '',
        executionTimeMs: 20,
      },
    });

    const result = await runPromise;
    assert.equal(result.status, 'success');
    assert.equal(result.stdout, 'Got empty: True\n');
  });

  test('handles EOF signal from terminal (Ctrl+D equivalent)', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    const runner = new PythonRunner();
    const runPromise = runner.run('try:\n    x = input()\nexcept EOFError:\n    print("Caught EOF")', '', {
      onInputRequest: () => {
        // Send EOF
        runner.sendInput('', true);
      },
    });

    const mockWorker = MockWorker.getLatest();
    const reqId = mockWorker.lastPostedMessage.id;

    mockWorker.onmessage({
      data: {
        type: 'INPUT_REQUEST',
        id: reqId,
        prompt: '',
      },
    });

    assert.equal(mockWorker.lastPostedMessage.type, 'INPUT_RESPONSE');
    assert.equal(mockWorker.lastPostedMessage.eof, true);

    mockWorker.onmessage({
      data: {
        type: 'SUCCESS',
        id: reqId,
        stdout: 'Caught EOF\n',
        stderr: '',
        executionTimeMs: 30,
      },
    });

    const result = await runPromise;
    assert.equal(result.status, 'success');
    assert.equal(result.stdout, 'Caught EOF\n');
  });

  test('streams real-time stdout and stderr chunks', async () => {
    globalThis.window = {};
    globalThis.Worker = MockWorker;

    const stdoutChunks = [];
    const stderrChunks = [];

    const runner = new PythonRunner();
    const runPromise = runner.run('print("Line 1")\nimport sys; sys.stderr.write("Warn\\n")', '', {
      onStdout: (chunk) => stdoutChunks.push(chunk),
      onStderr: (chunk) => stderrChunks.push(chunk),
    });

    const mockWorker = MockWorker.getLatest();
    const reqId = mockWorker.lastPostedMessage.id;

    // Stream chunk 1
    mockWorker.onmessage({
      data: {
        type: 'STREAM',
        id: reqId,
        stream: 'stdout',
        chunk: 'Line 1\n',
      },
    });

    // Stream chunk 2
    mockWorker.onmessage({
      data: {
        type: 'STREAM',
        id: reqId,
        stream: 'stderr',
        chunk: 'Warn\n',
      },
    });

    mockWorker.onmessage({
      data: {
        type: 'SUCCESS',
        id: reqId,
        stdout: 'Line 1\n',
        stderr: 'Warn\n',
        executionTimeMs: 15,
      },
    });

    await runPromise;

    assert.deepEqual(stdoutChunks, ['Line 1\n']);
    assert.deepEqual(stderrChunks, ['Warn\n']);
  });
});
