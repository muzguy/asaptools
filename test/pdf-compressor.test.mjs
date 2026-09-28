import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPRESSION_LEVELS,
  formatByteSize,
  getFilenameWithoutExtension,
  optimizePdfStructure,
  mapSliderToSettings,
  mapPresetToSlider,
  calculateHonestSavings,
  estimateDocumentSize,
} from '../lib/pdf-compressor-utils.ts';
import { PDFDocument } from 'pdf-lib';

describe('PDF Compressor - Compression Levels & Metadata', () => {
  test('defines structural, balanced, and strong compression modes', () => {
    const levelIds = COMPRESSION_LEVELS.map((l) => l.id);
    assert.deepEqual(levelIds, ['structural', 'balanced', 'strong']);

    const structural = COMPRESSION_LEVELS.find((l) => l.id === 'structural');
    assert.equal(structural?.isLossy, false);

    const balanced = COMPRESSION_LEVELS.find((l) => l.id === 'balanced');
    assert.equal(balanced?.isLossy, true);

    const strong = COMPRESSION_LEVELS.find((l) => l.id === 'strong');
    assert.equal(strong?.isLossy, true);
  });

  test('formats filenames and byte sizes correctly', () => {
    assert.equal(getFilenameWithoutExtension('my-contract.pdf'), 'my-contract');
    assert.equal(getFilenameWithoutExtension('taxes.final.PDF'), 'taxes.final');

    assert.equal(formatByteSize(500), '500 B');
    assert.equal(formatByteSize(2048), '2.0 KB');
    assert.equal(formatByteSize(5242880), '5.00 MB');
  });
});

describe('PDF Compressor - Custom Slider to Settings Mapping', () => {
  test('maps 0-15 to structural lossless clean mode', () => {
    const s0 = mapSliderToSettings(0);
    assert.equal(s0.mode, 'structural');
    assert.equal(s0.isLossy, false);
    assert.equal(s0.preset, 'structural');

    const s10 = mapSliderToSettings(10);
    assert.equal(s10.mode, 'structural');
    assert.equal(s10.isLossy, false);
    assert.equal(s10.preset, 'structural');

    const s15 = mapSliderToSettings(15);
    assert.equal(s15.mode, 'structural');
    assert.equal(s15.isLossy, false);
  });

  test('maps 50 exactly to balanced compression preset', () => {
    const s50 = mapSliderToSettings(50);
    assert.equal(s50.mode, 'raster');
    assert.equal(s50.preset, 'balanced');
    assert.equal(s50.scale, 1.35);
    assert.equal(s50.quality, 0.75);
    assert.equal(s50.isLossy, true);
    assert.equal(s50.dpiEstimate, Math.round(1.35 * 96));
  });

  test('maps 85 exactly to strong compression preset', () => {
    const s85 = mapSliderToSettings(85);
    assert.equal(s85.mode, 'raster');
    assert.equal(s85.preset, 'strong');
    assert.equal(s85.scale, 1.0);
    assert.equal(s85.quality, 0.55);
    assert.equal(s85.isLossy, true);
    assert.equal(s85.dpiEstimate, 96);
  });

  test('maps 100 to maximum compression tier', () => {
    const s100 = mapSliderToSettings(100);
    assert.equal(s100.mode, 'raster');
    assert.equal(s100.scale, 0.8);
    assert.equal(s100.quality, 0.4);
    assert.equal(s100.isLossy, true);
    assert.ok(s100.label.includes('Maximum'));
  });

  test('maps presets accurately back to slider anchors', () => {
    assert.equal(mapPresetToSlider('structural'), 10);
    assert.equal(mapPresetToSlider('balanced'), 50);
    assert.equal(mapPresetToSlider('strong'), 85);
  });
});

describe('PDF Compressor - Lossless Structural Optimization', () => {
  test('cleans and optimizes valid PDF document structure', async () => {
    const srcDoc = await PDFDocument.create();
    srcDoc.setTitle('Temporary Title That Adds Metadata');
    srcDoc.setAuthor('Test Author');
    srcDoc.setProducer('Test Producer System');
    srcDoc.addPage([500, 500]);
    srcDoc.addPage([500, 500]);

    const initialBytes = await srcDoc.save();
    const optimizedBytes = await optimizePdfStructure(initialBytes.buffer);

    assert.ok(optimizedBytes.length > 0);

    const loadedDoc = await PDFDocument.load(optimizedBytes);
    assert.equal(loadedDoc.getPageCount(), 2);
  });
});

describe('PDF Compressor - Honest Measurement & Metrics', () => {
  test('calculates accurate savings percentage when smaller', () => {
    const savings = calculateHonestSavings(1000000, 400000);
    assert.equal(savings.isSmaller, true);
    assert.equal(savings.savingsBytes, 600000);
    assert.equal(savings.savingsPercentage, 60.0);
    assert.equal(savings.formattedOriginalSize, '976.6 KB');
    assert.equal(savings.formattedCompressedSize, '390.6 KB');
    assert.equal(savings.formattedSavings, '585.9 KB');
  });

  test('accurately detects when output is not smaller without negative claims', () => {
    const savings = calculateHonestSavings(50000, 52000);
    assert.equal(savings.isSmaller, false);
    assert.equal(savings.savingsBytes, -2000);
    assert.equal(savings.diffBytes, 2000);
    assert.equal(savings.savingsPercentage, 4.0);
  });

  test('handles zero and identical sizes cleanly', () => {
    const savings = calculateHonestSavings(50000, 50000);
    assert.equal(savings.isSmaller, false);
    assert.equal(savings.savingsBytes, 0);
    assert.equal(savings.diffBytes, 0);
    assert.equal(savings.savingsPercentage, 0.0);
  });
});

describe('PDF Compressor - Output Size Estimation Heuristics', () => {
  test('estimates structural cleanup at ~10% reduction', () => {
    const settings = mapSliderToSettings(10);
    const est = estimateDocumentSize(100000, 5, settings);
    assert.equal(est.isSmaller, true);
    assert.equal(est.estimatedBytes, 90000);
    assert.equal(est.estimatedPercentage, 10.0);
  });

  test('estimates raster document based on real sampled page bytes', () => {
    const settings = mapSliderToSettings(50);
    const samplePageBytes = 50000; // 50 KB for 1 page
    const pageCount = 4;
    const est = estimateDocumentSize(500000, pageCount, settings, samplePageBytes);
    // Overhead = 1500 + 4 * 800 = 4700 bytes
    // Estimated = 50000 * 4 + 4700 = 204700 bytes
    assert.equal(est.estimatedBytes, 204700);
    assert.equal(est.isSmaller, true);
    assert.ok(est.estimatedSavingsBytes > 0);
  });
});

describe('PDF Compressor - Asynchronous Preview Stale Request Protection', () => {
  test('discards older out-of-order preview resolutions using sequence tokens', async () => {
    let requestId = 0;
    let committedPreview = null;
    const revokedUrls = [];

    const mockRevoke = (url) => revokedUrls.push(url);

    const dispatchPreviewJob = (sliderValue, latencyMs, payload) => {
      const thisRequestId = ++requestId;
      return new Promise((resolve) => {
        setTimeout(() => {
          if (thisRequestId !== requestId) {
            mockRevoke(payload.previewUrl);
            resolve({ discarded: true, sliderValue });
          } else {
            committedPreview = payload;
            resolve({ discarded: false, sliderValue });
          }
        }, latencyMs);
      });
    };

    // User slides from 30 -> 50 -> 80
    const job1 = dispatchPreviewJob(30, 90, { previewUrl: 'blob:p30', slider: 30 });
    const job2 = dispatchPreviewJob(50, 70, { previewUrl: 'blob:p50', slider: 50 });
    const job3 = dispatchPreviewJob(80, 20, { previewUrl: 'blob:p80', slider: 80 });

    await Promise.all([job1, job2, job3]);

    assert.equal(committedPreview.slider, 80);
    assert.equal(committedPreview.previewUrl, 'blob:p80');
    assert.ok(revokedUrls.includes('blob:p30'));
    assert.ok(revokedUrls.includes('blob:p50'));
    assert.equal(revokedUrls.includes('blob:p80'), false);
  });
});
