import type { Metadata } from 'next';
import { ResumeBuilder } from '@/components/tools/resume-builder';

export const metadata: Metadata = {
  title: 'CV / Resume Builder — Free, ATS-Friendly & Print-Ready PDF | ASAPTools',
  description:
    'Free, private, online CV & Resume Builder. Build ATS-friendly resumes for students, freshers, and professionals with live preview, multiple templates, auto-save, and print-ready vector PDF export.',
  keywords: [
    'resume builder',
    'cv builder',
    'curriculum vitae',
    'free resume maker',
    'ats resume builder',
    'student resume template',
    'fresher resume maker',
    'download resume pdf',
    'print resume to pdf',
    'job application cv',
    'private resume builder',
    'ASAPTools',
  ],
  alternates: {
    canonical: 'https://asaptools.in/tools/resume-builder',
  },
  openGraph: {
    title: 'CV / Resume Builder — Free, ATS-Friendly & Print-Ready PDF | ASAPTools',
    description:
      'Build professional, ATS-friendly resumes and CVs with real-time preview, guided sections, and print-ready PDF export. 100% private in your browser.',
    url: 'https://asaptools.in/tools/resume-builder',
    siteName: 'ASAPTools',
    type: 'website',
    images: [
      {
        url: '/branding/asaptools-logo.png',
        width: 1024,
        height: 1024,
        alt: 'ASAPTools — CV / Resume Builder',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CV / Resume Builder — Free, ATS-Friendly & Print-Ready PDF | ASAPTools',
    description:
      'Build professional, ATS-friendly resumes with live preview, guided sections, and print-ready PDF export. 100% private in your browser.',
    images: ['/branding/asaptools-logo.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'ASAPTools CV / Resume Builder',
  url: 'https://asaptools.in/tools/resume-builder',
  description:
    'Free online CV and Resume Builder with live preview, ATS-friendly templates, section reordering, and print-ready PDF export.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires HTML5 and modern browser support.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'ATS Classic student and fresher resume template',
    'Multiple professional design templates and typography styles',
    'Live real-time resume preview',
    'Print-ready vector PDF export with selectable text',
    'Reorderable sections and visibility toggles',
    '100% client-side privacy with LocalStorage auto-save',
    'JSON backup export and import',
  ],
};

export default function ResumeBuilderPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ResumeBuilder />
    </>
  );
}
