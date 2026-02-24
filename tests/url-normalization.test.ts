import { describe, expect, it } from 'vitest';
import { hostFromUrl, normalizeHost } from '@shared/url';

describe('url normalization', () => {
  it('normalizes protocol, ports, www and trailing dot', () => {
    expect(normalizeHost('https://www.Example.com:8443')).toBe('example.com');
    expect(normalizeHost('WWW.Example.com.')).toBe('example.com');
    expect(normalizeHost('example.com:443')).toBe('example.com');
    expect(hostFromUrl('http://www.example.com:8080/path')).toBe('example.com');
  });

  it('keeps subdomains distinct (host-level whitelist)', () => {
    expect(normalizeHost('sub.example.com')).toBe('sub.example.com');
    expect(normalizeHost('example.com')).not.toBe('sub.example.com');
  });

  it('lowercases hostnames', () => {
    expect(normalizeHost('GOOGLE.COM')).toBe('google.com');
  });

  it('handles bare hostnames without protocol', () => {
    expect(normalizeHost('github.com')).toBe('github.com');
    expect(normalizeHost('  github.com  ')).toBe('github.com');
  });

  it('normalizes IDN/punycode via URL', () => {
    expect(hostFromUrl('https://bücher.de')).toBe('xn--bcher-kva.de');
  });
});
