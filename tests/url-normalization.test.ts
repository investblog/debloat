import { describe, expect, it } from 'vitest';
import { hostFromUrl, normalizeHost } from '@shared/url';

describe('url normalization', () => {
  it('normalizes protocol, ports, www and trailing dot', () => {
    expect(normalizeHost('https://www.Example.com:8443')).toBe('example.com');
    expect(hostFromUrl('http://www.example.com:8080/path')).toBe('example.com');
  });

  it('keeps subdomain explicit (host-level whitelist decision)', () => {
    expect(normalizeHost('sub.example.com')).toBe('sub.example.com');
    expect(normalizeHost('example.com')).not.toBe('sub.example.com');
  });

  it('normalizes idn/punycode via URL', () => {
    expect(hostFromUrl('https://bücher.de')).toBe('xn--bcher-kva.de');
  });
});
