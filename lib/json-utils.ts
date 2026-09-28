export interface JsonErrorInfo {
  message: string;
  line: number | null;
  column: number | null;
  position: number | null;
  snippet?: string;
  pointer?: string;
}

export interface JsonStats {
  characters: number;
  lines: number;
  sizeBytes: number;
  sizeFormatted: string;
}

export interface JsonValidationResult {
  isValid: boolean | null;
  error: JsonErrorInfo | null;
  stats: JsonStats;
  parsed: unknown | null;
}

export type IndentationType = '2' | '4' | 'compact';

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function calculateStats(text: string): JsonStats {
  const characters = text.length;
  const lines = text.length === 0 ? 0 : text.split('\n').length;
  const sizeBytes = new TextEncoder().encode(text).length;
  return {
    characters,
    lines,
    sizeBytes,
    sizeFormatted: formatByteSize(sizeBytes),
  };
}

export function extractJsonError(error: unknown, rawText: string): JsonErrorInfo {
  const message = error instanceof Error ? error.message : 'Unknown JSON syntax error';

  let line: number | null = null;
  let column: number | null = null;
  let position: number | null = null;

  // Check if Error object has position attached (some runtimes)
  if (typeof error === 'object' && error !== null && 'position' in error) {
    const rawPos = (error as { position?: unknown }).position;
    if (typeof rawPos === 'number' && !isNaN(rawPos)) {
      position = rawPos;
    }
  }

  // Parse regex: "at position 123"
  if (position === null) {
    const posMatch = message.match(/at position\s+(\d+)/i);
    if (posMatch) {
      position = parseInt(posMatch[1], 10);
    }
  }

  // Parse regex: "line 12 column 34" or "line 12, column 34"
  const lineColMatch = message.match(/line\s+(\d+)\s*,?\s*col(?:umn)?\s+(\d+)/i);
  if (lineColMatch) {
    line = parseInt(lineColMatch[1], 10);
    column = parseInt(lineColMatch[2], 10);
  }

  // If position is known, compute exact line & column from rawText
  if (position !== null && !isNaN(position)) {
    const clampedPos = Math.min(Math.max(0, position), rawText.length);
    const textUpToPos = rawText.slice(0, clampedPos);
    const splitLines = textUpToPos.split('\n');
    line = splitLines.length;
    column = splitLines[splitLines.length - 1].length + 1;
  }

  // If error says "Unexpected end of JSON input", point to the end of input
  if (line === null && /unexpected end of (?:json|input)/i.test(message)) {
    const splitLines = rawText.split('\n');
    line = Math.max(1, splitLines.length);
    column = splitLines[splitLines.length - 1].length + 1;
  }

  // Build snippet and pointer if line number is available
  let snippet: string | undefined;
  let pointer: string | undefined;

  if (line !== null) {
    const allLines = rawText.split('\n');
    const lineIndex = line - 1;
    if (lineIndex >= 0 && lineIndex < allLines.length) {
      snippet = allLines[lineIndex];
      if (column !== null && column > 0) {
        const indentSpace = ' '.repeat(Math.max(0, column - 1));
        pointer = `${indentSpace}^`;
      }
    }
  }

  return {
    message,
    line,
    column,
    position,
    snippet,
    pointer,
  };
}

export function validateJson(rawText: string): JsonValidationResult {
  const trimmed = rawText.trim();
  const stats = calculateStats(rawText);

  if (!trimmed) {
    return {
      isValid: null,
      error: null,
      stats,
      parsed: null,
    };
  }

  try {
    const parsed = JSON.parse(rawText);
    return {
      isValid: true,
      error: null,
      stats,
      parsed,
    };
  } catch (err) {
    const errorInfo = extractJsonError(err, rawText);
    return {
      isValid: false,
      error: errorInfo,
      stats,
      parsed: null,
    };
  }
}

export function formatJson(
  rawText: string,
  indent: IndentationType = '2'
): { success: true; output: string; parsed: unknown } | { success: false; error: JsonErrorInfo } {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { success: true, output: '', parsed: null };
  }

  try {
    const parsed = JSON.parse(rawText);
    let output: string;
    if (indent === 'compact') {
      output = JSON.stringify(parsed);
    } else if (indent === '4') {
      output = JSON.stringify(parsed, null, 4);
    } else {
      output = JSON.stringify(parsed, null, 2);
    }
    return { success: true, output, parsed };
  } catch (err) {
    return { success: false, error: extractJsonError(err, rawText) };
  }
}

export function minifyJson(
  rawText: string
): { success: true; output: string; parsed: unknown } | { success: false; error: JsonErrorInfo } {
  return formatJson(rawText, 'compact');
}

export const SAMPLE_JSON = `{
  "api": "ASAPTools",
  "version": "1.0.0",
  "status": "operational",
  "meta": {
    "server": "asaptools.in",
    "timestamp": 1727539200,
    "environment": "production",
    "region": "ap-south-1"
  },
  "user": {
    "id": 10482,
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "roles": ["developer", "admin"],
    "verified": true,
    "balance": 249.50,
    "locale": "en_IN",
    "bio": "Building fast web utilities ⚡",
    "metadata": {
      "theme": "system",
      "notifications": false,
      "lastLogin": null
    }
  },
  "tools": [
    {
      "id": "json-formatter",
      "name": "JSON Formatter & Validator",
      "category": "developer",
      "rating": 4.98,
      "tags": ["json", "formatter", "beautify", "minify"]
    },
    {
      "id": "base64-converter",
      "name": "Base64 Encoder / Decoder",
      "category": "developer",
      "rating": 4.91,
      "tags": ["base64", "encode", "decode"]
    }
  ]
}`;
