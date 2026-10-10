import type { Metadata } from 'next';
import { VoiceStudio } from '@/components/tools/voice-studio';

export const metadata: Metadata = {
  title: 'Voice Studio — Text to Speech, Audio Transcription & Subtitles | ASAPTools',
  description:
    'Free, private, in-browser Voice Studio. Convert text to speech with natural voices, transcribe audio/video, generate SRT and WebVTT subtitles, and translate voice scripts with 100% client-side privacy.',
  keywords: [
    'voice studio',
    'text to speech',
    'tts',
    'audio to text',
    'video to text',
    'speech to text',
    'transcribe audio',
    'srt generator',
    'subtitles generator',
    'webvtt generator',
    'speech synthesizer',
    'free text to speech',
    'voiceover maker',
    'audio translation',
    'dubbing tool',
    'private voice studio',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/voice-studio',
  },
  openGraph: {
    title: 'Voice Studio — Text to Speech, Audio Transcription & Subtitles | ASAPTools',
    description:
      'All-in-one private audio studio: Text-to-Speech synthesizer, Audio/Video Transcription with SRT subtitle export, and Multi-language Translation Dubbing. 100% in-browser.',
    url: 'https://asaptools.in/tools/voice-studio',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — Voice Studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voice Studio — Text to Speech, Audio Transcription & Subtitles | ASAPTools',
    description:
      'Private in-browser Voice Studio: Text to speech, transcription, SRT subtitles, and translation dubbing.',
    images: ['/branding/asaptools-logo.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'ASAPTools Voice Studio',
  url: 'https://asaptools.in/tools/voice-studio',
  description:
    'Free online Voice Studio with client-side Text-to-Speech synthesis, Audio/Video Transcription with SRT subtitles, and Translation Dubbing.',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires modern browser with Web Speech API and HTML5 Audio support.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function VoiceStudioPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <VoiceStudio />
    </>
  );
}
