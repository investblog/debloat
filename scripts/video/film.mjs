#!/usr/bin/env node
// Promo video frames: the real built extension, filmed frame by frame.
//   npm run build && node scripts/video/film.mjs <serp.html> <linesDir> <framesDir>
// <serp.html>  a Google results page saved from a real browser (document.outerHTML) — kept
//              outside the repo; scripts are stripped and e-mail addresses blanked before use.
// <linesDir>   narration from voice.mjs: scene lengths are fitted to the spoken lines.
// <framesDir>  receives 00000.jpg… at 30 fps (1920×1080) and console.log with the narration
//              cues for render.mjs.
// How it works: a filming copy of dist/chrome-mv3 gets video.html + stage.js and lets the Google
// content script run in frames too. video.html is then an extension page holding the real side
// panel and the saved results page side by side; Playwright clicks the real controls, and the
// stage draws titles, cursor and fades as a function of time.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const here = join(root, 'scripts', 'video');
const { chromium } = createRequire(join(root, 'package.json'))('playwright');
const [serpFile, linesDir, out] = process.argv.slice(2);
if (!serpFile || !linesDir || !out) {
  console.error('usage: film.mjs <serp.html> <linesDir> <framesDir>');
  process.exit(2);
}
const FPS = 30;
const SERP_URL = 'https://www.google.com/search?q=what+is+photosynthesis&hl=en';

// ---------------------------------------------------------------- filming copy of the extension

const dist = join(root, 'dist', 'chrome-mv3');
if (!existsSync(join(dist, 'manifest.json'))) throw new Error('dist/chrome-mv3 is missing — run `npm run build` first');
const work = mkdtempSync(join(tmpdir(), 'debloat-film-'));
const ext = join(work, 'ext');
cpSync(dist, ext, { recursive: true });
const manifest = JSON.parse(readFileSync(join(ext, 'manifest.json'), 'utf8'));
for (const cs of manifest.content_scripts) if (cs.matches.some((m) => m.includes('google'))) cs.all_frames = true;
writeFileSync(join(ext, 'manifest.json'), JSON.stringify(manifest));
for (const f of ['video.html', 'stage.js']) cpSync(join(here, f), join(ext, f));
cpSync(join(root, 'store-assets', 'video', 'art'), join(ext, 'art'), { recursive: true });

const serp = readFileSync(serpFile, 'utf8')
  .replace(/<script\b[\s\S]*?<\/script>/gi, '')
  .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '')
  // The account button (avatar) stays out of the picture.
  .replace('</head>', '<style>a[aria-label^="Google Account"],a[href*="SignOutOptions"],img[src*="googleusercontent.com/ogw"]{visibility:hidden!important}</style></head>');

const seconds = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]));
const voice = Object.fromEntries(
  JSON.parse(readFileSync(join(here, 'narration.json'), 'utf8')).lines.map((l) => [l.id, seconds(join(linesDir, `${l.id}.wav`))]),
);

// ---------------------------------------------------------------- browser

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const ctx = await chromium.launchPersistentContext(join(work, 'profile'), {
  channel: 'chromium',
  headless: true,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--no-first-run', '--hide-scrollbars', '--lang=en-US'],
  ignoreDefaultArgs: ['--enable-automation', '--disable-component-extensions-with-background-pages'],
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
  colorScheme: 'dark',
  locale: 'en-US',
});
const log = [];
try {
  let sw = ctx.serviceWorkers().find((w) => w.url().endsWith('background.js'));
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { predicate: (w) => w.url().endsWith('background.js') });
  const extId = sw.url().split('/')[2];
  await ctx.route('https://www.google.com/search*', (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: serp }));
  // Nothing from the saved page may phone home (it has no scripts, but images and pings stay local).
  await ctx.route(/google\.com\/(gen_204|log|client_204|async|complete)/, (r) => r.abort());

  // Start state: AI hiding off, so the AI Overview is visible; no "allow all sites" notice.
  await sw.evaluate(async () => {
    const { settings } = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({ settings: { ...(settings ?? {}), ai: false, subToggles: { window_ai: false } } });
  });

  const page = await ctx.newPage();
  page.on('console', (m) => console.log('[page]', m.text()));
  await page.goto(`chrome-extension://${extId}/video.html`);
  await page.evaluate((u) => {
    document.getElementById('serp').src = u;
    document.getElementById('side1').src = 'sidepanel.html';
    document.getElementById('side2').src = 'sidepanel.html';
  }, SERP_URL);
  const frameById = async (id) => {
    for (;;) {
      for (const f of page.frames()) {
        const el = await f.frameElement().catch(() => null);
        if (el && (await el.getAttribute('id')) === id) return f;
      }
      await page.waitForTimeout(100);
    }
  };
  const serpFrame = await frameById('serp');
  const side1 = await frameById('side1');
  const side2 = await frameById('side2');
  await serpFrame.waitForLoadState('load');
  await side1.waitForSelector('[data-testid="categories"]');
  await side2.waitForSelector('[data-testid="categories"]');
  await page.waitForTimeout(1500);

  // ---------------------------------------------------------------- timeline

  let frame = 0;
  const now = () => frame / FPS;
  const stage = (fn, ...a) => page.evaluate(([f, args]) => window.__stage[f](...args), [fn, a]);
  const renderTo = async (t) => {
    while (now() < t) {
      await page.evaluate((x) => window.__seek(x), now());
      await page.screenshot({ path: join(out, `${String(frame).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
      frame += 1;
      if (frame % FPS === 0) process.stdout.write(`\r${frame} frames (${now().toFixed(0)} s)`);
    }
  };
  const wait = (s) => renderTo(now() + s);
  const cue = (id, lead = 0.25) => log.push(`cue ${id} at ${Math.round((now() + lead) * 1000)} ms`);
  const scene = (id) => stage('scene', id, now());
  const step = (n, text) => stage('step', n, text, now());
  const center = async (f, sel) => {
    const b = await f.locator(sel).first().boundingBox();
    if (!b) throw new Error(`no box for ${sel}`);
    return [b.x + b.width / 2, b.y + b.height / 2];
  };
  const moveTo = async (f, sel, dur = 0.8) => {
    await stage('move', await center(f, sel), now(), dur);
    await wait(dur + 0.15);
  };
  const click = async (f, sel) => {
    const [x, y] = await center(f, sel);
    await stage('click', x, y, now());
    // element.click(): the scaled iframe confuses hit-testing of a real mouse click; the controls
    // react the same way (a label click toggles its checkbox).
    await f.locator(sel).first().evaluate((el) => el.click());
    await page.waitForTimeout(300); // storage → content script, in real time
    await wait(0.5);
  };
  // A line plus a pause before the next one.
  const say = (id, extra = 0.6) => {
    cue(id);
    return voice[id] + 0.25 + extra;
  };

  // 0 — 301.st card
  scene('studio');
  await wait(2.4);

  // A — intro
  scene('intro');
  await wait(say('intro', 0.9));

  // B1 — a regular search with the AI Overview on top
  scene('demo');
  step(1, 'A regular Google search');
  await stage('cursor', false, now());
  await wait(0.5);
  await wait(say('before', 0.3));

  // B2 — one switch in the side panel hides it
  step(2, 'One switch in the side panel');
  let t = now();
  cue('hide');
  await stage('cursor', true, now());
  await moveTo(side1, 'label:has(> [data-testid="master-toggle-ai"])');
  await click(side1, 'label:has(> [data-testid="master-toggle-ai"])');
  await renderTo(t + voice.hide + 0.25 + 0.7);

  // B3 — or collapse it to a bar
  step(3, 'Or keep it one click away');
  t = now();
  cue('collapse');
  await moveTo(side1, '[data-testid="expand-ai"]', 0.7);
  await click(side1, '[data-testid="expand-ai"]');
  await moveTo(side1, 'label:has(> [data-testid="sub-toggle-ai_overview_minimize"])', 0.6);
  await click(side1, 'label:has(> [data-testid="sub-toggle-ai_overview_minimize"])');
  await moveTo(serpFrame, '.debloat-minibar button', 0.9);
  await click(serpFrame, '.debloat-minibar button');
  await wait(1.2);
  await moveTo(serpFrame, '.debloat-minibar button', 0.3);
  await click(serpFrame, '.debloat-minibar button');
  await renderTo(Math.max(now() + 0.3, t + voice.collapse + 0.25 + 0.6));

  // B4 — pause for an hour, then resume
  step(4, 'Pause for an hour');
  t = now();
  cue('pause');
  await moveTo(side1, '[data-testid="pause-1h"]', 0.8);
  await click(side1, '[data-testid="pause-1h"]');
  await wait(1.6);
  await click(side1, '[data-testid="pause-1h"]');
  await renderTo(Math.max(now() + 0.4, t + voice.pause + 0.25 + 0.6));
  await stage('cursor', false, now());

  // C — more than Google (the panel reloaded so it shows the current settings)
  await side2.goto(`chrome-extension://${extId}/sidepanel.html`);
  await side2.waitForSelector('[data-testid="categories"]');
  scene('more');
  await wait(say('more', 1.0));

  // D — outro
  scene('outro');
  await wait(say('outro', 2.2));

  writeFileSync(join(out, 'console.log'), `${log.join('\n')}\n`);
  console.log(`\r${frame} frames, ${now().toFixed(1)} s → ${out}`);
} finally {
  await ctx.close();
  rmSync(work, { recursive: true, force: true });
}
