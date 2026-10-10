import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeWifiString,
  formatWifiPayload,
  escapeVCardValue,
  formatVCardPayload,
  formatEmailPayload,
  formatSmsPayload,
  formatGeoPayload,
  formatIcalDate,
  formatEventPayload,
  isValidBitcoinAddress,
  formatBitcoinPayload,
  formatQrPayload,
  hexToRgb,
  getRelativeLuminance,
  calculateContrastRatio,
  getContrastAdvisory,
} from '../lib/qr-code-utils.ts';

describe('QR Code Generator - Wi-Fi Payload Construction & Escaping', () => {
  test('escapes special characters in SSID and password', () => {
    assert.equal(escapeWifiString('My;Wifi:Network\\Name"'), 'My\\;Wifi\\:Network\\\\Name\\"');
    assert.equal(escapeWifiString('SimpleSSID'), 'SimpleSSID');
  });

  test('formats standard WPA/WPA2 Wi-Fi payload with password', () => {
    const payload = formatWifiPayload({
      ssid: 'Office-Guest',
      password: 'Secret;Password123',
      encryption: 'WPA',
      hidden: false,
    });
    assert.equal(payload, 'WIFI:S:Office-Guest;T:WPA;P:Secret\\;Password123;;');
  });

  test('formats hidden network Wi-Fi payload with H:true flag', () => {
    const payload = formatWifiPayload({
      ssid: 'Hidden-Lab',
      password: 'SafePass',
      encryption: 'WPA',
      hidden: true,
    });
    assert.equal(payload, 'WIFI:S:Hidden-Lab;T:WPA;P:SafePass;H:true;;');
  });

  test('formats open/unencrypted network without password parameter', () => {
    const payload = formatWifiPayload({
      ssid: 'Public-Airport-Free',
      encryption: 'nopass',
    });
    assert.equal(payload, 'WIFI:S:Public-Airport-Free;T:nopass;;');
  });

  test('handles WEP encryption type', () => {
    const payload = formatWifiPayload({
      ssid: 'LegacyRouter',
      password: '1234567890',
      encryption: 'WEP',
    });
    assert.equal(payload, 'WIFI:S:LegacyRouter;T:WEP;P:1234567890;;');
  });
});

describe('QR Code Generator - vCard 3.0 Formatting & Escaping', () => {
  test('escapes commas, semicolons, backslashes, and newlines in vCard values', () => {
    assert.equal(escapeVCardValue('Smith, Jr.; CEO\\Founder\nLine2'), 'Smith\\, Jr.\\; CEO\\\\Founder\\nLine2');
  });

  test('builds fully populated vCard 3.0 payload', () => {
    const vcard = formatVCardPayload({
      firstName: 'Sarah',
      lastName: 'Connor',
      organization: 'Tech Dynamics, Inc.',
      title: 'Lead Architect',
      phone: '+1 555-0199',
      email: 'sarah@example.com',
      website: 'example.com',
      street: '100 Silicon Way',
      city: 'San Francisco',
      state: 'CA',
      zip: '94107',
      country: 'USA',
    });

    assert.ok(vcard.startsWith('BEGIN:VCARD\nVERSION:3.0'));
    assert.ok(vcard.includes('N:Connor;Sarah;;;'));
    assert.ok(vcard.includes('FN:Sarah Connor'));
    assert.ok(vcard.includes('ORG:Tech Dynamics\\, Inc.'));
    assert.ok(vcard.includes('TITLE:Lead Architect'));
    assert.ok(vcard.includes('TEL;TYPE=CELL,VOICE:+1 555-0199'));
    assert.ok(vcard.includes('EMAIL;TYPE=INTERNET,PREF:sarah@example.com'));
    assert.ok(vcard.includes('URL:https://example.com'));
    assert.ok(vcard.includes('ADR;TYPE=WORK:;;100 Silicon Way;San Francisco;CA;94107;USA'));
    assert.ok(vcard.endsWith('END:VCARD'));
  });

  test('builds minimal vCard with just first name', () => {
    const vcard = formatVCardPayload({ firstName: 'Alex' });
    assert.ok(vcard.includes('N:;Alex;;;'));
    assert.ok(vcard.includes('FN:Alex'));
    assert.ok(!vcard.includes('ORG:'));
    assert.ok(!vcard.includes('ADR;'));
  });
});

describe('QR Code Generator - Email, SMS, Geo, Event & Bitcoin Payloads', () => {
  test('formats mailto: payload with URI encoded subject and body', () => {
    const payload = formatEmailPayload({
      email: 'test@asaptools.in',
      subject: 'Hello World',
      body: 'Testing & Feedback',
    });
    assert.equal(payload, 'mailto:test@asaptools.in?subject=Hello%20World&body=Testing%20%26%20Feedback');
  });

  test('formats mailto: payload without parameters when subject/body are omitted', () => {
    const payload = formatEmailPayload({ email: 'hello@example.com' });
    assert.equal(payload, 'mailto:hello@example.com');
  });

  test('formats SMSTO: payload', () => {
    const payload = formatSmsPayload({ phone: '+1234567890', message: 'Hello ASAPTools' });
    assert.equal(payload, 'SMSTO:+1234567890:Hello ASAPTools');
  });

  test('formats geo: coordinates with query parameter', () => {
    const payload = formatGeoPayload({ latitude: 37.7749, longitude: -122.4194, query: 'San Francisco' });
    assert.equal(payload, 'geo:37.774900,-122.419400?q=San%20Francisco');
  });

  test('formats iCalendar UTC timestamp correctly', () => {
    const dateStr = '2026-10-10T15:30:00Z';
    assert.equal(formatIcalDate(dateStr, false), '20261010T153000Z');
    assert.equal(formatIcalDate(dateStr, true), '20261010');
    assert.equal(formatIcalDate('invalid-date'), '');
  });

  test('formats iCalendar VEVENT payload', () => {
    const ev = formatEventPayload({
      title: 'Dev Summit',
      startDate: '2026-11-01T10:00:00Z',
      endDate: '2026-11-01T12:00:00Z',
      location: 'Hall B',
      description: 'Keynote speech',
    });
    assert.ok(ev.startsWith('BEGIN:VCALENDAR\nVERSION:2.0'));
    assert.ok(ev.includes('SUMMARY:Dev Summit'));
    assert.ok(ev.includes('DTSTART:20261101T100000Z'));
    assert.ok(ev.includes('DTEND:20261101T120000Z'));
    assert.ok(ev.includes('LOCATION:Hall B'));
    assert.ok(ev.includes('DESCRIPTION:Keynote speech'));
    assert.ok(ev.endsWith('END:VEVENT\nEND:VCALENDAR'));
  });

  test('validates Bitcoin addresses across Legacy, P2SH, and Bech32 formats', () => {
    // Legacy P2PKH (1...)
    assert.equal(isValidBitcoinAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'), true);
    // P2SH (3...)
    assert.equal(isValidBitcoinAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'), true);
    // Native SegWit Bech32 (bc1...)
    assert.equal(isValidBitcoinAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'), true);

    // Invalid addresses
    assert.equal(isValidBitcoinAddress(''), false);
    assert.equal(isValidBitcoinAddress('not-a-bitcoin-address'), false);
    assert.equal(isValidBitcoinAddress('0x1234567890123456789012345678901234567890'), false);
    assert.equal(isValidBitcoinAddress('bc1short'), false);
  });

  test('formats BIP21 bitcoin: URI payload', () => {
    const btc = formatBitcoinPayload({
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: '0.05',
      label: 'Satoshi Gift',
      message: 'Thank you!',
    });
    assert.equal(
      btc,
      'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.05&label=Satoshi%20Gift&message=Thank%20you!'
    );
  });
});

describe('QR Code Generator - Unified Payload Selector', () => {
  test('formats URL prepending https:// if missing', () => {
    assert.equal(formatQrPayload('url', { url: 'asaptools.in' }), 'https://asaptools.in');
    assert.equal(formatQrPayload('url', { url: 'https://asaptools.in' }), 'https://asaptools.in');
    assert.equal(formatQrPayload('url', { url: '' }), 'https://asaptools.in');
  });

  test('formats plain text with fallback', () => {
    assert.equal(formatQrPayload('text', { text: 'Custom note' }), 'Custom note');
    assert.equal(formatQrPayload('text', { text: '' }), 'Hello from ASAPTools!');
  });

  test('formats phone number with tel: prefix', () => {
    assert.equal(formatQrPayload('phone', { phone: '+1 555 123 4567' }), 'tel:+1 555 123 4567');
    assert.equal(formatQrPayload('phone', { phone: '' }), 'tel:+1234567890');
  });
});

describe('QR Code Generator - Color Contrast & Scanner Readability', () => {
  test('converts hex strings to RGB accurately', () => {
    assert.deepEqual(hexToRgb('#000000'), [0, 0, 0]);
    assert.deepEqual(hexToRgb('#ffffff'), [255, 255, 255]);
    assert.deepEqual(hexToRgb('#ea580c'), [234, 88, 12]);
    assert.deepEqual(hexToRgb('#fff'), [255, 255, 255]);
    assert.deepEqual(hexToRgb('invalid'), [0, 0, 0]);
  });

  test('calculates relative luminance according to WCAG standards', () => {
    assert.equal(getRelativeLuminance([0, 0, 0]), 0);
    assert.equal(Math.round(getRelativeLuminance([255, 255, 255])), 1);
  });

  test('calculates contrast ratio for extreme pairs', () => {
    const ratio = calculateContrastRatio('#000000', '#ffffff');
    assert.equal(ratio, 21); // Maximum contrast
    const same = calculateContrastRatio('#ffffff', '#ffffff');
    assert.equal(same, 1); // Zero contrast
  });

  test('detects low contrast and returns invalid scanning warning', () => {
    // Very light grey on white
    const adv = getContrastAdvisory('#e0e0e0', '#ffffff');
    assert.equal(adv.isValid, false);
    assert.ok(adv.warning?.includes('Very low contrast'));
  });

  test('detects moderate contrast and warns about dim lighting', () => {
    // Orange on white
    const adv = getContrastAdvisory('#ea580c', '#ffffff');
    assert.equal(adv.isValid, true);
    assert.ok(adv.ratio >= 2.5 && adv.ratio < 4.5);
    assert.ok(adv.warning?.includes('Moderate contrast'));
  });

  test('detects inverted colors (light dots on dark background)', () => {
    // White dots on black background
    const adv = getContrastAdvisory('#ffffff', '#000000');
    assert.equal(adv.isValid, true);
    assert.equal(adv.isInverted, true);
    assert.ok(adv.warning?.includes('Inverted colors detected'));
  });

  test('passes high contrast dark-on-light without warnings', () => {
    const adv = getContrastAdvisory('#000000', '#ffffff');
    assert.equal(adv.isValid, true);
    assert.equal(adv.isInverted, false);
    assert.equal(adv.warning, undefined);
  });
});
