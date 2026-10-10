import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateImageFile,
  validateDimensions,
  formatByteSize,
  formatResolution,
  generateOutputFilename,
  parseProgress,
  MODEL_OPTIONS,
  PRESET_BACKDROPS,
  MAX_BG_REMOVAL_FILE_SIZE,
  MIN_IMAGE_DIMENSION,
  MAX_IMAGE_DIMENSION,
} from '../lib/ai-background-remover-utils.ts';
import { TOOLS_REGISTRY, POPULAR_TOOL_IDS } from '../lib/tools-registry.ts';

describe('AI Background Remover - File Validation', () => {
  test('accepts valid JPG, PNG, and WebP files within 25 MB limit', () => {
    assert.deepEqual(
      validateImageFile({ name: 'photo.jpg', size: 1024 * 1024 * 3, type: 'image/jpeg' }),
      { valid: true }
    );
    assert.deepEqual(
      validateImageFile({ name: 'portrait.png', size: 1024 * 500, type: 'image/png' }),
      { valid: true }
    );
    assert.deepEqual(
      validateImageFile({ name: 'graphic.webp', size: 1024 * 1024 * 8, type: 'image/webp' }),
      { valid: true }
    );
  });

  test('accepts file by extension even if browser MIME type is generic', () => {
    assert.deepEqual(
      validateImageFile({ name: 'camera_capture.JPEG', size: 1024 * 200, type: '' }),
      { valid: true }
    );
    assert.deepEqual(
      validateImageFile({ name: 'snapshot.PNG', size: 1024 * 100, type: 'application/octet-stream' }),
      { valid: true }
    );
  });

  test('rejects empty file (0 bytes)', () => {
    const result = validateImageFile({ name: 'empty.png', size: 0, type: 'image/png' });
    assert.equal(result.valid, false);
    assert.match(result.error || '', /empty/i);
  });

  test('rejects oversized files exceeding 25 MB limit', () => {
    const oversizedBytes = MAX_BG_REMOVAL_FILE_SIZE + 1024;
    const result = validateImageFile({ name: 'giant_raw.jpg', size: oversizedBytes, type: 'image/jpeg' });
    assert.equal(result.valid, false);
    assert.match(result.error || '', /25 MB limit/i);
  });

  test('rejects unsupported file formats', () => {
    const invalidFormats = [
      { name: 'document.pdf', size: 1024 * 100, type: 'application/pdf' },
      { name: 'vector.svg', size: 1024 * 20, type: 'image/svg+xml' },
      { name: 'animation.gif', size: 1024 * 50, type: 'image/gif' },
      { name: 'data.txt', size: 1024 * 5, type: 'text/plain' },
    ];

    for (const item of invalidFormats) {
      const result = validateImageFile(item);
      assert.equal(result.valid, false);
      assert.match(result.error || '', /unsupported image format/i);
    }
  });

  test('handles null or missing file gracefully', () => {
    // @ts-expect-error Testing invalid runtime input
    const result = validateImageFile(null);
    assert.equal(result.valid, false);
  });
});

describe('AI Background Remover - Dimension Validation', () => {
  test('accepts valid dimensions', () => {
    assert.deepEqual(validateDimensions(1920, 1080), { valid: true, warning: undefined });
    assert.deepEqual(validateDimensions(800, 600), { valid: true, warning: undefined });
    assert.deepEqual(validateDimensions(1200, 900), { valid: true, warning: undefined });
  });

  test('rejects zero or negative dimensions', () => {
    assert.equal(validateDimensions(0, 500).valid, false);
    assert.equal(validateDimensions(500, -10).valid, false);
  });

  test('rejects dimensions below minimum threshold (10 px)', () => {
    const result = validateDimensions(MIN_IMAGE_DIMENSION - 1, 100);
    assert.equal(result.valid, false);
    assert.match(result.error || '', /too small/i);
  });

  test('rejects dimensions above maximum threshold (8000 px)', () => {
    const result = validateDimensions(MAX_IMAGE_DIMENSION + 10, 2000);
    assert.equal(result.valid, false);
    assert.match(result.error || '', /exceed the maximum supported/i);
  });

  test('emits warning for very high-resolution images (> 4000 px)', () => {
    const result = validateDimensions(5000, 3000);
    assert.equal(result.valid, true);
    assert.ok(result.warning);
    assert.match(result.warning || '', /High-resolution image/i);
  });
});

describe('AI Background Remover - Formatting Helpers', () => {
  test('formats byte sizes accurately', () => {
    assert.equal(formatByteSize(0), '0 B');
    assert.equal(formatByteSize(512), '512 B');
    assert.equal(formatByteSize(1024), '1.0 KB');
    assert.equal(formatByteSize(1024 * 1024 * 2.5), '2.50 MB');
    assert.equal(formatByteSize(1024 * 1024 * 42.29), '42.29 MB');
  });

  test('formats resolution cleanly', () => {
    assert.equal(formatResolution(1920, 1080), '1920 × 1080 px');
    assert.equal(formatResolution(3840, 2160), '3840 × 2160 px');
  });

  test('generates sanitized output filename', () => {
    assert.equal(generateOutputFilename('portrait.jpg'), 'portrait-asap-bg-removed.png');
    assert.equal(generateOutputFilename('my photo 2026.png'), 'my-photo-2026-asap-bg-removed.png');
    assert.equal(generateOutputFilename('complex.name.with.dots.webp'), 'complex-name-with-dots-asap-bg-removed.png');
    assert.equal(generateOutputFilename('photo@#$%.jpg'), 'photo-asap-bg-removed.png');
    assert.equal(generateOutputFilename(''), 'image-asap-bg-removed.png');
  });
});

describe('AI Background Remover - Progress State Mapping', () => {
  test('parses download phase with accurate percentage and label', () => {
    const total = 44342272; // ~42.3 MB
    const half = 22171136;
    const progress = parseProgress('/models/isnet_quint8', half, total);

    assert.equal(progress.stage, 'downloading');
    assert.ok(progress.percent >= 30 && progress.percent <= 45); // mapped to 0-75% bracket
    assert.match(progress.label, /Fast Quantized/i);
    assert.match(progress.detail || '', /50%/);
  });

  test('parses WebAssembly neural engine download phase', () => {
    const progress = parseProgress('/onnxruntime-web/ort-wasm-simd-threaded.wasm', 5000000, 11800000);
    assert.equal(progress.stage, 'downloading');
    assert.match(progress.label, /WebAssembly/i);
  });

  test('parses compute stages in correct sequential order', () => {
    const decode = parseProgress('compute:decode', 0, 4);
    assert.equal(decode.stage, 'decoding');
    assert.equal(decode.percent, 80);

    const inference = parseProgress('compute:inference', 1, 4);
    assert.equal(inference.stage, 'inference');
    assert.equal(inference.percent, 88);

    const mask = parseProgress('compute:mask', 2, 4);
    assert.equal(mask.stage, 'masking');
    assert.equal(mask.percent, 94);

    const encode = parseProgress('compute:encode', 3, 4);
    assert.equal(encode.stage, 'encoding');
    assert.equal(encode.percent, 98);
  });
});

describe('AI Background Remover - Models & Backdrop Configurations', () => {
  test('defines exactly 3 supported model options', () => {
    assert.equal(MODEL_OPTIONS.length, 3);
    const keys = MODEL_OPTIONS.map((m) => m.key);
    assert.ok(keys.includes('isnet_quint8'));
    assert.ok(keys.includes('isnet_fp16'));
    assert.ok(keys.includes('isnet'));
  });

  test('provides transparent and solid color backdrops', () => {
    const transparent = PRESET_BACKDROPS.find((b) => b.id === 'transparent');
    assert.ok(transparent);
    assert.equal(transparent.type, 'transparent');

    const solids = PRESET_BACKDROPS.filter((b) => b.type === 'solid');
    assert.ok(solids.length >= 5);
  });
});

describe('AI Background Remover - Tools Registry Integration', () => {
  test('is registered in TOOLS_REGISTRY with correct metadata', () => {
    const tool = TOOLS_REGISTRY.find((t) => t.id === 'ai-background-remover');
    assert.ok(tool, 'ai-background-remover must be registered');
    assert.equal(tool.name, 'AI Background Remover');
    assert.equal(tool.slug, '/tools/ai-background-remover');
    assert.equal(tool.category, 'image');
    assert.equal(tool.status, 'available');
    assert.equal(tool.icon, 'scissors');
    assert.ok(tool.keywords.includes('ai background remover'));
    assert.ok(tool.keywords.includes('transparent png'));
  });

  test('is included in POPULAR_TOOL_IDS', () => {
    const isPopular = POPULAR_TOOL_IDS.includes('ai-background-remover');
    assert.ok(isPopular, 'ai-background-remover must be included in POPULAR_TOOL_IDS');
  });
});
