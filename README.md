# Debloat

> *We did everything they allowed us to.*

Browser extension that removes AI features, sponsored content, shopping tools, telemetry, and annoyances from **Chrome**, **Edge**, and **Firefox**. One click, no admin rights.

![License](https://img.shields.io/github/license/investblog/debloat)
![GitHub release](https://img.shields.io/github/v/release/investblog/debloat?include_prereleases)
![CI](https://github.com/investblog/debloat/actions/workflows/ci.yml/badge.svg)

## What it blocks

| Category | Examples |
|---|---|
| **AI Features** | Google AI Overview, Gemini suggestions, Copilot sidebar, Help Me Write, Visual Search, AI History, window.ai |
| **Sponsored Content** | MSN/News feed on NTP, sponsored tiles, Discover cards, recommended stories |
| **Shopping** | Shopping Assistant, price comparison popups, coupons, express checkout |
| **Telemetry** | Google/Microsoft/Mozilla diagnostic endpoints, crash reporting, Firefox Studies |
| **Annoyances** | Rewards prompts, feature banners, "Set as default" nags, DALL-E themes, Bing redirect |

## How it works

Three-layer blocking, all within the extension API sandbox:

1. **declarativeNetRequest** — blocks HTTP requests at the network level (telemetry endpoints, shopping APIs, sponsored feeds)
2. **CSS injection** — hides UI elements at `document_start` before they render
3. **DOM mutation observer** — catches dynamically injected elements that CSS can't target

No admin rights. No system modifications. No enterprise policies. Just a browser extension.

## Install

| Browser | Store | Status |
|---|---|---|
| Chrome | Chrome Web Store | Coming soon |
| Edge | Edge Add-ons | Coming soon |
| Firefox | Firefox Add-ons | Coming soon |

### Manual install (from release)

1. Download the zip for your browser from [Releases](https://github.com/investblog/debloat/releases)
2. Unzip to a folder
3. **Chrome/Edge**: go to `chrome://extensions`, enable Developer mode, click "Load unpacked", select the folder
4. **Firefox**: go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", select `manifest.json`

## Build from source

```bash
git clone https://github.com/investblog/debloat.git
cd debloat
npm install

npm run build          # Chrome
npm run build:firefox  # Firefox
npm run build:edge     # Edge
npm run build:all      # All three

npm run check          # Typecheck + lint + tests
```

## Tech stack

- [WXT](https://wxt.dev) — next-gen web extension framework
- TypeScript 5.7+ (strict, no `any`)
- Vanilla DOM — no React/Vue/Svelte
- [Biome](https://biomejs.dev) — linter & formatter
- [Vitest](https://vitest.dev) — unit tests with happy-dom

## Inspiration & related projects

This extension stands on the shoulders of the browser debloating community:

- [Just the Browser](https://github.com/corbindavenport/just-the-browser) — script that strips AI/telemetry from Chrome, Edge, Firefox via enterprise policies
- [MSEdgeRedirect](https://github.com/rcmaehl/MSEdgeRedirect) — redirects Windows Edge-forced links to your default browser
- [Arkenfox user.js](https://github.com/arkenfox/user.js) — the gold standard for Firefox hardening and telemetry removal
- [Bye Bye, Google AI](https://chromewebstore.google.com/detail/bye-bye-google-ai-turn-of/imllolhfajlbkpheaapjocclpppchggc) — hides AI Overviews from Google Search
- [uBlock Origin](https://github.com/gorhill/uBlock) — the content filtering king, supports custom AI blocklists
- [uBlacklist](https://github.com/iorate/ublacklist) — blocks sites from search results, community AI content lists
- [Consent-O-Matic](https://github.com/cavi-au/Consent-O-Matic) — auto-rejects cookie consent popups
- [Brave-Debloater](https://github.com/Anxarden/brave-debloater) — strips AI, Rewards, Wallet from Brave
- [RemoveWindowsAI](https://github.com/zoicware/RemoveWindowsAI) — removes Copilot and Recall from Windows 11

**Debloat** takes a different approach: instead of system scripts or enterprise policies, it works entirely as a browser extension — installable by anyone, no elevated permissions required.

## License

MIT
