/**
 * CSS selectors for Edge Shopping Assistant UI.
 */

/** Shopping sidebar / assistant panel */
export const ASSISTANT = [
  '#shopping-sidebar',
  '#edge-shopping-container',
  'iframe[src*="microsoftedge.microsoft.com/shopping"]',
];

/** Price comparison popups */
export const PRICE_COMPARE = ['.edge-shopping-price-comparison', '[data-shopping-compare]'];

/** Coupons notification */
export const COUPONS = ['.edge-shopping-coupons', '[data-shopping-coupons]'];

export const ALL = [...ASSISTANT, ...PRICE_COMPARE, ...COUPONS];

export function toCSS(selectors: string[]): string {
  return selectors.join(',\n');
}
