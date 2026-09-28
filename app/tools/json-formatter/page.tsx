import type { Metadata } from 'next';
import { JsonFormatter } from '@/components/tools/json-formatter';

export const metadata: Metadata = {
  title: 'JSON Formatter & Validator — Prettify, Validate & Minify JSON',
  description:
    'Free, fast, and secure online JSON Formatter and Validator. Prettify messy JSON, detect syntax errors with line numbers, minify, and copy output locally in your browser.',
  keywords: [
    'JSON formatter',
    'JSON validator',
    'prettify JSON',
    'beautify JSON',
    'minify JSON',
    'JSON linter',
    'online JSON editor',
    'developer tools',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/json-formatter',
  },
  openGraph: {
    title: 'JSON Formatter & Validator — Prettify, Validate & Minify JSON',
    description:
      'Free, fast, and secure online JSON Formatter and Validator. Prettify messy JSON, detect syntax errors with line numbers, and minify directly in your browser.',
    url: 'https://asaptools.in/tools/json-formatter',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — JSON Formatter & Validator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JSON Formatter & Validator — Prettify, Validate & Minify JSON',
    description:
      'Format, validate, beautify, and minify JSON data instantly with client-side privacy.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function JsonFormatterPage() {
  return <JsonFormatter />;
}
