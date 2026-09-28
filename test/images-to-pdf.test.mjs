import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateImagePlacement,
  hexToRgbNormalized,
  PAGE_SIZES,
  MARGIN_VALUES,
} from '../lib/images-to-pdf-utils.ts';
import { PDFDocument } from 'pdf-lib';

describe('Images to PDF - Placement & Geometry Calculations', () => {
  test('calculates correct A4 portrait placement preserving aspect ratio', () => {
    const imgWidth = 1200;
    const imgHeight = 800; // 3:2 landscape image on portrait page

    const placement = calculateImagePlacement(imgWidth, imgHeight, {
      pageSize: 'a4',
      orientation: 'portrait',
      margin: 'none',
    });

    assert.equal(placement.pageWidth, PAGE_SIZES.a4.width);
    assert.equal(placement.pageHeight, PAGE_SIZES.a4.height);

    // Should scale down to fit width (595.28 pt)
    assert.equal(placement.drawWidth, PAGE_SIZES.a4.width);
    const expectedHeight = (800 / 1200) * PAGE_SIZES.a4.width;
    assert.ok(Math.abs(placement.drawHeight - expectedHeight) < 0.01);

    // Centered vertically
    assert.equal(placement.drawX, 0);
    assert.ok(placement.drawY > 0);
  });

  test('applies margins accurately to available printable area', () => {
    const imgWidth = 1000;
    const imgHeight = 1000; // 1:1 square
    const marginKey = 'medium'; // 36 pt
    const marginPt = MARGIN_VALUES[marginKey];

    const placement = calculateImagePlacement(imgWidth, imgHeight, {
      pageSize: 'letter',
      orientation: 'portrait',
      margin: marginKey,
    });

    const availWidth = PAGE_SIZES.letter.width - marginPt * 2;
    // Square image fits width (540 pt)
    assert.equal(placement.drawWidth, availWidth);
    assert.equal(placement.drawHeight, availWidth);
    assert.equal(placement.drawX, marginPt);
  });

  test('calculates fit-to-image canvas without distortion', () => {
    const imgWidth = 800;
    const imgHeight = 600;

    const placement = calculateImagePlacement(imgWidth, imgHeight, {
      pageSize: 'fit',
      orientation: 'auto',
      margin: 'small', // 20 pt
    });

    // 800 * 0.75 = 600 pt + 40 pt margin = 640 pt
    assert.equal(placement.drawWidth, 600);
    assert.equal(placement.drawHeight, 450);
    assert.equal(placement.pageWidth, 640);
    assert.equal(placement.pageHeight, 490);
    assert.equal(placement.drawX, 20);
    assert.equal(placement.drawY, 20);
  });
});

describe('Images to PDF - Color & Encoding Helpers', () => {
  test('normalizes 6-digit and 3-digit hex colors to RGB floats', () => {
    const white = hexToRgbNormalized('#ffffff');
    assert.equal(white.r, 1);
    assert.equal(white.g, 1);
    assert.equal(white.b, 1);

    const black = hexToRgbNormalized('#000000');
    assert.equal(black.r, 0);
    assert.equal(black.g, 0);
    assert.equal(black.b, 0);

    const redShort = hexToRgbNormalized('#f00');
    assert.equal(redShort.r, 1);
    assert.equal(redShort.g, 0);
    assert.equal(redShort.b, 0);
  });
});

describe('Images to PDF - Document Generation Flow', () => {
  test('embeds images into a multi-page PDF document', async () => {
    const doc = await PDFDocument.create();

    // 1x1 transparent PNG data bytes
    const samplePngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const pngBuffer = Buffer.from(samplePngBase64, 'base64');

    const embedded = await doc.embedPng(pngBuffer);
    assert.ok(embedded);

    const page1 = doc.addPage([595.28, 841.89]);
    page1.drawImage(embedded, { x: 50, y: 50, width: 200, height: 200 });

    const page2 = doc.addPage([595.28, 841.89]);
    page2.drawImage(embedded, { x: 50, y: 50, width: 200, height: 200 });

    const pdfBytes = await doc.save();
    assert.ok(pdfBytes.length > 0);

    const loaded = await PDFDocument.load(pdfBytes);
    assert.equal(loaded.getPageCount(), 2);
  });
});
