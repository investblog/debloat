/**
 * CSS selectors for Firefox Home (about:home / about:newtab) bloat.
 * Note: Firefox Home is served from about: protocol, limited CSS injection.
 * Most blocking done via dNR endpoints, these selectors are for future use.
 */

/** Sponsored stories */
export const SPONSORED_STORIES = [
  '.ds-card[data-is-sponsored="true"]',
  '[data-section-id="topstories"] [data-is-sponsored]',
];

/** Sponsored top sites */
export const SPONSORED_TILES = ['.top-site-outer[data-is-sponsored="true"]', '.top-sites .sponsored'];

/** Recommended stories (Pocket) */
export const RECOMMENDED = ['.ds-card', '[data-section-id="topstories"]'];

export const ALL = [...SPONSORED_STORIES, ...SPONSORED_TILES];

export function toCSS(selectors: string[]): string {
  return selectors.join(',\n');
}
