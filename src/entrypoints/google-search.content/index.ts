import { findGoogleAi, type GoogleAiKind, holdsResults } from '@shared/google-ai-detect';
import { createHideReporter } from '@shared/report-hidden';
import { isPaused, isSubEnabled, loadSettings } from '@shared/settings';
import type { Settings } from '@shared/types';
import { normalizeHost } from '@shared/url';
import { browser } from 'wxt/browser';
import './style.css';

const KINDS: GoogleAiKind[] = ['ai_overview', 'ai_mode', 'people_also_ask', 'things_to_know'];

/** Set on a block to hide; value = kind. CSS in style.css does the hiding. */
const HIDE_ATTR = 'data-debloat-hide';
/** Set on a minimized AI Overview the user expanded */
const EXPANDED_ATTR = 'data-debloat-expanded';
const MINIBAR_CLASS = 'debloat-minibar';
/** Sub-toggle: collapse AI Overview to a bar instead of removing it */
const MINIMIZE_SUB = 'ai_overview_minimize';

type MsgKey = Parameters<typeof browser.i18n.getMessage>[0];
function msg(key: string, fallback: string): string {
  try {
    return browser.i18n.getMessage(key as MsgKey) || fallback;
  } catch {
    return fallback;
  }
}

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
    const root = document.documentElement;
    const reporter = createHideReporter('ai');
    let enabled = new Set<GoogleAiKind>();

    /** Mirror settings onto <html> attributes; CSS reacts without a rescan */
    function apply(settings: Settings): void {
      const host = normalizeHost(location.hostname);
      const active = settings.ai && !isPaused(settings) && !(settings.siteWhitelist[host] ?? []).includes('ai');
      root.toggleAttribute('data-debloat-allow-ai', !active);
      enabled = new Set(active ? KINDS.filter((k) => isSubEnabled(settings, k)) : []);
      for (const kind of KINDS) root.toggleAttribute(`data-debloat-allow-${kind}`, !enabled.has(kind));
      root.toggleAttribute('data-debloat-ai-minimize', isSubEnabled(settings, MINIMIZE_SUB));
    }

    function scan(): void {
      // The page loads in pieces: a block marked before the results arrived may
      // turn out to wrap them — unmark it so this pass picks a smaller one.
      for (const el of document.querySelectorAll(`[${HIDE_ATTR}]`)) {
        if (el.getAttribute(HIDE_ATTR) !== 'people_also_ask' && holdsResults(el)) {
          el.removeAttribute(HIDE_ATTR);
          minibarFor(el)?.remove();
        }
      }

      for (const kind of enabled) {
        for (const el of findGoogleAi(document, kind)) {
          if (el.getAttribute(HIDE_ATTR) === kind) continue;
          el.setAttribute(HIDE_ATTR, kind);
          reporter.track(el as HTMLElement);
          if (kind === 'ai_overview') addMinibar(el);
        }
      }
    }

    function minibarFor(block: Element): Element | null {
      const prev = block.previousElementSibling;
      return prev?.classList.contains(MINIBAR_CLASS) ? prev : null;
    }

    /** Collapsed bar shown before a hidden AI Overview (visible only in minimize mode, via CSS) */
    function addMinibar(block: Element): void {
      if (minibarFor(block)) return;
      const label = document.createElement('span');
      label.textContent = msg('MINIBAR_LABEL', 'AI Overview hidden by Debloat');
      const button = document.createElement('button');
      button.type = 'button';
      const sync = () => {
        const expanded = block.hasAttribute(EXPANDED_ATTR);
        button.textContent = expanded ? msg('MINIBAR_HIDE', 'Hide') : msg('MINIBAR_SHOW', 'Show');
        button.setAttribute('aria-expanded', String(expanded));
      };
      button.addEventListener('click', () => {
        block.toggleAttribute(EXPANDED_ATTR);
        sync();
      });
      sync();
      const bar = document.createElement('div');
      bar.className = MINIBAR_CLASS;
      bar.append(label, button);
      block.before(bar);
    }

    let scheduled = false;
    function scheduleScan(): void {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        scan();
      });
    }

    apply(await loadSettings());
    new MutationObserver(scheduleScan).observe(root, { childList: true, subtree: true });
    scheduleScan();

    // Live response to the side panel: toggles, pause, whitelist
    browser.storage.onChanged.addListener(async (changes, area) => {
      if (area !== 'local' || !('settings' in changes)) return;
      apply(await loadSettings());
      scheduleScan();
    });
  },
});
