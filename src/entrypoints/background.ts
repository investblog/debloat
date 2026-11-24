import { addCssHiddenCount, getTabCount, initBadge } from '@background/badge';
import { initClassicResults, isAiShown, showAiOnce } from '@background/classic-results';
import { initPause, pause, unpause } from '@background/pause';
import { initRules } from '@background/rules';
import type { Message, MessageResponse } from '@shared/messaging';
import { addSiteWhitelist, removeSiteWhitelist } from '@shared/settings';
import type { ActivityEntry } from '@shared/types';
import { browser } from 'wxt/browser';

// Per-tab activity log (circular buffer, runtime only)
const tabActivity = new Map<number, ActivityEntry[]>();

export default defineBackground(async () => {
  initBadge(tabActivity);
  initRules();
  initPause();
  initClassicResults();

  // Toolbar icon, no popup: Chrome/Edge open the side panel; Firefox toggles the sidebar
  // straight from the click (sidebarAction needs the user gesture). Runs on every worker start.
  const b = browser as unknown as {
    sidePanel?: { setPanelBehavior?: (o: object) => Promise<void> };
    sidebarAction?: { toggle?: () => Promise<void>; open: () => Promise<void> };
    browserAction?: { onClicked: { addListener: (cb: () => void) => void } };
  };
  b.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true })?.catch(() => undefined);
  if (b.sidebarAction && b.browserAction) {
    const sidebar = b.sidebarAction;
    b.browserAction.onClicked.addListener(() => {
      (sidebar.toggle ? sidebar.toggle() : sidebar.open()).catch(() => undefined);
    });
  }

  // Message handler for Side Panel / Sidebar
  browser.runtime.onMessage.addListener(((
    msg: Message,
    sender: { tab?: { id?: number; url?: string } },
    sendResponse: (resp: MessageResponse) => void,
  ) => {
    handleMessage(msg, sender).then(sendResponse);
    return true; // async response
  }) as Parameters<typeof browser.runtime.onMessage.addListener>[0]);

  // Cleanup on tab close
  browser.tabs.onRemoved.addListener((tabId) => {
    tabActivity.delete(tabId);
  });

  // Welcome page on first install + uninstall URL
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') });
      browser.runtime.setUninstallURL('https://debloat.click/uninstall');
    }
  });
});

async function handleMessage(msg: Message, sender: { tab?: { id?: number; url?: string } }): Promise<MessageResponse> {
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

    case 'REPORT_CSS_HIDDEN': {
      const tabId = sender.tab?.id;
      if (tabId != null) {
        addCssHiddenCount(tabId, msg.count, msg.domain, msg.category, tabActivity);
      }
      return { type: 'OK' };
    }

    case 'SHOW_AI_ONCE':
      await showAiOnce(msg.tabId);
      return { type: 'OK' };

    case 'IS_AI_SHOWN': {
      const { id, url } = sender.tab ?? {};
      return { type: 'AI_SHOWN', shown: id != null && url != null && isAiShown(id, url) };
    }
  }
}
