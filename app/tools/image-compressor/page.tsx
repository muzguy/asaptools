import type { Metadata } from 'next';
import { ImageCompressor } from '@/components/tools/image-compressor';

export const metadata: Metadata = {
  title: 'Image Compressor — Compress JPG, PNG & WebP Online',
  description:
    'Free, fast, and private online Image Compressor. Reduce JPG, PNG, and WebP file sizes dramatically with adjustable quality and instant preview in your browser.',
  keywords: [
    'image compressor',
    'compress image online',
    'shrink JPG',
    'compress PNG',
    'WebP compressor',
    'reduce image size',
    'photo compressor',
    'browser image compression',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/image-compressor',
  },
  openGraph: {
    title: 'Image Compressor — Compress JPG, PNG & WebP Online',
    description:
      'Reduce JPG, PNG, and WebP file sizes dramatically directly in your browser. 100% private and client-side.',
    url: 'https://asaptools.in/tools/image-compressor',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — Image Compressor',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Image Compressor — Compress JPG, PNG & WebP Online',
    description:
      'Reduce JPG, PNG, and WebP file sizes dramatically directly in your browser with client-side privacy.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function ImageCompressorPage() {
  return <ImageCompressor />;
}
