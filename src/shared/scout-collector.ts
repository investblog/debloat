import { browser } from 'wxt/browser';

/** Minimal candidate block — matches CandidateBlock in debloat-ai-scout */
export interface CandidateBlock {
  html: string;
  selector: string;
  textContent: string;
  tagName: string;
  classes: string[];
  role: string | null;
  ariaLabel: string | null;
  depth: number;
  parentTag: string | null;
  siblingCount: number;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  inShadowDom: boolean;
}

const MAX_HTML_LENGTH = 2000;
const COLLECT_DELAY_MS = 3000;

function getDepth(el: Element): number {
  let depth = 0;
  let node: Element | null = el;
  while (node && node !== document.body) {
    depth++;
    node = node.parentElement;
  }
  return depth;
}

function getCssSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const parts: string[] = [];
  let node: Element | null = el;
  for (let i = 0; i < 5 && node && node !== document.body; i++) {
    let seg = node.tagName.toLowerCase();
    if (node.id) {
      seg = `#${node.id}`;
      parts.unshift(seg);
      break;
    }
    if (node.className && typeof node.className === 'string') {
      const cls = node.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (cls) seg += `.${cls}`;
    }
    parts.unshift(seg);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

function extractCandidate(el: HTMLElement): CandidateBlock {
  const rect = el.getBoundingClientRect();
  const html = el.outerHTML;
  return {
    html: html.length > MAX_HTML_LENGTH ? html.slice(0, MAX_HTML_LENGTH) : html,
    selector: getCssSelector(el),
    textContent: (el.textContent ?? '').trim().slice(0, 500),
    tagName: el.tagName.toLowerCase(),
    classes: [...el.classList],
    role: el.getAttribute('role'),
    ariaLabel: el.getAttribute('aria-label'),
    depth: getDepth(el),
    parentTag: el.parentElement?.tagName.toLowerCase() ?? null,
    siblingCount: el.parentElement?.children.length ?? 0,
    boundingBox:
      rect.width > 0 || rect.height > 0
        ? {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        : null,
    inShadowDom: !!el.getRootNode()?.toString().includes('ShadowRoot'),
  };
}

export interface ScoutCollector {
  track(el: HTMLElement): void;
}

/**
 * Collects candidate blocks from hidden elements and sends them
 * to background after a delay (waits for page to settle).
 * @param known - true if elements matched known selectors, false for heuristic finds
 */
export function createScoutCollector(surface: string, known = true): ScoutCollector {
  const seen = new WeakSet<HTMLElement>();
  const candidates: CandidateBlock[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush(): void {
    timer = null;
    if (candidates.length === 0) return;
    const batch = candidates.splice(0);
    try {
      browser.runtime.sendMessage({
        type: 'SCOUT_CANDIDATES',
        surface,
        pageUrl: location.href,
        candidates: batch,
        viewport: { width: screen.width, height: screen.height },
        known,
      });
    } catch {
      // Extension context may be invalidated
    }
  }

  return {
    track(el: HTMLElement): void {
      if (seen.has(el)) return;
      seen.add(el);
      candidates.push(extractCandidate(el));
      // Reset timer on each new element — wait for page to settle
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, COLLECT_DELAY_MS);
    },
  };
}
