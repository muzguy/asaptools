import type { Metadata } from 'next';
import { CaseConverter } from '@/components/tools/case-converter';

export const metadata: Metadata = {
  title: 'Case Converter — UPPERCASE, lowercase, Title Case, camelCase & More',
  description:
    'Convert text to UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, and kebab-case instantly in your browser. Free, fast, and secure.',
  keywords: [
    'case converter',
    'uppercase converter',
    'lowercase converter',
    'title case converter',
    'sentence case',
    'camelcase generator',
    'pascalcase converter',
    'snake_case converter',
    'kebab-case converter',
    'text case tool',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/case-converter',
  },
  openGraph: {
    title: 'Case Converter — UPPERCASE, lowercase, Title Case & More',
    description:
      'Instantly convert text to 8 different casing conventions in your browser with 100% client-side privacy.',
    url: 'https://asaptools.in/tools/case-converter',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — Case Converter',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Case Converter — UPPERCASE, lowercase, Title Case & More',
    description:
      'Convert text between uppercase, lowercase, title case, camelCase, snake_case and more with client-side privacy.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function CaseConverterPage() {
  return <CaseConverter />;
}
