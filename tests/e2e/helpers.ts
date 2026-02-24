import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { type BrowserContext, type Page, chromium } from 'playwright';

const EXTENSION_PATH = path.resolve(__dirname, '../../dist/chrome-mv3');
const PROFILE_DIR = path.resolve(__dirname, '../../dist/.test-profile');

export interface ExtensionContext {
  context: BrowserContext;
  extensionId: string;
}

export async function launchWithExtension(): Promise<ExtensionContext> {
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  fs.mkdirSync(PROFILE_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--host-rules=MAP www.google.com 127.0.0.1',
      '--ignore-certificate-errors',
    ],
  });

  let sw = context.serviceWorkers().find((w) => w.url().endsWith('background.js'));
  if (!sw) {
    sw = await context.waitForEvent('serviceworker');
  }
  const match = sw.url().match(/chrome-extension:\/\/([a-z]+)\//);
  if (!match) throw new Error(`Cannot extract extension ID from ${sw.url()}`);

  return { context, extensionId: match[1] };
}

export async function openSidePanel(ctx: ExtensionContext): Promise<Page> {
  const page = await ctx.context.newPage();
  await page.goto(`chrome-extension://${ctx.extensionId}/sidepanel.html`, { waitUntil: 'domcontentloaded' });
  return page;
}

export async function withFixtureServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('No port');
  return { server, port: addr.port };
}
