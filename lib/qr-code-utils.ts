/**
 * ASAPTools QR Code Generator Utilities
 * Pure functions for payload generation, validation, contrast calculations, and formatting.
 */

export type QrContentType =
  | 'url'
  | 'text'
  | 'email'
  | 'phone'
  | 'sms'
  | 'wifi'
  | 'vcard'
  | 'geo'
  | 'event'
  | 'bitcoin';

export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

export interface WifiContent {
  ssid: string;
  password?: string;
  encryption: WifiEncryption;
  hidden?: boolean;
}

export interface VCardContent {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  organization?: string;
  title?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface EmailContent {
  email: string;
  subject?: string;
  body?: string;
}

export interface SmsContent {
  phone: string;
  message?: string;
}

export interface GeoContent {
  latitude: number | string;
  longitude: number | string;
  query?: string;
}

export interface EventContent {
  title: string;
  startDate: string; // ISO string or YYYY-MM-DDTHH:mm
  endDate: string;
  location?: string;
  description?: string;
  allDay?: boolean;
}

export interface BitcoinContent {
  address: string;
  amount?: number | string;
  label?: string;
  message?: string;
}

export interface QrContentValues {
  url?: string;
  text?: string;
  email?: EmailContent;
  phone?: string;
  sms?: SmsContent;
  wifi?: WifiContent;
  vcard?: VCardContent;
  geo?: GeoContent;
  event?: EventContent;
  bitcoin?: BitcoinContent;
}

/**
 * Escapes special characters for Wi-Fi QR strings (MeCard / WiFi spec)
 */
export function escapeWifiString(str: string): string {
  return str.replace(/([\\;,":])/g, '\\$1');
}

/**
 * Builds standard WiFi QR payload: WIFI:S:ssid;T:WPA;P:password;H:false;;
 */
export function formatWifiPayload(wifi: WifiContent): string {
  const ssid = escapeWifiString(wifi.ssid || '');
  const enc = wifi.encryption || 'WPA';
  const pass = wifi.password && enc !== 'nopass' ? escapeWifiString(wifi.password) : '';
  const hidden = Boolean(wifi.hidden);

  let payload = `WIFI:S:${ssid};T:${enc};`;
  if (enc !== 'nopass' && pass) {
    payload += `P:${pass};`;
  }
  if (hidden) {
    payload += 'H:true;';
  }
  payload += ';';
  return payload;
}

/**
 * Escapes vCard property values according to vCard 3.0 specification
 */
export function escapeVCardValue(str: string): string {
  return str.replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n');
}

/**
 * Builds standard vCard 3.0 QR payload
 */
export function formatVCardPayload(vcard: VCardContent): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

  const fn = [vcard.firstName, vcard.lastName].filter(Boolean).join(' ').trim() || 'Contact';
  lines.push(`N:${escapeVCardValue(vcard.lastName || '')};${escapeVCardValue(vcard.firstName || '')};;;`);
  lines.push(`FN:${escapeVCardValue(fn)}`);

  if (vcard.organization) {
    lines.push(`ORG:${escapeVCardValue(vcard.organization)}`);
  }
  if (vcard.title) {
    lines.push(`TITLE:${escapeVCardValue(vcard.title)}`);
  }
  if (vcard.phone) {
    lines.push(`TEL;TYPE=CELL,VOICE:${vcard.phone.trim()}`);
  }
  if (vcard.email) {
    lines.push(`EMAIL;TYPE=INTERNET,PREF:${vcard.email.trim()}`);
  }
  if (vcard.website) {
    let url = vcard.website.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    lines.push(`URL:${url}`);
  }

  const hasAddress = vcard.street || vcard.city || vcard.state || vcard.zip || vcard.country;
  if (hasAddress) {
    lines.push(
      `ADR;TYPE=WORK:;;${escapeVCardValue(vcard.street || '')};${escapeVCardValue(vcard.city || '')};${escapeVCardValue(
        vcard.state || ''
      )};${escapeVCardValue(vcard.zip || '')};${escapeVCardValue(vcard.country || '')}`
    );
  }

  lines.push('END:VCARD');
  return lines.join('\n');
}

/**
 * Formats standard mailto: payload
 */
export function formatEmailPayload(email: EmailContent): string {
  const addr = (email.email || '').trim();
  const params: string[] = [];
  if (email.subject) params.push(`subject=${encodeURIComponent(email.subject)}`);
  if (email.body) params.push(`body=${encodeURIComponent(email.body)}`);
  return `mailto:${addr}${params.length > 0 ? `?${params.join('&')}` : ''}`;
}

/**
 * Formats standard SMSTO: payload
 */
export function formatSmsPayload(sms: SmsContent): string {
  const cleanPhone = (sms.phone || '').trim();
  const body = sms.message || '';
  return `SMSTO:${cleanPhone}:${body}`;
}

/**
 * Formats standard geo: payload
 */
export function formatGeoPayload(geo: GeoContent): string {
  const lat = Number(geo.latitude) || 0;
  const lon = Number(geo.longitude) || 0;
  const q = geo.query ? `?q=${encodeURIComponent(geo.query)}` : '';
  return `geo:${lat.toFixed(6)},${lon.toFixed(6)}${q}`;
}

/**
 * Formats date into iCalendar UTC/Date string: YYYYMMDDTHHmmssZ
 */
export function formatIcalDate(dateStr: string, isAllDay = false): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());

  if (isAllDay) {
    return `${year}${month}${day}`;
  }

  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Formats standard iCalendar VEVENT payload
 */
export function formatEventPayload(ev: EventContent): string {
  const dtStart = formatIcalDate(ev.startDate, ev.allDay);
  const dtEnd = formatIcalDate(ev.endDate || ev.startDate, ev.allDay);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ASAPTools//QR Event Generator//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${escapeVCardValue(ev.title || 'Event')}`,
  ];

  if (ev.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    if (dtEnd) lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
  } else {
    if (dtStart) lines.push(`DTSTART:${dtStart}`);
    if (dtEnd) lines.push(`DTEND:${dtEnd}`);
  }

  if (ev.location) {
    lines.push(`LOCATION:${escapeVCardValue(ev.location)}`);
  }
  if (ev.description) {
    lines.push(`DESCRIPTION:${escapeVCardValue(ev.description)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\n');
}

/**
 * Validates Bitcoin address format (P2PKH, P2SH, or Bech32)
 */
export function isValidBitcoinAddress(address: string): boolean {
  const cleaned = address.trim();
  // Legacy (1...), P2SH (3...), Native SegWit Bech32 (bc1...)
  const legacyP2sh = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  const bech32 = /^bc1[a-z0-9]{39,59}$/i;
  return legacyP2sh.test(cleaned) || bech32.test(cleaned);
}

/**
 * Formats standard BIP21 bitcoin: URI payload
 */
export function formatBitcoinPayload(btc: BitcoinContent): string {
  const addr = (btc.address || '').trim();
  const params: string[] = [];
  if (btc.amount && !isNaN(Number(btc.amount)) && Number(btc.amount) > 0) {
    params.push(`amount=${btc.amount}`);
  }
  if (btc.label) params.push(`label=${encodeURIComponent(btc.label)}`);
  if (btc.message) params.push(`message=${encodeURIComponent(btc.message)}`);

  return `bitcoin:${addr}${params.length > 0 ? `?${params.join('&')}` : ''}`;
}

/**
 * Generates the unified QR payload string for any active content type
 */
export function formatQrPayload(type: QrContentType, values: QrContentValues): string {
  switch (type) {
    case 'url': {
      let raw = (values.url || '').trim();
      if (!raw) return 'https://asaptools.in';
      if (!/^https?:\/\//i.test(raw)) {
        raw = `https://${raw}`;
      }
      return raw;
    }

    case 'text':
      return (values.text || '').trim() || 'Hello from ASAPTools!';

    case 'email':
      return formatEmailPayload(values.email || { email: 'hello@example.com' });

    case 'phone': {
      const p = (values.phone || '').trim();
      return p ? `tel:${p}` : 'tel:+1234567890';
    }

    case 'sms':
      return formatSmsPayload(values.sms || { phone: '+1234567890', message: 'Hello!' });

    case 'wifi':
      return formatWifiPayload(values.wifi || { ssid: 'MyWiFi', encryption: 'WPA', password: 'password123' });

    case 'vcard':
      return formatVCardPayload(
        values.vcard || {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1 555-0199',
        }
      );

    case 'geo':
      return formatGeoPayload(values.geo || { latitude: 37.7749, longitude: -122.4194 });

    case 'event':
      return formatEventPayload(
        values.event || {
          title: 'ASAPTools Launch',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 3600000).toISOString(),
        }
      );

    case 'bitcoin':
      return formatBitcoinPayload(values.bitcoin || { address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' });

    default:
      return 'https://asaptools.in';
  }
}

/**
 * Converts Hex color string to [R, G, B] tuple
 */
export function hexToRgb(hex: string): [number, number, number] {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-f]{6}$/i.test(cleaned)) {
    return [0, 0, 0];
  }
  const num = parseInt(cleaned, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Calculates WCAG relative luminance for an RGB color
 */
export function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates contrast ratio between two hex colors (1:1 to 21:1)
 */
export function calculateContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = getRelativeLuminance(hexToRgb(fgHex));
  const l2 = getRelativeLuminance(hexToRgb(bgHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 10) / 10;
}

/**
 * Analyzes color contrast and returns scanning reliability advisory
 */
export function getContrastAdvisory(
  fgHex: string,
  bgHex: string
): { ratio: number; isValid: boolean; isInverted: boolean; warning?: string } {
  const lFg = getRelativeLuminance(hexToRgb(fgHex));
  const lBg = getRelativeLuminance(hexToRgb(bgHex));
  const ratio = calculateContrastRatio(fgHex, bgHex);
  const isInverted = lFg > lBg; // light dots on dark background

  if (ratio < 2.5) {
    return {
      ratio,
      isValid: false,
      isInverted,
      warning: `Very low contrast (${ratio}:1). Most mobile cameras and QR scanners will fail to detect this code.`,
    };
  }

  if (ratio < 4.5) {
    return {
      ratio,
      isValid: true,
      isInverted,
      warning: `Moderate contrast (${ratio}:1). May have difficulty scanning in dim lighting or at a distance.`,
    };
  }

  if (isInverted) {
    return {
      ratio,
      isValid: true,
      isInverted,
      warning: `Inverted colors detected (light foreground on dark background). While modern smartphone cameras scan inverted codes, some legacy hardware barcode readers may not.`,
    };
  }

  return { ratio, isValid: true, isInverted: false };
}
