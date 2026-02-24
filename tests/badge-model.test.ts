import { describe, expect, it, vi } from 'vitest';
import { formatCount, initBadge } from '@background/badge';

describe('badge formatting', () => {
  it('formats counts as expected', () => {
    expect(formatCount(0)).toBe('');
    expect(formatCount(7)).toBe('7');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1000)).toBe('1k+');
  });
});

describe('per-tab reset model', () => {
  it('resets activity and count on onCommitted', () => {
    const navCb: Array<(d: { frameId: number; tabId: number }) => void> = [];
    const removedCb: Array<(id: number) => void> = [];
    vi.stubGlobal('chrome', {
      webNavigation: { onCommitted: { addListener: (cb: any) => navCb.push(cb) } },
      declarativeNetRequest: { getMatchedRules: vi.fn(async () => ({ rulesMatchedInfo: [] })) },
      tabs: {
        query: vi.fn(async () => [{ id: 1 }]),
        onRemoved: { addListener: (cb: any) => removedCb.push(cb) },
      },
      action: { setBadgeText: vi.fn(), setBadgeBackgroundColor: vi.fn() },
    });

    const tabActivity = new Map([[1, [{ time: Date.now(), domain: 'x', category: 'ai', rulesetId: 'r' }]] as any]);
    initBadge(tabActivity);
    navCb[0]({ frameId: 0, tabId: 1 });
    expect(tabActivity.get(1)).toBeUndefined();
  });
});
