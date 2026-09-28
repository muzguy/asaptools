import type { Metadata } from 'next';
import { ImagesToPdf } from '@/components/tools/images-to-pdf';

export const metadata: Metadata = {
  title: 'Images to PDF — Convert JPG, PNG & WebP to PDF Online Privately',
  description:
    'Free, fast, and 100% private online Images to PDF converter. Combine JPG, PNG, and WebP images into a single professional PDF with custom paper sizes (A4, Letter, Fit), orientation, and margins directly in your browser.',
  keywords: [
    'images to pdf',
    'jpg to pdf',
    'png to pdf',
    'webp to pdf',
    'photo to pdf',
    'convert pictures to pdf',
    'combine photos into pdf',
    'a4 image to pdf',
    'private image converter',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/images-to-pdf',
  },
  openGraph: {
    title: 'Images to PDF — Convert JPG, PNG & WebP to PDF Online Privately',
    description:
      'Convert JPG, PNG, and WebP images into a clean, professional PDF document directly in your browser. 100% private with custom page sizes and zero server uploads.',
    url: 'https://asaptools.in/tools/images-to-pdf',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — Images to PDF',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Images to PDF — Convert JPG, PNG & WebP to PDF Online Privately',
    description:
      'Combine photos into an organized, professional PDF directly in your browser with complete client-side privacy.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function ImagesToPdfPage() {
  return <ImagesToPdf />;
}
