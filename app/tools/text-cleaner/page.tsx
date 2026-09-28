import type { Metadata } from 'next';
import { TextCleaner } from '@/components/tools/text-cleaner';

export const metadata: Metadata = {
  title: 'Text Cleaner — Trim Whitespace, Empty Lines & Spaces',
  description:
    'Clean messy text online. Trim leading/trailing whitespace, remove extra spaces within lines, and normalize empty lines instantly in your browser. Free and private.',
  keywords: [
    'text cleaner',
    'trim whitespace',
    'remove extra spaces',
    'remove empty lines',
    'normalize blank lines',
    'clean text online',
    'whitespace remover',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/text-cleaner',
  },
  openGraph: {
    title: 'Text Cleaner — Trim Whitespace, Empty Lines & Spaces',
    description:
      'Clean messy text online with customizable whitespace and line-trimming rules. 100% private and client-side.',
    url: 'https://asaptools.in/tools/text-cleaner',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — Text Cleaner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Text Cleaner — Trim Whitespace, Empty Lines & Spaces',
    description:
      'Clean messy text online with customizable whitespace and line-trimming rules with client-side privacy.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function TextCleanerPage() {
  return <TextCleaner />;
}
