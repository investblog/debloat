# Testing

## Unit/integration

```bash
npm test
```

Covers settings migrations/defaults, URL normalization, UI component behavior, rules and badge formatting.

## E2E UX / user-flow

Build extension first:

```bash
npm run build
npm run test:e2e
```

E2E suite loads unpacked Chromium extension and validates side panel UX, presets, master/child toggles,
whitelist/pause controls, activity drawer actions, deterministic DNR matching, and content-script hiding behavior
against local fixture servers (no external sites).

## CI

CI runs typecheck, lint, unit tests, build, and e2e Chromium flow tests.
