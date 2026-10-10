import type { Metadata } from 'next';
import { GifToMp4Tool } from '@/components/tools/gif-to-mp4';

export const metadata: Metadata = {
  title: 'GIF ↔ MP4 Converter — Convert GIF to MP4 & MP4 to GIF Online Free',
  description:
    'Free online two-way media converter. Convert animated GIFs to MP4 videos or convert MP4 videos to high-quality animated GIFs with custom palette generation, trimming, and 100% browser-side privacy.',
  keywords: [
    'gif to mp4',
    'mp4 to gif',
    'convert gif to mp4',
    'convert mp4 to gif',
    'video to gif',
    'animated gif to video',
    'gif converter',
    'mp4 to animated gif',
    'reduce gif size',
    'browser video converter',
    'client side gif converter',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/gif-to-mp4',
  },
  openGraph: {
    title: 'GIF ↔ MP4 Converter — Convert GIF to MP4 & MP4 to GIF Online Free',
    description:
      'Convert animated GIFs to MP4 videos or MP4 videos to GIFs directly in your browser with palette generation, trimming, and transparency controls. 100% private and client-side.',
    url: 'https://asaptools.in/tools/gif-to-mp4',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — GIF ↔ MP4 Converter',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GIF ↔ MP4 Converter — Convert GIF to MP4 & MP4 to GIF Online Free',
    description:
      'Convert animated GIFs to MP4 videos or MP4 videos to GIFs directly in your browser with palette generation, trimming, and transparency controls. 100% private and client-side.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function GifToMp4Page() {
  return <GifToMp4Tool />;
}
