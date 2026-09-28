import type { Metadata } from 'next';
import { PdfToImages } from '@/components/tools/pdf-to-images';

export const metadata: Metadata = {
  title: 'PDF to Images — Extract PNG or JPG Pages Online Privately',
  description:
    'Free, fast, and 100% private online PDF to Images converter. Extract pages from your PDF as high-resolution PNG or JPG images with individual downloads and 1-click ZIP archive packaging.',
  keywords: [
    'pdf to images',
    'pdf to png',
    'pdf to jpg',
    'convert pdf to image',
    'extract pdf pages as images',
    'high resolution pdf to png',
    'download pdf pages zip',
    'private pdf converter',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/pdf-to-images',
  },
  openGraph: {
    title: 'PDF to Images — Extract PNG or JPG Pages Online Privately',
    description:
      'Extract pages from your PDF as high-resolution PNG or JPG images directly in your browser. 100% private, client-side execution with zero document uploads.',
    url: 'https://asaptools.in/tools/pdf-to-images',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — PDF to Images',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF to Images — Extract PNG or JPG Pages Online Privately',
    description:
      'Extract pages from your PDF as high-resolution PNG or JPG images directly in your browser. Zero server uploads, 100% private.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function PdfToImagesPage() {
  return <PdfToImages />;
}
