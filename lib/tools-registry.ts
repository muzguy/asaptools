export type ToolCategory = 'all' | 'developer' | 'text' | 'image' | 'pdf' | 'calculator' | 'media';

export interface ToolItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: Exclude<ToolCategory, 'all'>;
  badge?: 'Popular' | 'In Development' | 'Planned';
  isFeatured?: boolean;
  status: 'available' | 'in-development';
  keywords: string[];
  icon: string;
}

export interface CategoryMeta {
  id: Exclude<ToolCategory, 'all'>;
  name: string;
  description: string;
  icon: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'developer',
    name: 'Developer Tools',
    description: 'Format, validate, encode, and debug code and data quickly.',
    icon: 'code',
  },
  {
    id: 'text',
    name: 'Text & Content',
    description: 'Clean, count, convert, and format text without hassle.',
    icon: 'text',
  },
  {
    id: 'pdf',
    name: 'PDF Documents',
    description: 'Merge, split, extract, and convert PDF documents with privacy.',
    icon: 'pdf',
  },
  {
    id: 'image',
    name: 'Image Utilities',
    description: 'Compress, resize, and convert images fast in your browser.',
    icon: 'image',
  },
  {
    id: 'calculator',
    name: 'Calculators',
    description: 'Instant mathematical, financial, and conversion utilities.',
    icon: 'calculator',
  },
  {
    id: 'media',
    name: 'Media & Audio',
    description: 'Convert GIFs, videos, and audio tracks locally with WebAssembly privacy.',
    icon: 'film',
  },
];

/**
 * Prioritized Popular Tools featured at the top of the homepage.
 * Ordered by high user demand: PDF tools, Image tools, Media converters, and QR code generator.
 */
export const POPULAR_TOOL_IDS = [
  'pdf-compressor',
  'image-compressor',
  'ai-background-remover',
  'image-resizer',
  'images-to-pdf',
  'pdf-to-images',
  'gif-to-mp4',
  'video-to-mp3',
  'qr-code-generator',
] as const;

/**
 * Developer & text utilities displayed in a dedicated section lower on the homepage.
 */
export const DEVELOPER_TEXT_TOOL_IDS = [
  'code-playground',
  'json-formatter',
  'word-counter',
  'case-converter',
  'text-cleaner',
  'base64-converter',
  'uuid-generator',
] as const;

export const TOOLS_REGISTRY: ToolItem[] = [
  {
    id: 'code-playground',
    name: 'ASAPTools CodeLab',
    slug: '/tools/code-playground',
    description: 'Run Python 3 code live in your browser for free via WebAssembly with custom stdin, real output, and zero setup.',
    category: 'developer',
    badge: 'Popular',
    isFeatured: false,
    status: 'available',
    keywords: [
      'code playground',
      'c compiler',
      'cpp compiler',
      'c++ online compiler',
      'python online compiler',
      'codelab',
      'run code online',
      'ide',
      'sandbox',
    ],
    icon: 'terminal',
  },
  {
    id: 'json-formatter',
    name: 'JSON Formatter & Validator',
    slug: '/tools/json-formatter',
    description: 'Prettify, validate, and debug messy JSON with syntax highlighting and instant error detection.',
    category: 'developer',
    badge: 'Popular',
    isFeatured: false,
    status: 'available',
    keywords: ['json', 'formatter', 'beautify', 'validator', 'lint', 'minify', 'parse'],
    icon: 'code',
  },
  {
    id: 'qr-code-generator',
    name: 'QR Code Generator',
    slug: '/tools/qr-code-generator',
    description: 'Generate high-resolution custom QR codes with colors, gradients, logos, and custom shapes for URLs, Wi-Fi, vCards, and more.',
    category: 'developer',
    badge: 'Popular',
    isFeatured: true,
    status: 'available',
    keywords: [
      'qr code generator',
      'qr code',
      'generate qr code',
      'custom qr code',
      'free qr code',
      'wifi qr code',
      'vcard qr code',
      'qr logo',
      'vector qr code',
      'svg qr code',
    ],
    icon: 'qrcode',
  },
  {
    id: 'base64-converter',
    name: 'Base64 Encoder / Decoder',
    slug: '/tools/base64-converter',
    description: 'Safely encode and decode strings and media to and from Base64 representations.',
    category: 'developer',
    badge: 'Popular',
    isFeatured: false,
    status: 'in-development',
    keywords: ['base64', 'encode', 'decode', 'string', 'binary', 'url safe'],
    icon: 'binary',
  },
  {
    id: 'uuid-generator',
    name: 'UUID / GUID Generator',
    slug: '/tools/uuid-generator',
    description: 'Generate cryptographically strong v4 UUIDs individually or in bulk.',
    category: 'developer',
    badge: 'In Development',
    isFeatured: false,
    status: 'in-development',
    keywords: ['uuid', 'guid', 'v4', 'random', 'id', 'generator'],
    icon: 'hash',
  },
  {
    id: 'word-counter',
    name: 'Word & Character Counter',
    slug: '/tools/word-counter',
    description: 'Real-time text statistics including word count, characters, reading time, and paragraph count.',
    category: 'text',
    badge: 'Popular',
    isFeatured: false,
    status: 'available',
    keywords: ['word count', 'character count', 'reading time', 'text statistics', 'editor'],
    icon: 'text',
  },
  {
    id: 'case-converter',
    name: 'Case Converter',
    slug: '/tools/case-converter',
    description: 'Instantly convert text to camelCase, snake_case, kebab-case, UPPERCASE, and title case.',
    category: 'text',
    badge: 'Popular',
    isFeatured: false,
    status: 'available',
    keywords: ['case', 'camelcase', 'snake_case', 'uppercase', 'lowercase', 'slug', 'titlecase', 'pascalcase'],
    icon: 'textCase',
  },
  {
    id: 'text-cleaner',
    name: 'Text Cleaner',
    slug: '/tools/text-cleaner',
    description: 'Remove redundant whitespace, extra spaces, empty lines, and clean text instantly.',
    category: 'text',
    badge: 'Popular',
    isFeatured: false,
    status: 'available',
    keywords: ['text cleaner', 'trim whitespace', 'remove empty lines', 'normalize spaces', 'clean text', 'format text'],
    icon: 'text',
  },
  {
    id: 'image-compressor',
    name: 'Image Compressor',
    slug: '/tools/image-compressor',
    description: 'Reduce JPG, PNG, and WebP file sizes dramatically while maintaining crisp visual quality.',
    category: 'image',
    badge: 'Popular',
    isFeatured: true,
    status: 'available',
    keywords: ['image', 'compress', 'shrink', 'optimize', 'jpg', 'png', 'webp', 'reduce size'],
    icon: 'image',
  },
  {
    id: 'image-resizer',
    name: 'Image Resizer',
    slug: '/tools/image-resizer',
    description: 'Resize images to exact pixel dimensions, scale by percentage, and lock aspect ratios.',
    category: 'image',
    badge: 'Popular',
    isFeatured: true,
    status: 'available',
    keywords: ['image', 'resize', 'dimensions', 'aspect ratio', 'pixels', 'scale', 'social media', 'jpg', 'png', 'webp'],
    icon: 'image',
  },
  {
    id: 'ai-background-remover',
    name: 'AI Background Remover',
    slug: '/tools/ai-background-remover',
    description: 'Remove photo backgrounds 100% privately in your browser using local AI neural networks with transparent PNG export.',
    category: 'image',
    badge: 'Popular',
    isFeatured: true,
    status: 'available',
    keywords: [
      'ai background remover',
      'remove background',
      'transparent background',
      'bg remover',
      'cutout',
      'remove bg',
      'transparent png',
      'background eraser',
      'isolate subject',
      'photo cutout',
      'ai image segmentation',
      'isnet',
    ],
    icon: 'scissors',
  },
  {
    id: 'image-converter',
    name: 'Image Format Converter',
    slug: '/tools/image-converter',
    description: 'Convert images between PNG, JPEG/JPG, and WebP instantly with smart transparency handling.',
    category: 'image',
    badge: 'Popular',
    isFeatured: false,
    status: 'available',
    keywords: ['image', 'convert', 'format converter', 'webp', 'png', 'jpg', 'jpeg', 'export', 'transparency'],
    icon: 'imageRotate',
  },
  {
    id: 'pdf-tools',
    name: 'PDF Merge & Split',
    slug: '/tools/pdf-tools',
    description: 'Merge multiple PDF documents into one or split and extract custom page ranges with zero server uploads.',
    category: 'pdf',
    badge: 'Popular',
    isFeatured: false,
    status: 'available',
    keywords: ['pdf', 'merge', 'split', 'combine', 'extract pages', 'reorder pdf', 'join', 'documents'],
    icon: 'pdf',
  },
  {
    id: 'pdf-to-images',
    name: 'PDF to Images',
    slug: '/tools/pdf-to-images',
    description: 'Render and extract high-resolution PNG or JPG images from each page of your PDF.',
    category: 'pdf',
    badge: 'Popular',
    isFeatured: true,
    status: 'available',
    keywords: ['pdf', 'extract', 'pages', 'jpg', 'png', 'export', 'convert', 'images', 'zip'],
    icon: 'pdfExport',
  },
  {
    id: 'images-to-pdf',
    name: 'Images to PDF',
    slug: '/tools/images-to-pdf',
    description: 'Convert JPG, PNG, and WebP images into a single professional PDF with custom sizing and margins.',
    category: 'pdf',
    badge: 'Popular',
    isFeatured: true,
    status: 'available',
    keywords: ['images to pdf', 'jpg to pdf', 'png to pdf', 'webp to pdf', 'convert photo to pdf', 'a4', 'combine images'],
    icon: 'imagesToPdf',
  },
  {
    id: 'pdf-compressor',
    name: 'PDF Compressor',
    slug: '/tools/pdf-compressor',
    description: 'Compress PDF file sizes dramatically with multiple optimization levels and client-side privacy.',
    category: 'pdf',
    badge: 'Popular',
    isFeatured: true,
    status: 'available',
    keywords: ['pdf compressor', 'compress pdf', 'reduce pdf size', 'shrink pdf', 'optimize pdf', 'smaller pdf'],
    icon: 'pdfCompress',
  },
  {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    slug: '/tools/word-to-pdf',
    description: 'Convert Word documents (.docx, .doc) to high-fidelity PDF files preserving fonts, tables, and margins.',
    category: 'pdf',
    badge: 'Popular',
    isFeatured: false,
    status: 'available',
    keywords: ['word to pdf', 'convert docx to pdf', 'doc to pdf', 'docx to pdf converter', 'office to pdf', 'microsoft word to pdf'],
    icon: 'wordToPdf',
  },
  {
    id: 'percentage-calculator',
    name: 'Percentage Calculator',
    slug: '/tools/percentage-calculator',
    description: 'Calculate percentage increases, discounts, tips, and relative differences effortlessly.',
    category: 'calculator',
    badge: 'Popular',
    isFeatured: false,
    status: 'in-development',
    keywords: ['percentage', 'calculator', 'discount', 'increase', 'margin', 'math'],
    icon: 'calculator',
  },
  {
    id: 'unit-converter',
    name: 'Unit Converter',
    slug: '/tools/unit-converter',
    description: 'Quick conversion between length, weight, area, temperature, and digital storage units.',
    category: 'calculator',
    badge: 'In Development',
    isFeatured: false,
    status: 'in-development',
    keywords: ['unit', 'converter', 'metric', 'imperial', 'length', 'weight', 'bytes'],
    icon: 'ruler',
  },
  {
    id: 'gif-to-mp4',
    name: 'GIF ↔ MP4 Converter',
    slug: '/tools/gif-to-mp4',
    description: 'Convert animated GIFs to MP4 videos or MP4 videos to GIFs.',
    category: 'media',
    badge: 'Popular',
    isFeatured: true,
    status: 'available',
    keywords: ['gif to mp4', 'mp4 to gif', 'convert gif', 'video to gif', 'animated gif to video', 'gif converter', 'mp4', 'h264', 'video', 'transparency'],
    icon: 'film',
  },
  {
    id: 'video-to-mp3',
    name: 'Video to MP3 Converter',
    slug: '/tools/video-to-mp3',
    description: 'Extract pristine audio tracks from MP4, WebM, and other video files into high-fidelity MP3 files.',
    category: 'media',
    badge: 'Popular',
    isFeatured: true,
    status: 'available',
    keywords: ['video to mp3', 'extract audio', 'mp4 to mp3', 'webm to mp3', 'audio extractor', 'mp3 converter', 'bitrate'],
    icon: 'music',
  },
  {
    id: 'audio-converter',
    name: 'Audio Format Converter',
    slug: '/tools/audio-converter',
    description: 'Convert between MP3, WAV, AAC/M4A, OGG, and FLAC formats with custom bitrates, sample rates, and quality presets.',
    category: 'media',
    badge: 'Popular',
    isFeatured: false,
    status: 'available',
    keywords: ['audio converter', 'convert audio', 'mp3 to wav', 'wav to mp3', 'flac to mp3', 'm4a to mp3', 'ogg', 'sound converter'],
    icon: 'volume',
  },
];

/**
 * Returns the popular tools in the exact prioritized order.
 * Skips missing or non-functional tools.
 */
export function getPopularTools(): ToolItem[] {
  return POPULAR_TOOL_IDS
    .map((id) => TOOLS_REGISTRY.find((tool) => tool.id === id))
    .filter((tool): tool is ToolItem => Boolean(tool && tool.status === 'available'));
}

/**
 * Returns the developer and text utilities.
 */
export function getDeveloperTextTools(): ToolItem[] {
  return DEVELOPER_TEXT_TOOL_IDS
    .map((id) => TOOLS_REGISTRY.find((tool) => tool.id === id))
    .filter((tool): tool is ToolItem => Boolean(tool));
}
