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
import { createHideReporter } from '@shared/report-hidden';
import { loadSettings } from '@shared/settings';
import type { CategoryId } from '@shared/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  registration: 'runtime',

  async main() {
    const settings = await loadSettings();

    const groups: { selectors: string[]; category: CategoryId; enabled: boolean }[] = [
      { selectors: COPILOT_SELECTORS, category: 'ai', enabled: settings.ai },
      { selectors: SHOPPING_SELECTORS, category: 'shopping', enabled: settings.shopping },
    ];

    const activeGroups = groups.filter((g) => g.enabled);
    if (activeGroups.length === 0) return;

    const reporters = new Map(activeGroups.map((g) => [g.category, createHideReporter(g.category)]));

    // Hide existing elements
    for (const group of activeGroups) {
      const reporter = reporters.get(group.category);
      for (const selector of group.selectors) {
        for (const el of document.querySelectorAll<HTMLElement>(selector)) {
          el.style.display = 'none';
          reporter?.track(el);
        }
      }
    }

    // Watch for dynamically added elements
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          for (const group of activeGroups) {
            const reporter = reporters.get(group.category);
            for (const selector of group.selectors) {
              const targets = node.matches(selector) ? [node] : [...node.querySelectorAll(selector)];
              for (const target of targets) {
                (target as HTMLElement).style.display = 'none';
                reporter?.track(target as HTMLElement);
              }
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  },
});
