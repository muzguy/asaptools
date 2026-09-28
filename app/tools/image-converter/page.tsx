import type { Metadata } from 'next';
import { ImageConverter } from '@/components/tools/image-converter';

export const metadata: Metadata = {
  title: 'Image Converter — Convert PNG, JPEG & WebP Online with Transparency Control',
  description:
    'Free, fast, and private online Image Converter. Convert images between PNG, JPEG/JPG, and WebP directly in your browser with real MIME verification, smart transparency handling, and instant download.',
  keywords: [
    'image converter',
    'convert image online',
    'png to jpg',
    'jpg to png',
    'png to webp',
    'webp to png',
    'jpeg to webp',
    'convert image format',
    'transparent png to jpg',
    'browser image conversion',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/image-converter',
  },
  openGraph: {
    title: 'Image Converter — Convert PNG, JPEG & WebP Online with Transparency Control',
    description:
      'Convert images between PNG, JPEG, and WebP directly in your browser with real MIME verification and smart transparency handling. 100% private and client-side.',
    url: 'https://asaptools.in/tools/image-converter',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — Image Converter',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Image Converter — Convert PNG, JPEG & WebP Online with Transparency Control',
    description:
      'Convert images between PNG, JPEG, and WebP directly in your browser with real MIME verification and smart transparency handling. 100% private and client-side.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function ImageConverterPage() {
  return <ImageConverter />;
}
