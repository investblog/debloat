import { getTabCount, initBadge } from '@background/badge';
import { initPause, pause, unpause } from '@background/pause';
import { initRules } from '@background/rules';
import type { Message, MessageResponse } from '@shared/messaging';
import { addSiteWhitelist, removeSiteWhitelist } from '@shared/settings';
import type { ActivityEntry } from '@shared/types';

// Per-tab activity log (circular buffer, runtime only)
const tabActivity = new Map<number, ActivityEntry[]>();

export default defineBackground(async () => {
  initBadge(tabActivity);
  initRules();
  initPause();

  // Chrome/Edge: click icon → open Side Panel
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }

  // Message handler for Side Panel / Sidebar
  chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse: (resp: MessageResponse) => void) => {
    handleMessage(msg).then(sendResponse);
    return true; // async response
  });

  // Cleanup activity on tab close
  chrome.tabs.onRemoved.addListener((tabId) => tabActivity.delete(tabId));
});

async function handleMessage(msg: Message): Promise<MessageResponse> {
  switch (msg.type) {
    case 'GET_TAB_COUNT':
      return { type: 'TAB_COUNT', count: getTabCount(msg.tabId) };

    case 'GET_ACTIVITY':
      return { type: 'ACTIVITY', entries: tabActivity.get(msg.tabId) ?? [] };

    case 'PAUSE':
      await pause(msg.durationMs);
      return { type: 'OK' };

    case 'UNPAUSE':
      await unpause();
      return { type: 'OK' };

    case 'WHITELIST_SITE':
      await addSiteWhitelist(msg.domain, msg.categories);
      return { type: 'OK' };

    case 'UNWHITELIST_SITE':
      await removeSiteWhitelist(msg.domain);
      return { type: 'OK' };
  }
}
