# Live check — Google SERP (before every release)

Google shows a captcha to automated browsers, so CI only covers a routed fixture
(`tests/e2e/google-serp.test.ts`). Before tagging a release, check the real SERP in a
normal, signed-in Chrome profile with the built extension loaded.

Who runs it: a maintainer, or an agent driving the maintainer's own Chrome
(Claude in Chrome / `chrome-devtools --autoConnect`). Never a datacenter crawler.

## Setup

1. `npm run build` → load `dist/chrome-mv3` unpacked (chrome://extensions → Developer mode).
2. Side panel: preset **Aggressive**, all Google sub-toggles at defaults.

## Queries

Run each in en / ru / de (`&hl=en`, `&hl=ru`, `&hl=de`) on google.com, plus one on a non-core
domain (e.g. google.at) after granting **All Google domains**:

| Query | Expect |
|---|---|
| `what is photosynthesis` | AI Overview hidden, organic results intact, no empty gap at the top |
| `best laptop 2026` | AI Overview + "People also ask" hidden; shopping/ads untouched by the AI category |
| `2+2`, `weather london`, `usd to eur` | calculator / weather / converter **visible** |
| `photosynthsis` (typo) | "Did you mean / Showing results for" line **visible** |
| `car insurance quote` | top ads untouched by the AI category (only the Sponsored category may hide them) |
| any query | AI Mode tab hidden; All / Images / News / Videos tabs visible |

Then per mode:

- **Collapse to a bar** on → bar visible above the results; Show/Hide toggles the overview.
- **Classic web results** on → URL gets `udm=14`; Images tab still works; side panel shows
  "Show AI for this search" and it reloads once without `udm`; the next search is `udm=14` again.
- **Pause (1h)** → everything reappears without reload; Resume hides again.
- **Allow on site** for google.com → AI Overview visible; remove → hidden.

## When something is missed

1. In DevTools, find the smallest stable marker of the block (id, `data-*`, `jsname`, a
   `[role="heading"]` text). Prefer ids/data attributes over generated class names.
2. Save the outer HTML of the module as a fixture and add a case to
   `tests/google-ai-detect.test.ts`.
3. Add the marker to `src/selectors/google-search.ts` (`AI_OVERVIEW`, and to
   `AI_OVERVIEW_INSTANT` + `style.css` only if it is a stable id).
4. Check the weekly competitor-watch issue in `investblog/debloat-ai-scout` for recent
   selector changes — they often point at the same markup change.
