import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_WORD_FILE_SIZE,
  SUPPORTED_WORD_EXTENSIONS,
  validateWordFile,
  isValidWordMagicBytes,
  getOutputPdfFilename,
  formatByteSize,
  buildCloudConvertJobPayload,
} from '../lib/word-to-pdf-utils.ts';

describe('Word to PDF - Supported Formats & File Limits', () => {
  test('defines max file size as 25 MB', () => {
    assert.equal(MAX_WORD_FILE_SIZE, 25 * 1024 * 1024);
    assert.deepEqual(SUPPORTED_WORD_EXTENSIONS, ['.docx', '.doc']);
  });

  test('accepts valid .docx and .doc filenames within size limit', () => {
    const validDocx = validateWordFile({
      name: 'quarterly-report.docx',
      size: 1024 * 500, // 500 KB
    });
    assert.equal(validDocx.valid, true);

    const validDoc = validateWordFile({
      name: 'legacy-contract.doc',
      size: 1024 * 1024 * 5, // 5 MB
    });
    assert.equal(validDoc.valid, true);
  });

  test('rejects unsupported extensions', () => {
    const invalidTxt = validateWordFile({ name: 'notes.txt', size: 1024 });
    assert.equal(invalidTxt.valid, false);
    assert.ok(invalidTxt.error?.includes('Unsupported file format'));

    const invalidPdf = validateWordFile({ name: 'document.pdf', size: 1024 });
    assert.equal(invalidPdf.valid, false);

    const invalidXlsx = validateWordFile({ name: 'sheet.xlsx', size: 1024 });
    assert.equal(invalidXlsx.valid, false);
  });

  test('rejects empty files (0 bytes)', () => {
    const emptyFile = validateWordFile({ name: 'empty.docx', size: 0 });
    assert.equal(emptyFile.valid, false);
    assert.ok(emptyFile.error?.includes('empty'));
  });

  test('rejects files exceeding 25 MB limit', () => {
    const oversizedFile = validateWordFile({
      name: 'huge-archive.docx',
      size: 26 * 1024 * 1024, // 26 MB
    });
    assert.equal(oversizedFile.valid, false);
    assert.ok(oversizedFile.error?.includes('25 MB'));
  });
});

describe('Word to PDF - Magic Bytes Verification', () => {
  test('detects valid DOCX zip archive magic bytes (50 4B 03 04)', () => {
    const docxHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    assert.equal(isValidWordMagicBytes(docxHeader.buffer, 'document.docx'), true);
  });

  test('detects valid legacy DOC compound document magic bytes (D0 CF 11 E0)', () => {
    const docHeader = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    assert.equal(isValidWordMagicBytes(docHeader.buffer, 'document.doc'), true);
  });

  test('rejects corrupt or plain text headers masquerading as Word documents', () => {
    const fakeHeader = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f]); // "Hello Wo"
    assert.equal(isValidWordMagicBytes(fakeHeader.buffer, 'fake.docx'), false);

    const validation = validateWordFile({
      name: 'corrupt.docx',
      size: 1024,
      buffer: fakeHeader.buffer,
    });
    assert.equal(validation.valid, false);
    assert.ok(validation.error?.includes('corrupted'));
  });
});

describe('Word to PDF - Filename & Format Helpers', () => {
  test('formats output PDF filename accurately', () => {
    assert.equal(getOutputPdfFilename('business-plan.docx'), 'business-plan.pdf');
    assert.equal(getOutputPdfFilename('RESUME.DOCX'), 'RESUME.pdf');
    assert.equal(getOutputPdfFilename('archive.final.doc'), 'archive.final.pdf');
    assert.equal(getOutputPdfFilename('.docx'), 'document.pdf');
  });

  test('formats byte sizes cleanly', () => {
    assert.equal(formatByteSize(450), '450 B');
    assert.equal(formatByteSize(1024 * 20), '20.0 KB');
    assert.equal(formatByteSize(1024 * 1024 * 3.5), '3.50 MB');
  });
});

describe('Word to PDF - CloudConvert Job Payload Architecture', () => {
  test('builds compliant CloudConvert API v2 three-task job payload', () => {
    const payload = buildCloudConvertJobPayload();

    assert.ok(payload.tasks['import-file'], 'Must have import-file task');
    assert.equal(payload.tasks['import-file'].operation, 'import/upload');

    assert.ok(payload.tasks['convert-file'], 'Must have convert-file task');
    assert.equal(payload.tasks['convert-file'].operation, 'convert');
    assert.equal(payload.tasks['convert-file'].input, 'import-file');
    assert.equal(payload.tasks['convert-file'].output_format, 'pdf');
    assert.equal(payload.tasks['convert-file'].engine, 'office');

    assert.ok(payload.tasks['export-file'], 'Must have export-file task');
    assert.equal(payload.tasks['export-file'].operation, 'export/url');
    assert.equal(payload.tasks['export-file'].input, 'convert-file');
  });
});

describe('Word to PDF - API Key Sanitization & Validation', () => {
  test('returns undefined for empty, null, or undefined keys', async () => {
    const { sanitizeApiKey } = await import('../lib/word-to-pdf-utils.ts');
    assert.equal(sanitizeApiKey(undefined), undefined);
    assert.equal(sanitizeApiKey(null), undefined);
    assert.equal(sanitizeApiKey(''), undefined);
    assert.equal(sanitizeApiKey('   '), undefined);
  });

  test('strips surrounding quotes and whitespace', async () => {
    const { sanitizeApiKey } = await import('../lib/word-to-pdf-utils.ts');
    assert.equal(sanitizeApiKey('  "my_secret_key"  '), 'my_secret_key');
    assert.equal(sanitizeApiKey("'single_quoted_key'"), 'single_quoted_key');
  });

  test('rejects placeholder values', async () => {
    const { sanitizeApiKey } = await import('../lib/word-to-pdf-utils.ts');
    assert.equal(sanitizeApiKey('your_cloudconvert_api_key_here'), undefined);
    assert.equal(sanitizeApiKey('your_actual_cloudconvert_api_key_here'), undefined);
  });
});

