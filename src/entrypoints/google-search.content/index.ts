import { findGoogleAi, type GoogleAiKind } from '@shared/google-ai-detect';
import { GOOGLE_CORE_DOMAINS, googleSearchMatches } from '@shared/google-domains';
import type { MessageResponse } from '@shared/messaging';
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

async function askAiShown(): Promise<boolean> {
  try {
    const resp = (await browser.runtime.sendMessage({ type: 'IS_AI_SHOWN' })) as MessageResponse | undefined;
    return resp?.type === 'AI_SHOWN' && resp.shown;
  } catch {
    return false;
  }
}

export default defineContentScript({
  matches: googleSearchMatches(GOOGLE_CORE_DOMAINS),
  runAt: 'document_start',

  async main() {
    const root = document.documentElement;
    const reporter = createHideReporter('ai');
    let enabled = new Set<GoogleAiKind>();
    /** The user asked to see AI for this search ("Show AI for this search" in classic results mode) */
    let aiShown = false;

    /** Mirror settings onto <html> attributes; CSS reacts without a rescan */
    function apply(settings: Settings): void {
      const host = normalizeHost(location.hostname);
      const active =
        settings.ai && !aiShown && !isPaused(settings) && !(settings.siteWhitelist[host] ?? []).includes('ai');
      root.toggleAttribute('data-debloat-allow-ai', !active);
      enabled = new Set(active ? KINDS.filter((k) => isSubEnabled(settings, k)) : []);
      for (const kind of KINDS) root.toggleAttribute(`data-debloat-allow-${kind}`, !enabled.has(kind));
      root.toggleAttribute('data-debloat-ai-minimize', isSubEnabled(settings, MINIMIZE_SUB));
    }

    /**
     * Reconcile marks with what the detector finds now. The page loads in pieces:
     * a block marked early may turn out to wrap results, or a "Things to know"
     * section may get its non-AI content later — those lose their mark.
     */
    function scan(): void {
      for (const kind of enabled) {
        const found = new Set(findGoogleAi(document, kind));
        for (const el of document.querySelectorAll(`[${HIDE_ATTR}="${kind}"]`)) {
          if (found.has(el)) continue;
          el.removeAttribute(HIDE_ATTR);
          minibarFor(el)?.remove();
        }
        for (const el of found) {
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
      // Google lays #rcnt out as a grid through display:contents wrappers: give the bar the
      // block's column, or auto-placement drops it into the left gutter as a tall empty box.
      const column = getComputedStyle(block).gridColumn;
      if (column && column !== 'auto') bar.style.gridColumn = column;
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

    const [settings, shown] = await Promise.all([loadSettings(), askAiShown()]);
    aiShown = shown;
    apply(settings);
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
