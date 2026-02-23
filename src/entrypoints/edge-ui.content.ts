/**
 * Edge UI overlays: Copilot sidebar, Visual Search, Shopping.
 * This content script is NOT in the manifest — it's registered dynamically
 * via scripting.registerContentScripts() when the user enables relevant toggles
 * and grants optional <all_urls> permission.
 *
 * For Phase 0, this is a stub. Dynamic registration logic lives in background/rules.ts.
 */
import { ALL as COPILOT_SELECTORS } from '@selectors/edge-copilot';
import { ALL as SHOPPING_SELECTORS } from '@selectors/edge-shopping';
import { loadSettings } from '@shared/settings';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  registration: 'runtime',

  async main() {
    const settings = await loadSettings();

    const selectors: string[] = [];
    if (settings.ai) selectors.push(...COPILOT_SELECTORS);
    if (settings.shopping) selectors.push(...SHOPPING_SELECTORS);
    if (selectors.length === 0) return;

    // Hide existing elements
    for (const selector of selectors) {
      for (const el of document.querySelectorAll<HTMLElement>(selector)) {
        el.style.display = 'none';
      }
    }

    // Watch for dynamically added elements
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          for (const selector of selectors) {
            const targets = node.matches(selector) ? [node] : [...node.querySelectorAll(selector)];
            for (const target of targets) {
              (target as HTMLElement).style.display = 'none';
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  },
});
