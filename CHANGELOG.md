# Changelog

All notable changes to Debloat are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-03-07

### Added
- AI Scout integration: opt-in anonymous detection of new AI elements
- Scout candidate collection in Bing Search and Google Search content scripts
- Scout reporting flow: collect candidates, store per-tab, user-initiated send to Worker
- Browser notifications for Scout report results
- Scout toggle in sidepanel quick controls (radar icon)
- Scout opt-in section on welcome page
- Badge signal for new unknown AI element discoveries (indigo indicator)
- Activity log button highlights when entries are available
- `#b_copilot_container` selector for Bing Search (found via AI Scout)
- `known` / `unknown` candidate classification for Scout pipeline
- Real store URLs for Chrome Web Store, Edge Add-ons, and Firefox Add-ons

### Changed
- Activity drawer: Scout row with [Send Report] only shown for unknown elements
- Activity log button: subtle color for activity, aggressive pulse for unknown Scout finds
- Welcome page: compact layout with Scout opt-in section

## [1.0.2] - 2026-02-25

### Added
- Fallback selectors for Bing Copilot composer elements (`#b_copilot_composer_2`, `.b_copilot_send`)

### Fixed
- Bing Copilot composer hiding on pages with dynamic element IDs

## [1.0.1] - 2026-02-24

### Added
- Bing Search content script: hide Copilot answer panels, QnA blocks, chat composer, nav tab
- Site whitelist support: per-site, per-category allow-listing with `data-debloat-allow-*` CSS scoping
- Whitelist toggle button in sidepanel header (persistent green state)
- Activity log button in header
- Tooltip on activity rows (category, domain, timestamp, ruleset)
- CSS/DOM hidden element reporting: merged into badge counter and activity log
- `report-hidden.ts`: WeakSet dedup, debounce, fire-and-forget messaging

### Changed
- Badge now shows combined count: dNR network blocks + CSS/DOM hidden elements

## [1.0.0] - 2026-02-23

### Added
- Three-layer blocking: declarativeNetRequest, CSS injection, DOM MutationObserver
- 5 master categories: AI, Sponsored, Shopping, Telemetry, Annoyances
- 36 sub-toggles with per-browser visibility (Chrome, Edge, Firefox)
- 4 presets: Aggressive (default), Balanced, Minimal, Custom
- Side panel UI (Chrome/Edge) with sidebar fallback (Firefox) and popup fallback (Firefox toolbar)
- 6 dNR rulesets: ai_endpoints, sponsored, shopping, telemetry_chrome, telemetry_edge, telemetry_firefox
- Google Search content script: AI Overview hiding
- Edge NTP content script: MSN feed, sponsored tiles, Copilot, Spotlight cleanup
- Edge UI content script: Copilot sidebar, shopping overlays on all pages
- Web AI API blocking (window.ai)
- Dark/light theme toggle with CSS variables
- Welcome page on first install
- Uninstall URL redirect
- Badge with block counter, flash animation, pause indicator
- Pause/resume (1 hour default)
- Activity drawer with per-entry allow-on-site
- i18n support (English, Russian)
- 10 test files, 101 unit tests (Vitest + happy-dom)
- 8 Playwright e2e smoke tests
- GitHub Actions CI/CD: typecheck, lint, test, build, release
- Cross-browser builds: Chrome MV3, Edge MV3, Firefox MV2

[1.0.3]: https://github.com/investblog/debloat/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/investblog/debloat/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/investblog/debloat/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/investblog/debloat/releases/tag/v1.0.0
