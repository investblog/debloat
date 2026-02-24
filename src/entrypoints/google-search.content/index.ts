import { ALL } from '@selectors/google-search';
import { createHideReporter } from '@shared/report-hidden';
import { loadSettings } from '@shared/settings';
import './style.css';

export default defineContentScript({
  matches: [
    '*://www.google.com/search*',
    '*://www.google.co.uk/search*',
    '*://www.google.de/search*',
    '*://www.google.fr/search*',
    '*://www.google.co.jp/search*',
    '*://www.google.co.in/search*',
    '*://www.google.com.br/search*',
    '*://www.google.ca/search*',
    '*://www.google.com.au/search*',
    '*://www.google.ru/search*',
    '*://www.google.it/search*',
    '*://www.google.es/search*',
    '*://www.google.com.mx/search*',
    '*://www.google.co.kr/search*',
    '*://www.google.nl/search*',
    '*://www.google.pl/search*',
    '*://www.google.com.tr/search*',
    '*://www.google.co.id/search*',
  ],
  runAt: 'document_start',

  async main() {
    const settings = await loadSettings();
    if (!settings.ai) return;

    const reporter = createHideReporter('ai');

    // MutationObserver for dynamically loaded AI elements
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          for (const selector of ALL) {
            const targets = node.matches(selector) ? [node] : [...node.querySelectorAll(selector)];
            for (const target of targets) {
              (target as HTMLElement).style.display = 'none';
              reporter.track(target as HTMLElement);
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
