import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EXT_PATH = path.resolve('dist/chrome-mv3');
const SCREENSHOTS_DIR = path.resolve('test-screenshots');
const USER_DATA_DIR = path.join(tmpdir(), 'debloat-test-' + Date.now());

if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR, { recursive: true });

console.log('Extension:', EXT_PATH);

// Chrome 137+ removed --load-extension from branded builds.
// Puppeteer 24+ has enableExtensions option that uses CDP Extensions.loadUnpacked.
const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: false,
  userDataDir: USER_DATA_DIR,
  pipe: true,  // Required for enableExtensions with paths
  enableExtensions: [EXT_PATH],
  args: [
    '--no-first-run',
    '--disable-default-apps',
  ],
  defaultViewport: null,
});

console.log('Chrome launched with extension, waiting 8s...');
await new Promise((r) => setTimeout(r, 8000));

// List targets
const targets = browser.targets();
console.log(`\nTargets (${targets.length}):`);
for (const t of targets) console.log(`  ${t.type()} → ${t.url()}`);

// Find our extension
let ourTarget = targets.find((t) => t.url().includes('/background.js'));
if (!ourTarget) {
  console.log('\nWaiting for background.js service worker...');
  try {
    ourTarget = await browser.waitForTarget((t) => t.url().includes('/background.js'), { timeout: 10000 });
  } catch {
    // Try any service_worker with chrome-extension://
    ourTarget = browser.targets().find(
      (t) => t.type() === 'service_worker' && t.url().includes('chrome-extension://'),
    );
  }
}

if (!ourTarget) {
  console.log('Extension NOT loaded!');
  const page = (await browser.pages())[0];
  if (page) {
    await page.goto('chrome://extensions/', { timeout: 5000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-extensions.png') });
  }
  await browser.close();
  process.exit(1);
}

const extUrl = ourTarget.url();
const extId = extUrl.match(/chrome-extension:\/\/([a-z]+)/)?.[1];
console.log(`\nExtension ID: ${extId}`);

// ── Side Panel ──
console.log('\n--- Side Panel ---');
const panelPage = await browser.newPage();
await panelPage.goto(`chrome-extension://${extId}/sidepanel.html`, {
  waitUntil: 'domcontentloaded',
  timeout: 10000,
});
await new Promise((r) => setTimeout(r, 3000));
await panelPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-side-panel.png') });
console.log('Screenshot: 02-side-panel.png');

const ui = await panelPage.evaluate(() => ({
  title: document.title,
  bodyHTML: document.body?.innerHTML?.substring(0, 800),
  header: document.querySelector('.header__title')?.textContent,
  subtitle: document.querySelector('.header__subtitle')?.textContent,
  cards: [...document.querySelectorAll('.card__title')].map((el) => el.textContent),
  toggleCount: document.querySelectorAll('.toggle').length,
  bg: getComputedStyle(document.body).backgroundColor,
}));
console.log(JSON.stringify(ui, null, 2));

// ── Toggle test ──
const toggle = await panelPage.$('.toggle');
if (toggle) {
  const before = await panelPage.$eval('.toggle__input', (el) => el.checked);
  await toggle.click();
  await new Promise((r) => setTimeout(r, 500));
  const after = await panelPage.$eval('.toggle__input', (el) => el.checked);
  console.log(`Toggle: ${before} → ${after} (${before !== after ? 'OK' : 'FAIL'})`);
  await toggle.click();
} else {
  console.log('No .toggle found');
}

// ── dNR test ──
console.log('\n--- dNR blocking ---');
const testPage = await browser.newPage();
await testPage.goto('https://example.com', { waitUntil: 'networkidle2', timeout: 15000 });
const results = await testPage.evaluate(async () => {
  const out = [];
  for (const url of [
    'https://telemetry.microsoft.com/',
    'https://copilot.microsoft.com/',
    'https://sydney.bing.com/',
    'https://example.com/',
  ]) {
    try {
      await fetch(url, { mode: 'no-cors', signal: AbortSignal.timeout(3000) });
      out.push({ host: new URL(url).hostname, status: 'allowed' });
    } catch {
      out.push({ host: new URL(url).hostname, status: 'BLOCKED' });
    }
  }
  return out;
});
for (const r of results) console.log(`  ${r.status}: ${r.host}`);

await browser.close();
console.log('\nDone!');
