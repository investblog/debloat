import { ALL } from '@selectors/google-search';
import { createHideReporter } from '@shared/report-hidden';
import { createScoutCollector } from '@shared/scout-collector';
import { loadSettings } from '@shared/settings';
import { normalizeHost } from '@shared/url';
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
    const host = normalizeHost(location.hostname);
    const whitelisted = settings.siteWhitelist[host] ?? [];

    if (!settings.ai || whitelisted.includes('ai')) {
      document.documentElement.setAttribute('data-debloat-allow-ai', '');
      return;
    }

    const reporter = createHideReporter('ai');
    const scout = settings.scoutReporting ? createScoutCollector('google-search') : null;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          for (const selector of ALL) {
            const targets = node.matches(selector) ? [node] : [...node.querySelectorAll(selector)];
            for (const target of targets) {
              const el = target as HTMLElement;
              if (scout) scout.track(el);
              el.style.display = 'none';
              reporter.track(el);
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
