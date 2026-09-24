export type ToolCategory = 'all' | 'developer' | 'text' | 'image' | 'pdf' | 'calculator';

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
];

export const TOOLS_REGISTRY: ToolItem[] = [
  {
    id: 'json-formatter',
    name: 'JSON Formatter & Validator',
    slug: '/tools/json-formatter',
    description: 'Prettify, validate, and debug messy JSON with syntax highlighting and instant error detection.',
    category: 'developer',
    badge: 'Popular',
    isFeatured: true,
    status: 'in-development',
    keywords: ['json', 'formatter', 'beautify', 'validator', 'lint', 'minify', 'parse'],
    icon: 'code',
  },
  {
    id: 'base64-converter',
    name: 'Base64 Encoder / Decoder',
    slug: '/tools/base64-converter',
    description: 'Safely encode and decode strings and media to and from Base64 representations.',
    category: 'developer',
    badge: 'Popular',
    isFeatured: true,
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
    isFeatured: true,
    status: 'in-development',
    keywords: ['word count', 'character count', 'reading time', 'text statistics', 'editor'],
    icon: 'text',
  },
  {
    id: 'case-converter',
    name: 'Case Converter',
    slug: '/tools/case-converter',
    description: 'Instantly convert text to camelCase, snake_case, kebab-case, UPPERCASE, and title case.',
    category: 'text',
    badge: 'In Development',
    isFeatured: false,
    status: 'in-development',
    keywords: ['case', 'camelcase', 'snake_case', 'uppercase', 'lowercase', 'slug'],
    icon: 'textCase',
  },
  {
    id: 'image-compressor',
    name: 'Image Compressor',
    slug: '/tools/image-compressor',
    description: 'Reduce JPG, PNG, and WebP file sizes dramatically while maintaining crisp visual quality.',
    category: 'image',
    badge: 'Popular',
    isFeatured: true,
    status: 'in-development',
    keywords: ['image', 'compress', 'shrink', 'optimize', 'jpg', 'png', 'webp', 'reduce size'],
    icon: 'image',
  },
  {
    id: 'image-converter',
    name: 'Image Format Converter',
    slug: '/tools/image-converter',
    description: 'Quickly convert between modern formats: WebP, PNG, JPG, and AVIF directly in the browser.',
    category: 'image',
    badge: 'In Development',
    isFeatured: false,
    status: 'in-development',
    keywords: ['image', 'convert', 'webp', 'png', 'jpg', 'avif', 'export'],
    icon: 'imageRotate',
  },
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    slug: '/tools/merge-pdf',
    description: 'Combine multiple PDF documents into a single organized file in seconds.',
    category: 'pdf',
    badge: 'Popular',
    isFeatured: true,
    status: 'in-development',
    keywords: ['pdf', 'merge', 'combine', 'join', 'documents', 'assemble'],
    icon: 'pdf',
  },
  {
    id: 'pdf-to-images',
    name: 'PDF to Images',
    slug: '/tools/pdf-to-images',
    description: 'Render and extract high-resolution PNG or JPG images from each page of your PDF.',
    category: 'pdf',
    badge: 'In Development',
    isFeatured: false,
    status: 'in-development',
    keywords: ['pdf', 'extract', 'pages', 'jpg', 'png', 'export', 'convert'],
    icon: 'pdfExport',
  },
  {
    id: 'percentage-calculator',
    name: 'Percentage Calculator',
    slug: '/tools/percentage-calculator',
    description: 'Calculate percentage increases, discounts, tips, and relative differences effortlessly.',
    category: 'calculator',
    badge: 'Popular',
    isFeatured: true,
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
];
