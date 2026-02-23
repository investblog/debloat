/**
 * CSS selectors for Edge Copilot overlays and sidebar.
 */

/** Copilot sidebar panel */
export const SIDEBAR = [
  '#edgecopilot-sidebar',
  '#b_copilot_sidebar',
  'iframe[src*="copilot.microsoft.com"]',
  'iframe[src*="sydney.bing.com"]',
];

/** Copilot toolbar button */
export const TOOLBAR_BUTTON = ['#copilot-toolbar-button', '[data-copilot-button]'];

/** Visual Search overlay */
export const VISUAL_SEARCH = ['#visual-search-overlay', '.vs-overlay-container', '[data-visual-search]'];

/** Help Me Write / Rewrite with Copilot */
export const HELP_ME_WRITE = ['[data-copilot-compose]', '.copilot-compose-overlay'];

export const ALL = [...SIDEBAR, ...TOOLBAR_BUTTON, ...VISUAL_SEARCH, ...HELP_ME_WRITE];

export function toCSS(selectors: string[]): string {
  return selectors.join(',\n');
}
