import { CATEGORIES } from '@shared/constants';
import { sendMessage } from '@shared/messaging';
import type { ActivityEntry, CategoryId } from '@shared/types';
import { h } from '@ui/dom';
import { icon } from '@ui/icons';
import { browser } from 'wxt/browser';

const POLL_INTERVAL = 3000;

const CATEGORY_ICON_NAMES: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.icon]),
) as Record<CategoryId, string>;

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function createActivityDrawer(): HTMLElement {
  let expanded = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const chevron = h('span', { class: 'activity__chevron' });
  chevron.append(icon('chevron-down', 12));
  const list = h('div', { class: 'activity__list' });
  list.style.display = 'none';

  const clearBtn = h(
    'button',
    {
      class: 'activity__clear',
      onClick: () => {
        list.textContent = '';
      },
    },
    'Clear',
  );
  clearBtn.style.display = 'none';

  const headerBtn = h(
    'button',
    {
      class: 'activity__header',
      onClick: () => {
        expanded = !expanded;
        list.style.display = expanded ? 'flex' : 'none';
        clearBtn.style.display = expanded ? 'inline' : 'none';
        chevron.textContent = '';
        chevron.append(icon(expanded ? 'chevron-up' : 'chevron-down', 12));

        if (expanded) {
          refresh();
          pollTimer = setInterval(refresh, POLL_INTERVAL);
        } else if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      },
    },
    chevron,
    ' Activity',
  );

  const container = h('div', { class: 'activity' }, h('div', { class: 'activity__bar' }, headerBtn, clearBtn), list);

  async function refresh() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const resp = await sendMessage({ type: 'GET_ACTIVITY', tabId: tab.id });
      if (resp.type !== 'ACTIVITY') return;
      renderEntries(resp.entries);
    } catch {
      // Side panel may not have an active tab
    }
  }

  function renderEntries(entries: ActivityEntry[]) {
    list.textContent = '';
    if (entries.length === 0) {
      list.append(h('div', { class: 'activity__empty' }, 'No activity yet'));
      return;
    }

    // Show newest first
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      const iconName = CATEGORY_ICON_NAMES[entry.category] ?? 'shield-check';
      const iconEl = h('span', { class: 'activity__icon' });
      iconEl.append(icon(iconName, 14));

      const allowBtn = h(
        'button',
        {
          class: 'activity__allow',
          onClick: async () => {
            await sendMessage({
              type: 'WHITELIST_SITE',
              domain: entry.domain,
              categories: [entry.category],
            });
            allowBtn.textContent = '\u2713';
            allowBtn.disabled = true;
          },
        },
        'Allow on site',
      );

      const row = h(
        'div',
        { class: 'activity__row' },
        h('span', { class: 'activity__time' }, formatTime(entry.time)),
        iconEl,
        h('span', { class: 'activity__domain' }, entry.domain || entry.rulesetId),
        allowBtn,
      );
      list.append(row);
    }
  }

  return container;
}
