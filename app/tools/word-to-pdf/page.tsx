import type { Metadata } from 'next';
import { WordToPdf } from '@/components/tools/word-to-pdf';

export const metadata: Metadata = {
  title: 'Word to PDF Converter — Convert DOCX & DOC to PDF Online',
  description:
    'Free, fast, and high-fidelity Word to PDF converter. Convert Microsoft Word documents (.docx, .doc) to professional PDF files preserving fonts, margins, tables, and page layout.',
  keywords: [
    'word to pdf',
    'convert docx to pdf',
    'docx to pdf',
    'doc to pdf',
    'convert word to pdf online',
    'word to pdf converter',
    'office to pdf',
    'microsoft word to pdf',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/word-to-pdf',
  },
  openGraph: {
    title: 'Word to PDF Converter — Convert DOCX & DOC to PDF Online',
    description:
      'Convert Microsoft Word documents (.docx, .doc) to professional PDF files with 100% layout fidelity, preserving fonts, tables, and margins.',
    url: 'https://asaptools.in/tools/word-to-pdf',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — Word to PDF',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word to PDF Converter — Convert DOCX & DOC to PDF Online',
    description:
      'Convert Microsoft Word documents (.docx, .doc) to crisp vector PDF files with zero layout loss.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function WordToPdfPage() {
  return <WordToPdf />;
}
