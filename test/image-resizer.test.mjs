import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateResizeDimensions,
  calculateAspectRatioDimension,
  scaleDimensionsByPercentage,
  MAX_RESIZE_DIMENSION,
  MIN_RESIZE_DIMENSION,
} from '../lib/image-utils.ts';

describe('Image Resizer - Dimension Validation', () => {
  test('accepts valid pixel dimensions', () => {
    assert.deepEqual(validateResizeDimensions(800, 600), { valid: true });
    assert.deepEqual(validateResizeDimensions(1920, 1080), { valid: true });
    assert.deepEqual(validateResizeDimensions(1, 1), { valid: true });
    assert.deepEqual(validateResizeDimensions(10000, 10000), { valid: true });
  });

  test('rejects zero, negative, or non-finite dimensions', () => {
    assert.equal(validateResizeDimensions(0, 500).valid, false);
    assert.equal(validateResizeDimensions(500, 0).valid, false);
    assert.equal(validateResizeDimensions(-50, 100).valid, false);
    assert.equal(validateResizeDimensions(100, -10).valid, false);
    assert.equal(validateResizeDimensions(NaN, 500).valid, false);
    assert.equal(validateResizeDimensions(500, Infinity).valid, false);
  });

  test('rejects dimensions exceeding maximum safety cap', () => {
    assert.equal(validateResizeDimensions(10001, 500).valid, false);
    assert.equal(validateResizeDimensions(500, 15000).valid, false);
    assert.equal(validateResizeDimensions(MAX_RESIZE_DIMENSION + 1, 100).valid, false);
    assert.equal(MIN_RESIZE_DIMENSION, 1);
  });
});

describe('Image Resizer - Aspect Ratio Calculations', () => {
  test('calculates proportional height when width changes on landscape image', () => {
    const originalWidth = 1200;
    const originalHeight = 800;

    const res1 = calculateAspectRatioDimension('width', 600, originalWidth, originalHeight);
    assert.equal(res1.width, 600);
    assert.equal(res1.height, 400);

    const res2 = calculateAspectRatioDimension('width', 300, originalWidth, originalHeight);
    assert.equal(res2.width, 300);
    assert.equal(res2.height, 200);
  });

  test('calculates proportional width when height changes on landscape image', () => {
    const originalWidth = 1200;
    const originalHeight = 800;

    const res1 = calculateAspectRatioDimension('height', 400, originalWidth, originalHeight);
    assert.equal(res1.width, 600);
    assert.equal(res1.height, 400);

    const res2 = calculateAspectRatioDimension('height', 200, originalWidth, originalHeight);
    assert.equal(res2.width, 300);
    assert.equal(res2.height, 200);
  });

  test('preserves aspect ratio on vertical/portrait images (9:16)', () => {
    const originalWidth = 1080;
    const originalHeight = 1920;

    const res1 = calculateAspectRatioDimension('width', 540, originalWidth, originalHeight);
    assert.equal(res1.width, 540);
    assert.equal(res1.height, 960);

    const res2 = calculateAspectRatioDimension('height', 960, originalWidth, originalHeight);
    assert.equal(res2.width, 540);
    assert.equal(res2.height, 960);
  });

  test('preserves square aspect ratio (1:1)', () => {
    const originalWidth = 500;
    const originalHeight = 500;

    const res = calculateAspectRatioDimension('width', 250, originalWidth, originalHeight);
    assert.equal(res.width, 250);
    assert.equal(res.height, 250);
  });
});

describe('Image Resizer - Percentage Scaling Presets', () => {
  test('scales dimensions accurately by 25%, 50%, 75%, 100%, 150%, 200%', () => {
    const origW = 1200;
    const origH = 800;

    assert.deepEqual(scaleDimensionsByPercentage(origW, origH, 25), { width: 300, height: 200 });
    assert.deepEqual(scaleDimensionsByPercentage(origW, origH, 50), { width: 600, height: 400 });
    assert.deepEqual(scaleDimensionsByPercentage(origW, origH, 75), { width: 900, height: 600 });
    assert.deepEqual(scaleDimensionsByPercentage(origW, origH, 100), { width: 1200, height: 800 });
    assert.deepEqual(scaleDimensionsByPercentage(origW, origH, 150), { width: 1800, height: 1200 });
    assert.deepEqual(scaleDimensionsByPercentage(origW, origH, 200), { width: 2400, height: 1600 });
  });
});

describe('Image Resizer - Asynchronous Race Condition Protection', () => {
  test('discards older out-of-order resizing resolutions', async () => {
    let activeRequestId = 0;
    let committedOutput = null;
    const revokedUrls = [];

    const mockRevoke = (url) => revokedUrls.push(url);

    const dispatchResize = (dim, latencyMs) => {
      const thisId = ++activeRequestId;
      return new Promise((resolve) => {
        setTimeout(() => {
          const fakeResult = { url: `blob:resize-${dim}`, width: dim, height: dim };
          if (thisId !== activeRequestId) {
            mockRevoke(fakeResult.url);
            resolve({ discarded: true, id: thisId });
          } else {
            committedOutput = fakeResult;
            resolve({ discarded: false, id: thisId });
          }
        }, latencyMs);
      });
    };

    // Simulate user typing in dimension box: 800 -> 600 -> 400
    // Job 1 (800): slower (90ms)
    // Job 2 (600): medium (60ms)
    // Job 3 (400): fastest (15ms)
    const p1 = dispatchResize(800, 90);
    const p2 = dispatchResize(600, 60);
    const p3 = dispatchResize(400, 15);

    await Promise.all([p1, p2, p3]);

    assert.equal(committedOutput.width, 400, 'Must commit the latest requested dimensions');
    assert.ok(revokedUrls.includes('blob:resize-800'));
    assert.ok(revokedUrls.includes('blob:resize-600'));
    assert.equal(revokedUrls.includes('blob:resize-400'), false);
  });
});
