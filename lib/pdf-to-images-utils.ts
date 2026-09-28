import JSZip from 'jszip';

/**
 * Returns filename without trailing extension.
 */
export function getFilenameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return filename;
  return filename.substring(0, lastDot);
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

export type OutputImageFormat = 'image/png' | 'image/jpeg';
export type ResolutionScale = 1.0 | 1.5 | 2.0;

export interface ConvertedPageImage {
  pageNumber: number;
  blob: Blob;
  objectUrl: string;
  filename: string;
  width: number;
  height: number;
  size: number;
  formattedSize: string;
  format: OutputImageFormat;
}

export interface PdfToImagesConversionResult {
  pages: ConvertedPageImage[];
  zipBlob: Blob | null;
  zipObjectUrl: string | null;
  zipFilename: string;
  totalSize: number;
  formattedTotalSize: string;
}

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

/**
 * Dynamically loads pdfjs-dist and configures the self-hosted worker.
 */
export async function getPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      if (typeof window !== 'undefined' && 'Worker' in window) {
        // Point to the local self-hosted worker in public/pdf.worker.min.mjs
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/**
 * Standardizes filename formatting like "contract-page-001.png".
 */
export function formatPageImageFilename(
  originalFilename: string,
  pageNumber: number,
  extension: 'png' | 'jpg'
): string {
  const baseName = getFilenameWithoutExtension(originalFilename);
  const paddedPage = String(pageNumber).padStart(3, '0');
  return `${baseName}-page-${paddedPage}.${extension}`;
}

/**
 * Renders a specific PDF page onto an HTML5 canvas and encodes to a Blob.
 */
export async function renderPageToImageBlob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any,
  pageNumber: number,
  options: {
    scale: ResolutionScale;
    format: OutputImageFormat;
    quality?: number; // 0.01 - 1.0 for JPEG
  }
): Promise<{
  blob: Blob;
  width: number;
  height: number;
}> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: options.scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d', { alpha: options.format === 'image/png' });
  if (!ctx) {
    throw new Error('Failed to acquire canvas 2D rendering context.');
  }

  // JPEG doesn't support transparency. Fill white background to prevent black background artifacts.
  if (options.format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Render PDF page into canvas
  const renderContext = {
    canvasContext: ctx,
    viewport,
  };

  await page.render(renderContext).promise;

  const quality = options.format === 'image/jpeg' ? (options.quality ?? 0.92) : undefined;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error(`Failed to encode page ${pageNumber} to image.`));
      },
      options.format,
      quality
    );
  });

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Creates a downloadable ZIP archive containing all rendered page images.
 */
export async function createZipArchive(
  images: { filename: string; blob: Blob }[]
): Promise<Blob> {
  const zip = new JSZip();

  for (const img of images) {
    zip.file(img.filename, img.blob);
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * Cleans up array of page images, safely revoking their object URLs.
 */
export function cleanupPageImages(images: ConvertedPageImage[]): void {
  for (const img of images) {
    safeRevokeUrl(img.objectUrl);
  }
}
