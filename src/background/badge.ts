import {
  ACTIVITY_BUFFER_SIZE,
  BADGE_COLOR,
  BADGE_FLASH_COLOR,
  BADGE_FLASH_MS,
  BADGE_PAUSED_COLOR,
  BADGE_REFRESH_MS,
  CATEGORY_RULESETS,
} from '@shared/constants';
import { loadSettings } from '@shared/settings';
import type { ActivityEntry, CategoryId } from '@shared/types';

const tabCounts = new Map<number, number>();
const flashTimers = new Map<number, ReturnType<typeof setTimeout>>();

/** Reverse map: rulesetId → CategoryId */
const rulesetToCategory = new Map<string, CategoryId>();
for (const [category, rulesetIds] of Object.entries(CATEGORY_RULESETS)) {
  for (const id of rulesetIds) {
    rulesetToCategory.set(id, category as CategoryId);
  }
}

export function initBadge(tabActivity: Map<number, ActivityEntry[]>): void {
  // Reset counter + activity on navigation
  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;
    tabCounts.set(details.tabId, 0);
    tabActivity.delete(details.tabId);
    refreshBadge(details.tabId, tabActivity);
  });

  // Periodic refresh for active tab
  setInterval(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null) refreshBadge(tab.id, tabActivity);
  }, BADGE_REFRESH_MS);

  // Cleanup on tab close
  chrome.tabs.onRemoved.addListener((tabId) => {
    tabCounts.delete(tabId);
    tabActivity.delete(tabId);
    const timer = flashTimers.get(tabId);
    if (timer) {
      clearTimeout(timer);
      flashTimers.delete(tabId);
    }
  });
}

export function getTabCount(tabId: number): number {
  return tabCounts.get(tabId) ?? 0;
}

/** Show paused state on all tabs */
export async function showPausedBadge(): Promise<void> {
  try {
    await chrome.action.setBadgeText({ text: '⏸' });
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_PAUSED_COLOR });
    await chrome.action.setTitle({ title: 'Debloat: paused' });
  } catch {
    // Extension context may be invalid
  }
}

/** Clear paused state (global badge) so per-tab badges take over */
export async function clearPausedBadge(): Promise<void> {
  try {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
    await chrome.action.setTitle({ title: 'Debloat' });
  } catch {
    // Extension context may be invalid
  }
}

function flashBadge(tabId: number): void {
  const prev = flashTimers.get(tabId);
  if (prev) clearTimeout(prev);

  try {
    chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_FLASH_COLOR });
  } catch {
    return;
  }

  const timer = setTimeout(() => {
    flashTimers.delete(tabId);
    try {
      chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
    } catch {
      // Tab may be gone
    }
  }, BADGE_FLASH_MS);
  flashTimers.set(tabId, timer);
}

async function refreshBadge(tabId: number, tabActivity: Map<number, ActivityEntry[]>): Promise<void> {
  try {
    // Skip badge updates while paused
    const settings = await loadSettings();
    if (settings.pauseUntil && settings.pauseUntil > Date.now()) return;

    const { rulesMatchedInfo } = await chrome.declarativeNetRequest.getMatchedRules({ tabId });
    const count = rulesMatchedInfo.length;
    const prevCount = tabCounts.get(tabId) ?? 0;
    tabCounts.set(tabId, count);

    // Build activity entries from matched rules
    if (rulesMatchedInfo.length > 0) {
      let domain = '';
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.url) {
          domain = new URL(tab.url).hostname;
        }
      } catch {
        // Tab may not exist
      }

      const existing = tabActivity.get(tabId) ?? [];
      const seen = new Set(existing.map((e) => `${e.time}:${e.rulesetId}`));

      for (const info of rulesMatchedInfo) {
        const rulesetId = info.rule.rulesetId;
        const time = info.timeStamp ?? Date.now();
        const key = `${time}:${rulesetId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const category = rulesetToCategory.get(rulesetId);
        if (!category) continue;

        existing.push({ time, domain, category, rulesetId });
      }

      // Cap at buffer size (keep newest)
      if (existing.length > ACTIVITY_BUFFER_SIZE) {
        existing.splice(0, existing.length - ACTIVITY_BUFFER_SIZE);
      }

      tabActivity.set(tabId, existing);
    }

    const text = count === 0 ? '' : count > 999 ? '1k+' : String(count);
    await chrome.action.setBadgeText({ text, tabId });
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR, tabId });

    // Tooltip
    const title = count > 0 ? `Debloat: ${count} blocked` : 'Debloat';
    await chrome.action.setTitle({ title, tabId });

    // Flash on new blocks
    if (count > prevCount && prevCount > 0) {
      flashBadge(tabId);
    }
  } catch {
    // Tab may have been closed between query and badge update
  }
}
