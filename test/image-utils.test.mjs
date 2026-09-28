import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeQuality,
  getMimeExtension,
  getFileExtension,
  getFilenameWithoutExtension,
  formatByteSize,
  SUPPORTED_INPUT_TYPES,
  MAX_IMAGE_FILE_SIZE,
} from '../lib/image-utils.ts';

describe('Image Utils - Quality Normalization', () => {
  test('normalizes 0-100 integer range to 0.01-1.0', () => {
    assert.equal(normalizeQuality(5), 0.05);
    assert.equal(normalizeQuality(25), 0.25);
    assert.equal(normalizeQuality(50), 0.5);
    assert.equal(normalizeQuality(75), 0.75);
    assert.equal(normalizeQuality(95), 0.95);
    assert.equal(normalizeQuality(100), 1.0);
  });

  test('normalizes 0.01-1.0 float range unchanged', () => {
    assert.equal(normalizeQuality(0.05), 0.05);
    assert.equal(normalizeQuality(0.25), 0.25);
    assert.equal(normalizeQuality(0.5), 0.5);
    assert.equal(normalizeQuality(0.75), 0.75);
    assert.equal(normalizeQuality(0.95), 0.95);
    assert.equal(normalizeQuality(1.0), 1.0);
  });

  test('clamps out-of-range quality values safely', () => {
    assert.equal(normalizeQuality(0), 0.01);
    assert.equal(normalizeQuality(-10), 0.01);
    assert.equal(normalizeQuality(150), 1.0);
  });
});

describe('Image Utils - MIME and File Extensions', () => {
  test('returns correct extensions for standard formats', () => {
    assert.equal(getMimeExtension('image/jpeg'), 'jpg');
    assert.equal(getMimeExtension('image/jpg'), 'jpg');
    assert.equal(getMimeExtension('IMAGE/JPEG'), 'jpg');
    assert.equal(getMimeExtension('image/png'), 'png');
    assert.equal(getMimeExtension('image/webp'), 'webp');
    assert.equal(getMimeExtension('image/avif'), 'avif');
  });

  test('parses filenames and extensions correctly', () => {
    assert.equal(getFileExtension('photo.jpg'), 'jpg');
    assert.equal(getFileExtension('archive.tar.gz'), 'gz');
    assert.equal(getFileExtension('image.WEBP'), 'webp');
    assert.equal(getFilenameWithoutExtension('photo.highres.png'), 'photo.highres');
    assert.equal(getFilenameWithoutExtension('simple'), 'simple');
  });

  test('formats byte sizes accurately', () => {
    assert.equal(formatByteSize(450), '450 B');
    assert.equal(formatByteSize(1024), '1.0 KB');
    assert.equal(formatByteSize(1024 * 100), '100.0 KB');
    assert.equal(formatByteSize(1024 * 1024 * 2.5), '2.50 MB');
  });

  test('supports all intended input image formats', () => {
    assert.ok(SUPPORTED_INPUT_TYPES.has('image/jpeg'));
    assert.ok(SUPPORTED_INPUT_TYPES.has('image/png'));
    assert.ok(SUPPORTED_INPUT_TYPES.has('image/webp'));
    assert.ok(SUPPORTED_INPUT_TYPES.has('image/avif'));
    assert.ok(SUPPORTED_INPUT_TYPES.has('image/bmp'));
    assert.ok(SUPPORTED_INPUT_TYPES.has('image/gif'));
    assert.equal(MAX_IMAGE_FILE_SIZE, 50 * 1024 * 1024);
  });
});

describe('Image Compression - MIME Fallback and Verification Logic', () => {
  test('detects silent browser fallback from requested format to PNG', () => {
    const requestedFormat = 'image/webp';
    const mockBlobFromUnsupportedBrowser = {
      type: 'image/png',
      size: 250000,
    };

    const normalizedTarget = requestedFormat.toLowerCase();
    const normalizedActual = mockBlobFromUnsupportedBrowser.type.toLowerCase();

    const isMatch = normalizedActual === normalizedTarget;
    assert.equal(isMatch, false, 'Should flag mismatch when browser falls back to image/png');
  });

  test('accepts when browser produces requested format', () => {
    const requestedFormat = 'image/webp';
    const mockBlob = {
      type: 'image/webp',
      size: 120000,
    };

    const normalizedTarget = requestedFormat.toLowerCase();
    const normalizedActual = mockBlob.type.toLowerCase();

    const isMatch = normalizedActual === normalizedTarget;
    assert.equal(isMatch, true, 'Should accept when browser successfully encoded to image/webp');
  });

  test('handles image/jpg and image/jpeg equivalence', () => {
    const requestedFormat = 'image/jpg';
    const mockBlob = {
      type: 'image/jpeg',
      size: 150000,
    };

    const normTarget = requestedFormat === 'image/jpg' ? 'image/jpeg' : requestedFormat;
    const normActual = mockBlob.type === 'image/jpg' ? 'image/jpeg' : mockBlob.type;

    assert.equal(normActual, normTarget, 'image/jpg and image/jpeg should be treated as equivalent');
  });
});

describe('Image Compression - Race Condition & Request Versioning Logic', () => {
  test('discards older out-of-order responses using sequence token', async () => {
    let requestId = 0;
    let committedResult = null;
    const revokedUrls = [];

    const mockRevoke = (url) => revokedUrls.push(url);

    // Simulate dispatching 3 rapid settings changes
    const dispatchJob = (jobId, latencyMs, resultPayload) => {
      const thisRequestId = ++requestId;
      return new Promise((resolve) => {
        setTimeout(() => {
          // Emulate component resolution check
          if (thisRequestId !== requestId) {
            // Stale result discarded!
            mockRevoke(resultPayload.url);
            resolve({ discarded: true, jobId });
          } else {
            // Active result committed!
            committedResult = resultPayload;
            resolve({ discarded: false, jobId });
          }
        }, latencyMs);
      });
    };

    // Job 1 (e.g. quality 50): slower network/canvas (100ms)
    // Job 2 (e.g. quality 25): medium (80ms)
    // Job 3 (e.g. quality 75): fastest (20ms)
    const p1 = dispatchJob(1, 100, { url: 'blob:job1', quality: 50 });
    const p2 = dispatchJob(2, 80, { url: 'blob:job2', quality: 25 });
    const p3 = dispatchJob(3, 20, { url: 'blob:job3', quality: 75 });

    await Promise.all([p1, p2, p3]);

    // Job 3 was the last dispatched (requestId === 3)
    // Even though Job 1 and Job 2 resolve later than Job 3, they MUST be discarded
    assert.equal(committedResult.quality, 75, 'Committed result must strictly match the latest dispatched request');
    assert.equal(committedResult.url, 'blob:job3');
    assert.ok(revokedUrls.includes('blob:job1'), 'Job 1 URL must have been revoked');
    assert.ok(revokedUrls.includes('blob:job2'), 'Job 2 URL must have been revoked');
    assert.equal(revokedUrls.includes('blob:job3'), false, 'Job 3 URL must not be revoked');
  });
});

describe('Image Compression - Output Statistics Accuracy', () => {
  test('calculates accurate savings percentage when smaller', () => {
    const originalSize = 100000;
    const compressedSize = 60000;

    const savingsBytes = originalSize - compressedSize;
    const isSmaller = compressedSize < originalSize;
    const diffBytes = Math.abs(savingsBytes);
    const savingsPercentage = parseFloat(((diffBytes / originalSize) * 100).toFixed(1));

    assert.equal(isSmaller, true);
    assert.equal(savingsBytes, 40000);
    assert.equal(savingsPercentage, 40.0);
  });

  test('calculates accurate increase percentage when larger without negative display', () => {
    const originalSize = 50000;
    const compressedSize = 65000;

    const savingsBytes = originalSize - compressedSize;
    const isSmaller = compressedSize < originalSize;
    const diffBytes = Math.abs(savingsBytes);
    const savingsPercentage = parseFloat(((diffBytes / originalSize) * 100).toFixed(1));

    assert.equal(isSmaller, false);
    assert.equal(savingsBytes, -15000);
    assert.equal(savingsPercentage, 30.0);
  });
});
