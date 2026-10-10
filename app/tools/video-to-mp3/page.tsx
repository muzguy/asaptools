import type { Metadata } from 'next';
import { VideoToMp3Tool } from '@/components/tools/video-to-mp3';

export const metadata: Metadata = {
  title: 'Video to MP3 Converter — Extract Audio from MP4 & WebM Online Free',
  description:
    'Free online Video to MP3 converter. Extract audio tracks from MP4, WebM, MOV, and MKV video files directly into high-fidelity MP3 files with customizable bitrates and 100% client-side privacy.',
  keywords: [
    'video to mp3',
    'extract audio from video',
    'mp4 to mp3',
    'webm to mp3',
    'mov to mp3',
    'video audio extractor',
    'online mp3 converter',
    'lame mp3 encoder',
    'client side video converter',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/video-to-mp3',
  },
  openGraph: {
    title: 'Video to MP3 Converter — Extract Audio from MP4 & WebM Online Free',
    description:
      'Extract pristine audio tracks from MP4, WebM, and other video files into high-fidelity MP3 files with zero server uploads.',
    url: 'https://asaptools.in/tools/video-to-mp3',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — Video to MP3 Converter',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Video to MP3 Converter — Extract Audio from MP4 & WebM Online Free',
    description:
      'Extract pristine audio tracks from MP4, WebM, and other video files into high-fidelity MP3 files with zero server uploads.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function VideoToMp3Page() {
  return <VideoToMp3Tool />;
}
