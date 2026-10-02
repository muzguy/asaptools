export type SupportedLanguage = 'c' | 'cpp' | 'python';

export interface LanguageConfig {
  id: SupportedLanguage;
  name: string;
  version: string;
  extension: string;
  judge0LanguageId: number;
  mimeType: string;
  defaultStarterCode: string;
  defaultStdin: string;
}

export type ExecutionStatus =
  | 'success'
  | 'compilation_error'
  | 'runtime_error'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'error';

export interface ExecutionRequest {
  language: SupportedLanguage;
  sourceCode: string;
  stdin?: string;
  timeoutMs?: number;
}

export interface ExecutionResult {
  status: ExecutionStatus;
  statusDescription: string;
  stdout: string;
  stderr: string;
  compileOutput?: string;
  executionTimeMs?: number;
  memoryKb?: number;
  exitCode?: number;
  provider: string;
}

export interface ProviderStatus {
  configured: boolean;
  providerName: string;
  supportedLanguages: SupportedLanguage[];
  maxSourceSize: number;
  maxStdinSize: number;
  setupInstructions?: string;
}

export interface ExecutionProvider {
  readonly name: string;
  isConfigured(): boolean;
  execute(req: ExecutionRequest): Promise<ExecutionResult>;
}

export const MAX_SOURCE_LENGTH = 64 * 1024; // 64 KB
export const MAX_STDIN_LENGTH = 16 * 1024;  // 16 KB
export const MAX_OUTPUT_LENGTH = 32 * 1024; // 32 KB
export const DEFAULT_TIMEOUT_MS = 10000;    // 10 seconds

export const STARTER_C = `#include <stdio.h>

int main(void) {
    char name[100];

    printf("=== ASAPTools CodeLab: C (GCC) ===\\n");
    printf("Reading standard input...\\n");

    if (fgets(name, sizeof(name), stdin) != NULL) {
        printf("Hello, %s", name);
    } else {
        printf("Hello, developer!\\n");
    }

    // Interactive calculation demonstration
    int sum = 0;
    for (int i = 1; i <= 10; i++) {
        sum += i;
    }
    printf("Sum of 1 through 10 is: %d\\n", sum);

    return 0;
}
`;

export const STARTER_CPP = `#include <iostream>
#include <vector>
#include <numeric>
#include <string>

int main() {
    std::cout << "=== ASAPTools CodeLab: C++ (G++) ===" << std::endl;
    std::cout << "Reading standard input..." << std::endl;

    std::string name;
    if (std::getline(std::cin, name) && !name.empty()) {
        std::cout << "Welcome, " << name << "!" << std::endl;
    } else {
        std::cout << "Welcome, developer!" << std::endl;
    }

    std::vector<int> numbers = {10, 20, 30, 40, 50};
    int total = std::accumulate(numbers.begin(), numbers.end(), 0);

    std::cout << "Vector values: ";
    for (int n : numbers) {
        std::cout << n << " ";
    }
    std::cout << "\\nTotal sum = " << total << std::endl;

    return 0;
}
`;

export const STARTER_PYTHON = `def main():
    print("=== ASAPTools CodeLab: Interactive Python 3 ===")
    print("Welcome! Type your answers directly into the terminal prompt below.\\n")

    # Interactive input 1: Text prompt
    name = input("Enter your name: ")
    print(f"Hello, {name}!")

    # Interactive input 2: Sequential prompt with arithmetic calculation
    try:
        birth_year_str = input("Enter birth year (e.g. 2000): ")
        if birth_year_str.strip():
            age = 2026 - int(birth_year_str)
            print(f"You will turn approximately {age} in 2026.")
    except ValueError:
        print("Please enter a valid numeric year.")

    # Prime numbers computation demo
    def get_primes(max_val):
        primes = []
        for candidate in range(2, max_val + 1):
            if all(candidate % p != 0 for p in primes):
                primes.append(candidate)
        return primes

    primes = get_primes(30)
    print(f"\\nComputed prime numbers up to 30: {primes}")
    print("All tasks finished successfully!")

if __name__ == "__main__":
    main()
`;

export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  c: {
    id: 'c',
    name: 'C',
    version: 'GCC (Coming Soon)',
    extension: '.c',
    judge0LanguageId: 50, // C (GCC 9.2.0)
    mimeType: 'text/x-csrc',
    defaultStarterCode: STARTER_C,
    defaultStdin: 'Ada Lovelace\n',
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    version: 'G++ (Coming Soon)',
    extension: '.cpp',
    judge0LanguageId: 54, // C++ (GCC 9.2.0)
    mimeType: 'text/x-c++src',
    defaultStarterCode: STARTER_CPP,
    defaultStdin: 'Alan Turing\n',
  },
  python: {
    id: 'python',
    name: 'Python 3',
    version: 'Pyodide WebAssembly',
    extension: '.py',
    judge0LanguageId: 71, // Python (3.8.1)
    mimeType: 'text/x-python',
    defaultStarterCode: STARTER_PYTHON,
    defaultStdin: 'Guido van Rossum\n',
  },
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['c', 'cpp', 'python'];

// -------------------------------------------------------------
// Validation Utilities
// -------------------------------------------------------------

export interface ValidationSuccess {
  valid: true;
  data: {
    language: SupportedLanguage;
    sourceCode: string;
    stdin: string;
  };
}

export interface ValidationFailure {
  valid: false;
  error: string;
  code: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export function normalizeLanguage(lang: unknown): SupportedLanguage | null {
  if (typeof lang !== 'string') return null;
  const normalized = lang.trim().toLowerCase();

  if (normalized === 'c') return 'c';
  if (normalized === 'cpp' || normalized === 'c++' || normalized === 'cplusplus') return 'cpp';
  if (normalized === 'python' || normalized === 'python3' || normalized === 'py') return 'python';

  return null;
}

export function validateExecutionRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: 'Invalid request body. Expected a JSON object.',
      code: 'INVALID_PAYLOAD',
    };
  }

  const { language, sourceCode, stdin } = body as Record<string, unknown>;

  const canonicalLang = normalizeLanguage(language);
  if (!canonicalLang) {
    return {
      valid: false,
      error: `Unsupported language "${String(language ?? '')}". Supported languages are: ${SUPPORTED_LANGUAGES.join(', ')}.`,
      code: 'UNSUPPORTED_LANGUAGE',
    };
  }

  if (typeof sourceCode !== 'string') {
    return {
      valid: false,
      error: 'Source code must be provided as a string.',
      code: 'INVALID_SOURCE_CODE',
    };
  }

  if (sourceCode.trim().length === 0) {
    return {
      valid: false,
      error: 'Source code cannot be empty.',
      code: 'EMPTY_SOURCE_CODE',
    };
  }

  if (sourceCode.length > MAX_SOURCE_LENGTH) {
    return {
      valid: false,
      error: `Source code exceeds maximum permitted length of ${MAX_SOURCE_LENGTH / 1024} KB.`,
      code: 'SOURCE_CODE_TOO_LARGE',
    };
  }

  let normalizedStdin = '';
  if (stdin !== undefined && stdin !== null) {
    if (typeof stdin !== 'string') {
      return {
        valid: false,
        error: 'Standard input (stdin) must be a string.',
        code: 'INVALID_STDIN',
      };
    }
    if (stdin.length > MAX_STDIN_LENGTH) {
      return {
        valid: false,
        error: `Standard input exceeds maximum permitted length of ${MAX_STDIN_LENGTH / 1024} KB.`,
        code: 'STDIN_TOO_LARGE',
      };
    }
    normalizedStdin = stdin;
  }

  return {
    valid: true,
    data: {
      language: canonicalLang,
      sourceCode,
      stdin: normalizedStdin,
    },
  };
}

// -------------------------------------------------------------
// Formatters & Helper Utilities
// -------------------------------------------------------------

export function sanitizeApiKey(key?: string | null): string | undefined {
  if (!key) return undefined;
  const trimmed = key.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed || trimmed.toLowerCase().startsWith('your_')) return undefined;
  return trimmed;
}

export function decodeBase64Safe(encoded?: string | null): string {
  if (!encoded) return '';
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(encoded, 'base64').toString('utf8');
    }
    if (typeof atob === 'function') {
      return atob(encoded);
    }
  } catch {
    return encoded;
  }
  return encoded;
}

export function encodeBase64Safe(text: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text, 'utf8').toString('base64');
  }
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(text)));
  }
  return text;
}

export function truncateOutput(text: string, maxLen = MAX_OUTPUT_LENGTH): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '\n\n[Output truncated: exceeded 32 KB display limit]';
}

export function formatExecutionTime(ms?: number): string {
  if (ms === undefined || ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatMemoryUsage(kb?: number): string {
  if (kb === undefined || kb === null) return '—';
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// -------------------------------------------------------------
// Judge0 Execution Provider
// -------------------------------------------------------------

function mapJudge0Status(statusId: number): ExecutionStatus {
  switch (statusId) {
    case 3: // Accepted
    case 4: // Wrong Answer (standard execution without judge test-suite)
      return 'success';
    case 5: // Time Limit Exceeded
      return 'time_limit_exceeded';
    case 6: // Compilation Error
      return 'compilation_error';
    case 7: // Runtime Error (SIGSEGV)
    case 8: // Runtime Error (SIGXFSZ)
    case 9: // Runtime Error (SIGFPE)
    case 10: // Runtime Error (SIGABRT)
    case 11: // Runtime Error (NZEC)
    case 12: // Runtime Error (Other)
      return 'runtime_error';
    default:
      return 'error';
  }
}

export class Judge0ExecutionProvider implements ExecutionProvider {
  readonly name = 'Judge0';
  private apiUrl: string;
  private apiKey?: string;
  private apiHost?: string;

  constructor(options?: { apiUrl?: string; apiKey?: string; apiHost?: string }) {
    this.apiUrl = options?.apiUrl || process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
    this.apiKey = sanitizeApiKey(options?.apiKey ?? process.env.JUDGE0_API_KEY);
    this.apiHost = options?.apiHost || process.env.JUDGE0_API_HOST;
  }

  isConfigured(): boolean {
    const isRapidApi = this.apiUrl.includes('rapidapi.com');
    if (isRapidApi) {
      return Boolean(this.apiKey);
    }
    const isCustomUrl = Boolean(process.env.JUDGE0_API_URL && !process.env.JUDGE0_API_URL.includes('rapidapi.com'));
    return Boolean(this.apiKey || isCustomUrl);
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const isRapidApi = this.apiUrl.includes('rapidapi.com');
    if (isRapidApi && this.apiKey) {
      headers['X-RapidAPI-Key'] = this.apiKey;
      headers['X-RapidAPI-Host'] = this.apiHost || 'judge0-ce.p.rapidapi.com';
    } else if (this.apiKey) {
      headers['X-Auth-Token'] = this.apiKey;
    }

    return headers;
  }

  async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'Judge0 API is not configured on the server. Please set JUDGE0_API_KEY in .env.local to enable real code execution.'
      );
    }

    const langConfig = LANGUAGE_CONFIGS[req.language];
    if (!langConfig) {
      throw new Error(`Unsupported language: ${req.language}`);
    }

    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const cleanBaseUrl = this.apiUrl.replace(/\/+$/, '');
    const headers = this.buildHeaders();

    // 1. Submit Code Submission
    const submitUrl = `${cleanBaseUrl}/submissions?base64_encoded=true&wait=false`;
    const submissionPayload = {
      source_code: encodeBase64Safe(req.sourceCode),
      language_id: langConfig.judge0LanguageId,
      stdin: encodeBase64Safe(req.stdin ?? ''),
      cpu_time_limit: 5,
      wall_time_limit: 10,
      memory_limit: 128000,
    };

    let submitResponse: Response;
    try {
      submitResponse = await fetch(submitUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(submissionPayload),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      throw new Error(`Failed to connect to Judge0 execution server: ${msg}`);
    }

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      if (submitResponse.status === 401 || submitResponse.status === 403) {
        throw new Error('Judge0 authentication failed. Check your JUDGE0_API_KEY in .env.local.');
      }
      if (submitResponse.status === 429) {
        throw new Error('Judge0 rate limit exceeded. Please wait a few seconds and try again.');
      }
      throw new Error(
        `Judge0 submission failed (HTTP ${submitResponse.status}): ${errorText || submitResponse.statusText}`
      );
    }

    const submitJson = (await submitResponse.json()) as { token?: string };
    const token = submitJson.token;
    if (!token) {
      throw new Error('Judge0 did not return a submission token.');
    }

    // 2. Poll for Submission Result
    const pollUrl = `${cleanBaseUrl}/submissions/${token}?base64_encoded=true`;
    const startTime = Date.now();
    const pollInterval = 400;

    while (Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      let pollResponse: Response;
      try {
        pollResponse = await fetch(pollUrl, {
          method: 'GET',
          headers,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error';
        throw new Error(`Error polling Judge0 submission result: ${msg}`);
      }

      if (!pollResponse.ok) {
        throw new Error(`Judge0 polling error (HTTP ${pollResponse.status})`);
      }

      interface Judge0SubmissionData {
        status?: { id: number; description: string };
        stdout?: string | null;
        stderr?: string | null;
        compile_output?: string | null;
        message?: string | null;
        time?: string | null;
        memory?: number | null;
        exit_code?: number | null;
      }

      const resultData = (await pollResponse.json()) as Judge0SubmissionData;
      const statusId = resultData.status?.id ?? 1;

      // In Queue or Processing
      if (statusId === 1 || statusId === 2) {
        continue;
      }

      const status = mapJudge0Status(statusId);
      const stdout = truncateOutput(decodeBase64Safe(resultData.stdout));
      const stderr = truncateOutput(decodeBase64Safe(resultData.stderr));
      const compileOutput = truncateOutput(decodeBase64Safe(resultData.compile_output));
      const message = decodeBase64Safe(resultData.message);

      const combinedStderr = [stderr, message].filter(Boolean).join('\n').trim();
      const executionTimeMs = resultData.time
        ? Math.round(parseFloat(resultData.time) * 1000)
        : Date.now() - startTime;

      return {
        status,
        statusDescription: resultData.status?.description || 'Executed',
        stdout,
        stderr: combinedStderr,
        compileOutput: compileOutput || undefined,
        executionTimeMs,
        memoryKb: resultData.memory ?? undefined,
        exitCode: resultData.exit_code ?? (status === 'success' ? 0 : 1),
        provider: 'Judge0',
      };
    }

    return {
      status: 'time_limit_exceeded',
      statusDescription: 'Time Limit Exceeded (Polling timeout)',
      stdout: '',
      stderr: `Code execution timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
      executionTimeMs: timeoutMs,
      exitCode: 124,
      provider: 'Judge0',
    };
  }
}

// -------------------------------------------------------------
// Piston Execution Provider
// -------------------------------------------------------------

export class PistonExecutionProvider implements ExecutionProvider {
  readonly name = 'Piston';
  private apiUrl: string;

  constructor(options?: { apiUrl?: string }) {
    this.apiUrl = options?.apiUrl || process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';
  }

  isConfigured(): boolean {
    return Boolean(process.env.PISTON_API_URL || process.env.CODE_EXECUTION_PROVIDER === 'piston');
  }

  async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    const cleanBaseUrl = this.apiUrl.replace(/\/+$/, '');
    const executeUrl = `${cleanBaseUrl}/execute`;

    const pistonLang = req.language === 'cpp' ? 'c++' : req.language;

    const payload = {
      language: pistonLang,
      version: '*',
      files: [
        {
          name: req.language === 'python' ? 'main.py' : req.language === 'cpp' ? 'main.cpp' : 'main.c',
          content: req.sourceCode,
        },
      ],
      stdin: req.stdin || '',
      run_timeout: Math.min(req.timeoutMs || 10000, 10000),
      compile_timeout: 10000,
    };

    const startTime = Date.now();
    let res: Response;
    try {
      res = await fetch(executeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      throw new Error(`Failed to reach Piston execution service: ${msg}`);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Piston API error (HTTP ${res.status}): ${text}`);
    }

    interface PistonOutput {
      stdout?: string;
      stderr?: string;
      output?: string;
      code?: number | null;
      signal?: string | null;
    }

    interface PistonResponse {
      run?: PistonOutput;
      compile?: PistonOutput;
      message?: string;
    }

    const data = (await res.json()) as PistonResponse;
    const duration = Date.now() - startTime;

    if (data.compile && data.compile.code !== 0 && data.compile.code !== null) {
      const compileErr = data.compile.stderr || data.compile.output || 'Compilation failed.';
      return {
        status: 'compilation_error',
        statusDescription: 'Compilation Error',
        stdout: '',
        stderr: truncateOutput(compileErr, MAX_OUTPUT_LENGTH),
        compileOutput: truncateOutput(compileErr, MAX_OUTPUT_LENGTH),
        executionTimeMs: duration,
        exitCode: data.compile.code ?? 1,
        provider: 'Piston',
      };
    }

    const run = data.run || {};
    let status: ExecutionStatus = 'success';
    let statusDescription = 'Success';

    if (run.signal === 'SIGKILL' || run.signal === 'SIGTERM') {
      status = 'time_limit_exceeded';
      statusDescription = 'Time Limit Exceeded';
    } else if (run.code !== 0 && run.code !== null) {
      status = 'runtime_error';
      statusDescription = `Runtime Error (Exit code: ${run.code})`;
    }

    return {
      status,
      statusDescription,
      stdout: truncateOutput(run.stdout || '', MAX_OUTPUT_LENGTH),
      stderr: truncateOutput(run.stderr || '', MAX_OUTPUT_LENGTH),
      executionTimeMs: duration,
      exitCode: run.code ?? 0,
      provider: 'Piston',
    };
  }
}

// -------------------------------------------------------------
// Provider Resolution Factory & Status
// -------------------------------------------------------------

export const SETUP_INSTRUCTIONS = `To enable live code execution in ASAPTools CodeLab, configure a sandboxed execution provider in your .env.local file:

Option 1: Judge0 CE via RapidAPI (Recommended)
1. Get a key at https://rapidapi.com/judge0-official/api/judge0-ce
2. Add to your .env.local:
   JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
   JUDGE0_API_KEY=your_rapidapi_key
   JUDGE0_API_HOST=judge0-ce.p.rapidapi.com

Option 2: Self-Hosted Judge0
1. Deploy Judge0 via Docker on port 2358
2. Add to your .env.local:
   JUDGE0_API_URL=http://localhost:2358

Option 3: Piston Engine
1. Add to your .env.local:
   CODE_EXECUTION_PROVIDER=piston
   PISTON_API_URL=https://emkc.org/api/v2/piston

Security notice: Never paste API keys into chat or commit .env.local.`;

export class UnconfiguredExecutionProvider implements ExecutionProvider {
  readonly name = 'Unconfigured';

  isConfigured(): boolean {
    return false;
  }

  async execute(): Promise<ExecutionResult> {
    throw new Error(
      'No sandboxed code execution provider is configured on the server. Please configure Judge0 or Piston in .env.local.'
    );
  }
}

export function getExecutionProvider(): ExecutionProvider {
  const preferredProvider = process.env.CODE_EXECUTION_PROVIDER?.toLowerCase().trim();

  if (preferredProvider === 'piston') {
    const piston = new PistonExecutionProvider();
    if (piston.isConfigured()) return piston;
  }

  if (preferredProvider === 'judge0') {
    const judge0 = new Judge0ExecutionProvider();
    if (judge0.isConfigured()) return judge0;
  }

  const judge0 = new Judge0ExecutionProvider();
  if (judge0.isConfigured()) {
    return judge0;
  }

  const piston = new PistonExecutionProvider();
  if (piston.isConfigured()) {
    return piston;
  }

  return new UnconfiguredExecutionProvider();
}

export function getProviderStatus(): ProviderStatus {
  const provider = getExecutionProvider();
  const configured = provider.isConfigured();

  return {
    configured,
    providerName: provider.name,
    supportedLanguages: [...SUPPORTED_LANGUAGES],
    maxSourceSize: MAX_SOURCE_LENGTH,
    maxStdinSize: MAX_STDIN_LENGTH,
    setupInstructions: configured ? undefined : SETUP_INSTRUCTIONS,
  };
}
