/**
 * CSS selectors for Edge NTP (ntp.msn.com) bloat elements.
 */

/** MSN news feed */
export const MSN_FEED = ['#cib-feed-container', '.feed-layout', '[data-m*="NewsFeed"]', '.infopane-container'];

/** Copilot Discover widget */
export const COPILOT_DISCOVER = ['#copilot-discover', '[data-m*="CopilotDiscover"]', '.copilot-card'];

/** Sponsored top sites / tiles */
export const SPONSORED_TILES = ['.sponsored-tile', '[data-m*="SponsoredTile"]', 'a[data-tag*="sponsored"]'];

/** Shopping suggestions */
export const SHOPPING = ['[data-m*="Shopping"]', '.shopping-card'];

/** Microsoft Rewards */
export const REWARDS = ['#rewards-card', '[data-m*="Rewards"]', '.rewards-container'];

export const ALL = [...MSN_FEED, ...COPILOT_DISCOVER, ...SPONSORED_TILES, ...SHOPPING, ...REWARDS];

export function toCSS(selectors: string[]): string {
  return selectors.join(',\n');
}
