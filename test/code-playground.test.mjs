import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateExecutionRequest,
  normalizeLanguage,
  MAX_SOURCE_LENGTH,
  MAX_STDIN_LENGTH,
  MAX_OUTPUT_LENGTH,
  LANGUAGE_CONFIGS,
  SUPPORTED_LANGUAGES,
  formatExecutionTime,
  formatMemoryUsage,
  sanitizeApiKey,
  truncateOutput,
  encodeBase64Safe,
  decodeBase64Safe,
  Judge0ExecutionProvider,
  PistonExecutionProvider,
  getExecutionProvider,
  getProviderStatus,
  SETUP_INSTRUCTIONS,
} from '../lib/code-playground-utils.ts';

describe('CodeLab - Language Support & Configuration', () => {
  test('supports C, C++, and Python 3 languages', () => {
    assert.deepEqual(SUPPORTED_LANGUAGES, ['c', 'cpp', 'python']);
  });

  test('configures C with GCC, .c extension, and Judge0 ID 50', () => {
    const config = LANGUAGE_CONFIGS.c;
    assert.equal(config.id, 'c');
    assert.equal(config.extension, '.c');
    assert.equal(config.judge0LanguageId, 50);
    assert.ok(config.defaultStarterCode.includes('#include <stdio.h>'));
    assert.ok(config.defaultStarterCode.length > 20);
  });

  test('configures C++ with G++, .cpp extension, and Judge0 ID 54', () => {
    const config = LANGUAGE_CONFIGS.cpp;
    assert.equal(config.id, 'cpp');
    assert.equal(config.extension, '.cpp');
    assert.equal(config.judge0LanguageId, 54);
    assert.ok(config.defaultStarterCode.includes('#include <iostream>'));
    assert.ok(config.defaultStarterCode.length > 20);
  });

  test('configures Python 3 with .py extension and Judge0 ID 71', () => {
    const config = LANGUAGE_CONFIGS.python;
    assert.equal(config.id, 'python');
    assert.equal(config.extension, '.py');
    assert.equal(config.judge0LanguageId, 71);
    assert.ok(config.defaultStarterCode.includes('input('));
    assert.ok(config.defaultStarterCode.length > 20);
  });
});

describe('CodeLab - Language Normalization', () => {
  test('normalizes canonical language ids', () => {
    assert.equal(normalizeLanguage('c'), 'c');
    assert.equal(normalizeLanguage('cpp'), 'cpp');
    assert.equal(normalizeLanguage('python'), 'python');
  });

  test('normalizes common language aliases and case variations', () => {
    assert.equal(normalizeLanguage('C'), 'c');
    assert.equal(normalizeLanguage('c++'), 'cpp');
    assert.equal(normalizeLanguage('C++'), 'cpp');
    assert.equal(normalizeLanguage('cplusplus'), 'cpp');
    assert.equal(normalizeLanguage('python3'), 'python');
    assert.equal(normalizeLanguage('PYTHON3'), 'python');
    assert.equal(normalizeLanguage('py'), 'python');
  });

  test('returns null for unsupported languages or invalid types', () => {
    assert.equal(normalizeLanguage('java'), null);
    assert.equal(normalizeLanguage('javascript'), null);
    assert.equal(normalizeLanguage('ruby'), null);
    assert.equal(normalizeLanguage(''), null);
    assert.equal(normalizeLanguage(null), null);
    assert.equal(normalizeLanguage(123), null);
  });
});

describe('CodeLab - Server-side Payload Validation', () => {
  test('accepts valid execution payload for all supported languages', () => {
    const validC = validateExecutionRequest({
      language: 'c',
      sourceCode: 'int main() { return 0; }',
      stdin: 'hello world',
    });
    assert.equal(validC.valid, true);
    if (validC.valid) {
      assert.equal(validC.data.language, 'c');
      assert.equal(validC.data.stdin, 'hello world');
    }

    const validCpp = validateExecutionRequest({
      language: 'c++',
      sourceCode: 'int main() { return 0; }',
    });
    assert.equal(validCpp.valid, true);
    if (validCpp.valid) {
      assert.equal(validCpp.data.language, 'cpp');
      assert.equal(validCpp.data.stdin, '');
    }

    const validPython = validateExecutionRequest({
      language: 'python3',
      sourceCode: 'print(42)',
    });
    assert.equal(validPython.valid, true);
    if (validPython.valid) {
      assert.equal(validPython.data.language, 'python');
    }
  });

  test('rejects non-object or null request bodies', () => {
    assert.equal(validateExecutionRequest(null).valid, false);
    assert.equal(validateExecutionRequest(undefined).valid, false);
    assert.equal(validateExecutionRequest('invalid').valid, false);
  });

  test('rejects unsupported programming languages', () => {
    const res = validateExecutionRequest({
      language: 'rust',
      sourceCode: 'fn main() {}',
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, 'UNSUPPORTED_LANGUAGE');
  });

  test('rejects empty or whitespace-only source code', () => {
    const empty = validateExecutionRequest({ language: 'c', sourceCode: '' });
    assert.equal(empty.valid, false);
    assert.equal(empty.code, 'EMPTY_SOURCE_CODE');

    const spaces = validateExecutionRequest({ language: 'c', sourceCode: '   \n  \t  ' });
    assert.equal(spaces.valid, false);
    assert.equal(spaces.code, 'EMPTY_SOURCE_CODE');
  });

  test('rejects non-string source code', () => {
    const num = validateExecutionRequest({ language: 'c', sourceCode: 12345 });
    assert.equal(num.valid, false);
    assert.equal(num.code, 'INVALID_SOURCE_CODE');
  });

  test('rejects source code exceeding 64 KB limit', () => {
    const hugeCode = 'a'.repeat(MAX_SOURCE_LENGTH + 1);
    const res = validateExecutionRequest({ language: 'c', sourceCode: hugeCode });
    assert.equal(res.valid, false);
    assert.equal(res.code, 'SOURCE_CODE_TOO_LARGE');
  });

  test('rejects non-string stdin', () => {
    const res = validateExecutionRequest({
      language: 'c',
      sourceCode: 'int main() {}',
      stdin: 123,
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, 'INVALID_STDIN');
  });

  test('rejects stdin exceeding 16 KB limit', () => {
    const hugeStdin = 'x'.repeat(MAX_STDIN_LENGTH + 1);
    const res = validateExecutionRequest({
      language: 'c',
      sourceCode: 'int main() {}',
      stdin: hugeStdin,
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, 'STDIN_TOO_LARGE');
  });
});

describe('CodeLab - Helper Utilities & Base64 Encoding', () => {
  test('formats execution time accurately', () => {
    assert.equal(formatExecutionTime(undefined), '—');
    assert.equal(formatExecutionTime(45), '45ms');
    assert.equal(formatExecutionTime(1250), '1.25s');
    assert.equal(formatExecutionTime(2000), '2.00s');
  });

  test('formats memory usage cleanly', () => {
    assert.equal(formatMemoryUsage(undefined), '—');
    assert.equal(formatMemoryUsage(512), '512 KB');
    assert.equal(formatMemoryUsage(2048), '2.0 MB');
    assert.equal(formatMemoryUsage(15360), '15.0 MB');
  });

  test('sanitizes API keys correctly', () => {
    assert.equal(sanitizeApiKey(undefined), undefined);
    assert.equal(sanitizeApiKey(null), undefined);
    assert.equal(sanitizeApiKey(''), undefined);
    assert.equal(sanitizeApiKey('   '), undefined);
    assert.equal(sanitizeApiKey('  "my_secret_key"  '), 'my_secret_key');
    assert.equal(sanitizeApiKey("'single_quoted'"), 'single_quoted');
    assert.equal(sanitizeApiKey('your_rapidapi_key_here'), undefined);
  });

  test('truncates output when exceeding 32 KB limit', () => {
    const shortText = 'Hello world output';
    assert.equal(truncateOutput(shortText), shortText);

    const longText = 'x'.repeat(MAX_OUTPUT_LENGTH + 500);
    const truncated = truncateOutput(longText);
    assert.ok(truncated.includes('[Output truncated: exceeded 32 KB display limit]'));
    assert.ok(truncated.startsWith('x'.repeat(MAX_OUTPUT_LENGTH)));
  });

  test('encodes and decodes base64 safely including special characters and unicode', () => {
    const original = 'printf("Hello, 🌍!\\n\\tLine 2");\n';
    const encoded = encodeBase64Safe(original);
    const decoded = decodeBase64Safe(encoded);
    assert.equal(decoded, original);
  });
});

describe('CodeLab - Judge0 Execution Provider (Mocked)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('detects unconfigured state when API key is missing', () => {
    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://judge0-ce.p.rapidapi.com',
      apiKey: undefined,
    });
    assert.equal(provider.isConfigured(), false);
  });

  test('detects configured state when RapidAPI key is provided', () => {
    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://judge0-ce.p.rapidapi.com',
      apiKey: 'valid_rapidapi_key_123',
    });
    assert.equal(provider.isConfigured(), true);
  });

  test('handles successful execution with queued polling', async () => {
    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://judge0-ce.p.rapidapi.com',
      apiKey: 'test_key',
    });

    let pollCount = 0;
    globalThis.fetch = async (url, options) => {
      const urlStr = String(url);
      if (options?.method === 'POST') {
        // Submission endpoint
        return new Response(JSON.stringify({ token: 'mock-token-abc' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (urlStr.includes('/submissions/mock-token-abc')) {
        pollCount++;
        if (pollCount === 1) {
          // Status 1: In Queue
          return new Response(JSON.stringify({ status: { id: 1, description: 'In Queue' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        // Status 3: Accepted
        return new Response(
          JSON.stringify({
            status: { id: 3, description: 'Accepted' },
            stdout: Buffer.from('Hello from Judge0!\n').toString('base64'),
            stderr: null,
            time: '0.042',
            memory: 3020,
            exit_code: 0,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Unexpected request to: ${urlStr}`);
    };

    const res = await provider.execute({
      language: 'python',
      sourceCode: 'print("Hello from Judge0!")',
    });

    assert.equal(res.status, 'success');
    assert.equal(res.stdout, 'Hello from Judge0!\n');
    assert.equal(res.stderr, '');
    assert.equal(res.executionTimeMs, 42);
    assert.equal(res.memoryKb, 3020);
    assert.equal(res.exitCode, 0);
    assert.equal(res.provider, 'Judge0');
  });

  test('handles compilation errors accurately', async () => {
    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://judge0-ce.p.rapidapi.com',
      apiKey: 'test_key',
    });

    globalThis.fetch = async (url, options) => {
      if (options?.method === 'POST') {
        return new Response(JSON.stringify({ token: 'token-compile-err' }), { status: 201 });
      }

      return new Response(
        JSON.stringify({
          status: { id: 6, description: 'Compilation Error' },
          stdout: null,
          compile_output: Buffer.from('main.c:2:5: error: unknown type name "foo"').toString('base64'),
          exit_code: 1,
        }),
        { status: 200 }
      );
    };

    const res = await provider.execute({
      language: 'c',
      sourceCode: 'int main() { foo bar; }',
    });

    assert.equal(res.status, 'compilation_error');
    assert.ok(res.compileOutput?.includes('error: unknown type name "foo"'));
    assert.equal(res.exitCode, 1);
  });

  test('handles runtime errors (SIGSEGV / exit code)', async () => {
    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://judge0-ce.p.rapidapi.com',
      apiKey: 'test_key',
    });

    globalThis.fetch = async (url, options) => {
      if (options?.method === 'POST') {
        return new Response(JSON.stringify({ token: 'token-runtime-err' }), { status: 201 });
      }

      return new Response(
        JSON.stringify({
          status: { id: 7, description: 'Runtime Error (SIGSEGV)' },
          stdout: null,
          stderr: Buffer.from('Segmentation fault (core dumped)\n').toString('base64'),
          exit_code: 139,
        }),
        { status: 200 }
      );
    };

    const res = await provider.execute({
      language: 'cpp',
      sourceCode: 'int main() { int* p = 0; *p = 1; }',
    });

    assert.equal(res.status, 'runtime_error');
    assert.ok(res.stderr.includes('Segmentation fault'));
    assert.equal(res.exitCode, 139);
  });

  test('handles time limit exceeded (status id 5)', async () => {
    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://judge0-ce.p.rapidapi.com',
      apiKey: 'test_key',
    });

    globalThis.fetch = async (url, options) => {
      if (options?.method === 'POST') {
        return new Response(JSON.stringify({ token: 'token-tle' }), { status: 201 });
      }

      return new Response(
        JSON.stringify({
          status: { id: 5, description: 'Time Limit Exceeded' },
          stdout: null,
          stderr: null,
          time: '5.001',
        }),
        { status: 200 }
      );
    };

    const res = await provider.execute({
      language: 'python',
      sourceCode: 'while True: pass',
    });

    assert.equal(res.status, 'time_limit_exceeded');
  });

  test('throws descriptive error on 401 unauthorized credentials', async () => {
    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://judge0-ce.p.rapidapi.com',
      apiKey: 'invalid_key',
    });

    globalThis.fetch = async () => {
      return new Response('Unauthorized', { status: 401 });
    };

    await assert.rejects(
      async () => {
        await provider.execute({ language: 'python', sourceCode: 'print(1)' });
      },
      /Judge0 authentication failed/
    );
  });

  test('throws descriptive error on 429 rate limit exceeded', async () => {
    const provider = new Judge0ExecutionProvider({
      apiUrl: 'https://judge0-ce.p.rapidapi.com',
      apiKey: 'valid_key',
    });

    globalThis.fetch = async () => {
      return new Response('Too Many Requests', { status: 429 });
    };

    await assert.rejects(
      async () => {
        await provider.execute({ language: 'python', sourceCode: 'print(1)' });
      },
      /Judge0 rate limit exceeded/
    );
  });
});

describe('CodeLab - Piston Execution Provider (Mocked)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('handles Piston execution success', async () => {
    const piston = new PistonExecutionProvider({ apiUrl: 'https://emkc.org/api/v2/piston' });

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          language: 'python',
          version: '3.10.0',
          run: {
            stdout: 'Hello Piston!\n',
            stderr: '',
            code: 0,
            signal: null,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const res = await piston.execute({
      language: 'python',
      sourceCode: 'print("Hello Piston!")',
    });

    assert.equal(res.status, 'success');
    assert.equal(res.stdout, 'Hello Piston!\n');
    assert.equal(res.exitCode, 0);
    assert.equal(res.provider, 'Piston');
  });

  test('handles Piston compilation errors', async () => {
    const piston = new PistonExecutionProvider({ apiUrl: 'https://emkc.org/api/v2/piston' });

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          compile: {
            stdout: '',
            stderr: 'main.cpp:1:2: error: stray "#"',
            code: 1,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const res = await piston.execute({
      language: 'cpp',
      sourceCode: '## invalid c++',
    });

    assert.equal(res.status, 'compilation_error');
    assert.ok(res.compileOutput?.includes('error: stray'));
  });
});

describe('CodeLab - Provider Factory & Unconfigured Engine Handling', () => {
  test('returns setup guidance when unconfigured', () => {
    const prevKey = process.env.JUDGE0_API_KEY;
    const prevUrl = process.env.JUDGE0_API_URL;
    const prevPiston = process.env.PISTON_API_URL;
    const prevProvider = process.env.CODE_EXECUTION_PROVIDER;

    try {
      delete process.env.JUDGE0_API_KEY;
      delete process.env.JUDGE0_API_URL;
      delete process.env.PISTON_API_URL;
      delete process.env.CODE_EXECUTION_PROVIDER;

      const status = getProviderStatus();
      assert.equal(status.configured, false);
      assert.equal(status.providerName, 'Unconfigured');
      assert.equal(status.setupInstructions, SETUP_INSTRUCTIONS);
    } finally {
      if (prevKey) process.env.JUDGE0_API_KEY = prevKey;
      if (prevUrl) process.env.JUDGE0_API_URL = prevUrl;
      if (prevPiston) process.env.PISTON_API_URL = prevPiston;
      if (prevProvider) process.env.CODE_EXECUTION_PROVIDER = prevProvider;
    }
  });

  test('unconfigured provider throws explicit configuration error without fake output', async () => {
    const prevKey = process.env.JUDGE0_API_KEY;
    const prevUrl = process.env.JUDGE0_API_URL;
    const prevPiston = process.env.PISTON_API_URL;
    const prevProvider = process.env.CODE_EXECUTION_PROVIDER;

    try {
      delete process.env.JUDGE0_API_KEY;
      delete process.env.JUDGE0_API_URL;
      delete process.env.PISTON_API_URL;
      delete process.env.CODE_EXECUTION_PROVIDER;

      const provider = getExecutionProvider();
      assert.equal(provider.isConfigured(), false);

      await assert.rejects(
        async () => {
          await provider.execute({ language: 'python', sourceCode: 'print(1)' });
        },
        /No sandboxed code execution provider is configured/
      );
    } finally {
      if (prevKey) process.env.JUDGE0_API_KEY = prevKey;
      if (prevUrl) process.env.JUDGE0_API_URL = prevUrl;
      if (prevPiston) process.env.PISTON_API_URL = prevPiston;
      if (prevProvider) process.env.CODE_EXECUTION_PROVIDER = prevProvider;
    }
  });
});
