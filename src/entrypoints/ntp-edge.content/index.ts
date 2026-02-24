import { COPILOT_DISCOVER, MSN_FEED, REWARDS, SHOPPING, SPONSORED_TILES } from '@selectors/edge-ntp';
import { createHideReporter } from '@shared/report-hidden';
import { loadSettings } from '@shared/settings';
import type { CategoryId } from '@shared/types';
import './style.css';

export default defineContentScript({
  matches: ['*://ntp.msn.com/*', '*://edge.microsoft.com/*'],
  runAt: 'document_start',

  async main() {
    const settings = await loadSettings();

    // Only proceed if at least one relevant category is enabled
    if (!settings.sponsored && !settings.ai && !settings.annoyances && !settings.shopping) return;

    // Map selector groups to categories
    const groups: { selectors: string[]; category: CategoryId; enabled: boolean }[] = [
      { selectors: [...MSN_FEED, ...SPONSORED_TILES], category: 'sponsored', enabled: settings.sponsored },
      { selectors: COPILOT_DISCOVER, category: 'ai', enabled: settings.ai },
      { selectors: SHOPPING, category: 'shopping', enabled: settings.shopping },
      { selectors: REWARDS, category: 'annoyances', enabled: settings.annoyances },
    ];

    const activeGroups = groups.filter((g) => g.enabled);
    if (activeGroups.length === 0) return;

    // One reporter per active category
    const reporters = new Map(activeGroups.map((g) => [g.category, createHideReporter(g.category)]));

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

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  },
});
