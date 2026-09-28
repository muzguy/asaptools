export interface ImageFileMeta {
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  type: string;
  width: number;
  height: number;
  aspectRatio: string;
  objectUrl: string;
  hasAlpha?: boolean;
}

export type SupportedOutputFormat = 'original' | 'image/jpeg' | 'image/webp' | 'image/png';

export interface CompressionOptions {
  quality: number; // 0.01 to 1.0 or 1 to 100
  format: SupportedOutputFormat;
  backgroundColor?: string; // fallback color for JPEG transparency, e.g. '#ffffff'
}

export interface CompressionResult {
  blob: Blob;
  objectUrl: string;
  size: number;
  formattedSize: string;
  width: number;
  height: number;
  type: string;
  extension: string;
  savingsBytes: number;
  savingsPercentage: number;
  isSmaller: boolean;
  downloadFilename: string;
}

export interface ResizeOptions {
  width: number;
  height: number;
  format: SupportedOutputFormat;
  quality?: number; // 0.01 to 1.0 or 1 to 100
  backgroundColor?: string; // fallback color for JPEG transparency, e.g. '#ffffff'
}

export interface ResizeResult {
  blob: Blob;
  objectUrl: string;
  size: number;
  formattedSize: string;
  width: number;
  height: number;
  type: string;
  extension: string;
  downloadFilename: string;
}

export type TargetConvertFormat = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/jpg';

export interface ConvertOptions {
  format: TargetConvertFormat;
  quality?: number; // 0.01 to 1.0 or 1 to 100
  backgroundColor?: string; // fallback color for JPEG transparency, e.g. '#ffffff'
}

export interface ConvertResult {
  blob: Blob;
  objectUrl: string;
  size: number;
  formattedSize: string;
  width: number;
  height: number;
  type: string;
  extension: string;
  savingsBytes: number;
  savingsPercentage: number;
  isSmaller: boolean;
  downloadFilename: string;
}

export const MAX_RESIZE_DIMENSION = 10000;
export const MIN_RESIZE_DIMENSION = 1;

export const MAX_IMAGE_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export const SUPPORTED_INPUT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/gif',
]);

/**
 * Normalizes quality to 0.01 - 1.0 range whether passed as 0-100 or 0-1.
 */
export function normalizeQuality(quality: number): number {
  let q = quality;
  if (q > 1) {
    q = q / 100;
  }
  return Math.max(0.01, Math.min(1.0, q));
}

/**
 * Checks whether the current browser's canvas encoder actually supports the given MIME type.
 * HTML5 Canvas specification dictates that unsupported types silently fall back to image/png.
 */
export function isMimeSupportedByBrowser(mimeType: string): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL(mimeType);
    const normalizedTarget = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType.toLowerCase();
    return dataUrl.startsWith(`data:${normalizedTarget}`);
  } catch {
    return false;
  }
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function getFilenameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

export function getMimeExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  switch (normalized) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/avif':
      return 'avif';
    case 'image/bmp':
      return 'bmp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
}

/**
 * Fast sampling to detect whether an image contains any transparent pixels.
 */
export function detectImageAlpha(img: HTMLImageElement, width: number, height: number): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const sw = Math.min(100, width);
    const sh = Math.min(100, height);
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.clearRect(0, 0, sw, sh);
    ctx.drawImage(img, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const data = imgData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Validates and loads image file metadata including natural dimensions and object URL.
 */
export function loadImageMeta(file: File): Promise<ImageFileMeta> {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided.'));
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return reject(
        new Error(
          `File size exceeds 50MB limit (${formatByteSize(file.size)}). Please choose a smaller image to prevent browser memory issues.`
        )
      );
    }

    // Check mime type or extension
    const ext = getFileExtension(file.name);
    let mime = file.type.toLowerCase();
    if (!mime && ext) {
      if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
      else if (ext === 'png') mime = 'image/png';
      else if (ext === 'webp') mime = 'image/webp';
      else if (ext === 'avif') mime = 'image/avif';
      else if (ext === 'bmp') mime = 'image/bmp';
      else if (ext === 'gif') mime = 'image/gif';
    }
    if (mime === 'image/jpg') mime = 'image/jpeg';

    const isSupportedMime = SUPPORTED_INPUT_TYPES.has(mime);
    const isSupportedExt = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp', 'gif'].includes(ext);

    if (!isSupportedMime && !isSupportedExt) {
      return reject(
        new Error(
          `Unsupported file type (${file.type || ext || 'unknown'}). Supported formats are JPEG, PNG, WebP, AVIF, BMP, and GIF.`
        )
      );
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      if (!width || !height) {
        URL.revokeObjectURL(objectUrl);
        return reject(new Error('Image has zero dimensions or could not be decoded.'));
      }

      // Calculate simplified aspect ratio
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(width, height);
      const ratioWidth = width / divisor;
      const ratioHeight = height / divisor;
      const aspectRatio =
        ratioWidth <= 21 && ratioHeight <= 21
          ? `${ratioWidth}:${ratioHeight}`
          : `${(width / height).toFixed(2)}:1`;

      const resolvedType = mime || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      const hasAlpha = ['image/png', 'image/webp', 'image/gif', 'image/avif'].includes(resolvedType)
        ? detectImageAlpha(img, width, height)
        : false;

      resolve({
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatByteSize(file.size),
        type: resolvedType,
        width,
        height,
        aspectRatio,
        objectUrl,
        hasAlpha,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          'Failed to decode image. The file may be corrupt, damaged, or not a genuine image.'
        )
      );
    };

    img.src = objectUrl;
  });
}

/**
 * Performs client-side image compression using standard HTML5 Canvas.
 * Always encodes from the original image (meta.objectUrl).
 * Strictly validates that the browser's encoder produced the requested MIME type.
 */
export function compressImage(
  meta: ImageFileMeta,
  options: CompressionOptions
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    // 1. Determine target MIME type
    let targetMime: string;
    if (options.format === 'original') {
      targetMime = meta.type === 'image/jpg' ? 'image/jpeg' : meta.type;
    } else {
      targetMime = options.format;
    }

    const normalizedTarget = (targetMime === 'image/jpg' ? 'image/jpeg' : targetMime).toLowerCase();

    // 2. Pre-verify browser support for target format
    if (!isMimeSupportedByBrowser(normalizedTarget)) {
      return reject(
        new Error(
          `Your browser does not support encoding images to format "${targetMime}". Please select WebP, JPEG, or PNG instead.`
        )
      );
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = meta.width;
        canvas.height = meta.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not initialize canvas 2D context for compression.'));
        }

        // Transparency handling:
        // JPEG does not support alpha channels. Fill canvas with chosen background color to prevent black transparency artifacts.
        if (normalizedTarget === 'image/jpeg') {
          ctx.fillStyle = options.backgroundColor || '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          // Clear canvas for PNG and WebP to preserve alpha channels
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Draw original image onto canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Quality parameter (0.01 - 1.0)
        const quality = normalizeQuality(options.quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(
                new Error(
                  `Failed to encode image to format "${targetMime}". The browser encoder failed or is unavailable.`
                )
              );
            }

            // 3. Post-verification of returned MIME type:
            // Detect silent fallback where browser returns 'image/png' when another format was requested
            const normalizedActual = (blob.type === 'image/jpg' ? 'image/jpeg' : blob.type).toLowerCase();
            if (normalizedActual !== normalizedTarget) {
              return reject(
                new Error(
                  `Browser encoder fallback detected: requested "${targetMime}" but browser generated "${blob.type}". Encoder not genuinely supported.`
                )
              );
            }

            const outputObjectUrl = URL.createObjectURL(blob);
            const extension = getMimeExtension(normalizedActual);
            const baseName = getFilenameWithoutExtension(meta.name);
            const downloadFilename = `${baseName}-compressed.${extension}`;

            const savingsBytes = meta.size - blob.size;
            const isSmaller = blob.size < meta.size;
            const diffBytes = Math.abs(savingsBytes);
            const savingsPercentage = meta.size > 0
              ? parseFloat(((diffBytes / meta.size) * 100).toFixed(1))
              : 0;

            resolve({
              blob,
              objectUrl: outputObjectUrl,
              size: blob.size,
              formattedSize: formatByteSize(blob.size),
              width: canvas.width,
              height: canvas.height,
              type: normalizedActual,
              extension,
              savingsBytes,
              savingsPercentage,
              isSmaller,
              downloadFilename,
            });
          },
          normalizedTarget,
          quality
        );
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Unexpected error during canvas compression.'));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load source image into canvas for compression.'));
    };

    // Always source from the original image URL
    img.src = meta.objectUrl;
  });
}

/**
 * Validates dimensions against zero, negative, non-finite, and browser-unsafe limits.
 */
export function validateResizeDimensions(width: number, height: number): { valid: boolean; error?: string } {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return { valid: false, error: 'Width and height must be valid numbers.' };
  }
  const roundedW = Math.round(width);
  const roundedH = Math.round(height);
  if (roundedW < MIN_RESIZE_DIMENSION || roundedH < MIN_RESIZE_DIMENSION) {
    return { valid: false, error: 'Dimensions must be at least 1 pixel.' };
  }
  if (roundedW > MAX_RESIZE_DIMENSION || roundedH > MAX_RESIZE_DIMENSION) {
    return {
      valid: false,
      error: `Dimensions cannot exceed ${MAX_RESIZE_DIMENSION}px to prevent browser memory issues.`,
    };
  }
  return { valid: true };
}

/**
 * Calculates matching width or height to preserve the original image's aspect ratio.
 */
export function calculateAspectRatioDimension(
  changedDim: 'width' | 'height',
  newValue: number,
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  if (originalWidth <= 0 || originalHeight <= 0) {
    return { width: Math.max(1, Math.round(newValue)), height: Math.max(1, Math.round(newValue)) };
  }
  const ratio = originalWidth / originalHeight;
  if (changedDim === 'width') {
    const calculatedHeight = Math.max(1, Math.round(newValue / ratio));
    return { width: Math.max(1, Math.round(newValue)), height: calculatedHeight };
  } else {
    const calculatedWidth = Math.max(1, Math.round(newValue * ratio));
    return { width: calculatedWidth, height: Math.max(1, Math.round(newValue)) };
  }
}

/**
 * Scales width and height by a given percentage based on original dimensions.
 */
export function scaleDimensionsByPercentage(
  originalWidth: number,
  originalHeight: number,
  percentage: number
): { width: number; height: number } {
  const p = Math.max(1, percentage) / 100;
  return {
    width: Math.max(1, Math.round(originalWidth * p)),
    height: Math.max(1, Math.round(originalHeight * p)),
  };
}

/**
 * Performs client-side image resizing using HTML5 Canvas with high-quality bicubic smoothing.
 * Strictly checks MIME type support and prevents silent browser fallback to PNG.
 */
export function resizeImage(
  meta: ImageFileMeta,
  options: ResizeOptions
): Promise<ResizeResult> {
  return new Promise((resolve, reject) => {
    // 1. Validate target dimensions
    const validation = validateResizeDimensions(options.width, options.height);
    if (!validation.valid) {
      return reject(new Error(validation.error || 'Invalid dimensions provided for resizing.'));
    }

    const targetWidth = Math.round(options.width);
    const targetHeight = Math.round(options.height);

    // 2. Determine target MIME type
    let targetMime: string;
    if (options.format === 'original') {
      targetMime = meta.type === 'image/jpg' ? 'image/jpeg' : meta.type;
    } else {
      targetMime = options.format;
    }

    const normalizedTarget = (targetMime === 'image/jpg' ? 'image/jpeg' : targetMime).toLowerCase();

    // 3. Pre-verify browser support for target format
    if (!isMimeSupportedByBrowser(normalizedTarget)) {
      return reject(
        new Error(
          `Your browser does not support encoding images to format "${targetMime}". Please select WebP, JPEG, or PNG instead.`
        )
      );
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not initialize canvas 2D context for resizing.'));
        }

        // Enable high-quality smoothing for downscaling and upscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Transparency handling:
        // JPEG does not support alpha channels. Fill canvas with chosen background color to prevent black transparency artifacts.
        if (normalizedTarget === 'image/jpeg') {
          ctx.fillStyle = options.backgroundColor || '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          // Clear canvas for PNG and WebP to preserve alpha channels
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Draw resized image onto canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Quality parameter (0.01 - 1.0, default 0.92 for WebP/JPEG)
        const quality = normalizeQuality(options.quality ?? 0.92);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(
                new Error(
                  `Failed to encode resized image to format "${targetMime}". The browser encoder failed or is unavailable.`
                )
              );
            }

            // Post-verification of returned MIME type:
            // Detect silent fallback where browser returns 'image/png' when another format was requested
            const normalizedActual = (blob.type === 'image/jpg' ? 'image/jpeg' : blob.type).toLowerCase();
            if (normalizedActual !== normalizedTarget) {
              return reject(
                new Error(
                  `Browser encoder fallback detected: requested "${targetMime}" but browser generated "${blob.type}". Encoder not genuinely supported.`
                )
              );
            }

            const outputObjectUrl = URL.createObjectURL(blob);
            const extension = getMimeExtension(normalizedActual);
            const baseName = getFilenameWithoutExtension(meta.name);
            const downloadFilename = `${baseName}-${targetWidth}x${targetHeight}.${extension}`;

            resolve({
              blob,
              objectUrl: outputObjectUrl,
              size: blob.size,
              formattedSize: formatByteSize(blob.size),
              width: targetWidth,
              height: targetHeight,
              type: normalizedActual,
              extension,
              downloadFilename,
            });
          },
          normalizedTarget,
          quality
        );
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Unexpected error during canvas resizing.'));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load source image into canvas for resizing.'));
    };

    // Always source from the original image URL
    img.src = meta.objectUrl;
  });
}

/**
 * Performs client-side image format conversion using HTML5 Canvas.
 * Strictly checks MIME type support, detects silent browser fallback to PNG,
 * and properly fills background for JPEG if transparency is present.
 */
export function convertImage(
  meta: ImageFileMeta,
  options: ConvertOptions
): Promise<ConvertResult> {
  return new Promise((resolve, reject) => {
    const targetMime = options.format;
    const normalizedTarget = (targetMime === 'image/jpg' ? 'image/jpeg' : targetMime).toLowerCase();

    // 1. Pre-verify browser support
    if (!isMimeSupportedByBrowser(normalizedTarget)) {
      return reject(
        new Error(
          `Your browser does not support encoding images to format "${targetMime}". Please select WebP, JPEG, or PNG instead.`
        )
      );
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = meta.width;
        canvas.height = meta.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not initialize canvas 2D context for conversion.'));
        }

        // Transparency handling:
        // JPEG does not support alpha channels. Fill canvas with chosen background color to prevent black transparency artifacts.
        if (normalizedTarget === 'image/jpeg') {
          ctx.fillStyle = options.backgroundColor || '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          // Clear canvas for PNG and WebP to preserve alpha channels
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Draw image at native original dimensions
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Quality parameter (0.01 - 1.0, default 0.92 for WebP/JPEG)
        const quality = normalizeQuality(options.quality ?? 0.92);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(
                new Error(
                  `Failed to convert image to format "${targetMime}". The browser encoder failed or is unavailable.`
                )
              );
            }

            // Post-verification of returned MIME type:
            // Detect silent fallback where browser returns 'image/png' when another format was requested
            const normalizedActual = (blob.type === 'image/jpg' ? 'image/jpeg' : blob.type).toLowerCase();
            if (normalizedActual !== normalizedTarget) {
              return reject(
                new Error(
                  `Browser encoder fallback detected: requested "${targetMime}" but browser generated "${blob.type}". Encoder not genuinely supported.`
                )
              );
            }

            const outputObjectUrl = URL.createObjectURL(blob);
            const extension = getMimeExtension(normalizedActual);
            const baseName = getFilenameWithoutExtension(meta.name);
            const downloadFilename = `${baseName}.${extension}`;

            const savingsBytes = meta.size - blob.size;
            const isSmaller = blob.size < meta.size;
            const diffBytes = Math.abs(savingsBytes);
            const savingsPercentage = meta.size > 0
              ? parseFloat(((diffBytes / meta.size) * 100).toFixed(1))
              : 0;

            resolve({
              blob,
              objectUrl: outputObjectUrl,
              size: blob.size,
              formattedSize: formatByteSize(blob.size),
              width: canvas.width,
              height: canvas.height,
              type: normalizedActual,
              extension,
              savingsBytes,
              savingsPercentage,
              isSmaller,
              downloadFilename,
            });
          },
          normalizedTarget,
          quality
        );
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Unexpected error during canvas conversion.'));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load source image into canvas for conversion.'));
    };

    // Always source from the original image URL
    img.src = meta.objectUrl;
  });
}

/**
 * Creates a transparent PNG sample image with alpha channels for testing transparency conversion.
 */
export function createSampleTransparentPng(): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 700;
    const ctx = canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, 1000, 700);

    // Glowing circle in background with alpha
    const radGrad = ctx.createRadialGradient(500, 350, 50, 500, 350, 300);
    radGrad.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    radGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 1000, 700);

    // Modern card shape with translucent fill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.roundRect(200, 150, 600, 400, 24);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Colorful badge pill
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(400, 210, 200, 36, 18);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRANSPARENT PNG', 500, 234);

    // Title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('ASAPTools Converter', 500, 320);

    ctx.fillStyle = '#64748b';
    ctx.font = '18px sans-serif';
    ctx.fillText('Alpha Channel & Transparency Sample', 500, 365);

    // Floating badges with varied alpha
    ctx.fillStyle = 'rgba(37, 99, 235, 0.15)';
    ctx.beginPath();
    ctx.roundRect(280, 420, 200, 50, 12);
    ctx.fill();
    ctx.fillStyle = '#1d4ed8';
    ctx.font = '600 15px sans-serif';
    ctx.fillText('Preserves Alpha in WebP', 380, 451);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.beginPath();
    ctx.roundRect(520, 420, 200, 50, 12);
    ctx.fill();
    ctx.fillStyle = '#d97706';
    ctx.font = '600 15px sans-serif';
    ctx.fillText('Fills Background in JPEG', 620, 451);

    canvas.toBlob(
      (blob) => {
        const file = new File([blob!], 'asaptools-transparent-sample.png', { type: 'image/png' });
        resolve(file);
      },
      'image/png'
    );
  });
}

/**
 * Creates a rich, realistic sample image in memory for 1-click testing.
 */
export function createSampleImage(): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;

    // Rich gradient background
    const grad = ctx.createLinearGradient(0, 0, 1200, 800);
    grad.addColorStop(0, '#f97316'); // orange-500
    grad.addColorStop(0.5, '#ea580c'); // orange-600
    grad.addColorStop(1, '#09090b'); // zinc-950
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 800);

    // Decorative geometric patterns
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(200 + i * 160, 400 + Math.sin(i) * 120, 80 + i * 15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Modern card shape
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.roundRect(300, 200, 600, 400, 24);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Text details
    ctx.fillStyle = '#ea580c';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ASAPTools', 600, 340);

    ctx.fillStyle = '#18181b';
    ctx.font = '600 24px sans-serif';
    ctx.fillText('Client-Side Image Compressor', 600, 395);

    ctx.fillStyle = '#71717a';
    ctx.font = '16px sans-serif';
    ctx.fillText('1200 × 800 • High Resolution Sample', 600, 445);

    canvas.toBlob(
      (blob) => {
        const file = new File([blob!], 'asaptools-sample.jpg', { type: 'image/jpeg' });
        resolve(file);
      },
      'image/jpeg',
      0.95
    );
  });
}
