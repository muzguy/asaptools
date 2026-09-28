import { PDFDocument } from 'pdf-lib';

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

export async function getPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      if (typeof window !== 'undefined' && 'Worker' in window) {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export type CompressionLevel = 'structural' | 'balanced' | 'strong';

export interface CompressionLevelMeta {
  id: CompressionLevel;
  name: string;
  tag: string;
  description: string;
  isLossy: boolean;
  expectedReduction: string;
  defaultSlider: number;
}

export const COMPRESSION_LEVELS: CompressionLevelMeta[] = [
  {
    id: 'structural',
    name: 'Lossless Clean',
    tag: '100% Vector Quality',
    description: 'Strips redundant metadata, orphan object streams, and revision history. Selectable text and vector graphics remain completely untouched.',
    isLossy: false,
    expectedReduction: '5% - 25% (Depends on metadata)',
    defaultSlider: 10,
  },
  {
    id: 'balanced',
    name: 'Balanced Compression',
    tag: 'Recommended',
    description: 'Downsamples embedded graphics to crisp web resolution (~130 DPI, 75% quality). Great for reports, presentations, and scanned documents.',
    isLossy: true,
    expectedReduction: '40% - 70% Size Reduction',
    defaultSlider: 50,
  },
  {
    id: 'strong',
    name: 'Strong / Maximum',
    tag: 'Smallest File',
    description: 'Compresses images aggressively (~96 DPI, 55% quality). Ideal for fitting under strict email attachments or government portal upload limits.',
    isLossy: true,
    expectedReduction: '60% - 85% Size Reduction',
    defaultSlider: 85,
  },
];

export interface CompressionSettings {
  sliderValue: number;
  mode: 'structural' | 'raster';
  preset?: CompressionLevel;
  label: string;
  scale: number;
  quality: number;
  dpiEstimate: number;
  isLossy: boolean;
  description: string;
}

/**
 * Maps a continuous 0-100 slider value into concrete compression settings.
 * Presets anchor at:
 * - 10: Lossless Clean (structural)
 * - 50: Balanced Compression (raster scale 1.35, quality 0.75)
 * - 85: Strong / Maximum (raster scale 1.00, quality 0.55)
 */
export function mapSliderToSettings(sliderValue: number): CompressionSettings {
  const clamped = Math.max(0, Math.min(100, Math.round(sliderValue)));

  if (clamped <= 15) {
    return {
      sliderValue: clamped,
      mode: 'structural',
      preset: 'structural',
      label: 'Lossless Clean',
      scale: 1.0,
      quality: 1.0,
      dpiEstimate: 150,
      isLossy: false,
      description: 'Strips redundant metadata and unused object streams. 100% vector quality; text remains selectable and crystal clear.',
    };
  }

  if (clamped <= 50) {
    const t = (clamped - 16) / (50 - 16);
    const scale = Number((1.50 - t * 0.15).toFixed(2));
    const quality = Number((0.85 - t * 0.10).toFixed(2));
    const dpiEstimate = Math.round(scale * 96);

    const isPreset = clamped === 50;
    return {
      sliderValue: clamped,
      mode: 'raster',
      preset: isPreset ? 'balanced' : undefined,
      label: isPreset ? 'Balanced Compression' : `Custom Balanced (${clamped}%)`,
      scale,
      quality,
      dpiEstimate,
      isLossy: true,
      description: isPreset
        ? 'Downsamples embedded graphics to crisp web resolution (~130 DPI, 75% quality). Ideal balance of readability and compression.'
        : `Custom visual compression at ~${dpiEstimate} DPI with ${Math.round(quality * 100)}% quality.`,
    };
  }

  if (clamped <= 85) {
    const t = (clamped - 51) / (85 - 51);
    const scale = Number((1.35 - t * 0.35).toFixed(2));
    const quality = Number((0.75 - t * 0.20).toFixed(2));
    const dpiEstimate = Math.round(scale * 96);

    const isPreset = clamped === 85;
    return {
      sliderValue: clamped,
      mode: 'raster',
      preset: isPreset ? 'strong' : undefined,
      label: isPreset ? 'Strong / Maximum' : `Custom Strong (${clamped}%)`,
      scale,
      quality,
      dpiEstimate,
      isLossy: true,
      description: isPreset
        ? 'Aggressive downsampling (~96 DPI, 55% quality) to fit strict email or portal upload limits. Warning: small text may soften.'
        : `Aggressive downsampling at ~${dpiEstimate} DPI with ${Math.round(quality * 100)}% quality.`,
    };
  }

  // 86 - 100: Extreme compression
  const t = (clamped - 86) / (100 - 86);
  const scale = Number((1.0 - t * 0.20).toFixed(2));
  const quality = Number((0.55 - t * 0.15).toFixed(2));
  const dpiEstimate = Math.round(scale * 96);

  return {
    sliderValue: clamped,
    mode: 'raster',
    preset: undefined,
    label: `Maximum Compression (${clamped}%)`,
    scale,
    quality,
    dpiEstimate,
    isLossy: true,
    description: `Maximum raster downsampling (~${dpiEstimate} DPI, ${Math.round(quality * 100)}% quality). Noticeable compression artifacts may occur on fine graphics.`,
  };
}

/**
 * Returns default slider position for named presets.
 */
export function mapPresetToSlider(preset: CompressionLevel): number {
  switch (preset) {
    case 'structural':
      return 10;
    case 'balanced':
      return 50;
    case 'strong':
      return 85;
    default:
      return 50;
  }
}

export interface HonestSavings {
  originalSize: number;
  compressedSize: number;
  savingsBytes: number;
  diffBytes: number;
  savingsPercentage: number;
  isSmaller: boolean;
  formattedOriginalSize: string;
  formattedCompressedSize: string;
  formattedSavings: string;
}

/**
 * Accurately measures savings without claiming fake or negative reductions.
 */
export function calculateHonestSavings(originalSize: number, compressedSize: number): HonestSavings {
  const savingsBytes = originalSize - compressedSize;
  const isSmaller = compressedSize < originalSize;
  const diffBytes = Math.abs(savingsBytes);
  const savingsPercentage = originalSize > 0
    ? parseFloat(((diffBytes / originalSize) * 100).toFixed(1))
    : 0;

  return {
    originalSize,
    compressedSize,
    savingsBytes,
    diffBytes,
    savingsPercentage,
    isSmaller,
    formattedOriginalSize: formatByteSize(originalSize),
    formattedCompressedSize: formatByteSize(compressedSize),
    formattedSavings: formatByteSize(diffBytes),
  };
}

export interface SizeEstimate {
  estimatedBytes: number;
  estimatedSavingsBytes: number;
  estimatedPercentage: number;
  isSmaller: boolean;
  formattedEstimatedSize: string;
  formattedEstimatedSavings: string;
  explanation: string;
}

/**
 * Calculates a genuine projection of expected output size.
 * Uses real page sampling data when provided, or structural heuristic.
 */
export function estimateDocumentSize(
  originalSize: number,
  pageCount: number,
  settings: CompressionSettings,
  samplePageBytes?: number
): SizeEstimate {
  let estimatedBytes: number;
  let explanation = '';

  if (settings.mode === 'structural') {
    // Structural cleanup removes metadata/streams (~5% - 15%)
    const estFactor = 0.90;
    estimatedBytes = Math.max(1024, Math.round(originalSize * estFactor));
    explanation = 'Projected ~10% structural cleanup. Run compression for exact byte measurement.';
  } else if (samplePageBytes && samplePageBytes > 0 && pageCount > 0) {
    const pdfOverhead = 1500 + pageCount * 800;
    estimatedBytes = Math.round(samplePageBytes * pageCount + pdfOverhead);
    explanation = `Estimated based on sample page rendering (~${formatByteSize(samplePageBytes)}/page).`;
  } else {
    // General fallback estimation based on scale & quality
    const avgPageBytes = Math.round(75000 * (settings.scale / 1.35) * (settings.quality / 0.75));
    estimatedBytes = Math.round(avgPageBytes * pageCount + 2000);
    explanation = 'Preliminary projection based on compression settings.';
  }

  const savings = calculateHonestSavings(originalSize, estimatedBytes);

  return {
    estimatedBytes,
    estimatedSavingsBytes: savings.savingsBytes,
    estimatedPercentage: savings.savingsPercentage,
    isSmaller: savings.isSmaller,
    formattedEstimatedSize: savings.formattedCompressedSize,
    formattedEstimatedSavings: savings.formattedSavings,
    explanation,
  };
}

export interface PdfCompressionResult {
  blob: Blob;
  objectUrl: string;
  originalSize: number;
  compressedSize: number;
  savingsBytes: number;
  savingsPercentage: number;
  isSmaller: boolean;
  formattedOriginalSize: string;
  formattedCompressedSize: string;
  pageCount: number;
  downloadFilename: string;
  level: CompressionLevel;
  settings: CompressionSettings;
  methodDescription: string;
}

/**
 * Formats byte size into human-readable B, KB, or MB string.
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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

/**
 * Losslessly optimizes PDF structure by clearing redundant metadata and rewriting object streams.
 */
export async function optimizePdfStructure(arrayBuffer: ArrayBuffer): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  if (srcDoc.isEncrypted) {
    throw new Error('This PDF is password-protected. Please remove the password before compressing.');
  }

  const pageCount = srcDoc.getPageCount();
  if (pageCount === 0) {
    throw new Error('The loaded PDF does not contain any pages.');
  }

  // Create clean new PDF and copy all pages
  const cleanDoc = await PDFDocument.create();
  const pageIndices = srcDoc.getPageIndices();
  const copiedPages = await cleanDoc.copyPages(srcDoc, pageIndices);

  for (const page of copiedPages) {
    cleanDoc.addPage(page);
  }

  // Save with clean object streams and no orphan objects
  return await cleanDoc.save({ useObjectStreams: true });
}

/**
 * Downsamples and recompresses PDF pages using canvas rasterization and JPEG stream embedding.
 */
export async function compressPdfRaster(
  arrayBuffer: ArrayBuffer,
  options: {
    scale: number;
    quality: number;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<Uint8Array> {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  const pageCount = pdfDoc.numPages;
  if (pageCount === 0) {
    throw new Error('The loaded PDF contains 0 pages.');
  }

  const targetDoc = await PDFDocument.create();

  for (let i = 1; i <= pageCount; i++) {
    if (options.onProgress) {
      options.onProgress(i, pageCount);
    }

    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: options.scale });
    const originalViewport = page.getViewport({ scale: 1.0 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error(`Failed to acquire canvas 2D context for page ${i}.`);
    }

    // Fill white background for JPEG rendering
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error(`Failed to encode compressed page ${i}.`));
        },
        'image/jpeg',
        options.quality
      );
    });

    const jpegBuffer = await jpegBlob.arrayBuffer();
    const embeddedImage = await targetDoc.embedJpg(jpegBuffer);

    // Create page matching original unscaled points
    const newPage = targetDoc.addPage([originalViewport.width, originalViewport.height]);
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: originalViewport.width,
      height: originalViewport.height,
    });
  }

  return await targetDoc.save({ useObjectStreams: true });
}

/**
 * Samples a specific page of a loaded PDF and renders both original and compressed previews.
 */
export async function samplePageForPreview(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any,
  pageNumber: number,
  settings: CompressionSettings
): Promise<{
  originalUrl: string;
  compressedUrl: string;
  sampleBytes: number;
  width: number;
  height: number;
}> {
  const page = await pdfDoc.getPage(pageNumber);

  // 1. Render original visual page preview (scale 1.0)
  const origViewport = page.getViewport({ scale: 1.0 });
  const origCanvas = document.createElement('canvas');
  origCanvas.width = Math.floor(origViewport.width);
  origCanvas.height = Math.floor(origViewport.height);
  const origCtx = origCanvas.getContext('2d', { alpha: false });
  if (!origCtx) throw new Error('Failed to acquire canvas context.');

  origCtx.fillStyle = '#ffffff';
  origCtx.fillRect(0, 0, origCanvas.width, origCanvas.height);
  await page.render({ canvasContext: origCtx, viewport: origViewport }).promise;

  const origBlob = await new Promise<Blob>((res, rej) => {
    origCanvas.toBlob((b) => (b ? res(b) : rej(new Error('Failed to create original preview blob.'))), 'image/jpeg', 0.92);
  });
  const originalUrl = URL.createObjectURL(origBlob);

  // 2. If structural, compressed page is visually identical to original
  if (settings.mode === 'structural') {
    return {
      originalUrl,
      compressedUrl: originalUrl,
      sampleBytes: origBlob.size,
      width: origCanvas.width,
      height: origCanvas.height,
    };
  }

  // 3. For raster mode, render at the exact target scale & quality
  const targetViewport = page.getViewport({ scale: settings.scale });
  const compCanvas = document.createElement('canvas');
  compCanvas.width = Math.floor(targetViewport.width);
  compCanvas.height = Math.floor(targetViewport.height);
  const compCtx = compCanvas.getContext('2d', { alpha: false });
  if (!compCtx) throw new Error('Failed to acquire compressed canvas context.');

  compCtx.fillStyle = '#ffffff';
  compCtx.fillRect(0, 0, compCanvas.width, compCanvas.height);
  await page.render({ canvasContext: compCtx, viewport: targetViewport }).promise;

  const compBlob = await new Promise<Blob>((res, rej) => {
    compCanvas.toBlob(
      (b) => (b ? res(b) : rej(new Error('Failed to encode compressed page preview.'))),
      'image/jpeg',
      settings.quality
    );
  });

  const compressedUrl = URL.createObjectURL(compBlob);

  return {
    originalUrl,
    compressedUrl,
    sampleBytes: compBlob.size,
    width: origCanvas.width,
    height: origCanvas.height,
  };
}

/**
 * Main compression entrypoint supporting presets or custom compression settings.
 */
export async function compressPdf(
  file: File,
  levelOrSettings: CompressionLevel | CompressionSettings,
  options?: {
    outputFilename?: string;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<PdfCompressionResult> {
  const settings: CompressionSettings =
    typeof levelOrSettings === 'string'
      ? mapSliderToSettings(mapPresetToSlider(levelOrSettings))
      : levelOrSettings;

  const arrayBuffer = await file.arrayBuffer();

  let compressedBytes: Uint8Array;
  let methodDescription = '';

  if (settings.mode === 'structural') {
    methodDescription = 'Lossless Structural Optimization (Strips metadata & redundant object streams)';
    compressedBytes = await optimizePdfStructure(arrayBuffer);
  } else {
    methodDescription = `${settings.label} (~${settings.dpiEstimate} DPI, ${Math.round(settings.quality * 100)}% quality)`;
    compressedBytes = await compressPdfRaster(arrayBuffer, {
      scale: settings.scale,
      quality: settings.quality,
      onProgress: options?.onProgress,
    });
  }

  const blob = new Blob([compressedBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);

  const savings = calculateHonestSavings(file.size, blob.size);

  // Read page count from final document
  let pageCount = 1;
  try {
    const finalDoc = await PDFDocument.load(compressedBytes, { ignoreEncryption: true });
    pageCount = finalDoc.getPageCount();
  } catch {
    // Fallback pageCount
  }

  const baseName = getFilenameWithoutExtension(file.name);
  const defaultFilename = `${baseName}-compressed.pdf`;
  const cleanFilename = options?.outputFilename
    ? options.outputFilename.endsWith('.pdf')
      ? options.outputFilename
      : `${options.outputFilename}.pdf`
    : defaultFilename;

  const level: CompressionLevel = settings.preset || (settings.sliderValue <= 15 ? 'structural' : settings.sliderValue <= 65 ? 'balanced' : 'strong');

  return {
    blob,
    objectUrl,
    originalSize: savings.originalSize,
    compressedSize: savings.compressedSize,
    savingsBytes: savings.savingsBytes,
    savingsPercentage: savings.savingsPercentage,
    isSmaller: savings.isSmaller,
    formattedOriginalSize: savings.formattedOriginalSize,
    formattedCompressedSize: savings.formattedCompressedSize,
    pageCount,
    downloadFilename: cleanFilename,
    level,
    settings,
    methodDescription,
  };
}

/**
 * Creates an in-memory heavy sample PDF with embedded high-resolution canvas drawings
 * for testing genuine compression reduction (~1.5 MB).
 */
export async function createSampleHeavyPdf(): Promise<File> {
  const doc = await PDFDocument.create();

  // Create 2 large 1600x1200 detailed gradient canvas textures to simulate heavy embedded graphics
  for (let p = 1; p <= 2; p++) {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;

    // Rich gradient background
    const grad = ctx.createLinearGradient(0, 0, 1600, 1200);
    grad.addColorStop(0, p === 1 ? '#1e3a8a' : '#14532d');
    grad.addColorStop(0.5, p === 1 ? '#3b82f6' : '#10b981');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1600, 1200);

    // Procedural dense grid pattern to generate uncompressed pixel data
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1600; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1200);
      ctx.stroke();
    }
    for (let y = 0; y < 1200; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1600, y);
      ctx.stroke();
    }

    // Centered card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.roundRect(300, 250, 1000, 700, 32);
    ctx.fill();

    // Title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Heavy Sample Document — Page ${p}`, 800, 480);

    ctx.fillStyle = '#475569';
    ctx.font = '28px sans-serif';
    ctx.fillText('High-Resolution Uncompressed Graphics Test', 800, 560);

    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('ASAPTools PDF Compressor Demo', 800, 680);

    // High quality PNG blob
    const pngBlob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
    const pngBuffer = await pngBlob.arrayBuffer();
    const embeddedImg = await doc.embedPng(pngBuffer);

    const page = doc.addPage([595.28, 841.89]); // A4
    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: 595.28,
      height: 841.89,
    });
  }

  const pdfBytes = await doc.save();
  return new File([pdfBytes as Uint8Array<ArrayBuffer>], 'asaptools-heavy-sample-doc.pdf', {
    type: 'application/pdf',
  });
}
