import type { BrowserType } from '@shared/types';

let _browser: BrowserType | null = null;

export function detectBrowser(): BrowserType {
  if (_browser) return _browser;
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) _browser = 'firefox';
  else if (ua.includes('Edg/')) _browser = 'edge';
  else if (ua.includes('Chrome/')) _browser = 'chrome';
  else _browser = 'unknown';
  return _browser;
}
