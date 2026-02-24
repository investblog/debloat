import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launchWithExtension, openSidePanel, withFixtureServer, type ExtensionContext } from './helpers';

let ctx: ExtensionContext;

beforeAll(async () => {
  ctx = await launchWithExtension();
}, 30_000);

afterAll(async () => {
  await ctx?.context.close();
});

describe('sidepanel ux flows', () => {
  it('renders baseline structure with controls', async () => {
    const page = await openSidePanel(ctx);
    expect(await page.getByTestId('header-title').isVisible()).toBe(true);
    expect(await page.getByTestId('quick-controls').isVisible()).toBe(true);
    expect(await page.getByTestId('preset-selector').isVisible()).toBe(true);
    expect(await page.getByTestId('enable-all').isVisible()).toBe(true);
    expect(await page.getByTestId('disable-all').isVisible()).toBe(true);
    expect(await page.getByTestId('activity-toggle').isVisible()).toBe(true);
    expect(await page.locator('[data-testid^="category-"]').count()).toBe(5);
    await page.close();
  });

  it('fresh defaults are all enabled and coverage is populated', async () => {
    const page = await openSidePanel(ctx);
    expect(await page.getByTestId('master-toggle-ai').isChecked()).toBe(true);
    expect(await page.getByTestId('master-toggle-sponsored').isChecked()).toBe(true);
    expect(await page.getByTestId('master-toggle-shopping').isChecked()).toBe(true);
    expect(await page.getByTestId('master-toggle-telemetry').isChecked()).toBe(true);
    expect(await page.getByTestId('master-toggle-annoyances').isChecked()).toBe(true);
    const coverage = await page.getByTestId('coverage-ai').textContent();
    expect((coverage ?? '').trim().length).toBeGreaterThan(0);
    await page.close();
  });

  it('master toggle propagates to children and persists reopen', async () => {
    const page = await openSidePanel(ctx);
    await page.getByTestId('expand-ai').click();
    await page.getByTestId('master-toggle-ai').uncheck();
    expect(await page.getByTestId('sub-toggle-ai_overview').isChecked()).toBe(false);
    await page.getByTestId('master-toggle-ai').check();
    expect(await page.getByTestId('sub-toggle-ai_overview').isChecked()).toBe(true);
    await page.close();

    const reopened = await openSidePanel(ctx);
    expect(await reopened.getByTestId('master-toggle-ai').isChecked()).toBe(true);
    await reopened.close();
  });

  it('browser-specific sub toggles are hidden when not applicable', async () => {
    const page = await openSidePanel(ctx);
    await page.getByTestId('expand-ai').click();
    expect(await page.getByTestId('sub-row-help_me_write').count()).toBe(0);
    expect(await page.getByTestId('sub-row-gemini_suggestions').count()).toBe(1);
    await page.close();
  });

  it('presets map to deterministic states and manual change sets custom', async () => {
    const page = await openSidePanel(ctx);
    await page.getByTestId('preset-minimal').click();
    expect(await page.getByTestId('master-toggle-ai').isChecked()).toBe(false);
    expect(await page.getByTestId('master-toggle-telemetry').isChecked()).toBe(true);

    await page.getByTestId('preset-balanced').click();
    expect(await page.getByTestId('master-toggle-ai').isChecked()).toBe(true);
    expect(await page.getByTestId('master-toggle-sponsored').isChecked()).toBe(false);

    await page.getByTestId('master-toggle-sponsored').check();
    expect(await page.getByTestId('preset-custom').getAttribute('class')).toContain('preset--active');
    await page.close();
  });

  it('this site whitelist + pause store normalized host and pause expiry timestamp', async () => {
    const tab = await ctx.context.newPage();
    await tab.goto('http://example.com');
    const page = await openSidePanel(ctx);
    await page.getByTestId('whitelist-site').click();
    await page.getByTestId('pause-1h').click();
    await page.waitForTimeout(200);
    const stored = await page.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
    expect(stored.siteWhitelist['example.com']).toBeDefined(); // host-level whitelist: subdomains are separate entries
    expect(stored.pauseUntil).toBeGreaterThan(Date.now());
    await page.close();
    await tab.close();
  });

});

describe('blocking mechanics', () => {
  it('dnr blocks telemetry path and activity entries render + report link', async () => {
    const { server, port } = await withFixtureServer((req, res) => {
      res.setHeader('content-type', 'text/html');
      res.end(`<script>fetch('https://clients.google.com/tbproxy/test',{mode:'no-cors'}).catch(()=>{});</script>`);
    });

    const page = await ctx.context.newPage();
    await page.goto(`http://127.0.0.1:${port}`);
    await page.waitForTimeout(800);

    const sp = await openSidePanel(ctx);
    await sp.getByTestId('activity-toggle').click();
    expect(await sp.getByTestId('activity-row-0').isVisible()).toBe(true);
    expect(await sp.getByTestId('activity-row-0').textContent()).toContain('telemetry_');
    const href = await sp.getByTestId('activity-report-0').getAttribute('href');
    expect(href).toContain('domain=');
    expect(href).toContain('rulesetId=');
    await sp.getByTestId('activity-clear').click();
    await sp.close();

    await page.close();
    await new Promise((resolve) => server.close(resolve));
  });

  it('google css at document_start + mutation observer hide ai blocks deterministically', async () => {
    const { server, port } = await withFixtureServer((req, res) => {
      const html = `<!doctype html><body>
      <div id='ai-overview-card'>AI should never show</div>
      <script>setTimeout(()=>{const d=document.createElement('div');d.id='ai-overview-card';d.textContent='late';document.body.append(d);}, 50);</script>
      </body>`;
      res.setHeader('content-type', 'text/html');
      res.end(html);
    });

    const page = await ctx.context.newPage();
    await page.goto(`http://www.google.com:${port}/search?q=debloat`);
    const hiddenNow = await page.locator('#ai-overview-card').evaluate((el) => getComputedStyle(el).display === 'none');
    expect(hiddenNow).toBe(true);
    await page.waitForTimeout(150);
    const hiddenLater = await page.locator('#ai-overview-card').first().evaluate((el) => getComputedStyle(el).display === 'none');
    expect(hiddenLater).toBe(true);
    await page.close();
    await new Promise((resolve) => server.close(resolve));
  });
});
