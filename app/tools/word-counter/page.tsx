import type { Metadata } from 'next';
import { WordCounter } from '@/components/tools/word-counter';

export const metadata: Metadata = {
  title: 'Word & Character Counter — Real-Time Text Statistics',
  description:
    'Free, fast, and private online Word & Character Counter. Count words, characters with/without spaces, sentences, paragraphs, and reading time instantly in your browser.',
  keywords: [
    'word counter',
    'character counter',
    'word count tool',
    'character count without spaces',
    'sentence counter',
    'paragraph counter',
    'reading time calculator',
    'online word counter',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/word-counter',
  },
  openGraph: {
    title: 'Word & Character Counter — Real-Time Text Statistics',
    description:
      'Count words, characters, sentences, paragraphs, and reading time instantly. 100% private and processed locally in your browser.',
    url: 'https://asaptools.in/tools/word-counter',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — Word & Character Counter',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word & Character Counter — Real-Time Text Statistics',
    description:
      'Count words, characters, sentences, paragraphs, and reading time instantly with client-side privacy.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function WordCounterPage() {
  return <WordCounter />;
}
