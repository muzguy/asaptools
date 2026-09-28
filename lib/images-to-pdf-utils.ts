import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Formats byte size into human-readable B, KB, or MB string.
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Safely revokes an object URL to release browser memory.
 */
export function safeRevokeUrl(url: string | null | undefined): void {
  if (url && typeof window !== 'undefined' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore revocation errors
    }
  }
}

export type PageSizeOption = 'a4' | 'letter' | 'fit';
export type PageOrientation = 'portrait' | 'landscape' | 'auto';
export type MarginOption = 'none' | 'small' | 'medium' | 'large';

export interface ImageToPdfItem {
  id: string;
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  width: number;
  height: number;
  aspectRatio: string;
  previewUrl: string;
  type: string;
}

export interface ImagesToPdfOptions {
  pageSize: PageSizeOption;
  orientation: PageOrientation;
  margin: MarginOption;
  backgroundColor: string; // e.g. '#ffffff'
  outputFilename: string;
}

export interface ImagesToPdfResult {
  blob: Blob;
  objectUrl: string;
  size: number;
  formattedSize: string;
  pageCount: number;
  downloadFilename: string;
}

// Page dimensions in PDF points (72 points = 1 inch)
export const PAGE_SIZES: Record<'a4' | 'letter', { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
};

export const MARGIN_VALUES: Record<MarginOption, number> = {
  none: 0,
  small: 20,
  medium: 36, // 0.5 inch
  large: 54, // 0.75 inch
};

export const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

/**
 * Loads an image file, extracts natural pixel dimensions, and generates a preview URL.
 */
export function loadImageInfo(file: File, id?: string): Promise<ImageToPdfItem> {
  return new Promise((resolve, reject) => {
    const fileId = id || Math.random().toString(36).substring(2, 11);
    const mime = file.type.toLowerCase();

    if (!SUPPORTED_IMAGE_TYPES.has(mime) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      return reject(
        new Error(`Unsupported image format "${file.name}". Please upload JPG, PNG, or WebP files.`)
      );
    }

    const previewUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || 800;
      const height = img.naturalHeight || 600;
      const ratio = (width / height).toFixed(2);

      resolve({
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatByteSize(file.size),
        width,
        height,
        aspectRatio: `${ratio}:1`,
        previewUrl,
        type: mime || 'image/jpeg',
      });
    };

    img.onerror = () => {
      safeRevokeUrl(previewUrl);
      reject(new Error(`Failed to decode image "${file.name}". The file may be corrupted.`));
    };

    img.src = previewUrl;
  });
}

/**
 * Calculates page dimensions and placement geometry for an image.
 * Ensures the image preserves its aspect ratio and fits completely within margins.
 */
export function calculateImagePlacement(
  imgWidth: number,
  imgHeight: number,
  options: {
    pageSize: PageSizeOption;
    orientation: PageOrientation;
    margin: MarginOption;
  }
): {
  pageWidth: number;
  pageHeight: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
} {
  const marginPt = MARGIN_VALUES[options.margin] ?? 0;

  if (options.pageSize === 'fit') {
    // Canvas matches image natural pixel dimensions (scaled to 72 DPI points)
    // 1 pixel = 0.75 points (96 DPI to 72 DPI standard PDF mapping)
    const factor = 0.75;
    const baseW = Math.max(72, imgWidth * factor);
    const baseH = Math.max(72, imgHeight * factor);

    const pageWidth = baseW + marginPt * 2;
    const pageHeight = baseH + marginPt * 2;

    return {
      pageWidth,
      pageHeight,
      drawX: marginPt,
      drawY: marginPt,
      drawWidth: baseW,
      drawHeight: baseH,
    };
  }

  // Standard paper size (A4 or Letter)
  const baseDim = PAGE_SIZES[options.pageSize];
  let isLandscape = false;

  if (options.orientation === 'landscape') {
    isLandscape = true;
  } else if (options.orientation === 'portrait') {
    isLandscape = false;
  } else {
    // Auto: match image aspect ratio
    isLandscape = imgWidth > imgHeight;
  }

  const pageWidth = isLandscape
    ? Math.max(baseDim.width, baseDim.height)
    : Math.min(baseDim.width, baseDim.height);
  const pageHeight = isLandscape
    ? Math.min(baseDim.width, baseDim.height)
    : Math.max(baseDim.width, baseDim.height);

  const availableWidth = Math.max(1, pageWidth - marginPt * 2);
  const availableHeight = Math.max(1, pageHeight - marginPt * 2);

  // Proportional scaling to fit within available box
  const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
  const drawWidth = imgWidth * scale;
  const drawHeight = imgHeight * scale;

  // Center horizontally and vertically
  const drawX = marginPt + (availableWidth - drawWidth) / 2;
  const drawY = marginPt + (availableHeight - drawHeight) / 2;

  return {
    pageWidth,
    pageHeight,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
  };
}

/**
 * Converts a hex color string (e.g. '#ffffff') to normalized RGB (0-1).
 */
export function hexToRgbNormalized(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
    return { r, g, b };
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return { r, g, b };
  }
  return { r: 1, g: 1, b: 1 }; // Default white
}

/**
 * Converts an image file to a PNG ArrayBuffer using an offscreen canvas.
 * Used for WebP format or transparency background flattening.
 */
export function rasterizeImageToPngBuffer(
  file: File,
  backgroundColor?: string
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          safeRevokeUrl(url);
          return reject(new Error('Canvas 2D context not available.'));
        }

        if (backgroundColor && backgroundColor !== 'transparent') {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);
        safeRevokeUrl(url);

        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Failed to encode image to PNG.'));
          }
          blob.arrayBuffer().then((buf) => {
            resolve(new Uint8Array(buf));
          });
        }, 'image/png');
      } catch (err) {
        safeRevokeUrl(url);
        reject(err);
      }
    };

    img.onerror = () => {
      safeRevokeUrl(url);
      reject(new Error(`Could not load image "${file.name}" for rendering.`));
    };

    img.src = url;
  });
}

/**
 * Generates a valid multi-page PDF document from an array of images.
 */
export async function convertImagesToPdf(
  items: ImageToPdfItem[],
  options: ImagesToPdfOptions
): Promise<ImagesToPdfResult> {
  if (!items || items.length === 0) {
    throw new Error('Please select at least one image to create a PDF.');
  }

  const doc = await PDFDocument.create();
  const bgRgb = hexToRgbNormalized(options.backgroundColor || '#ffffff');

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const mime = item.type.toLowerCase();

    let embeddedImage;
    const isJpeg = mime === 'image/jpeg' || mime === 'image/jpg';
    const isPng = mime === 'image/png';

    if (isJpeg) {
      const buffer = await item.file.arrayBuffer();
      try {
        embeddedImage = await doc.embedJpg(buffer);
      } catch {
        // Fallback through canvas if JPEG has unconventional color profile
        const pngBytes = await rasterizeImageToPngBuffer(item.file, options.backgroundColor);
        embeddedImage = await doc.embedPng(pngBytes);
      }
    } else if (isPng) {
      const buffer = await item.file.arrayBuffer();
      try {
        embeddedImage = await doc.embedPng(buffer);
      } catch {
        const pngBytes = await rasterizeImageToPngBuffer(item.file, options.backgroundColor);
        embeddedImage = await doc.embedPng(pngBytes);
      }
    } else {
      // WebP and other formats rasterized to PNG
      const pngBytes = await rasterizeImageToPngBuffer(item.file, options.backgroundColor);
      embeddedImage = await doc.embedPng(pngBytes);
    }

    const { pageWidth, pageHeight, drawX, drawY, drawWidth, drawHeight } =
      calculateImagePlacement(item.width, item.height, {
        pageSize: options.pageSize,
        orientation: options.orientation,
        margin: options.margin,
      });

    const page = doc.addPage([pageWidth, pageHeight]);

    // Fill page background color
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
    });

    // Draw embedded image centered within margins
    page.drawImage(embeddedImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    });
  }

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);

  const baseFilename = options.outputFilename.trim() || 'asaptools-converted.pdf';
  const cleanFilename = baseFilename.endsWith('.pdf') ? baseFilename : `${baseFilename}.pdf`;

  return {
    blob,
    objectUrl,
    size: blob.size,
    formattedSize: formatByteSize(blob.size),
    pageCount: items.length,
    downloadFilename: cleanFilename,
  };
}

/**
 * Creates 3 distinct sample images in memory for 1-click testing.
 */
export async function createSampleImages(): Promise<File[]> {
  const samples: { title: string; subtitle: string; width: number; height: number; bg: string }[] = [
    {
      title: 'Invoice Summary',
      subtitle: 'Page 1 — Financial Documentation',
      width: 800,
      height: 1100, // Portrait
      bg: '#3b82f6',
    },
    {
      title: 'Product Blueprint',
      subtitle: 'Page 2 — Architecture Diagram',
      width: 1200,
      height: 800, // Landscape
      bg: '#10b981',
    },
    {
      title: 'Project Certificate',
      subtitle: 'Page 3 — Verified Certificate',
      width: 900,
      height: 900, // Square
      bg: '#f59e0b',
    },
  ];

  const files: File[] = [];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const canvas = document.createElement('canvas');
    canvas.width = s.width;
    canvas.height = s.height;
    const ctx = canvas.getContext('2d')!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, s.width, s.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s.width, s.height);

    // Decorative top stripe
    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, s.width, 16);

    // Central card
    const cardMargin = 50;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardMargin, cardMargin + 20, s.width - cardMargin * 2, s.height - cardMargin * 2 - 40, 24);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.title, s.width / 2, s.height / 2 - 30);

    // Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '22px sans-serif';
    ctx.fillText(s.subtitle, s.width / 2, s.height / 2 + 20);

    // Pill
    ctx.fillStyle = s.bg;
    ctx.beginPath();
    ctx.roundRect(s.width / 2 - 120, s.height / 2 + 70, 240, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('ASAPTools Images to PDF', s.width / 2, s.height / 2 + 96);

    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
    const safeName = s.title.toLowerCase().replace(/\s+/g, '-');
    files.push(new File([blob], `sample-${safeName}.png`, { type: 'image/png' }));
  }

  return files;
}
