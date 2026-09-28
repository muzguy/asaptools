import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPageImageFilename,
  createZipArchive,
} from '../lib/pdf-to-images-utils.ts';

describe('PDF to Images - Filename Standardization', () => {
  test('formats page filename with zero-padded 3-digit numbering (e.g. document-page-001.png)', () => {
    assert.equal(
      formatPageImageFilename('contract.pdf', 1, 'png'),
      'contract-page-001.png'
    );
    assert.equal(
      formatPageImageFilename('annual-report.pdf', 12, 'jpg'),
      'annual-report-page-012.jpg'
    );
    assert.equal(
      formatPageImageFilename('archive.backup.pdf', 105, 'png'),
      'archive.backup-page-105.png'
    );
  });
});

describe('PDF to Images - ZIP Archive Packaging', () => {
  test('bundles multiple image blobs into a valid ZIP archive', async () => {
    const mockFiles = [
      {
        filename: 'report-page-001.png',
        blob: new Blob(['mock-png-page-1-bytes'], { type: 'image/png' }),
      },
      {
        filename: 'report-page-002.png',
        blob: new Blob(['mock-png-page-2-bytes'], { type: 'image/png' }),
      },
    ];

    const zipBlob = await createZipArchive(mockFiles);
    assert.ok(zipBlob);
    assert.ok(zipBlob.size > 0);

    const buffer = await zipBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Verify ZIP magic header bytes (PK\x03\x04 -> 0x50, 0x4B, 0x03, 0x04)
    assert.equal(bytes[0], 0x50);
    assert.equal(bytes[1], 0x4b);
    assert.equal(bytes[2], 0x03);
    assert.equal(bytes[3], 0x04);
  });
});
