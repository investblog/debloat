import { afterEach, describe, expect, it, vi } from 'vitest';

describe('detectBrowser()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function detectWith(userAgent: string) {
    vi.stubGlobal('navigator', { userAgent });
    const { detectBrowser } = await import('@background/browser');
    return detectBrowser();
  }

  it('detects Firefox from UA string', async () => {
    expect(await detectWith('Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0')).toBe('firefox');
  });

  it('detects Edge from UA string', async () => {
    expect(await detectWith('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0')).toBe('edge');
  });

  it('detects Chrome from UA string', async () => {
    expect(await detectWith('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36')).toBe('chrome');
  });

  it('returns unknown for unrecognized UA', async () => {
    expect(await detectWith('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe('unknown');
  });

  it('Edge UA (contains Chrome/) is detected as edge, not chrome', async () => {
    // Edge UA includes both "Chrome/" and "Edg/" — order matters
    const edgeUA = 'Mozilla/5.0 AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
    expect(await detectWith(edgeUA)).toBe('edge');
  });

  it('caches result on subsequent calls', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Firefox/128.0' });
    const { detectBrowser } = await import('@background/browser');
    const first = detectBrowser();
    const second = detectBrowser();
    expect(first).toBe('firefox');
    expect(second).toBe('firefox');
  });
});
