import type { Metadata } from 'next';
import { AudioConverterTool } from '@/components/tools/audio-converter';

export const metadata: Metadata = {
  title: 'Audio Converter — Convert MP3, WAV, AAC, OGG & FLAC Online Free',
  description:
    'Free online audio format converter. Convert audio between MP3, WAV, AAC/M4A, OGG, and FLAC with real WebAssembly decoding, customizable bitrates, sample rates, and zero server uploads.',
  keywords: [
    'audio converter',
    'convert audio online',
    'mp3 to wav',
    'wav to mp3',
    'flac to mp3',
    'm4a to mp3',
    'ogg to mp3',
    'lossless audio converter',
    'client side audio converter',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/audio-converter',
  },
  openGraph: {
    title: 'Audio Converter — Convert MP3, WAV, AAC, OGG & FLAC Online Free',
    description:
      'Convert audio between MP3, WAV, AAC/M4A, OGG, and FLAC formats with custom bitrates and studio quality. 100% private and client-side.',
    url: 'https://asaptools.in/tools/audio-converter',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — Audio Format Converter',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Audio Converter — Convert MP3, WAV, AAC, OGG & FLAC Online Free',
    description:
      'Convert audio between MP3, WAV, AAC/M4A, OGG, and FLAC formats with custom bitrates and studio quality. 100% private and client-side.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function AudioConverterPage() {
  return <AudioConverterTool />;
}
