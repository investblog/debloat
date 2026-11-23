/**
 * Google SERP e2e — the built extension against a routed fixture page.
 *
 * Google serves a captcha to automated browsers, so www.google.com/search is
 * fulfilled locally with a SERP-shaped fixture. Checks CSS + content script
 * together: hiding per kind, results untouched, live toggles, minimize mode.
 *
 * Run:   npm run build && npm run test:e2e
 */
import type { Page, Worker } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type ExtensionContext, launchWithExtension } from './helpers';

const FIXTURE = `<!doctype html><html><head><meta charset="utf-8"><title>q - Google Search</title></head><body>
<div role="list">
  <div role="listitem" id="tab-all"><a href="/search?q=q">All</a></div>
  <div role="listitem" id="tab-ai"><a href="/search?q=q&udm=50">AI Mode</a></div>
  <div role="listitem" id="tab-img"><a href="/search?q=q&udm=2">Images</a></div>
</div>
<div id="rcnt"><div id="center_col"><div id="rso">
  <div class="ULSxyf" id="aio"><div><div id="B2Jtyd">AI generated answer</div></div></div>
  <div class="g" id="r1"><a href="https://example.com/1"><h3>Result 1</h3></a></div>
  <div><div id="paa"><div data-initq="q"><div class="related-question-pair">Question?</div></div></div></div>
  <div class="g" id="r2"><a href="https://example.com/2"><h3>Result 2</h3></a></div>
</div></div></div>
</body></html>`;

let ctx: ExtensionContext;
let sw: Worker;

beforeAll(async () => {
  ctx = await launchWithExtension();
  sw = ctx.context.serviceWorkers().find((w) => w.url().endsWith('background.js')) as Worker;
  await ctx.context.route('https://www.google.com/search*', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: FIXTURE }),
  );
}, 20_000);

afterAll(async () => {
  await ctx?.context.close();
});

async function setSubToggles(subToggles: Record<string, boolean>): Promise<void> {
  await sw.evaluate(async (subs) => {
    const { settings } = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({ settings: { ...(settings ?? {}), subToggles: subs } });
  }, subToggles);
}

async function visible(page: Page, selector: string): Promise<boolean> {
  return page.$eval(selector, (el) => {
    for (let cur: Element | null = el; cur; cur = cur.parentElement) {
      if (getComputedStyle(cur).display === 'none') return false;
    }
    return true;
  });
}

async function openSerp(): Promise<Page> {
  const page = await ctx.context.newPage();
  await page.goto('https://www.google.com/search?q=q', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-debloat-allow-ai_overview], [data-debloat-hide]', {
    state: 'attached',
    timeout: 5000,
  });
  await page.waitForTimeout(150); // let the rAF scan settle
  return page;
}

describe('Google SERP (routed fixture)', () => {
  it('hides AI Overview, AI Mode tab and People also ask; keeps results and other tabs', async () => {
    await setSubToggles({});
    const page = await openSerp();
    try {
      expect(await visible(page, '#aio')).toBe(false);
      expect(await visible(page, '#tab-ai')).toBe(false);
      expect(await visible(page, '#paa')).toBe(false);
      expect(await visible(page, '#r1')).toBe(true);
      expect(await visible(page, '#r2')).toBe(true);
      expect(await visible(page, '#tab-all')).toBe(true);
      expect(await visible(page, '#tab-img')).toBe(true);
      expect(await page.$('.debloat-minibar')).not.toBeNull();
      expect(await visible(page, '.debloat-minibar')).toBe(false); // minimize mode off
    } finally {
      await page.close();
    }
  });

  it('reacts to a sub-toggle change without reload', async () => {
    await setSubToggles({});
    const page = await openSerp();
    try {
      await setSubToggles({ people_also_ask: false });
      await page.waitForSelector('html[data-debloat-allow-people_also_ask]', { state: 'attached' });
      expect(await visible(page, '#paa')).toBe(true);
      expect(await visible(page, '#aio')).toBe(false);
    } finally {
      await page.close();
    }
  });

  it('classic results mode redirects to udm=14, and "show AI once" bypasses it for one load', async () => {
    await setSubToggles({ classic_results: true });
    await new Promise((r) => setTimeout(r, 300)); // background applies dynamic rules
    const page = await ctx.context.newPage();
    try {
      await page.goto('https://www.google.com/search?q=cats', { waitUntil: 'domcontentloaded' });
      expect(new URL(page.url()).searchParams.get('udm')).toBe('14');

      // Images vertical is left alone
      await page.goto('https://www.google.com/search?q=cats&udm=2', { waitUntil: 'domcontentloaded' });
      expect(new URL(page.url()).searchParams.get('udm')).toBe('2');

      // Bypass: same search without udm, once
      await page.goto('https://www.google.com/search?q=dogs', { waitUntil: 'domcontentloaded' });
      const tabId = await sw.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ url: 'https://www.google.com/search*udm=14*' });
        return tab?.id ?? -1;
      });
      expect(tabId).toBeGreaterThan(-1);
      const panel = await ctx.context.newPage();
      await panel.goto(`chrome-extension://${ctx.extensionId}/sidepanel.html`);
      await panel.evaluate((id) => chrome.runtime.sendMessage({ type: 'SHOW_AI_ONCE', tabId: id }), tabId);
      await panel.close();
      await page.waitForURL((u) => !u.searchParams.has('udm'), { timeout: 5000 });
      expect(new URL(page.url()).searchParams.get('q')).toBe('dogs');

      // The next search is classic again
      await page.goto('https://www.google.com/search?q=birds', { waitUntil: 'domcontentloaded' });
      expect(new URL(page.url()).searchParams.get('udm')).toBe('14');
    } finally {
      await page.close();
      await setSubToggles({});
    }
  });

  it('minimize mode shows a bar that expands the AI Overview', async () => {
    await setSubToggles({ ai_overview_minimize: true });
    const page = await openSerp();
    try {
      await page.waitForSelector('html[data-debloat-ai-minimize]', { state: 'attached' });
      expect(await visible(page, '.debloat-minibar')).toBe(true);
      expect(await visible(page, '#aio')).toBe(false);
      await page.click('.debloat-minibar button');
      expect(await visible(page, '#aio')).toBe(true);
      expect(await visible(page, '#B2Jtyd')).toBe(true);
      await page.click('.debloat-minibar button');
      expect(await visible(page, '#aio')).toBe(false);
    } finally {
      await page.close();
      await setSubToggles({});
    }
  });
});
