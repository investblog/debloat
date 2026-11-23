/**
 * Google Search AI block detection — pure DOM functions, no extension APIs.
 *
 * Each finder returns the elements to hide. Markers are often inner nodes,
 * so the detector climbs to the module container but never to anything that
 * holds organic results (Google sometimes wraps AI blocks and results together,
 * and the page loads in pieces).
 */
import {
  AI_MODE_LINK,
  AI_MODE_TAB,
  AI_MODE_UDM,
  AI_OVERVIEW,
  AI_OVERVIEW_HEADINGS,
  MODULE_WRAPPER,
  PEOPLE_ALSO_ASK,
  RESULT_TITLE,
  RESULTS_AREA,
  STOP_IDS,
  THINGS_TO_KNOW_CONTENT,
  THINGS_TO_KNOW_TITLE,
} from '@selectors/google-search';

export type GoogleAiKind = 'ai_overview' | 'ai_mode' | 'people_also_ask' | 'things_to_know';

const PAA_SELECTOR = PEOPLE_ALSO_ASK.join(', ');

/** True if hiding `el` would hide organic results */
export function holdsResults(el: Element): boolean {
  return el.matches(RESULTS_AREA) || el.querySelector(`${RESULTS_AREA}, ${RESULT_TITLE}`) !== null;
}

function isStop(el: Element | null): boolean {
  return !el || el === el.ownerDocument.body || STOP_IDS.includes(el.id);
}

/**
 * Climb from a marker to the largest ancestor that is still only the AI block:
 * stop below #rso/#rcnt/#center_col and below any parent whose other children
 * hold results. Returns null if even the marker itself holds results.
 */
export function safeContainer(marker: Element): Element | null {
  if (holdsResults(marker)) return null;

  const wrapper = marker.closest(MODULE_WRAPPER);
  if (wrapper && !holdsResults(wrapper)) return wrapper;

  let el = marker;
  while (!isStop(el.parentElement)) {
    const parent = el.parentElement as Element;
    const siblingHoldsResults = [...parent.children].some((child) => child !== el && holdsResults(child));
    if (siblingHoldsResults) break;
    el = parent;
  }
  return el;
}

function isInsidePeopleAlsoAsk(el: Element): boolean {
  return el.closest(PAA_SELECTOR) !== null;
}

export function findAiOverviewBlocks(root: ParentNode): Element[] {
  const blocks = new Set<Element>();

  for (const marker of root.querySelectorAll(AI_OVERVIEW.join(', '))) {
    if (isInsidePeopleAlsoAsk(marker)) continue;
    const block = safeContainer(marker);
    if (block) blocks.add(block);
  }

  // Text fallback: the "AI Overview" heading, localized, in the main column only
  for (const heading of root.querySelectorAll('#rcnt [role="heading"], #center_col [role="heading"]')) {
    const text = heading.textContent?.trim() ?? '';
    if (!AI_OVERVIEW_HEADINGS.some((re) => re.test(text))) continue;
    if (isInsidePeopleAlsoAsk(heading)) continue;
    const block = safeContainer(heading);
    if (block) blocks.add(block);
  }

  return dropNested(blocks);
}

function isAiModeLink(link: HTMLAnchorElement): boolean {
  try {
    return new URL(link.href, 'https://www.google.com').searchParams.get('udm') === AI_MODE_UDM;
  } catch {
    return false;
  }
}

/** AI Mode tabs/buttons: links into the udm=50 vertical, with their tab wrapper */
export function findAiModeEntries(root: ParentNode): Element[] {
  const entries = new Set<Element>();
  for (const link of root.querySelectorAll<HTMLAnchorElement>(AI_MODE_LINK)) {
    if (!isAiModeLink(link)) continue;
    const tab = link.closest(AI_MODE_TAB);
    entries.add(tab && !holdsResults(tab) ? tab : link);
  }
  return [...entries];
}

/** "People also ask" modules (the answers inside are AI Overviews) */
export function findPeopleAlsoAsk(root: ParentNode): Element[] {
  const blocks = new Set<Element>();
  for (const el of root.querySelectorAll(PAA_SELECTOR)) {
    const wrapper = el.closest(MODULE_WRAPPER) ?? topBelowRso(el) ?? el;
    // PAA answers contain result-like titles, so only guard the results column itself
    if (wrapper.matches(RESULTS_AREA) || wrapper.querySelector(RESULTS_AREA)) continue;
    blocks.add(wrapper);
  }
  return dropNested(blocks);
}

/** The result block a node belongs to: the grandchild of #rso (#rso > div > block) */
function topBelowRso(el: Element): Element | null {
  let cur: Element | null = el;
  while (cur?.parentElement) {
    if (cur.parentElement.parentElement?.id === 'rso') return cur;
    cur = cur.parentElement;
  }
  return null;
}

/**
 * "Things to know": returns the AI-only sections (title without content),
 * or the whole block when every section is AI.
 */
export function findThingsToKnowAi(root: ParentNode): Element[] {
  const titles = [...root.querySelectorAll(THINGS_TO_KNOW_TITLE)];
  if (titles.length === 0) return [];

  const block = topBelowRso(titles[0]) ?? titles[0].closest(MODULE_WRAPPER);
  if (!block) return [];
  const own = titles.filter((t) => block.contains(t));

  let sections: Element[] = [block];
  if (own.length > 1) {
    let list = own[0].parentElement as Element;
    while (!own.every((t) => list.contains(t)) && list.parentElement) list = list.parentElement;
    sections = own.map((t) => [...list.children].find((child) => child.contains(t))).filter((s): s is Element => !!s);
  }

  const ai = sections.filter((s) => !s.querySelector(THINGS_TO_KNOW_CONTENT));
  if (ai.length === 0) return [];
  return ai.length === sections.length ? [block] : ai;
}

/** Keep only outermost elements */
function dropNested(set: Set<Element>): Element[] {
  const all = [...set];
  return all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
}

export function findGoogleAi(root: ParentNode, kind: GoogleAiKind): Element[] {
  switch (kind) {
    case 'ai_overview':
      return findAiOverviewBlocks(root);
    case 'ai_mode':
      return findAiModeEntries(root);
    case 'people_also_ask':
      return findPeopleAlsoAsk(root);
    case 'things_to_know':
      return findThingsToKnowAi(root);
  }
}
