import { browser } from 'wxt/browser';
import { CSS_REPORT_DEBOUNCE_MS } from './constants';
import type { CategoryId } from './types';

interface HideReporter {
  track(el: HTMLElement): void;
}

/**
 * Creates a reporter that deduplicates hidden elements and debounces
 * a single REPORT_CSS_HIDDEN message to the background script.
 */
export function createHideReporter(category: CategoryId): HideReporter {
  const seen = new WeakSet<HTMLElement>();
  let pending = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush(): void {
    const count = pending;
    pending = 0;
    timer = null;
    if (count === 0) return;

    const domain = location.hostname;
    try {
      browser.runtime.sendMessage({
        type: 'REPORT_CSS_HIDDEN',
        domain,
        count,
        category,
      });
    } catch {
      // Extension context may be invalidated (e.g. after reload)
    }
  }

  return {
    track(el: HTMLElement): void {
      if (seen.has(el)) return;
      seen.add(el);
      pending++;
      if (!timer) {
        timer = setTimeout(flush, CSS_REPORT_DEBOUNCE_MS);
      }
    },
  };
}
