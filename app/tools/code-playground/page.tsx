import type { Metadata } from 'next';
import { CodePlayground } from '@/components/tools/code-playground/code-playground';

export const metadata: Metadata = {
  title: 'ASAPTools CodeLab — Online C, C++ & Python 3 Compiler & IDE',
  description:
    'Free online code playground. Run Python 3 live in your browser via WebAssembly with custom stdin, real output, execution time, and zero API keys.',
  keywords: [
    'code playground',
    'online compiler',
    'c compiler online',
    'cpp compiler online',
    'c++ online compiler',
    'python online compiler',
    'codelab',
    'run code online',
    'online ide',
    'developer tools',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/code-playground',
  },
  openGraph: {
    title: 'ASAPTools CodeLab — Online C, C++ & Python 3 Compiler & IDE',
    description:
      'Free online code playground and compiler for C, C++, and Python 3. Write, compile, test with stdin, and execute code in a secure cloud sandbox.',
    url: 'https://asaptools.in/tools/code-playground',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools CodeLab — Online C, C++ & Python 3 Compiler',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ASAPTools CodeLab — Online C, C++ & Python 3 Compiler & IDE',
    description:
      'Free online code playground and compiler for C, C++, and Python 3. Write, compile, test with stdin, and execute code in a secure cloud sandbox.',
    images: ['/branding/asaptools-logo.png'],
  },
};

export default function CodePlaygroundPage() {
  return <CodePlayground />;
}
