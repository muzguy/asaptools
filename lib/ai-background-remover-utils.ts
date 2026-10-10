export const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export const MAX_BG_REMOVAL_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const MIN_IMAGE_DIMENSION = 10; // 10 px
export const MAX_IMAGE_DIMENSION = 8000; // 8000 px

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
}

export type BackgroundRemovalModelKey = 'isnet_quint8' | 'isnet_fp16' | 'isnet';

export interface ModelOption {
  key: BackgroundRemovalModelKey;
  name: string;
  badge: string;
  sizeLabel: string;
  description: string;
  recommendation: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    key: 'isnet_quint8',
    name: 'Fast (Quantized 8-Bit)',
    badge: 'Recommended',
    sizeLabel: '~42 MB',
    description: 'Fastest download & inference with minimal memory footprint. Excellent edge quality for everyday photos.',
    recommendation: 'Best for standard photos, mobile devices, and quick processing.',
  },
  {
    key: 'isnet_fp16',
    name: 'Balanced (Half Precision FP16)',
    badge: 'High Detail',
    sizeLabel: '~84 MB',
    description: 'Balanced precision weights for intricate hair strands and complex semi-transparent edges.',
    recommendation: 'Best for portraits with fine hair, fur, or semi-translucent fabrics.',
  },
  {
    key: 'isnet',
    name: 'Ultra (Full Precision FP32)',
    badge: 'Maximum Fidelity',
    sizeLabel: '~168 MB',
    description: 'Uncompressed neural network weights for maximum possible boundary precision.',
    recommendation: 'Recommended on desktop computers with high-speed internet and dedicated GPUs.',
  },
];

export interface BackdropOption {
  id: string;
  name: string;
  type: 'transparent' | 'solid';
  color?: string;
}

export const PRESET_BACKDROPS: BackdropOption[] = [
  { id: 'transparent', name: 'Transparent (PNG)', type: 'transparent' },
  { id: 'white', name: 'Pure White', type: 'solid', color: '#ffffff' },
  { id: 'dark', name: 'Studio Black', type: 'solid', color: '#09090b' },
  { id: 'slate', name: 'Neutral Slate', type: 'solid', color: '#64748b' },
  { id: 'blue', name: 'Electric Blue', type: 'solid', color: '#2563eb' },
  { id: 'warm', name: 'Warm Cream', type: 'solid', color: '#fef3c7' },
  { id: 'emerald', name: 'Forest Emerald', type: 'solid', color: '#059669' },
  { id: 'sunset', name: 'Sunset Coral', type: 'solid', color: '#f97316' },
];

export type ProgressStage =
  | 'idle'
  | 'downloading'
  | 'decoding'
  | 'inference'
  | 'masking'
  | 'encoding'
  | 'complete'
  | 'error';

export interface ProgressState {
  stage: ProgressStage;
  percent: number;
  label: string;
  detail?: string;
}

/**
 * Validates candidate file type, size, and existence.
 */
export function validateImageFile(file: {
  name?: string;
  size: number;
  type?: string;
}): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No image file was provided.' };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes).' };
  }

  if (file.size > MAX_BG_REMOVAL_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the 25 MB limit (${formatByteSize(file.size)}). Please choose a smaller image to prevent browser memory exhaustion.`,
    };
  }

  const normalizedType = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  const isMimeSupported = SUPPORTED_MIME_TYPES.some((m) => m === normalizedType);
  const hasSupportedExt =
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp');

  if (!isMimeSupported && !hasSupportedExt) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload a JPG, PNG, or WebP photo.',
    };
  }

  return { valid: true };
}

/**
 * Validates image pixel dimensions.
 */
export function validateDimensions(
  width: number,
  height: number
): { valid: boolean; error?: string; warning?: string } {
  if (!width || !height || width <= 0 || height <= 0) {
    return { valid: false, error: 'Could not determine valid image dimensions.' };
  }

  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    return {
      valid: false,
      error: `Image dimensions (${width} × ${height} px) are too small. Minimum supported size is ${MIN_IMAGE_DIMENSION} × ${MIN_IMAGE_DIMENSION} px.`,
    };
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return {
      valid: false,
      error: `Image dimensions (${width} × ${height} px) exceed the maximum supported size of ${MAX_IMAGE_DIMENSION} × ${MAX_IMAGE_DIMENSION} px.`,
    };
  }

  let warning: string | undefined;
  if (width > 4000 || height > 4000) {
    warning = `High-resolution image (${width} × ${height} px). AI segmentation may take longer and requires adequate device memory.`;
  }

  return { valid: true, warning };
}

/**
 * Formats byte size into human readable string.
 */
export function formatByteSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return `${bytes} B`;
  return `${(bytes / Math.pow(k, i)).toFixed(i >= 2 ? 2 : 1)} ${sizes[i]}`;
}

/**
 * Formats image dimensions.
 */
export function formatResolution(width: number, height: number): string {
  return `${width} × ${height} px`;
}

/**
 * Generates an output filename by stripping the original extension and appending a suffix.
 */
export function generateOutputFilename(originalName: string, suffix = 'asap-bg-removed'): string {
  if (!originalName || typeof originalName !== 'string') {
    return `image-${suffix}.png`;
  }
  const cleanName = originalName.replace(/\.[^/.]+$/, '').trim();
  const safeName = cleanName
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${safeName || 'image'}-${suffix}.png`;
}

/**
 * Maps @imgly/background-removal progress callbacks to clean user-facing progress state.
 */
export function parseProgress(key: string, current: number, total: number): ProgressState {
  // 1. Download progress
  const isDownload =
    key.includes('models/') ||
    key.includes('ort-wasm') ||
    key.startsWith('/') ||
    key.startsWith('http') ||
    key.startsWith('fetch:');

  if (isDownload) {
    const rawPercent = total > 0 ? (current / total) * 100 : 0;
    // Map download phase to 0% - 75% of total user progress
    const displayPercent = Math.min(75, Math.max(5, Math.round(rawPercent * 0.75)));

    let label = 'Downloading AI segmentation model...';
    if (key.includes('ort-wasm')) {
      label = 'Loading WebAssembly neural runtime...';
    } else if (key.includes('isnet_quint8')) {
      label = 'Downloading Fast Quantized AI Model (~42 MB)...';
    } else if (key.includes('isnet_fp16')) {
      label = 'Downloading Balanced FP16 AI Model (~84 MB)...';
    } else if (key.includes('isnet')) {
      label = 'Downloading Ultra Quality AI Model (~168 MB)...';
    }

    const detail =
      total > 0
        ? `${formatByteSize(current)} of ${formatByteSize(total)} (${Math.round(rawPercent)}%)`
        : undefined;

    return {
      stage: 'downloading',
      percent: displayPercent,
      label,
      detail,
    };
  }

  // 2. Compute phases
  switch (key) {
    case 'compute:decode':
      return {
        stage: 'decoding',
        percent: 80,
        label: 'Decoding image into neural tensor...',
        detail: 'Preparing pixel buffer for inference',
      };
    case 'compute:inference':
      return {
        stage: 'inference',
        percent: 88,
        label: 'Running local AI neural network segmentation...',
        detail: 'Computing Dichotomous Image Segmentation (ISNet) mask',
      };
    case 'compute:mask':
      return {
        stage: 'masking',
        percent: 94,
        label: 'Refining transparent alpha matte mask...',
        detail: 'Upsampling segmentation boundary to full original resolution',
      };
    case 'compute:encode':
      return {
        stage: 'encoding',
        percent: 98,
        label: 'Encoding full-resolution transparent PNG...',
        detail: 'Assembling lossless PNG alpha channel',
      };
    default:
      return {
        stage: 'inference',
        percent: 85,
        label: 'Processing image...',
        detail: key,
      };
  }
}

/**
 * Composites a cut-out transparent image blob on top of a solid background color,
 * producing a new full-resolution PNG.
 */
export async function compositeImageWithBackground(
  imageBlob: Blob,
  backgroundColor: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Canvas compositing must run in a browser environment.'));
    }

    const img = new window.Image();
    const objectUrl = URL.createObjectURL(imageBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('HTML5 Canvas 2D context is unavailable in this browser.'));
        }

        // Fill background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Draw cut-out image on top
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to encode composited image canvas to PNG.'));
            }
          },
          'image/png',
          1.0
        );
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Unexpected error during canvas compositing.'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load cutout image into canvas for background compositing.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Creates an in-memory sample portrait silhouette image for 1-click testing.
 */
export function createSamplePortraitImage(): Promise<File> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Canvas sample generation must run in a browser environment.'));
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 900;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get 2D canvas context.'));
      }

      // Background: Warm architectural interior backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 900);
      bgGrad.addColorStop(0, '#1e293b'); // slate-800
      bgGrad.addColorStop(0.5, '#334155'); // slate-700
      bgGrad.addColorStop(1, '#0f172a'); // slate-900
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 900);

      // Decorative studio light circles in background
      ctx.fillStyle = 'rgba(249, 115, 22, 0.15)'; // orange glow
      ctx.beginPath();
      ctx.arc(350, 300, 220, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)'; // sky glow
      ctx.beginPath();
      ctx.arc(850, 450, 260, 0, Math.PI * 2);
      ctx.fill();

      // Foreground Subject: Silhouette of a photographer with camera
      ctx.fillStyle = '#f8fafc'; // crisp off-white subject

      // Body / Shoulders
      ctx.beginPath();
      ctx.ellipse(600, 780, 260, 220, 0, Math.PI, 0, true);
      ctx.fill();

      // Neck
      ctx.beginPath();
      ctx.rect(560, 500, 80, 100);
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(600, 430, 110, 0, Math.PI * 2);
      ctx.fill();

      // Camera body held up
      ctx.fillStyle = '#f97316'; // orange camera highlight
      ctx.beginPath();
      ctx.roundRect(580, 370, 140, 95, 12);
      ctx.fill();

      // Camera lens
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(650, 417, 36, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(650, 417, 18, 0, Math.PI * 2);
      ctx.fill();

      // Camera flash / viewfinder
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.roundRect(620, 350, 40, 22, 4);
      ctx.fill();

      // Subtle sample label in lower corner
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '500 16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('ASAPTools Sample Portrait • 1200 × 900 px', 1160, 860);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], 'asaptools-sample-subject.jpg', {
              type: 'image/jpeg',
            });
            resolve(file);
          } else {
            reject(new Error('Failed to generate sample image blob.'));
          }
        },
        'image/jpeg',
        0.95
      );
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Failed to build sample image.'));
    }
  });
}
