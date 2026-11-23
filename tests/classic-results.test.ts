import { describe, expect, it, vi } from 'vitest';

vi.mock('wxt/browser', () => ({ browser: {} }));

const { buildClassicRules } = await import('@background/classic-results');

type Rule = {
  id: number;
  priority: number;
  action: { type: string; redirect?: unknown };
  condition: { regexFilter: string; requestDomains: string[]; resourceTypes: string[] };
};

const rules = buildClassicRules(['google.com', 'google.de']) as unknown as Rule[];
const redirect = rules.find((r) => r.action.type === 'redirect') as Rule;
const keep = rules.find((r) => r.action.type === 'allow') as Rule;

// The patterns use only RE2-compatible syntax, so JS RegExp gives the same answer
const matches = (rule: Rule, url: string) => new RegExp(rule.condition.regexFilter).test(url);

describe('classic results dNR rules', () => {
  it('redirects plain searches by adding udm=14', () => {
    expect(redirect.action.redirect).toEqual({
      transform: { queryTransform: { addOrReplaceParams: [{ key: 'udm', value: '14' }] } },
    });
    expect(matches(redirect, 'https://www.google.com/search?q=cats')).toBe(true);
    expect(matches(redirect, 'https://google.de/search?q=katzen&hl=de')).toBe(true);
    expect(redirect.condition.resourceTypes).toEqual(['main_frame']);
    expect(redirect.condition.requestDomains).toEqual(['google.com', 'google.de']);
  });

  it('does not touch other Google pages', () => {
    expect(matches(redirect, 'https://www.google.com/maps?q=x')).toBe(false);
    expect(matches(redirect, 'https://www.google.com/searchbyimage?q=x')).toBe(false);
  });

  it('lets through searches that already chose a vertical, with higher priority', () => {
    expect(keep.priority).toBeGreaterThan(redirect.priority);
    expect(matches(keep, 'https://www.google.com/search?q=x&udm=14')).toBe(true); // no redirect loop
    expect(matches(keep, 'https://www.google.com/search?udm=2&q=x')).toBe(true); // images
    expect(matches(keep, 'https://www.google.com/search?q=x&tbm=nws')).toBe(true); // legacy news
    expect(matches(keep, 'https://www.google.com/search?q=udm%3D2')).toBe(false); // in the query text
    expect(matches(keep, 'https://www.google.com/search?q=x&xudm=1')).toBe(false);
  });
});
