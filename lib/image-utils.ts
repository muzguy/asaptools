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
  quality: number; // 0.01 to 1.0 (e.g. 0.8)
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
  switch (mimeType) {
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
    const mime = file.type.toLowerCase();
    const ext = getFileExtension(file.name);
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

      resolve({
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatByteSize(file.size),
        type: mime || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        width,
        height,
        aspectRatio,
        objectUrl,
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
 */
export function compressImage(
  meta: ImageFileMeta,
  options: CompressionOptions
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = meta.width;
        canvas.height = meta.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not initialize canvas context for compression.'));
        }

        // Determine target MIME type
        let targetMime: string;
        if (options.format === 'original') {
          if (['image/jpeg', 'image/webp', 'image/png'].includes(meta.type)) {
            targetMime = meta.type;
          } else {
            // Default to WebP for modern fallback if original format was BMP, GIF, etc.
            targetMime = 'image/webp';
          }
        } else {
          targetMime = options.format;
        }

        // Transparency handling for JPEG:
        // JPEG does not support transparency. If converting to JPEG, fill background with user selected color
        if (targetMime === 'image/jpeg') {
          ctx.fillStyle = options.backgroundColor || '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          // Clear canvas for PNG and WebP to preserve alpha channels
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Quality parameter (clamped 0.01 - 1.0)
        const quality = Math.max(0.01, Math.min(1.0, options.quality));

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(
                new Error(
                  `Failed to compress image into format ${targetMime}. Your browser may not support this output format.`
                )
              );
            }

            const outputObjectUrl = URL.createObjectURL(blob);
            const actualMime = blob.type || targetMime;
            const extension = getMimeExtension(actualMime);
            const baseName = getFilenameWithoutExtension(meta.name);
            const downloadFilename = `${baseName}-compressed.${extension}`;

            const savingsBytes = meta.size - blob.size;
            const savingsPercentage = parseFloat(
              (((meta.size - blob.size) / meta.size) * 100).toFixed(1)
            );
            const isSmaller = blob.size < meta.size;

            resolve({
              blob,
              objectUrl: outputObjectUrl,
              size: blob.size,
              formattedSize: formatByteSize(blob.size),
              width: canvas.width,
              height: canvas.height,
              type: actualMime,
              extension,
              savingsBytes,
              savingsPercentage,
              isSmaller,
              downloadFilename,
            });
          },
          targetMime,
          quality
        );
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Unexpected error during canvas compression.'));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image into canvas for compression.'));
    };

    img.src = meta.objectUrl;
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
