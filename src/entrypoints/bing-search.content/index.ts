import { ALL } from '@selectors/bing-search';
import { createHideReporter } from '@shared/report-hidden';
import { loadSettings } from '@shared/settings';
import { normalizeHost } from '@shared/url';
import './style.css';

export default defineContentScript({
  matches: ['*://*.bing.com/search*'],
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
