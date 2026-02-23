# Debloat - Browser Extension

## Overview
Browser extension that removes AI features, sponsored content, shopping tools, telemetry, and annoyances from Chrome, Edge, and Firefox. One click, no admin rights.

## Tech Stack
- **Framework:** WXT 0.19+ (`srcDir: 'src'`, `outDir: 'dist'`)
- **Language:** TypeScript 5.7+ (strict, no `any`)
- **Styling:** Vanilla CSS with BEM + CSS variables (`tokens.css`)
- **Linting:** Biome 2.x
- **Testing:** Vitest 4.x + Puppeteer (smoke tests)
- **No frameworks** — vanilla DOM, no React/Vue/Svelte

## Build Commands
```bash
npx wxt build              # Chrome
npx wxt build -b edge      # Edge
npx wxt build -b firefox   # Firefox
npx wxt zip:all             # All three zips
npx tsc --noEmit            # Typecheck
npx biome check src/        # Lint
```

## Architecture

### Three-Layer Blocking
1. **declarativeNetRequest (dNR):** HTTP request blocking — rules in `src/public/rules/`
2. **CSS injection:** `display: none !important` at `document_start` — styles in content script CSS files
3. **DOM manipulation:** MutationObserver for dynamic elements — JS content scripts

### Key Directories
- `src/entrypoints/` — WXT entry points (background, content scripts, sidepanel, sidebar)
- `src/background/` — Service worker modules (badge, rules, pause, browser detection)
- `src/selectors/` — CSS selectors per target site (modular, easy to update when sites change)
- `src/shared/` — Types, constants, settings, messaging
- `src/ui/` — DOM helpers and UI components (toggle, counter, category-card)
- `src/public/` — Static assets copied to dist (_locales, rules, icons)

### Content Scripts
- **Manifest-registered** (default): `google-search.content`, `ntp-edge.content` — works in Edge MV3
- **Runtime-registered**: `edge-ui.content` — requires optional `<all_urls>` permission

### Important Edge MV3 Notes
- Extension CSS from manifest content scripts is NOT visible via `document.styleSheets` from main world — this is normal
- `chrome.scripting.registerContentScripts()` may silently fail for unpacked extensions
- `chrome.scripting.insertCSS({ files: [...] })` may also fail — prefer manifest content scripts
- Always test with DOM markers (`data-debloat` attribute) to verify content script execution

### Settings Storage
- Single key `settings` in `chrome.storage.local`
- 5 master categories: `ai`, `sponsored`, `shopping`, `telemetry`, `annoyances`
- 37 sub-toggles with per-browser visibility
- Site whitelist: `domain → CategoryId[]`
- Pause: `pauseUntil` timestamp

### Messaging
Typed request-response via `chrome.runtime.sendMessage()`:
- `GET_TAB_COUNT` / `GET_ACTIVITY` — Side Panel polls
- `PAUSE` / `UNPAUSE` — pause controls
- `WHITELIST_SITE` / `UNWHITELIST_SITE` — per-site overrides

## Conventions
- Selectors break when sites update — keep them modular in `src/selectors/`
- Localization: `chrome.i18n.getMessage()` with keys in `_locales/{lang}/messages.json`
- Badge color: `#10B981` (emerald)
- All categories ON by default (aggressive preset)
- User language: Russian (primary developer), English (default locale)
