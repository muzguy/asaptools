import type { Metadata } from 'next';
import { QrCodeGeneratorTool } from '@/components/tools/qr-code-generator';

export const metadata: Metadata = {
  title: 'Free QR Code Generator with Logo, Colors & Vector SVG — ASAPTools',
  description:
    'Generate high-resolution custom QR codes for URLs, Wi-Fi networks, vCards, Email, SMS, Crypto, and more. Customize colors, gradients, center logos, and shapes. 100% free and private browser-side generation with SVG and PNG downloads.',
  keywords: [
    'qr code generator',
    'free qr code generator',
    'qr code with logo',
    'custom qr code generator',
    'wifi qr code generator',
    'vcard qr code generator',
    'vector qr code svg',
    'colored qr code',
    'gradient qr code',
    'high resolution qr code',
    'qr code png download',
    'bitcoin qr code generator',
    'calendar event qr code',
    'client side qr code generator',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/qr-code-generator',
  },
  openGraph: {
    title: 'Free QR Code Generator with Logo, Colors & Vector SVG — ASAPTools',
    description:
      'Generate high-resolution custom QR codes with colors, gradients, center logos, and custom shapes. 100% private in-browser generation with zero tracking or server uploads.',
    url: 'https://asaptools.in/tools/qr-code-generator',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — QR Code Generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free QR Code Generator with Logo, Colors & Vector SVG — ASAPTools',
    description:
      'Generate high-resolution custom QR codes with colors, gradients, center logos, and custom shapes. 100% private in-browser generation.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function QrCodeGeneratorPage() {
  return <QrCodeGeneratorTool />;
}
