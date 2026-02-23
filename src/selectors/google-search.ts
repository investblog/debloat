/**
 * CSS selectors for Google Search AI elements.
 * These break when Google updates its UI — keep them modular for fast patching.
 */

/** AI Overview block at the top of SERP */
export const AI_OVERVIEW = [
  '#ai-overview-card',
  'div[data-attrid="AIOverview"]',
  'div.M8OgIe', // AI Overview container (class may change)
  'div[jsname="Cpkphb"]',
];

/** AI Mode button and results */
export const AI_MODE = [
  'a[href*="/search?udm=50"]', // AI Mode link
  'div[data-udm="50"]', // AI Mode results container
];

/** Combined: all AI elements to hide */
export const ALL = [...AI_OVERVIEW, ...AI_MODE];

/** Build a single CSS selector string */
export function toCSS(selectors: string[]): string {
  return selectors.join(',\n');
}
