# Privacy Policy

**Debloat** is a browser extension that blocks unwanted content (AI features, sponsored posts, shopping overlays, telemetry, and annoyances) locally on your device.

**Effective date:** 2026-02-24

## Data we collect

None. Debloat does not collect, transmit, or store any personal data.

## How the extension works

- **Blocking rules** run entirely inside your browser using the declarativeNetRequest API. No network requests are made by the extension itself.
- **Settings** (toggle states, presets, site whitelist) are stored locally in your browser via `browser.storage.local`. They never leave your device.
- **Activity log** (blocked request counts per tab) is held in memory only and cleared when the tab is closed.

## Permissions explained

| Permission | Why |
|---|---|
| `storage` | Save your toggle and preset preferences locally |
| `declarativeNetRequest` | Block unwanted network requests (telemetry, ads, AI endpoints) |
| `scripting` | Inject CSS/JS to hide UI elements on specific sites |
| `webNavigation` | Reset per-tab counters on page navigation |
| `sidePanel` (Chrome/Edge) | Provide the settings panel |

## Third-party services

Debloat does not communicate with any external servers, APIs, or analytics services. There are no tracking pixels, no crash reporters, and no usage telemetry.

## Site whitelist

When you whitelist a site, the domain is stored locally on your device. It is not shared with anyone.

## Updates

The extension is updated through official browser extension stores (Chrome Web Store, Edge Add-ons, Firefox Add-ons). Updates are delivered by the browser itself, not by the extension.

## Changes to this policy

If this policy changes, the updated version will be published in the extension repository and on the extension website.

## Contact

If you have questions about this privacy policy, open an issue at [github.com/investblog/debloat](https://github.com/investblog/debloat) or email support@debloat.click.
