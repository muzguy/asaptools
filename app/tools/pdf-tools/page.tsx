import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PdfTools } from '@/components/tools/pdf-tools';

export const metadata: Metadata = {
  title: 'PDF Merge & Split — Combine or Extract PDF Pages Online Privately',
  description:
    'Free, fast, and 100% private online PDF tool. Merge multiple PDF files into one, reorder pages, or split and extract custom page ranges (e.g. 1-3, 5, 8-10) directly in your browser.',
  keywords: [
    'pdf merge',
    'merge pdf',
    'split pdf',
    'pdf splitter',
    'combine pdf',
    'extract pdf pages',
    'reorder pdf',
    'private pdf tools',
    'browser pdf merge',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/pdf-tools',
  },
  openGraph: {
    title: 'PDF Merge & Split — Combine or Extract PDF Pages Online Privately',
    description:
      'Combine multiple PDF files into one clean document or extract custom page ranges directly in your browser. 100% private, client-side execution with zero document uploads.',
    url: 'https://asaptools.in/tools/pdf-tools',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — PDF Merge & Split',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF Merge & Split — Combine or Extract PDF Pages Online Privately',
    description:
      'Merge multiple PDF documents or split pages with custom ranges directly in your browser. Zero server uploads, 100% private.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function PdfToolsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-5xl mx-auto px-4 py-16 text-center text-muted-foreground">
          <p className="text-sm">Loading PDF Tools...</p>
        </div>
      }
    >
      <PdfTools />
    </Suspense>
  );
}
