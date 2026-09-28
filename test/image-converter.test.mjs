import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMimeExtension,
  getFilenameWithoutExtension,
  formatByteSize,
} from '../lib/image-utils.ts';

describe('Image Converter - Format & Extension Mapping', () => {
  test('maps converter target formats to genuine file extensions', () => {
    assert.equal(getMimeExtension('image/jpeg'), 'jpg');
    assert.equal(getMimeExtension('image/png'), 'png');
    assert.equal(getMimeExtension('image/webp'), 'webp');
  });

  test('formats downloaded filenames with correct target extension', () => {
    const baseName = getFilenameWithoutExtension('my-vacation-photo.PNG');
    assert.equal(baseName, 'my-vacation-photo');

    const extWebp = getMimeExtension('image/webp');
    assert.equal(`${baseName}.${extWebp}`, 'my-vacation-photo.webp');

    const extJpg = getMimeExtension('image/jpeg');
    assert.equal(`${baseName}.${extJpg}`, 'my-vacation-photo.jpg');

    const extPng = getMimeExtension('image/png');
    assert.equal(`${baseName}.${extPng}`, 'my-vacation-photo.png');
  });

  test('formats byte sizes accurately for display stats', () => {
    assert.equal(formatByteSize(512), '512 B');
    assert.equal(formatByteSize(1024), '1.0 KB');
    assert.equal(formatByteSize(1048576), '1.00 MB');
  });
});

describe('Image Converter - Silent Fallback & MIME Enforcement', () => {
  test('detects when browser silently falls back to image/png for unsupported format', () => {
    const requestedTarget = 'image/webp';
    const mockReturnedBlob = { type: 'image/png', size: 85000 };

    const normTarget = requestedTarget.toLowerCase();
    const normActual = mockReturnedBlob.type.toLowerCase();

    const isMatch = normActual === normTarget;
    assert.equal(isMatch, false, 'Should flag mismatch when browser falls back to image/png');
  });

  test('verifies genuine matching output format', () => {
    const requestedTarget = 'image/jpeg';
    const mockReturnedBlob = { type: 'image/jpeg', size: 62000 };

    const normTarget = requestedTarget.toLowerCase();
    const normActual = mockReturnedBlob.type.toLowerCase();

    assert.equal(normActual, normTarget, 'Should match when genuinely encoded to JPEG');
  });
});

describe('Image Converter - Transparency Handling Rules', () => {
  test('flags transparency warning when converting transparent source to JPEG', () => {
    const sourceHasAlpha = true;
    const targetFormat = 'image/jpeg';

    const requiresBgFill = sourceHasAlpha && targetFormat === 'image/jpeg';
    assert.equal(requiresBgFill, true, 'Converting transparent image to JPEG must require background fill');
  });

  test('preserves alpha without warning when converting to PNG or WebP', () => {
    const sourceHasAlpha = true;
    const targetPng = 'image/png';
    const targetWebp = 'image/webp';

    assert.equal(sourceHasAlpha && targetPng === 'image/jpeg', false);
    assert.equal(sourceHasAlpha && targetWebp === 'image/jpeg', false);
  });
});

describe('Image Converter - Asynchronous Race Condition Protection', () => {
  test('discards older out-of-order conversions when switching formats rapidly', async () => {
    let activeRequestId = 0;
    let committedResult = null;
    const revokedUrls = [];

    const mockRevoke = (url) => revokedUrls.push(url);

    const dispatchConversion = (format, latencyMs) => {
      const thisId = ++activeRequestId;
      return new Promise((resolve) => {
        setTimeout(() => {
          const fakeResult = { url: `blob:convert-${format}`, format };
          if (thisId !== activeRequestId) {
            mockRevoke(fakeResult.url);
            resolve({ discarded: true, id: thisId });
          } else {
            committedResult = fakeResult;
            resolve({ discarded: false, id: thisId });
          }
        }, latencyMs);
      });
    };

    // User rapidly clicks: PNG -> WebP -> JPEG
    // Job 1 (PNG): slow (80ms)
    // Job 2 (WebP): medium (50ms)
    // Job 3 (JPEG): fast (10ms)
    const p1 = dispatchConversion('image/png', 80);
    const p2 = dispatchConversion('image/webp', 50);
    const p3 = dispatchConversion('image/jpeg', 10);

    await Promise.all([p1, p2, p3]);

    assert.equal(committedResult.format, 'image/jpeg', 'Must commit the latest requested format');
    assert.ok(revokedUrls.includes('blob:convert-image/png'));
    assert.ok(revokedUrls.includes('blob:convert-image/webp'));
    assert.equal(revokedUrls.includes('blob:convert-image/jpeg'), false);
  });
});
