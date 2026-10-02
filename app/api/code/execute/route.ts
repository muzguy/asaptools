import { NextRequest, NextResponse } from 'next/server';
import {
  validateExecutionRequest,
  getExecutionProvider,
  getProviderStatus,
  SETUP_INSTRUCTIONS,
} from '@/lib/code-playground-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/code/execute
 * Returns the status of the server-side code execution provider.
 */
export async function GET() {
  const status = getProviderStatus();
  return NextResponse.json(status);
}

/**
 * POST /api/code/execute
 * Submits source code and stdin for sandboxed execution.
 */
export async function POST(req: NextRequest) {
  const provider = getExecutionProvider();

  // Enforce genuine sandboxed execution requirement
  if (!provider.isConfigured()) {
    return NextResponse.json(
      {
        error: 'No sandboxed code execution provider is configured on the server.',
        code: 'PROVIDER_NOT_CONFIGURED',
        details:
          'To execute real C, C++, and Python 3 code in a secure sandbox, configure an execution provider in .env.local. See .env.example for setup instructions.',
        setupInstructions: SETUP_INSTRUCTIONS,
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid JSON request payload.',
        code: 'INVALID_JSON',
      },
      { status: 400 }
    );
  }

  // Server-side validation
  const validation = validateExecutionRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      {
        error: validation.error,
        code: validation.code,
      },
      { status: 400 }
    );
  }

  try {
    const result = await provider.execute({
      language: validation.data.language,
      sourceCode: validation.data.sourceCode,
      stdin: validation.data.stdin,
      timeoutMs: 12000,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Execution failed';
    return NextResponse.json(
      {
        error: errorMessage,
        code: 'EXECUTION_FAILED',
        provider: provider.name,
      },
      { status: 502 }
    );
  }
}
