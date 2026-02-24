# Debloat — Browser Extension

Browser extension that removes AI features, sponsored content, shopping tools, telemetry, and annoyances from Chrome, Edge, and Firefox. One click, no admin rights.

**Current version:** 1.0.1 (released 2026-02-25)

## Tech Stack

- **Framework:** WXT 0.19+ (`srcDir: 'src'`, `outDir: 'dist'`)
- **Language:** TypeScript 5.7+ (strict, no `any`)
- **Browser API:** `import { browser } from 'wxt/browser'` — cross-browser polyfill (NOT raw `chrome.*`)
- **Styling:** Vanilla CSS with BEM + CSS variables (`tokens.css`)
- **Linting:** Biome 2.x
- **Testing:** Vitest 4.x + happy-dom (unit), Playwright (e2e smoke)
- **No frameworks** — vanilla DOM, no React/Vue/Svelte

## Commands

```bash
npm run build              # Chrome (default)
npm run build:edge         # Edge
npm run build:firefox      # Firefox
npm run build:all          # All three

npm run check              # typecheck + lint + test (CI gate)
npm run test               # Vitest unit tests only
npm run test:e2e           # Playwright e2e smoke tests (requires build first)
npm run lint:fix           # Biome auto-fix

npm run dev                # WXT dev mode (Chrome)
npm run dev:firefox        # WXT dev mode (Firefox)

npm run zip:all            # Create store-ready ZIP files for all browsers
```

## Architecture

### Three-Layer Blocking

1. **declarativeNetRequest (dNR)** — HTTP-level blocking. Rules in `src/public/rules/` (6 rulesets: 3 telemetry + ai_endpoints + shopping + sponsored)
2. **CSS injection** — `display: none !important` at `document_start`. Styles in content script CSS files
3. **DOM MutationObserver** — catches dynamically injected elements that CSS can't target

### Directory Layout

```
src/
  entrypoints/          WXT entry points
    background.ts         Service worker
    sidepanel/            Side Panel (Chrome/Edge) + Sidebar + Popup (Firefox)
    welcome/              Welcome page (opens on first install)
    bing-search.content/    Manifest-registered: AI hiding on Bing Search
    google-search.content/  Manifest-registered: AI Overview hiding on Google
    ntp-edge.content/       Manifest-registered: NTP cleanup on Edge
    edge-ui.content.ts      Runtime-registered: Copilot, shopping overlays (<all_urls>)
    ai-apis.content.ts      Web AI API blocking (window.ai)
  background/           Service worker modules (badge, rules, pause, browser detection)
  selectors/            CSS selectors per target site — modular, update when sites change
  shared/               Types, constants, settings, messaging, url normalization, report-hidden
  ui/                   DOM helpers: icons, toggle, counter, category-card, activity-drawer
  assets/styles/        tokens.css (design tokens, dark/light theme)
  public/               Static assets copied to dist (_locales, rules, icons, brand.svg)
```

### Browser API Pattern

**CRITICAL:** Always use `import { browser } from 'wxt/browser'`, never raw `chrome.*`.
Firefox MV2 `chrome.*` APIs use callbacks, not Promises — `await chrome.storage.local.get()` returns `undefined`.
The WXT `browser` import provides the webextension-polyfill that works across all browsers.

When the `browser` import conflicts with a local variable (e.g. `detectBrowser()` return value), either:
- Rename the local: `const currentBrowser = detectBrowser()`
- Alias the import: `import { browser as webBrowser } from 'wxt/browser'`

For i18n with WXT strict types, cast message keys:
```typescript
type MsgKey = Parameters<typeof browser.i18n.getMessage>[0];
browser.i18n.getMessage('MY_KEY' as MsgKey)
```

For Chrome-only APIs not in WXT types (e.g. `getMatchedRules`), use `unknown` cast chain.

### Content Scripts

- **Manifest-registered** (instant, `document_start`): `bing-search.content`, `google-search.content`, `ntp-edge.content`
- **Runtime-registered** (via `browser.scripting`, optional `<all_urls>`): `edge-ui.content`

### Site Whitelist & CSS Scoping

Content script CSS rules are scoped with `html:not([data-debloat-allow-CATEGORY])` so the whitelist can disable hiding per category. When a content script detects the current site is whitelisted (or the category is globally disabled), it sets `data-debloat-allow-CATEGORY` attribute on `<html>`, neutralizing the CSS rules and skipping the MutationObserver.

Pattern for single-category scripts (bing-search, google-search):
```typescript
const host = normalizeHost(location.hostname);
const whitelisted = settings.siteWhitelist[host] ?? [];
if (!settings.ai || whitelisted.includes('ai')) {
  document.documentElement.setAttribute('data-debloat-allow-ai', '');
  return;
}
```

Pattern for multi-category scripts (ntp-edge):
```typescript
for (const cat of allCategories) {
  if (!settings[cat] || whitelisted.includes(cat)) {
    document.documentElement.setAttribute(`data-debloat-allow-${cat}`, '');
  }
}
```

CSS scoping example:
```css
html:not([data-debloat-allow-ai]) #copans_container { display: none !important; }
```

### CSS/DOM Hide Reporting

Content scripts track hidden elements via `createHideReporter(category)` from `src/shared/report-hidden.ts`:
- `WeakSet<HTMLElement>` deduplicates (same element counted once)
- `setTimeout` debounce (500ms) → single `REPORT_CSS_HIDDEN` message to background
- Fire-and-forget with try/catch for invalidated context
- Background merges CSS counts into badge (dNR + CSS) and Activity log

### Settings & Storage

- Single key `settings` in `browser.storage.local`
- 5 master categories: `ai`, `sponsored`, `shopping`, `telemetry`, `annoyances`
- 36 sub-toggles with per-browser visibility (`browsers: ['chrome' | 'edge' | 'firefox']`)
- 4 presets: aggressive (default, all ON), balanced, minimal, custom
- Site whitelist: `normalizedHost → CategoryId[]` (normalized via `src/shared/url.ts`)
- Pause: `pauseUntil` timestamp (default 1 hour)

### URL Normalization

`src/shared/url.ts` provides `normalizeHost()` — strips `www.`, ports, trailing dots, lowercases.
Used in `addSiteWhitelist()`, `removeSiteWhitelist()`, and content script whitelist checks.

### Messaging

Typed request-response via `browser.runtime.sendMessage()`:

| Request | Payload | Response |
|---------|---------|----------|
| `GET_TAB_COUNT` | `tabId` | `{ count }` |
| `GET_ACTIVITY` | `tabId` | `{ entries: ActivityEntry[] }` |
| `PAUSE` | `durationMs` | `OK` |
| `UNPAUSE` | — | `OK` |
| `WHITELIST_SITE` | `domain, categories[]` | `OK` |
| `UNWHITELIST_SITE` | `domain` | `OK` |
| `REPORT_CSS_HIDDEN` | `domain, count, category` | (fire-and-forget) |

### Multi-Browser Build

WXT builds three targets from one codebase:

| Target | Manifest | Side Panel | Toolbar Icon |
|--------|----------|------------|--------------|
| Chrome | MV3 | `side_panel` + `sidePanel` perm | `action` → `setPanelBehavior` opens side panel |
| Edge | MV3 | `side_panel` + `sidePanel` perm | `action` → `setPanelBehavior` opens side panel |
| Firefox | MV2 | `sidebar_action` (auto from WXT) | `browser_action` with `default_popup: sidepanel.html` |

`build:manifestGenerated` hook handles:
- Strip `<all_urls>` from `host_permissions` (keep in `optional_host_permissions` only)
- Firefox: `data_collection_permissions` (AMO requirement), `sidebar_action` enrichment
- Firefox: set `action.default_popup = 'sidepanel.html'` (WXT converts `action` → `browser_action` for MV2)
- Firefox: `optional_host_permissions` → `optional_permissions` conversion (MV2 compat)
- Ensure `optional_permissions: []` exists in all manifests

### Badge & Toolbar

- Badge shows merged count: dNR network blocks + CSS/DOM hidden elements
- Badge color: `#10B981` (emerald) — matches brand
- Flash amber `#FFB347` for 600ms on new blocks (per-tab debounce)
- Grey `#6B7280` with `⏸` text while paused
- Dynamic tooltip: "Debloat: N blocked" / "Debloat: paused"
- Compat: `browser.action ?? browser.browserAction` for MV3/MV2

### Welcome & Uninstall

- **Welcome page** (`src/entrypoints/welcome/`): opens on first install via `browser.runtime.onInstalled`
  - Hero with inline brand SVG (`currentColor` for theme support)
  - Feature cards from CATEGORIES array, flexbox centered layout
  - Cross-browser CTA: `sidePanel.open()` (Chrome/Edge) / `sidebarAction.open()` (Firefox)
- **Uninstall URL**: `browser.runtime.setUninstallURL('https://debloat.click/uninstall')`

### Sidepanel Layout

Flex-based sticky layout (pattern from fastweb reference):
- Header + presets + quick controls: `flex-shrink: 0` (pinned top)
- Cards container: `flex: 1; overflow-y: auto` (scrollable middle)
- Footer (Enable All / Disable All): `flex-shrink: 0` (pinned bottom)
- Activity drawer: overlay panel with polling, "Allow on site" per-entry (reloads tab), "Report" issue link
- Header: whitelist toggle (persistent green state), activity log button, theme toggle
- `min-width: 360px; min-height: 520px` on body for Firefox popup sizing

### Edge MV3 Gotchas

- Extension CSS from manifest content scripts is NOT visible via `document.styleSheets` from main world
- `browser.scripting.registerContentScripts()` may silently fail for unpacked extensions
- Prefer manifest content scripts; use DOM markers (`data-debloat`) to verify execution

## Tests

10 test files, 101 tests, happy-dom environment:

| File | What it tests |
|------|---------------|
| `constants.test.ts` | CATEGORIES icon keys, browser coverage matrix, STORE_URLS |
| `toggle.test.ts` | createToggle(), setToggleState() DOM rendering |
| `category-card.test.ts` | Card rendering, browser filtering (Chrome/Edge/Firefox), callbacks |
| `settings.test.ts` | loadSettings/saveSettings/patchSettings with storage mock |
| `rules.test.ts` | 6 dNR JSON rule files: structure, ID uniqueness, resourceTypes |
| `browser.test.ts` | detectBrowser() UA parsing, caching, Edge-over-Chrome priority |
| `selectors.test.ts` | All exported selector arrays per module (6 modules incl. bing-search) |
| `icons.test.ts` | icon() SVG generation, 19 registered icon names, fallbacks |
| `url-normalization.test.ts` | normalizeHost(), hostFromUrl(), IDN/punycode, www/port stripping |
| `report-hidden.test.ts` | WeakSet dedup, debounce, message payload, post-flush reset |

### Test Mocking Pattern

Tests mock `wxt/browser` module (NOT global `chrome`):
```typescript
// Use vi.hoisted() for variables needed inside vi.mock() factory
const { storeRef, storageMock } = vi.hoisted(() => {
  const storeRef = { current: {} as Record<string, unknown> };
  const storageMock = { local: { get: vi.fn(...), set: vi.fn(...) } };
  return { storeRef, storageMock };
});

vi.mock('wxt/browser', () => ({
  browser: { storage: storageMock },
}));
```

### E2E Smoke Tests

8 tests in `tests/e2e/`, run against a real Chromium instance with the extension loaded.

**Setup:** Playwright `launchPersistentContext` with `--load-extension` flag. Uses Playwright's bundled Chromium (not system Chrome — Chrome 127+ deprecated `--load-extension`). Requires `npm run build` first.

**Config:** `vitest.config.e2e.ts` (separate from unit config, no happy-dom environment).

**Key patterns:**
- `ignoreDefaultArgs: ['--enable-automation', '--disable-component-extensions-with-background-pages']` — required for extension loading
- Filter service workers by `background.js` to skip Chrome component extension SWs
- Shopping category is Edge-only → Chromium shows 4 cards, not 5

### data-testid Selectors

All interactive elements have `data-testid` attributes for stable E2E selectors:
- `header`, `header-title`, `theme-toggle`, `whitelist-site`
- `preset-selector`, `preset-{id}`, `quick-controls`, `pause-1h`
- `categories`, `category-{id}`, `master-toggle-{id}`, `expand-{id}`, `coverage-{id}`
- `sub-row-{id}`, `sub-toggle-{id}`
- `enable-all`, `disable-all`
- `activity-log`, `activity-list`, `activity-clear`, `activity-close`
- `activity-row-{i}`, `activity-allow-{i}`, `activity-report-{i}`

## i18n

2 locales: `en` (default), `ru` (primary developer). 27 keys in `_locales/{lang}/messages.json`.

## Conventions

- **Browser API:** Always `import { browser } from 'wxt/browser'`, never raw `chrome.*`
- Selectors break when sites update — keep them modular in `src/selectors/`
- Content script CSS rules MUST be scoped with `html:not([data-debloat-allow-CATEGORY])` for whitelist support
- Content scripts MUST check `siteWhitelist` before running observers
- Localization: `browser.i18n.getMessage()` with keys from `_locales/`
- All categories ON by default (aggressive preset)
- User language: Russian (primary developer), English (default locale)
- CSS: BEM naming, `tokens.css` design tokens, `data-theme="light"` for light mode
- WCAG AA contrast compliance for interactive elements
- Version managed in TWO places: `package.json` and `wxt.config.ts` (must stay in sync)

## CI/CD

Two GitHub Actions workflows (`.github/workflows/`):
- **ci.yml** — push/PR to main: prepare → typecheck → lint → test → build:all
- **release.yml** — `v*` tags: same checks + zip:all → GitHub Release (prerelease if tag contains `-`)

Release process:
```bash
# Update version in package.json and wxt.config.ts, then:
git tag v1.x.x
git push origin v1.x.x
# CI automatically builds, tests, zips, and creates GitHub Release with artifacts
```

## Reference Projects

Style and architecture patterns borrowed from:
- `W:\projects\cookiepeak` — similar WXT extension, popup-based UI
- `W:\projects\fastweb` — similar WXT extension, sidepanel UI, manifest hooks pattern, Firefox popup fallback
- `W:\Projects\temp_scr` — Playwright e2e pattern for browser extensions (launchPersistentContext)
