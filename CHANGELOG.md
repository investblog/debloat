# Changelog

All notable changes to Debloat are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - Unreleased

### Fixed
- Google "Collapse to a bar": on Google's current grid layout the bar landed in the left gutter as a
  tall empty box; it now takes the AI Overview's column and sits above the results.

## [1.1.0] - 2026-11-24 (uploaded as a store draft, superseded by 1.1.1 before publishing)

### Added
- Google: new AI Overview detection (current markers + localized "AI Overview" headings),
  climbing to the module container without ever hiding organic results.
- Google: "People also ask" and AI parts of "Things to know" sub-toggles; AI Mode tab found by its
  `udm=50` link in every language. Google sub-toggles now also show (and work) on Firefox.
- Google: "Collapse to a bar" option — AI Overview becomes a slim bar with a Show/Hide button.
- Google: optional "Classic web results" mode (`udm=14` via a dynamic dNR redirect), off by
  default, with a one-time "Show AI for this search" bypass in the side panel.
- Google: "All Google domains" button — optional permission for the other 169 country domains
  (the manifest keeps the same 18, so updating doesn't re-prompt users).
- Side panel asks for access to all sites when it's needed: hiding Copilot in Edge pages and blocking
  web AI APIs (`window.ai`) never worked before, because nothing ever requested that optional permission.
- Side panel footer: icon links as in the other 301.st extensions — How it works, Rate, GitHub issues,
  301.st, Telegram support chat. (The old "Rate" link vanished after the first re-render of the cards.)
- 19 new interface languages (21 total); store name and description lead with
  "Hide Google AI Overview & AI Mode".

### Changed
- Sub-toggles, pause and the site allow-list apply to Google instantly, without reload.
- Pause now also stops CSS hiding on Bing, Edge NTP and Edge UI (checked on page load).
- Badge counts only blocked requests and hidden elements (not redirects/allow rules).
- Side panel only, no popup: in Firefox the toolbar button now toggles the sidebar (also bindable
  as a keyboard shortcut) instead of opening the panel as a popup.

### Fixed
- The all-sites permission check looked for `<all_urls>` while the manifest offers `*://*/*`, so a
  granted permission was never recognized. Edge UI / `window.ai` scripts are also unregistered while paused.
- Welcome page "Open Side Panel" did nothing in Edge (the click's user gesture was lost before the call).

### Removed
- AI Scout opt-in reporting: collector, Send Report button, Scout toggle, welcome opt-in, indigo badge state.
  The reporting endpoint was unreachable, so no reports were ever delivered.
- `notifications` permission (it was used only by AI Scout).
- Stored `scoutReporting` / `scoutInstallId` settings are cleaned up on load.

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
