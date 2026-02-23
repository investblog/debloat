import { describe, expect, it } from 'vitest';
import type { BrowserType } from '@shared/types';
import { CATEGORIES, STORE_URLS } from '@shared/constants';
import { icon } from '@ui/icons';

describe('CATEGORIES icon keys', () => {
  it('every category has a string icon key', () => {
    for (const cat of CATEGORIES) {
      expect(typeof cat.icon, `${cat.id} should have string icon`).toBe('string');
      expect(cat.icon.length, `${cat.id} icon key should be non-empty`).toBeGreaterThan(0);
    }
  });

  it('every category icon key resolves to a valid SVG', () => {
    for (const cat of CATEGORIES) {
      const el = icon(cat.icon);
      expect(el.tagName.toLowerCase(), `icon("${cat.icon}") for ${cat.id} should be svg`).toBe('svg');
      expect(el.querySelector('path'), `icon("${cat.icon}") for ${cat.id} should have path`).not.toBeNull();
    }
  });
});

describe('CATEGORIES browser coverage', () => {
  const browsers: BrowserType[] = ['chrome', 'edge', 'firefox'];

  for (const browser of browsers) {
    it(`${browser} has at least one sub-toggle across all categories`, () => {
      const total = CATEGORIES.flatMap((c) => c.subToggles).filter((s) => s.browsers.includes(browser)).length;
      expect(total, `${browser} should have ≥1 sub-toggle overall`).toBeGreaterThan(0);
    });
  }

  it('every sub-toggle targets at least one supported browser', () => {
    for (const cat of CATEGORIES) {
      for (const sub of cat.subToggles) {
        const supported = sub.browsers.filter((b) => browsers.includes(b));
        expect(
          supported.length,
          `${cat.id}/${sub.id} should target ≥1 of chrome/edge/firefox`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('edge has the most sub-toggles (primary target browser)', () => {
    const countByBrowser = (b: BrowserType) =>
      CATEGORIES.flatMap((c) => c.subToggles).filter((s) => s.browsers.includes(b)).length;
    const edgeCount = countByBrowser('edge');
    const chromeCount = countByBrowser('chrome');
    const firefoxCount = countByBrowser('firefox');
    expect(edgeCount).toBeGreaterThan(chromeCount);
    expect(edgeCount).toBeGreaterThan(firefoxCount);
  });
});

describe('STORE_URLS', () => {
  const browsers = ['chrome', 'edge', 'firefox'];

  for (const browser of browsers) {
    it(`${browser} has a valid store entry`, () => {
      const entry = STORE_URLS[browser];
      expect(entry, `${browser} should have a STORE_URLS entry`).toBeDefined();
      expect(entry.url).toBeTruthy();
      expect(entry.labelKey).toBeTruthy();

      const el = icon(entry.icon);
      expect(el.tagName.toLowerCase(), `icon("${entry.icon}") should be svg`).toBe('svg');
    });
  }
});
