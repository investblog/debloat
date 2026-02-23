import { ALL } from '@selectors/edge-ntp';
import { loadSettings } from '@shared/settings';
import './style.css';

export default defineContentScript({
  matches: ['*://ntp.msn.com/*', '*://edge.microsoft.com/*'],
  runAt: 'document_start',
  // Use default manifest registration

  async main() {
    const settings = await loadSettings();

    // Only proceed if at least one relevant category is enabled
    if (!settings.sponsored && !settings.ai && !settings.annoyances) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          for (const selector of ALL) {
            const targets = node.matches(selector) ? [node] : [...node.querySelectorAll(selector)];
            for (const target of targets) {
              (target as HTMLElement).style.display = 'none';
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
