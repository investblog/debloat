import type { CandidateBlock } from '@shared/scout-collector';
import { loadSettings } from '@shared/settings';
import type { ScoutStatus } from '@shared/types';
import { browser } from 'wxt/browser';
import { detectBrowser } from './browser';

const SCOUT_URL = 'https://scout.debloat.click/scout/report';

interface ScoutNotification {
  title: string;
  message: string;
  context: string;
  issueUrl?: string;
}

interface ReportResponse {
  ok: boolean;
  result: string;
  notification: ScoutNotification;
}

/** Per-tab stored candidates awaiting user action */
interface TabScoutData {
  surface: string;
  pageUrl: string;
  candidates: CandidateBlock[];
  knownCount: number;
  unknownCount: number;
  viewport: { width: number; height: number };
  state: 'pending' | 'sending' | 'reported';
  resultMessage?: string;
}

const tabScoutData = new Map<number, TabScoutData>();

/** Store candidates from content script (user will decide to send) */
export function storeScoutCandidates(
  tabId: number,
  surface: string,
  pageUrl: string,
  candidates: CandidateBlock[],
  viewport: { width: number; height: number },
  known: boolean,
): void {
  const existing = tabScoutData.get(tabId);
  if (existing && existing.state === 'pending') {
    // Merge with existing (content script may flush multiple batches)
    existing.candidates.push(...candidates);
    if (known) existing.knownCount += candidates.length;
    else existing.unknownCount += candidates.length;
  } else {
    tabScoutData.set(tabId, {
      surface,
      pageUrl,
      candidates: [...candidates],
      knownCount: known ? candidates.length : 0,
      unknownCount: known ? 0 : candidates.length,
      viewport,
      state: 'pending',
    });
  }
}

/** Get scout status for a tab */
export function getScoutStatus(tabId: number): ScoutStatus | null {
  const data = tabScoutData.get(tabId);
  if (!data || data.candidates.length === 0) return null;
  return {
    candidateCount: data.candidates.length,
    unknownCount: data.unknownCount,
    surface: data.surface,
    state: data.state,
    resultMessage: data.resultMessage,
  };
}

/** User-triggered: send stored candidates to Worker */
export async function sendStoredReport(tabId: number): Promise<ScoutNotification | null> {
  const data = tabScoutData.get(tabId);
  if (!data || data.state !== 'pending') return null;

  const settings = await loadSettings();
  if (!settings.scoutReporting || !settings.scoutInstallId) return null;
  if (data.candidates.length === 0) return null;

  data.state = 'sending';

  const currentBrowser = detectBrowser();
  const version = browser.runtime.getManifest().version;

  const body = {
    surface: data.surface,
    pageUrl: stripQueryParams(data.pageUrl),
    browser: currentBrowser === 'unknown' ? 'chrome' : currentBrowser,
    locale: navigator.language,
    extensionVersion: version,
    viewport: data.viewport,
    candidates: data.candidates,
    hiddenCount: data.candidates.length,
    installId: settings.scoutInstallId,
  };

  try {
    const resp = await fetch(SCOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      data.state = 'pending';
      return null;
    }
    const result = (await resp.json()) as ReportResponse;
    data.state = 'reported';
    data.resultMessage = result.notification?.message ?? 'Reported';
    return result.notification ?? null;
  } catch {
    data.state = 'pending';
    return null;
  }
}

/** Clean up on tab close */
export function cleanupScoutTab(tabId: number): void {
  tabScoutData.delete(tabId);
}

/** Clean up on navigation */
export function resetScoutTab(tabId: number): void {
  tabScoutData.delete(tabId);
}

/** Strip query params to avoid leaking search terms */
function stripQueryParams(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}
