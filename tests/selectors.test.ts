import { describe, expect, it } from 'vitest';

import { ALL as BING_ALL } from '@selectors/bing-search';
import { ALL as COPILOT_ALL } from '@selectors/edge-copilot';
import { ALL as NTP_ALL } from '@selectors/edge-ntp';
import { ALL as SHOPPING_ALL } from '@selectors/edge-shopping';
import { ALL as FIREFOX_ALL } from '@selectors/firefox-home';
import { ALL as GOOGLE_ALL } from '@selectors/google-search';

const selectorModules: Record<string, string[]> = {
  'bing-search': BING_ALL,
  'google-search': GOOGLE_ALL,
  'edge-copilot': COPILOT_ALL,
  'edge-ntp': NTP_ALL,
  'edge-shopping': SHOPPING_ALL,
  'firefox-home': FIREFOX_ALL,
};

describe('CSS selector modules', () => {
  for (const [name, selectors] of Object.entries(selectorModules)) {
    describe(name, () => {
      it('should export a non-empty array', () => {
        expect(Array.isArray(selectors)).toBe(true);
        expect(selectors.length).toBeGreaterThan(0);
      });

      it('should contain only non-empty strings', () => {
        for (const s of selectors) {
          expect(typeof s).toBe('string');
          expect(s.trim().length).toBeGreaterThan(0);
        }
      });

      it('should have no duplicate selectors', () => {
        expect(new Set(selectors).size).toBe(selectors.length);
      });
    });
  }
});
