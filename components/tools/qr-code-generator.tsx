'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import QRCodeStyling, {
  DotType,
  CornerSquareType,
  CornerDotType,
  ErrorCorrectionLevel,
  Options as QRCodeOptions,
} from 'qr-code-styling';
import {
  QrContentType,
  QrContentValues,
  WifiEncryption,
  formatQrPayload,
  getContrastAdvisory,
  isValidBitcoinAddress,
} from '@/lib/qr-code-utils';
import {
  QrCodeIcon,
  DownloadIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RotateCcwIcon,
  ShieldIcon,
  ZapIcon,
  InfoIcon,
  UploadIcon,
  TrashIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

// Built-in logo presets (vector SVG data URIs)
const LOGO_PRESETS = [
  {
    id: 'asaptools',
    name: 'ASAPTools',
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23ea580c'/%3E%3Cpath d='M50 15 L25 55 L45 55 L35 85 L75 45 L55 45 Z' fill='white'/%3E%3C/svg%3E",
  },
  {
    id: 'globe',
    name: 'Web / URL',
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ea580c' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10' fill='white'/%3E%3Cline x1='2' y1='12' x2='22' y2='12'/%3E%3Cpath d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/%3E%3C/svg%3E",
  },
  {
    id: 'wifi',
    name: 'Wi-Fi',
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ea580c' stroke-width='2'%3E%3Crect width='24' height='24' rx='6' fill='white'/%3E%3Cpath d='M5 12.55a11 11 0 0 1 14.08 0'/%3E%3Cpath d='M1.42 9a16 16 0 0 1 21.16 0'/%3E%3Cpath d='M8.53 16.11a6 6 0 0 1 6.95 0'/%3E%3Cline x1='12' y1='20' x2='12.01' y2='20'/%3E%3C/svg%3E",
  },
  {
    id: 'mail',
    name: 'Email',
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ea580c' stroke-width='2'%3E%3Crect width='24' height='24' rx='6' fill='white'/%3E%3Crect width='20' height='16' x='2' y='4' rx='2'/%3E%3Cpath d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'/%3E%3C/svg%3E",
  },
  {
    id: 'phone',
    name: 'Phone',
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ea580c' stroke-width='2'%3E%3Crect width='24' height='24' rx='6' fill='white'/%3E%3Cpath d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'/%3E%3C/svg%3E",
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10' fill='white'/%3E%3Cpath d='M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c3.938.694 4.912-4.819.974-5.513m-.974 5.513-5.907-1.041m5.907 1.041L12.56 5.86'/%3E%3C/svg%3E",
  },
];

const CONTENT_TYPES: { id: QrContentType; label: string; desc: string }[] = [
  { id: 'url', label: 'URL / Link', desc: 'Website address or web link' },
  { id: 'text', label: 'Plain Text', desc: 'Any plain text or message' },
  { id: 'email', label: 'Email', desc: 'Direct mailto message' },
  { id: 'phone', label: 'Phone', desc: 'Direct dial telephone number' },
  { id: 'sms', label: 'SMS', desc: 'Pre-filled text message' },
  { id: 'wifi', label: 'Wi-Fi', desc: 'Network name and credentials' },
  { id: 'vcard', label: 'Contact Card', desc: 'vCard 3.0 digital business card' },
  { id: 'geo', label: 'Location', desc: 'GPS latitude and longitude' },
  { id: 'event', label: 'Calendar Event', desc: 'iCalendar meeting or event' },
  { id: 'bitcoin', label: 'Bitcoin', desc: 'BIP21 cryptocurrency address' },
];

export function QrCodeGeneratorTool() {
  // Content States
  const [contentType, setContentType] = useState<QrContentType>('url');
  const [contentValues, setContentValues] = useState<QrContentValues>({
    url: 'https://asaptools.in',
    text: 'Hello from ASAPTools!',
    email: { email: 'contact@asaptools.in', subject: 'Inquiry', body: '' },
    phone: '+1 234 567 8900',
    sms: { phone: '+1 234 567 8900', message: 'Hi there!' },
    wifi: { ssid: 'Office-Guest', password: 'password123', encryption: 'WPA', hidden: false },
    vcard: {
      firstName: 'Alex',
      lastName: 'Morgan',
      organization: 'Tech Innovations',
      title: 'Product Lead',
      phone: '+1 555-0199',
      email: 'alex@example.com',
      website: 'https://asaptools.in',
    },
    geo: { latitude: '37.7749', longitude: '-122.4194', query: 'San Francisco, CA' },
    event: {
      title: 'Quarterly Sync',
      startDate: '2026-11-01T10:00',
      endDate: '2026-11-01T11:00',
      location: 'Conference Hall A',
      description: 'Quarterly roadmap planning session',
    },
    bitcoin: { address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', amount: '0.005', label: 'ASAPTools Tip' },
  });

  // Accordion Sections (QRCode Monkey style)
  const [openSection, setOpenSection] = useState<'content' | 'colors' | 'logo' | 'design'>('content');

  // Colors & Gradients
  const [useGradient, setUseGradient] = useState<boolean>(false);
  const [fgColor, setFgColor] = useState<string>('#000000');
  const [fgGradientEnd, setFgGradientEnd] = useState<string>('#ea580c');
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [gradientRotation, setGradientRotation] = useState<number>(0);
  const [bgColor, setBgColor] = useState<string>('#ffffff');

  // Eye Custom Colors
  const [customEyeColor, setCustomEyeColor] = useState<boolean>(false);
  const [eyeFrameColor, setEyeFrameColor] = useState<string>('#000000');
  const [eyeBallColor, setEyeBallColor] = useState<string>('#ea580c');

  // Logo / Image
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(0.25);
  const [hideBackgroundDots, setHideBackgroundDots] = useState<boolean>(true);

  // Design Shapes
  const [dotType, setDotType] = useState<DotType>('rounded');
  const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>('extra-rounded');
  const [cornerDotType, setCornerDotType] = useState<CornerDotType>('dot');
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<ErrorCorrectionLevel>('M');

  // Derived error correction level (High is automatically enforced when center logo is present)
  const effectiveErrorCorrectionLevel: ErrorCorrectionLevel = logoImage ? 'H' : errorCorrectionLevel;

  // Export & Download
  const [downloadSize, setDownloadSize] = useState<number>(1000);
  const [customFilename, setCustomFilename] = useState<string>('');
  const [copiedBadge, setCopiedBadge] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Refs
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const qrInstanceRef = useRef<QRCodeStyling | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Build current QRCodeStyling options
  const getStylingOptions = useCallback(
    (targetWidth = 280, targetHeight = 280): QRCodeOptions => {
      const payload = formatQrPayload(contentType, contentValues);

      const dotsOptions: QRCodeOptions['dotsOptions'] = {
        type: dotType,
        color: fgColor,
      };

      if (useGradient) {
        dotsOptions.gradient = {
          type: gradientType,
          rotation: (gradientRotation * Math.PI) / 180,
          colorStops: [
            { offset: 0, color: fgColor },
            { offset: 1, color: fgGradientEnd },
          ],
        };
      }

      const cornersSquareOptions: QRCodeOptions['cornersSquareOptions'] = {
        type: cornerSquareType,
        color: customEyeColor ? eyeFrameColor : fgColor,
      };

      const cornersDotOptions: QRCodeOptions['cornersDotOptions'] = {
        type: cornerDotType,
        color: customEyeColor ? eyeBallColor : fgColor,
      };

      return {
        width: targetWidth,
        height: targetHeight,
        data: payload,
        margin: 10,
        qrOptions: {
          errorCorrectionLevel: effectiveErrorCorrectionLevel,
        },
        image: logoImage || undefined,
        imageOptions: {
          imageSize: logoSize,
          margin: 4,
          hideBackgroundDots,
          crossOrigin: 'anonymous',
        },
        dotsOptions,
        cornersSquareOptions,
        cornersDotOptions,
        backgroundOptions: {
          color: bgColor,
        },
      };
    },
    [
      contentType,
      contentValues,
      dotType,
      cornerSquareType,
      cornerDotType,
      effectiveErrorCorrectionLevel,
      fgColor,
      useGradient,
      gradientType,
      gradientRotation,
      fgGradientEnd,
      customEyeColor,
      eyeFrameColor,
      eyeBallColor,
      bgColor,
      logoImage,
      logoSize,
      hideBackgroundDots,
    ]
  );

  // Initialize or update QR Code instance
  useEffect(() => {
    const opts = getStylingOptions(280, 280);

    if (!qrInstanceRef.current) {
      const qr = new QRCodeStyling(opts);
      qrInstanceRef.current = qr;
      if (previewContainerRef.current) {
        previewContainerRef.current.innerHTML = '';
        qr.append(previewContainerRef.current);
      }
    } else {
      qrInstanceRef.current.update(opts);
    }
  }, [getStylingOptions]);

  // Handle Logo file upload
  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, or WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file size exceeds 5 MB. Please select a smaller logo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setLogoImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    setFgColor('#000000');
    setBgColor('#ffffff');
    setUseGradient(false);
    setCustomEyeColor(false);
    setLogoImage(null);
    setDotType('rounded');
    setCornerSquareType('extra-rounded');
    setCornerDotType('dot');
    setErrorCorrectionLevel('M');
    setLogoSize(0.25);
    setHideBackgroundDots(true);
  };

  // Download handler supporting custom dimensions
  const handleDownload = async (ext: 'png' | 'svg' | 'jpeg') => {
    setIsExporting(true);
    try {
      const exportOptions = getStylingOptions(downloadSize, downloadSize);
      const exportQr = new QRCodeStyling(exportOptions);

      const baseName =
        customFilename.trim() || `asaptools-qrcode-${contentType}-${Date.now()}`;

      await exportQr.download({
        name: baseName,
        extension: ext,
      });
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy PNG image to clipboard
  const handleCopyToClipboard = async () => {
    try {
      const exportOptions = getStylingOptions(1000, 1000);
      const exportQr = new QRCodeStyling(exportOptions);
      const blob = await exportQr.getRawData('png');

      if (blob instanceof Blob && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopiedBadge(true);
        setTimeout(() => setCopiedBadge(false), 2500);
      } else {
        alert('Clipboard copy is not supported in this browser. Please use the Download button.');
      }
    } catch (err) {
      console.error('Clipboard copy error:', err);
    }
  };

  // Contrast check
  const contrast = getContrastAdvisory(fgColor, bgColor);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold">
          <QrCodeIcon size={14} />
          <span>Vector-Sharp SVG & Ultra-HD PNG</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          QR Code Generator
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          Create free, high-resolution custom QR codes with colors, gradients, center logos, and custom shapes.
          100% private in-browser generation with zero server uploads.
        </p>
      </div>

      {/* Main Two-Column Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Content Type & Customization Accordions */}
        <div className="lg:col-span-7 space-y-4">
          {/* Content Type Pill Bar */}
          <div className="p-3 rounded-2xl border border-border bg-card shadow-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 px-1">
              Select QR Type
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CONTENT_TYPES.map((type) => {
                const isSelected = contentType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setContentType(type.id);
                      setOpenSection('content');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-600 text-white shadow-sm scale-[1.02]'
                        : 'bg-zinc-100 dark:bg-zinc-800/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACCORDION 1: ENTER CONTENT */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'content' ? 'colors' : 'content')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Enter Content</h3>
                  <p className="text-xs text-muted-foreground">
                    {CONTENT_TYPES.find((c) => c.id === contentType)?.desc}
                  </p>
                </div>
              </div>
              <span className="text-muted-foreground text-xs font-bold">
                {openSection === 'content' ? '−' : '+'}
              </span>
            </button>

            {openSection === 'content' && (
              <div className="p-5 pt-1 border-t border-border space-y-4">
                {/* 1. URL */}
                {contentType === 'url' && (
                  <div className="space-y-1.5">
                    <label htmlFor="qr-url-input" className="text-xs font-semibold text-foreground">
                      Website URL
                    </label>
                    <input
                      id="qr-url-input"
                      type="url"
                      placeholder="https://yourwebsite.com"
                      value={contentValues.url || ''}
                      onChange={(e) => setContentValues({ ...contentValues, url: e.target.value })}
                      className="w-full text-xs rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Protocols like <code>https://</code> will be added automatically if omitted.
                    </p>
                  </div>
                )}

                {/* 2. TEXT */}
                {contentType === 'text' && (
                  <div className="space-y-1.5">
                    <label htmlFor="qr-text-input" className="text-xs font-semibold text-foreground">
                      Plain Text Message
                    </label>
                    <textarea
                      id="qr-text-input"
                      rows={4}
                      placeholder="Type or paste any text or code here..."
                      value={contentValues.text || ''}
                      onChange={(e) => setContentValues({ ...contentValues, text: e.target.value })}
                      className="w-full text-xs rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y"
                    />
                  </div>
                )}

                {/* 3. EMAIL */}
                {contentType === 'email' && (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="qr-email-addr" className="text-xs font-semibold text-foreground block mb-1">
                        Recipient Email Address
                      </label>
                      <input
                        id="qr-email-addr"
                        type="email"
                        placeholder="recipient@example.com"
                        value={contentValues.email?.email || ''}
                        onChange={(e) =>
                          setContentValues({
                            ...contentValues,
                            email: { ...(contentValues.email || { email: '' }), email: e.target.value },
                          })
                        }
                        className="w-full text-xs rounded-xl border border-border bg-background px-3.5 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="qr-email-subj" className="text-xs font-semibold text-foreground block mb-1">
                          Subject Line (Optional)
                        </label>
                        <input
                          id="qr-email-subj"
                          type="text"
                          placeholder="Quick Inquiry"
                          value={contentValues.email?.subject || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              email: { ...(contentValues.email || { email: '' }), subject: e.target.value },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3.5 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="qr-email-body" className="text-xs font-semibold text-foreground block mb-1">
                          Body Message (Optional)
                        </label>
                        <input
                          id="qr-email-body"
                          type="text"
                          placeholder="Hello, I'd like to get in touch..."
                          value={contentValues.email?.body || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              email: { ...(contentValues.email || { email: '' }), body: e.target.value },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3.5 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. PHONE */}
                {contentType === 'phone' && (
                  <div className="space-y-1.5">
                    <label htmlFor="qr-phone-input" className="text-xs font-semibold text-foreground">
                      Phone Number (with Country Code)
                    </label>
                    <input
                      id="qr-phone-input"
                      type="tel"
                      placeholder="+1 (555) 019-2834"
                      value={contentValues.phone || ''}
                      onChange={(e) => setContentValues({ ...contentValues, phone: e.target.value })}
                      className="w-full text-xs rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}

                {/* 5. SMS */}
                {contentType === 'sms' && (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="qr-sms-phone" className="text-xs font-semibold text-foreground block mb-1">
                        Phone Number
                      </label>
                      <input
                        id="qr-sms-phone"
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={contentValues.sms?.phone || ''}
                        onChange={(e) =>
                          setContentValues({
                            ...contentValues,
                            sms: { ...(contentValues.sms || { phone: '' }), phone: e.target.value },
                          })
                        }
                        className="w-full text-xs rounded-xl border border-border bg-background px-3.5 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="qr-sms-msg" className="text-xs font-semibold text-foreground block mb-1">
                        Pre-filled Text Message
                      </label>
                      <textarea
                        id="qr-sms-msg"
                        rows={2}
                        placeholder="I'm interested in your services..."
                        value={contentValues.sms?.message || ''}
                        onChange={(e) =>
                          setContentValues({
                            ...contentValues,
                            sms: { ...(contentValues.sms || { phone: '' }), message: e.target.value },
                          })
                        }
                        className="w-full text-xs rounded-xl border border-border bg-background px-3.5 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                )}

                {/* 6. WI-FI */}
                {contentType === 'wifi' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="qr-wifi-ssid" className="text-xs font-semibold text-foreground block mb-1">
                          Network SSID (Name)
                        </label>
                        <input
                          id="qr-wifi-ssid"
                          type="text"
                          placeholder="Home_WiFi_5G"
                          value={contentValues.wifi?.ssid || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              wifi: {
                                ...(contentValues.wifi || { ssid: '', encryption: 'WPA' }),
                                ssid: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3.5 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="qr-wifi-enc" className="text-xs font-semibold text-foreground block mb-1">
                          Encryption Type
                        </label>
                        <select
                          id="qr-wifi-enc"
                          value={contentValues.wifi?.encryption || 'WPA'}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              wifi: {
                                ...(contentValues.wifi || { ssid: '', encryption: 'WPA' }),
                                encryption: e.target.value as WifiEncryption,
                              },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="WPA">WPA / WPA2 / WPA3 (Recommended)</option>
                          <option value="WEP">WEP (Legacy)</option>
                          <option value="nopass">No Password (Open Network)</option>
                        </select>
                      </div>
                    </div>

                    {contentValues.wifi?.encryption !== 'nopass' && (
                      <div>
                        <label htmlFor="qr-wifi-pass" className="text-xs font-semibold text-foreground block mb-1">
                          Network Password
                        </label>
                        <input
                          id="qr-wifi-pass"
                          type="text"
                          placeholder="SecretPassword123"
                          value={contentValues.wifi?.password || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              wifi: {
                                ...(contentValues.wifi || { ssid: '', encryption: 'WPA' }),
                                password: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3.5 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="wifi-hidden"
                        checked={Boolean(contentValues.wifi?.hidden)}
                        onChange={(e) =>
                          setContentValues({
                            ...contentValues,
                            wifi: {
                              ...(contentValues.wifi || { ssid: '', encryption: 'WPA' }),
                              hidden: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
                      />
                      <label htmlFor="wifi-hidden" className="text-xs text-muted-foreground cursor-pointer">
                        Hidden Network (SSID broadcast disabled)
                      </label>
                    </div>
                  </div>
                )}

                {/* 7. VCARD */}
                {contentType === 'vcard' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="qr-vc-fn" className="text-xs font-semibold text-foreground block mb-1">
                          First Name
                        </label>
                        <input
                          id="qr-vc-fn"
                          type="text"
                          placeholder="Sarah"
                          value={contentValues.vcard?.firstName || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              vcard: { ...(contentValues.vcard || { firstName: '' }), firstName: e.target.value },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                        />
                      </div>
                      <div>
                        <label htmlFor="qr-vc-ln" className="text-xs font-semibold text-foreground block mb-1">
                          Last Name
                        </label>
                        <input
                          id="qr-vc-ln"
                          type="text"
                          placeholder="Connor"
                          value={contentValues.vcard?.lastName || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              vcard: { ...(contentValues.vcard || { firstName: '' }), lastName: e.target.value },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="qr-vc-phone" className="text-xs font-semibold text-foreground block mb-1">
                          Phone Number
                        </label>
                        <input
                          id="qr-vc-phone"
                          type="tel"
                          placeholder="+1 555-0199"
                          value={contentValues.vcard?.phone || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              vcard: { ...(contentValues.vcard || { firstName: '' }), phone: e.target.value },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                        />
                      </div>
                      <div>
                        <label htmlFor="qr-vc-email" className="text-xs font-semibold text-foreground block mb-1">
                          Email
                        </label>
                        <input
                          id="qr-vc-email"
                          type="email"
                          placeholder="sarah@company.com"
                          value={contentValues.vcard?.email || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              vcard: { ...(contentValues.vcard || { firstName: '' }), email: e.target.value },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="qr-vc-org" className="text-xs font-semibold text-foreground block mb-1">
                          Company / Org
                        </label>
                        <input
                          id="qr-vc-org"
                          type="text"
                          placeholder="Acme Corp"
                          value={contentValues.vcard?.organization || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              vcard: { ...(contentValues.vcard || { firstName: '' }), organization: e.target.value },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                        />
                      </div>
                      <div>
                        <label htmlFor="qr-vc-web" className="text-xs font-semibold text-foreground block mb-1">
                          Website
                        </label>
                        <input
                          id="qr-vc-web"
                          type="url"
                          placeholder="https://company.com"
                          value={contentValues.vcard?.website || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              vcard: { ...(contentValues.vcard || { firstName: '' }), website: e.target.value },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 8. GEO */}
                {contentType === 'geo' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="qr-geo-lat" className="text-xs font-semibold text-foreground block mb-1">
                          Latitude
                        </label>
                        <input
                          id="qr-geo-lat"
                          type="number"
                          step="0.0001"
                          placeholder="37.7749"
                          value={contentValues.geo?.latitude || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              geo: {
                                ...(contentValues.geo || { latitude: 0, longitude: 0 }),
                                latitude: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                        />
                      </div>
                      <div>
                        <label htmlFor="qr-geo-lon" className="text-xs font-semibold text-foreground block mb-1">
                          Longitude
                        </label>
                        <input
                          id="qr-geo-lon"
                          type="number"
                          step="0.0001"
                          placeholder="-122.4194"
                          value={contentValues.geo?.longitude || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              geo: {
                                ...(contentValues.geo || { latitude: 0, longitude: 0 }),
                                longitude: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="qr-geo-q" className="text-xs font-semibold text-foreground block mb-1">
                        Location Query / Label
                      </label>
                      <input
                        id="qr-geo-q"
                        type="text"
                        placeholder="Golden Gate Bridge, San Francisco"
                        value={contentValues.geo?.query || ''}
                        onChange={(e) =>
                          setContentValues({
                            ...contentValues,
                            geo: {
                              ...(contentValues.geo || { latitude: 0, longitude: 0 }),
                              query: e.target.value,
                            },
                          })
                        }
                        className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                      />
                    </div>
                  </div>
                )}

                {/* 9. EVENT */}
                {contentType === 'event' && (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="qr-ev-title" className="text-xs font-semibold text-foreground block mb-1">
                        Event Title
                      </label>
                      <input
                        id="qr-ev-title"
                        type="text"
                        placeholder="Tech Summit 2026"
                        value={contentValues.event?.title || ''}
                        onChange={(e) =>
                          setContentValues({
                            ...contentValues,
                            event: {
                              ...(contentValues.event || { title: '', startDate: '', endDate: '' }),
                              title: e.target.value,
                            },
                          })
                        }
                        className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="qr-ev-start" className="text-xs font-semibold text-foreground block mb-1">
                          Start Date & Time
                        </label>
                        <input
                          id="qr-ev-start"
                          type="datetime-local"
                          value={contentValues.event?.startDate || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              event: {
                                ...(contentValues.event || { title: '', startDate: '', endDate: '' }),
                                startDate: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                        />
                      </div>
                      <div>
                        <label htmlFor="qr-ev-end" className="text-xs font-semibold text-foreground block mb-1">
                          End Date & Time
                        </label>
                        <input
                          id="qr-ev-end"
                          type="datetime-local"
                          value={contentValues.event?.endDate || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              event: {
                                ...(contentValues.event || { title: '', startDate: '', endDate: '' }),
                                endDate: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="qr-ev-loc" className="text-xs font-semibold text-foreground block mb-1">
                        Location
                      </label>
                      <input
                        id="qr-ev-loc"
                        type="text"
                        placeholder="Convention Center or Zoom Link"
                        value={contentValues.event?.location || ''}
                        onChange={(e) =>
                          setContentValues({
                            ...contentValues,
                            event: {
                              ...(contentValues.event || { title: '', startDate: '', endDate: '' }),
                              location: e.target.value,
                            },
                          })
                        }
                        className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                      />
                    </div>
                  </div>
                )}

                {/* 10. BITCOIN */}
                {contentType === 'bitcoin' && (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="qr-btc-addr" className="text-xs font-semibold text-foreground block mb-1">
                        Bitcoin Address (Legacy, P2SH, or Bech32)
                      </label>
                      <input
                        id="qr-btc-addr"
                        type="text"
                        placeholder="bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"
                        value={contentValues.bitcoin?.address || ''}
                        onChange={(e) =>
                          setContentValues({
                            ...contentValues,
                            bitcoin: {
                              ...(contentValues.bitcoin || { address: '' }),
                              address: e.target.value,
                            },
                          })
                        }
                        className="w-full text-xs rounded-xl border border-border bg-background px-3.5 py-2 text-foreground font-mono"
                      />
                      {contentValues.bitcoin?.address &&
                        !isValidBitcoinAddress(contentValues.bitcoin.address) && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                            ⚠️ This does not appear to be a standard Bitcoin address format.
                          </p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="qr-btc-amt" className="text-xs font-semibold text-foreground block mb-1">
                          Amount (BTC)
                        </label>
                        <input
                          id="qr-btc-amt"
                          type="number"
                          step="0.0001"
                          placeholder="0.005"
                          value={contentValues.bitcoin?.amount || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              bitcoin: {
                                ...(contentValues.bitcoin || { address: '' }),
                                amount: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                        />
                      </div>
                      <div>
                        <label htmlFor="qr-btc-lbl" className="text-xs font-semibold text-foreground block mb-1">
                          Label / Receiver
                        </label>
                        <input
                          id="qr-btc-lbl"
                          type="text"
                          placeholder="Donation or Coffee"
                          value={contentValues.bitcoin?.label || ''}
                          onChange={(e) =>
                            setContentValues({
                              ...contentValues,
                              bitcoin: {
                                ...(contentValues.bitcoin || { address: '' }),
                                label: e.target.value,
                              },
                            })
                          }
                          className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACCORDION 2: SET COLORS */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'colors' ? 'content' : 'colors')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Set Colors & Gradients</h3>
                  <p className="text-xs text-muted-foreground">
                    Foreground dots, background, eye colors, and contrast check
                  </p>
                </div>
              </div>
              <span className="text-muted-foreground text-xs font-bold">
                {openSection === 'colors' ? '−' : '+'}
              </span>
            </button>

            {openSection === 'colors' && (
              <div className="p-5 pt-1 border-t border-border space-y-4">
                {/* Single vs Gradient Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Color Mode</span>
                  <div className="inline-flex rounded-xl p-1 bg-zinc-100 dark:bg-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setUseGradient(false)}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        !useGradient ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      Single Color
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseGradient(true)}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        useGradient ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      Color Gradient
                    </button>
                  </div>
                </div>

                {/* Color Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Foreground / Start Color */}
                  <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2">
                    <label htmlFor="qr-fg-color" className="text-xs font-semibold text-foreground block">
                      {useGradient ? 'Gradient Start Color' : 'Foreground Color'}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id="qr-fg-color"
                        type="color"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="flex-1 text-xs font-mono uppercase bg-background px-3 py-1.5 rounded-lg border border-border"
                      />
                    </div>
                  </div>

                  {/* Gradient End Color or Background */}
                  {useGradient ? (
                    <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2">
                      <label htmlFor="qr-fg-end-color" className="text-xs font-semibold text-foreground block">
                        Gradient End Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          id="qr-fg-end-color"
                          type="color"
                          value={fgGradientEnd}
                          onChange={(e) => setFgGradientEnd(e.target.value)}
                          className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={fgGradientEnd}
                          onChange={(e) => setFgGradientEnd(e.target.value)}
                          className="flex-1 text-xs font-mono uppercase bg-background px-3 py-1.5 rounded-lg border border-border"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2">
                      <label htmlFor="qr-bg-color" className="text-xs font-semibold text-foreground block">
                        Background Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          id="qr-bg-color"
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="flex-1 text-xs font-mono uppercase bg-background px-3 py-1.5 rounded-lg border border-border"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Background Color Picker if Gradient Mode is active */}
                {useGradient && (
                  <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2">
                    <label htmlFor="qr-bg-color-grad" className="text-xs font-semibold text-foreground block">
                      Background Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id="qr-bg-color-grad"
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-36 text-xs font-mono uppercase bg-background px-3 py-1.5 rounded-lg border border-border"
                      />
                      <div className="flex-1 flex items-center justify-end gap-3 text-xs flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Type:</span>
                          <select
                            value={gradientType}
                            onChange={(e) => setGradientType(e.target.value as 'linear' | 'radial')}
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
                          >
                            <option value="linear">Linear</option>
                            <option value="radial">Radial</option>
                          </select>
                        </div>
                        {gradientType === 'linear' && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Angle:</span>
                            <select
                              value={gradientRotation}
                              onChange={(e) => setGradientRotation(Number(e.target.value))}
                              className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
                            >
                              <option value={0}>0°</option>
                              <option value={45}>45°</option>
                              <option value={90}>90°</option>
                              <option value={135}>135°</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Eye Colors Checkbox */}
                <div className="pt-2 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Custom Eye (Corner Finder) Colors
                    </span>
                    <input
                      type="checkbox"
                      checked={customEyeColor}
                      onChange={(e) => setCustomEyeColor(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
                    />
                  </div>

                  {customEyeColor && (
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border">
                      <div>
                        <label htmlFor="qr-eye-frame-col" className="text-[11px] font-semibold text-foreground block mb-1">
                          Eye Outer Frame
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id="qr-eye-frame-col"
                            type="color"
                            value={eyeFrameColor}
                            onChange={(e) => setEyeFrameColor(e.target.value)}
                            className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                          />
                          <span className="text-[11px] font-mono uppercase text-foreground">{eyeFrameColor}</span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="qr-eye-ball-col" className="text-[11px] font-semibold text-foreground block mb-1">
                          Eye Center Ball
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id="qr-eye-ball-col"
                            type="color"
                            value={eyeBallColor}
                            onChange={(e) => setEyeBallColor(e.target.value)}
                            className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                          />
                          <span className="text-[11px] font-mono uppercase text-foreground">{eyeBallColor}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contrast Checker Card */}
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                    !contrast.isValid
                      ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                      : contrast.warning
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {contrast.isValid && !contrast.warning ? (
                      <CheckCircleIcon size={16} />
                    ) : (
                      <AlertCircleIcon size={16} />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Contrast Ratio: {contrast.ratio}:1</span>
                      <span className="text-[11px] uppercase tracking-wider">
                        {!contrast.isValid ? 'Poor' : contrast.warning ? 'Fair' : 'Excellent'}
                      </span>
                    </div>
                    {contrast.warning ? (
                      <p className="text-[11px] opacity-90 leading-relaxed">{contrast.warning}</p>
                    ) : (
                      <p className="text-[11px] opacity-90">
                        High contrast provides effortless readability across all smartphones and low-light environments.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 3: ADD LOGO IMAGE */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'logo' ? 'content' : 'logo')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Add Center Logo Image</h3>
                  <p className="text-xs text-muted-foreground">
                    Upload your brand icon or choose a popular quick symbol
                  </p>
                </div>
              </div>
              <span className="text-muted-foreground text-xs font-bold">
                {openSection === 'logo' ? '−' : '+'}
              </span>
            </button>

            {openSection === 'logo' && (
              <div className="p-5 pt-1 border-t border-border space-y-4">
                {/* Upload or Drop */}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoUpload(f);
                  }}
                  className="hidden"
                />

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-dashed border-border hover:border-orange-500 bg-background hover:bg-orange-500/5 transition-all text-xs font-semibold text-foreground flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UploadIcon size={16} className="text-orange-500" />
                    <span>Upload Custom Image</span>
                  </button>

                  {logoImage && (
                    <button
                      type="button"
                      onClick={() => setLogoImage(null)}
                      className="py-2.5 px-3 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      title="Remove Logo"
                    >
                      <TrashIcon size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Popular Presets */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Quick Preset Icons
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {LOGO_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setLogoImage(p.src)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                          logoImage === p.src
                            ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500'
                            : 'border-border bg-card/60 hover:border-border/80'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.src} alt={p.name} className="w-6 h-6 object-contain" />
                        <span className="text-[10px] font-semibold text-foreground truncate w-full text-center">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo Size & Padding Controls */}
                {logoImage && (
                  <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="qr-logo-size-slider" className="font-semibold text-foreground">
                        Logo Size Relative to QR
                      </label>
                      <span className="font-bold text-orange-500">{Math.round(logoSize * 100)}%</span>
                    </div>
                    <input
                      id="qr-logo-size-slider"
                      type="range"
                      min="0.15"
                      max="0.35"
                      step="0.01"
                      value={logoSize}
                      onChange={(e) => setLogoSize(parseFloat(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />

                    <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                      <span className="text-muted-foreground">Clear background dots behind logo</span>
                      <input
                        type="checkbox"
                        checked={hideBackgroundDots}
                        onChange={(e) => setHideBackgroundDots(e.target.checked)}
                        className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Auto High Error Correction Notice */}
                <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-xs text-orange-700 dark:text-orange-300 flex items-start gap-2.5">
                  <InfoIcon size={16} className="shrink-0 mt-0.5 text-orange-500" />
                  <p className="text-[11px] leading-relaxed">
                    Adding a center logo obscures center QR data modules. ASAPTools automatically enforces{' '}
                    <strong>High Error Correction (30%)</strong> so scanners easily recover obscured data.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 4: CUSTOMIZE DESIGN */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'design' ? 'content' : 'design')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Customize Design Shapes</h3>
                  <p className="text-xs text-muted-foreground">
                    Dot patterns, corner eye frame styles, and error recovery tier
                  </p>
                </div>
              </div>
              <span className="text-muted-foreground text-xs font-bold">
                {openSection === 'design' ? '−' : '+'}
              </span>
            </button>

            {openSection === 'design' && (
              <div className="p-5 pt-1 border-t border-border space-y-4">
                {/* 1. Body Dot Shapes */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Body Dot Style</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'square', label: 'Classic Square' },
                      { id: 'dots', label: 'Circular Dots' },
                      { id: 'rounded', label: 'Rounded' },
                      { id: 'extra-rounded', label: 'Extra Rounded' },
                      { id: 'classy', label: 'Classy Diamond' },
                      { id: 'classy-rounded', label: 'Classy Soft' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDotType(d.id as DotType)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                          dotType === d.id
                            ? 'border-orange-500 bg-orange-500/10 text-foreground ring-1 ring-orange-500'
                            : 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Corner Eye Frame Shapes */}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-foreground mb-2">Corner Frame Shape</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'square', label: 'Square' },
                      { id: 'extra-rounded', label: 'Soft Rounded' },
                      { id: 'dot', label: 'Circular' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCornerSquareType(c.id as CornerSquareType)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                          cornerSquareType === c.id
                            ? 'border-orange-500 bg-orange-500/10 text-foreground ring-1 ring-orange-500'
                            : 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Corner Eye Ball Shapes */}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-foreground mb-2">Corner Eye Ball Shape</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'square', label: 'Square Center' },
                      { id: 'dot', label: 'Circular Dot' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setCornerDotType(b.id as CornerDotType)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                          cornerDotType === b.id
                            ? 'border-orange-500 bg-orange-500/10 text-foreground ring-1 ring-orange-500'
                            : 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Error Correction Level */}
                <div className="pt-2 border-t border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="qr-err-level" className="text-xs font-semibold text-foreground">
                      Error Correction Level
                    </label>
                    <span className="text-xs font-bold text-orange-500">{effectiveErrorCorrectionLevel}</span>
                  </div>
                  <select
                    id="qr-err-level"
                    value={effectiveErrorCorrectionLevel}
                    disabled={Boolean(logoImage)}
                    onChange={(e) => setErrorCorrectionLevel(e.target.value as ErrorCorrectionLevel)}
                    className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                  >
                    <option value="L">L — Low (7% damage recovery)</option>
                    <option value="M">M — Medium (15% damage recovery — Recommended)</option>
                    <option value="Q">Q — Quartile (25% damage recovery)</option>
                    <option value="H">H — High (30% damage recovery — Optimal for logos)</option>
                  </select>
                </div>

                {/* Reset button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcwIcon size={12} />
                    <span>Reset styles to defaults</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Live Preview & Download Panel */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <QrCodeIcon size={18} className="text-orange-500" />
                <span>Live QR Code</span>
              </h3>
              <Badge variant="brand" className="text-[10px] uppercase">
                {contentType}
              </Badge>
            </div>

            {/* Live Render Container */}
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-950/80 border border-border flex items-center justify-center min-h-[300px]">
              <div
                ref={previewContainerRef}
                className="rounded-xl overflow-hidden shadow-sm flex items-center justify-center"
              />
            </div>

            {/* Custom Filename */}
            <div className="space-y-1.5">
              <label htmlFor="qr-filename" className="text-xs font-semibold text-foreground block">
                Output File Name
              </label>
              <input
                id="qr-filename"
                type="text"
                placeholder={`asaptools-qrcode-${contentType}`}
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Resolution Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Export Resolution</span>
                <span className="font-bold text-orange-500">
                  {downloadSize} × {downloadSize} px
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { size: 500, label: '500 px', desc: 'Standard' },
                  { size: 1000, label: '1000 px', desc: 'High-Res' },
                  { size: 2000, label: '2000 px', desc: 'Ultra HD' },
                ].map((s) => (
                  <button
                    key={s.size}
                    type="button"
                    onClick={() => setDownloadSize(s.size)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      downloadSize === s.size
                        ? 'border-orange-500 bg-orange-500/10 text-foreground font-bold'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="text-xs block">{s.label}</span>
                    <span className="text-[9px] text-muted-foreground font-normal">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Download Action Buttons */}
            <div className="space-y-2.5 pt-2 border-t border-border">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleDownload('png')}
                  className="py-3 px-4 rounded-xl font-bold text-xs bg-orange-600 hover:bg-orange-500 text-white shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <DownloadIcon size={16} />
                  <span>Download PNG</span>
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleDownload('svg')}
                  className="py-3 px-4 rounded-xl font-bold text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <DownloadIcon size={16} />
                  <span>Download SVG</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleDownload('jpeg')}
                  className="py-2.5 px-3 rounded-xl font-semibold text-xs border border-border bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <DownloadIcon size={14} />
                  <span>JPEG</span>
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleCopyToClipboard}
                  className="py-2.5 px-3 rounded-xl font-semibold text-xs border border-border bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {copiedBadge ? (
                    <>
                      <CheckCircleIcon size={14} className="text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <ZapIcon size={14} className="text-orange-500" />
                      <span>Copy Image</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Privacy & Guarantee note */}
            <div className="pt-3 border-t border-border flex items-center gap-2.5 text-xs text-muted-foreground">
              <ShieldIcon size={16} className="text-green-500 shrink-0" />
              <span className="text-[11px] leading-tight">
                <strong>100% Free & Private:</strong> Created entirely on your device. Your contact details, Wi-Fi keys, and links never touch our servers.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="pt-8 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <div>
          <span>Related Developer Tools: </span>
          <Link href="/tools/code-playground" className="text-orange-500 hover:underline font-medium ml-1">
            ASAPTools CodeLab
          </Link>
          <span className="mx-2">•</span>
          <Link href="/tools/json-formatter" className="text-orange-500 hover:underline font-medium">
            JSON Formatter
          </Link>
          <span className="mx-2">•</span>
          <Link href="/tools/base64-converter" className="text-orange-500 hover:underline font-medium">
            Base64 Converter
          </Link>
        </div>
        <Link href="/tools" className="hover:text-foreground transition-colors">
          Browse all tools &rarr;
        </Link>
      </div>
    </div>
  );
}

export default QrCodeGeneratorTool;
