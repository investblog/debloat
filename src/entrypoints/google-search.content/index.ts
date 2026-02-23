import { ALL } from '@selectors/google-search';
import { loadSettings } from '@shared/settings';
import './style.css';

export default defineContentScript({
  matches: ['*://www.google.com/search*'],
  runAt: 'document_start',
  // Use default manifest registration

  async main() {
    const settings = await loadSettings();
    if (!settings.ai) return;

    // MutationObserver for dynamically loaded AI elements
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
