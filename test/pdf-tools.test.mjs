import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePageRanges,
  generatePresetRange,
  formatByteSize,
  getFilenameWithoutExtension,
  mergePdfs,
  splitPdf,
} from '../lib/pdf-utils.ts';
import { PDFDocument } from 'pdf-lib';

describe('PDF Tools - Page Range Parsing & Validation', () => {
  test('parses single page numbers', () => {
    const result = parsePageRanges('3', 10);
    assert.equal(result.isValid, true);
    assert.deepEqual(result.pages, [3]);
    assert.equal(result.errors.length, 0);
  });

  test('parses continuous ranges', () => {
    const result = parsePageRanges('1-4', 10);
    assert.equal(result.isValid, true);
    assert.deepEqual(result.pages, [1, 2, 3, 4]);
    assert.equal(result.errors.length, 0);
  });

  test('parses mixed ranges and discrete pages (1-3, 5, 8-10)', () => {
    const result = parsePageRanges('1-3, 5, 8-10', 10);
    assert.equal(result.isValid, true);
    assert.deepEqual(result.pages, [1, 2, 3, 5, 8, 9, 10]);
    assert.equal(result.errors.length, 0);
    assert.match(result.summary, /Extracting 7 pages/);
  });

  test('handles arbitrary whitespace cleanly', () => {
    const result = parsePageRanges('  2 - 4 ,   7 ,  9 - 10  ', 10);
    assert.equal(result.isValid, true);
    assert.deepEqual(result.pages, [2, 3, 4, 7, 9, 10]);
  });

  test('deduplicates overlapping pages while preserving order', () => {
    const result = parsePageRanges('1-3, 2, 3, 4', 10);
    assert.equal(result.isValid, true);
    assert.deepEqual(result.pages, [1, 2, 3, 4]);
  });

  test('flags out-of-bounds page numbers', () => {
    const result = parsePageRanges('1-3, 15', 10);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('exceeds document total')));
  });

  test('flags inverted ranges (start > end)', () => {
    const result = parsePageRanges('5-2', 10);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('cannot be greater than end page')));
  });

  test('flags zero and negative page numbers', () => {
    const result = parsePageRanges('0, 2-4', 10);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('must be 1 or greater')));
  });

  test('flags non-numeric and malformed syntax', () => {
    const result = parsePageRanges('hello, 1-3', 10);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('not a valid whole page number')));
  });

  test('flags empty input string', () => {
    const result = parsePageRanges('   ', 10);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.length > 0);
  });
});

describe('PDF Tools - Preset Range Generators', () => {
  test('generates all pages preset', () => {
    assert.equal(generatePresetRange('all', 5), '1-5');
    assert.equal(generatePresetRange('all', 1), '1');
  });

  test('generates odd and even presets', () => {
    assert.equal(generatePresetRange('odd', 6), '1, 3, 5');
    assert.equal(generatePresetRange('even', 6), '2, 4, 6');
  });

  test('generates first-half and second-half presets', () => {
    assert.equal(generatePresetRange('first-half', 6), '1-3');
    assert.equal(generatePresetRange('second-half', 6), '4-6');
    assert.equal(generatePresetRange('first-half', 5), '1-3');
    assert.equal(generatePresetRange('second-half', 5), '4-5');
  });
});

describe('PDF Tools - List Reordering Logic', () => {
  function moveItem(list, fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= list.length) return list;
    const copy = [...list];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    return copy;
  }

  test('moves item up in list', () => {
    const list = ['doc1.pdf', 'doc2.pdf', 'doc3.pdf'];
    const updated = moveItem(list, 1, 0);
    assert.deepEqual(updated, ['doc2.pdf', 'doc1.pdf', 'doc3.pdf']);
  });

  test('moves item down in list', () => {
    const list = ['doc1.pdf', 'doc2.pdf', 'doc3.pdf'];
    const updated = moveItem(list, 1, 2);
    assert.deepEqual(updated, ['doc1.pdf', 'doc3.pdf', 'doc2.pdf']);
  });

  test('preserves order on boundary overreach', () => {
    const list = ['doc1.pdf', 'doc2.pdf'];
    assert.deepEqual(moveItem(list, 0, -1), list);
    assert.deepEqual(moveItem(list, 1, 2), list);
  });
});

describe('PDF Tools - Helper Formatters', () => {
  test('formats byte sizes accurately', () => {
    assert.equal(formatByteSize(450), '450 B');
    assert.equal(formatByteSize(2048), '2.0 KB');
    assert.equal(formatByteSize(5242880), '5.00 MB');
  });

  test('strips extensions cleanly', () => {
    assert.equal(getFilenameWithoutExtension('my-contract.pdf'), 'my-contract');
    assert.equal(getFilenameWithoutExtension('presentation.final.PDF'), 'presentation.final');
    assert.equal(getFilenameWithoutExtension('no-ext'), 'no-ext');
  });
});

describe('PDF Tools - Real PDF Document Operations', () => {
  async function makeTestPdf(pageCount) {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pageCount; i++) {
      doc.addPage([400, 400]);
    }
    const bytes = await doc.save();
    return new File([bytes], `test-${pageCount}p.pdf`, { type: 'application/pdf' });
  }

  test('merges multiple PDF files into one with exact page count', async () => {
    const file1 = await makeTestPdf(2);
    const file2 = await makeTestPdf(3);

    const result = await mergePdfs([file1, file2], 'custom-merged.pdf');
    assert.equal(result.pageCount, 5);
    assert.equal(result.downloadFilename, 'custom-merged.pdf');
    assert.ok(result.size > 0);
    assert.ok(result.objectUrl.startsWith('blob:'));

    // Verify loaded result doc
    const arrayBuffer = await result.blob.arrayBuffer();
    const loadedDoc = await PDFDocument.load(arrayBuffer);
    assert.equal(loadedDoc.getPageCount(), 5);
  });

  test('splits PDF and extracts only requested page numbers', async () => {
    const sourceFile = await makeTestPdf(6); // 6 pages: 1, 2, 3, 4, 5, 6
    const selectedPages = [1, 3, 5]; // extract odd pages

    const result = await splitPdf(sourceFile, selectedPages, 'extracted.pdf');
    assert.equal(result.pageCount, 3);
    assert.equal(result.downloadFilename, 'extracted.pdf');

    const arrayBuffer = await result.blob.arrayBuffer();
    const loadedDoc = await PDFDocument.load(arrayBuffer);
    assert.equal(loadedDoc.getPageCount(), 3);
  });

  test('rejects splitting with out-of-bounds page numbers', async () => {
    const sourceFile = await makeTestPdf(3);
    await assert.rejects(
      async () => {
        await splitPdf(sourceFile, [1, 4]); // 4 is out of bounds
      },
      /Page 4 is out of bounds/
    );
  });

  test('rejects empty file list on merge', async () => {
    await assert.rejects(
      async () => {
        await mergePdfs([]);
      },
      /Please select at least one PDF file/
    );
  });
});
