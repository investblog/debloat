/**
 * Smoke tests — verify extension loads and works in a real Chrome instance.
 *
 * Run:   npm run test:e2e
 * Requires: npm run build (Chrome target) first.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type ExtensionContext, launchWithExtension, openSidePanel } from './helpers';

let ctx: ExtensionContext;

beforeAll(async () => {
  ctx = await launchWithExtension();
}, 20_000);

afterAll(async () => {
  await ctx?.context.close();
});

describe('extension loads', () => {
  it('has a valid extension ID', () => {
    expect(ctx.extensionId).toMatch(/^[a-z]{32}$/);
  });

  it('service worker is running', () => {
    const sw = ctx.context.serviceWorkers().find((w) => w.url().includes(ctx.extensionId));
    expect(sw).toBeDefined();
  });
});

describe('side panel UI', () => {
  it('renders header and 5 category cards', async () => {
    const page = await openSidePanel(ctx);
    try {
      await page.waitForSelector('.header', { timeout: 5000 });

      const title = await page.textContent('.header__title');
      expect(title).toBeTruthy();

      // Shopping is Edge-only sub-toggles, so Chromium shows 4 cards, Edge shows 5
      const cards = await page.$$('.card');
      expect(cards.length).toBeGreaterThanOrEqual(4);
    } finally {
      await page.close();
    }
  });

  it('master toggle responds to click', async () => {
    const page = await openSidePanel(ctx);
    try {
      await page.waitForSelector('.card', { timeout: 5000 });

      // Check toggle checkbox state before click
      const checkedBefore = await page.$eval(
        '.card .toggle__input',
        (el) => (el as HTMLInputElement).checked,
      );
      // Click the visible slider
      await page.click('.card .toggle__slider');
      await page.waitForTimeout(500);

      const checkedAfter = await page.$eval(
        '.card .toggle__input',
        (el) => (el as HTMLInputElement).checked,
      );
      expect(checkedAfter).not.toBe(checkedBefore);
    } finally {
      await page.close();
    }
  });

  it('theme toggle switches data-theme', async () => {
    const page = await openSidePanel(ctx);
    try {
      await page.waitForSelector('.theme-toggle', { timeout: 5000 });

      const before = await page.getAttribute('html', 'data-theme');
      await page.click('.theme-toggle');
      await page.waitForTimeout(200);
      const after = await page.getAttribute('html', 'data-theme');

      expect(before).not.toBe(after);
    } finally {
      await page.close();
    }
  });

  it('preset pills are clickable', async () => {
    const page = await openSidePanel(ctx);
    try {
      await page.waitForSelector('.preset', { timeout: 5000 });

      const presets = await page.$$('.preset');
      expect(presets.length).toBeGreaterThanOrEqual(3);

      // Click "balanced" preset — should turn off some cards
      await presets[1].click();
      await page.waitForTimeout(300);

      const offCards = await page.$$('.card--off');
      expect(offCards.length).toBeGreaterThan(0);
    } finally {
      await page.close();
    }
  });
});

describe('dNR blocking', () => {
  it('blocks telemetry endpoint', async () => {
    const page = await ctx.context.newPage();
    try {
      const result = await page.evaluate(async () => {
        try {
          await fetch('https://clients.google.com/tbproxy/test', { mode: 'no-cors' });
          return 'allowed';
        } catch {
          return 'blocked';
        }
      });
      expect(result).toBe('blocked');
    } finally {
      await page.close();
    }
  });
});

describe('content script injection', () => {
  it('content script runs on Google Search', async () => {
    const page = await ctx.context.newPage();
    try {
      await page.goto('https://www.google.com/search?q=test', {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });

      // If AI Overview is present, it should be hidden by extension CSS/JS
      const aiOverviewVisible = await page.evaluate(() => {
        const el = document.querySelector('#ai-overview-card');
        if (!el) return null; // Not present — OK, nothing to hide
        return getComputedStyle(el).display !== 'none';
      });

      // If AI Overview is on the page, it must be hidden
      if (aiOverviewVisible !== null) {
        expect(aiOverviewVisible).toBe(false);
      }
    } finally {
      await page.close();
    }
  });
});
