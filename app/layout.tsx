import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ThemeProvider } from '@/components/theme/theme-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://asaptools.in'),
  title: {
    default: 'ASAPTools — Fast, Modern Digital Utilities',
    template: '%s | ASAPTools',
  },
  description:
    'Everyday digital tools built for speed, simplicity, and privacy. Format data, convert files, edit PDFs, and calculate metrics without clutter or friction.',
  keywords: [
    'developer tools',
    'JSON formatter',
    'Base64 encoder',
    'PDF tools',
    'image compressor',
    'word counter',
    'percentage calculator',
    'online utilities',
    'fast web tools',
  ],
  authors: [{ name: 'ASAPTools' }],
  creator: 'ASAPTools',
  icons: {
    icon: '/branding/asaptools-icon.png',
    shortcut: '/branding/asaptools-icon.png',
    apple: '/branding/asaptools-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://asaptools.in',
    siteName: 'ASAPTools',
    title: 'ASAPTools — Fast, Modern Digital Utilities',
    description:
      'Fast, modern digital utilities for everyday workflows. Format data, convert files, edit PDFs, and calculate metrics without clutter or friction.',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — Everyday digital tools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ASAPTools — Fast, Modern Digital Utilities',
    description:
      'Fast, modern digital utilities for everyday workflows. Format data, convert files, edit PDFs, and calculate metrics without clutter.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('asaptools-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1 w-full overflow-x-clip">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
