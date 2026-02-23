import { BADGE_COLOR, BADGE_REFRESH_MS } from '@shared/constants';

const tabCounts = new Map<number, number>();

export function initBadge(): void {
  // Reset counter on navigation
  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;
    tabCounts.set(details.tabId, 0);
    refreshBadge(details.tabId);
  });

  // Periodic refresh for active tab
  setInterval(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null) refreshBadge(tab.id);
  }, BADGE_REFRESH_MS);

  // Cleanup on tab close
  chrome.tabs.onRemoved.addListener((tabId) => tabCounts.delete(tabId));
}

export function getTabCount(tabId: number): number {
  return tabCounts.get(tabId) ?? 0;
}

async function refreshBadge(tabId: number): Promise<void> {
  try {
    const { rulesMatchedInfo } = await chrome.declarativeNetRequest.getMatchedRules({ tabId });
    const count = rulesMatchedInfo.length;
    tabCounts.set(tabId, count);

    await chrome.action.setBadgeText({
      text: count === 0 ? '' : count > 999 ? '1k+' : String(count),
      tabId,
    });
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR, tabId });
  } catch {
    // Tab may have been closed between query and badge update
  }
}
