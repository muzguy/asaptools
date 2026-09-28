import type { Metadata } from 'next';
import { PdfCompressor } from '@/components/tools/pdf-compressor';

export const metadata: Metadata = {
  title: 'PDF Compressor — Reduce PDF File Size Online Privately',
  description:
    'Free, fast, and 100% private online PDF compressor. Reduce PDF file sizes with balanced downsampling, lossless metadata stripping, or aggressive compression. Zero server uploads.',
  keywords: [
    'pdf compressor',
    'compress pdf online',
    'reduce pdf file size',
    'shrink pdf',
    'lossless pdf compression',
    'private pdf compressor',
    'client side pdf compression',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/pdf-compressor',
  },
  openGraph: {
    title: 'PDF Compressor — Reduce PDF File Size Online Privately',
    description:
      'Reduce PDF file size directly in your browser. Choose between lossless structural cleanup, balanced visual optimization, or maximum size reduction with zero server uploads.',
    url: 'https://asaptools.in/tools/pdf-compressor',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — PDF Compressor',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF Compressor — Reduce PDF File Size Online Privately',
    description:
      'Reduce PDF file size directly in your browser with zero document uploads. 100% private client-side processing.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function PdfCompressorPage() {
  return <PdfCompressor />;
}
