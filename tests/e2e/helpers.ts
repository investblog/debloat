/**
 * E2E test helpers — launch Chromium with extension loaded via Playwright.
 *
 * Uses Playwright's bundled Chromium (supports --load-extension).
 * System Chrome 127+ deprecated --load-extension, so we rely on Playwright's Chromium.
 * Requires: extension built (`npm run build`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { type BrowserContext, type Page, chromium } from 'playwright';

const EXTENSION_PATH = path.resolve(__dirname, '../../dist/chrome-mv3');
const PROFILE_DIR = path.resolve(__dirname, '../../dist/.test-profile');

export interface ExtensionContext {
  context: BrowserContext;
  extensionId: string;
}

/**
 * Launch Chromium with the extension loaded.
 * Returns browser context and resolved extension ID.
 */
export async function launchWithExtension(): Promise<ExtensionContext> {
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  fs.mkdirSync(PROFILE_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
    ignoreDefaultArgs: ['--enable-automation', '--disable-component-extensions-with-background-pages'],
    viewport: null,
  });

  // Wait for our service worker (background.js)
  let sw = context.serviceWorkers().find((w) => w.url().endsWith('background.js'));
  if (!sw) {
    sw = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Extension SW not found in 10s')), 10_000);
      const onSW = (worker: { url: () => string }) => {
        if (worker.url().endsWith('background.js')) {
          clearTimeout(timer);
          context.off('serviceworker', onSW);
          resolve(worker as typeof sw);
        }
      };
      // Check existing
      for (const w of context.serviceWorkers()) onSW(w);
      context.on('serviceworker', onSW);
    });
  }

  const match = sw!.url().match(/chrome-extension:\/\/([a-z]+)\//);
  if (!match) throw new Error(`Cannot extract extension ID from ${sw!.url()}`);

  return { context, extensionId: match[1] };
}

/**
 * Open the extension's side panel page in a new tab.
 */
export async function openSidePanel(ctx: ExtensionContext): Promise<Page> {
  const page = await ctx.context.newPage();
  await page.goto(`chrome-extension://${ctx.extensionId}/sidepanel.html`, {
    waitUntil: 'domcontentloaded',
  });
  return page;
}
