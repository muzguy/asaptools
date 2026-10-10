import type { Metadata } from 'next';
import { AIBackgroundRemover } from '@/components/tools/ai-background-remover';

export const metadata: Metadata = {
  title: 'AI Background Remover — Free, Instant & 100% Private | ASAPTools',
  description:
    'Remove image backgrounds instantly and 100% privately in your browser using local AI neural networks. Zero server uploads, interactive split comparison slider, transparent PNG export, and no account required.',
  keywords: [
    'ai background remover',
    'remove background online',
    'free background remover',
    'transparent background',
    'remove bg',
    'client side ai background removal',
    'transparent png generator',
    'photo cutout',
    'isolate subject',
    'private background remover',
    'isnet',
    'webassembly ai',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/ai-background-remover',
  },
  openGraph: {
    title: 'AI Background Remover — Free, Instant & 100% Private | ASAPTools',
    description:
      'Remove image backgrounds 100% privately in your browser using local AI neural networks. Lossless transparent PNG export with zero server uploads.',
    url: 'https://asaptools.in/tools/ai-background-remover',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — AI Background Remover',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Background Remover — Free, Instant & 100% Private | ASAPTools',
    description:
      'Remove image backgrounds 100% privately in your browser using local AI neural networks with zero server uploads.',
    images: ['/branding/asaptools-logo.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'ASAPTools AI Background Remover',
  url: 'https://asaptools.in/tools/ai-background-remover',
  description:
    'Free client-side AI background remover utility for instant, private subject isolation and full-resolution transparent PNG creation.',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires HTML5, WebAssembly, and modern browser support.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Client-side AI background segmentation',
    'Zero server-side image uploads',
    'Full-resolution transparent PNG export',
    'Before/after interactive comparison split slider',
    'Multiple neural network model options (Fast, Balanced, Ultra)',
    'Custom solid color backdrops preview and composite export',
  ],
};

export default function AIBackgroundRemoverPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AIBackgroundRemover />
    </>
  );
}
