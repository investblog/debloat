/**
 * "Classic web results" mode — Google's udm=14 vertical.
 *
 * A dynamic dNR redirect adds udm=14 to Google search navigations that have no
 * vertical yet, so AI Overview is never generated (nothing to hide, no flash).
 * Trade-off: instant answers (calculator, weather, knowledge panels) are not
 * part of that view either — the side panel says so, and the mode is off by default.
 *
 * "Show AI for this search" = a session allow rule scoped to one tab, removed
 * as soon as that tab commits its next main-frame navigation.
 */
import { GOOGLE_CORE_DOMAINS, GOOGLE_EXTRA_DOMAINS, googleOrigins } from '@shared/google-domains';
import { isPaused, isSubEnabled, loadSettings } from '@shared/settings';
import type { Settings } from '@shared/types';
import { normalizeHost } from '@shared/url';
import { browser } from 'wxt/browser';

export const CLASSIC_SUB_ID = 'classic_results';

const REDIRECT_RULE_ID = 1401;
/** Lets through any search that already picked a vertical (udm=… or legacy tbm=…) */
const KEEP_VERTICAL_RULE_ID = 1402;
const BYPASS_RULE_ID_BASE = 1500;

const SEARCH_URL_REGEX = '^https://(www\\.)?google\\.[a-z.]+/search\\?';

type DnrRule = Parameters<typeof browser.declarativeNetRequest.updateDynamicRules>[0] extends infer O
  ? O extends { addRules?: (infer R)[] }
    ? R
    : never
  : never;

/** Tabs whose next main-frame navigation must pass the redirect */
const pendingBypass = new Set<number>();
/** Tabs showing Google's AI view on request: tabId → the search query it was shown for */
const aiShownFor = new Map<number, string>();

/** True if the page at `url` in `tabId` is the search the user asked to see with AI */
export function isAiShown(tabId: number, url: string): boolean {
  const q = aiShownFor.get(tabId);
  if (q == null) return false;
  try {
    const u = new URL(url);
    return u.searchParams.get('q') === q && !u.searchParams.has('udm');
  } catch {
    return false;
  }
}

function removeBypassRule(tabId: number): void {
  browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: [BYPASS_RULE_ID_BASE + tabId] }).catch(() => {});
}

export function initClassicResults(): void {
  applyClassicResults();
  clearStaleBypassRules();
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'settings' in changes) applyClassicResults();
  });
  browser.permissions.onAdded.addListener(() => applyClassicResults());
  browser.permissions.onRemoved.addListener(() => applyClassicResults());

  browser.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;
    // A bypass rule covers exactly one navigation of its tab
    if (pendingBypass.delete(details.tabId)) removeBypassRule(details.tabId);
    // Leaving that search ends "show AI" for the tab
    if (aiShownFor.has(details.tabId) && !isAiShown(details.tabId, details.url)) aiShownFor.delete(details.tabId);
  });
  browser.tabs.onRemoved.addListener((tabId) => {
    aiShownFor.delete(tabId);
    if (pendingBypass.delete(tabId)) removeBypassRule(tabId);
  });
}

/** After a service-worker restart the in-memory bypass state is gone; drop leftover per-tab rules */
async function clearStaleBypassRules(): Promise<void> {
  try {
    const rules = await browser.declarativeNetRequest.getSessionRules();
    const stale = rules.map((r) => r.id).filter((id) => id >= BYPASS_RULE_ID_BASE);
    if (stale.length) await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: stale });
  } catch {
    // Session rules unsupported — nothing to clear
  }
}

/** Google domains (bare, e.g. google.de) the redirect applies to, minus allow-listed ones */
async function targetDomains(settings: Settings): Promise<string[]> {
  let domains = GOOGLE_CORE_DOMAINS.map((h) => h.replace(/^www\./, ''));
  try {
    if (await browser.permissions.contains({ origins: googleOrigins(GOOGLE_EXTRA_DOMAINS) })) {
      domains = [...domains, ...GOOGLE_EXTRA_DOMAINS];
    }
  } catch {
    // keep core domains
  }
  return domains.filter((d) => !(settings.siteWhitelist[normalizeHost(d)] ?? []).includes('ai'));
}

export function buildClassicRules(domains: string[]): DnrRule[] {
  const condition = {
    regexFilter: SEARCH_URL_REGEX,
    requestDomains: domains,
    resourceTypes: ['main_frame'],
    requestMethods: ['get'],
  };
  return [
    {
      id: KEEP_VERTICAL_RULE_ID,
      priority: 2,
      action: { type: 'allow' },
      condition: { ...condition, regexFilter: `${SEARCH_URL_REGEX}(.*&)?(udm|tbm)=` },
    },
    {
      id: REDIRECT_RULE_ID,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { transform: { queryTransform: { addOrReplaceParams: [{ key: 'udm', value: '14' }] } } },
      },
      condition,
    },
  ] as DnrRule[];
}

export async function applyClassicResults(): Promise<void> {
  const settings = await loadSettings();
  const on = settings.ai && !isPaused(settings) && isSubEnabled(settings, CLASSIC_SUB_ID);
  const domains = on ? await targetDomains(settings) : [];
  try {
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [REDIRECT_RULE_ID, KEEP_VERTICAL_RULE_ID],
      addRules: domains.length > 0 ? buildClassicRules(domains) : [],
    });
  } catch {
    // Browser without dNR redirect/transform support — feature stays off
  }
}

/** Reload a tab's search with Google's default view (AI Overview included), once */
export async function showAiOnce(tabId: number): Promise<void> {
  const tab = await browser.tabs.get(tabId);
  if (!tab.url) return;
  const url = new URL(tab.url);
  if (url.searchParams.get('udm') !== '14') return;
  url.searchParams.delete('udm');

  const ruleId = BYPASS_RULE_ID_BASE + tabId;
  await browser.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ruleId],
    addRules: [
      {
        id: ruleId,
        priority: 3,
        action: { type: 'allow' },
        condition: { tabIds: [tabId], regexFilter: SEARCH_URL_REGEX, resourceTypes: ['main_frame'] },
      },
    ] as DnrRule[],
  });
  pendingBypass.add(tabId);
  aiShownFor.set(tabId, url.searchParams.get('q') ?? '');
  await browser.tabs.update(tabId, { url: url.toString() });
}
