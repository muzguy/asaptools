import type { Metadata } from 'next';
import { ImageResizer } from '@/components/tools/image-resizer';

export const metadata: Metadata = {
  title: 'Image Resizer — Resize JPG, PNG & WebP Online to Exact Dimensions',
  description:
    'Free, fast, and private online Image Resizer. Resize images to exact pixel dimensions, scale by percentage, lock aspect ratios, and choose social media presets directly in your browser.',
  keywords: [
    'image resizer',
    'resize image online',
    'scale image',
    'change picture dimensions',
    'resize JPG',
    'resize PNG',
    'resize WebP',
    'aspect ratio lock',
    'social media image resize',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/image-resizer',
  },
  openGraph: {
    title: 'Image Resizer — Resize JPG, PNG & WebP Online to Exact Dimensions',
    description:
      'Resize images to exact pixel dimensions, scale by percentage, and lock aspect ratios directly in your browser. 100% private and client-side.',
    url: 'https://asaptools.in/tools/image-resizer',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — Image Resizer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Image Resizer — Resize JPG, PNG & WebP Online to Exact Dimensions',
    description:
      'Resize images to exact pixel dimensions, scale by percentage, and lock aspect ratios directly in your browser with client-side privacy.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function ImageResizerPage() {
  return <ImageResizer />;
}
