import { CATEGORIES } from '@shared/constants';
import { t } from '@shared/i18n';
import { sendMessage } from '@shared/messaging';
import type { ActivityEntry, CategoryId } from '@shared/types';
import { h } from '@ui/dom';
import { icon } from '@ui/icons';
import { browser } from 'wxt/browser';

type MsgKey = Parameters<typeof browser.i18n.getMessage>[0];

const POLL_INTERVAL = 3000;

const CATEGORY_ICON_NAMES: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.icon]),
) as Record<CategoryId, string>;

const CATEGORY_LABEL_KEYS: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.labelKey]),
) as Record<CategoryId, string>;

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface ActivityDrawerOptions {
  onHasActivity?: (hasActivity: boolean) => void;
}

export function createActivityDrawer(opts?: ActivityDrawerOptions): { drawer: HTMLElement; open: () => void } {
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const list = h('div', { class: 'activity__list', 'data-testid': 'activity-list' });

  const clearBtn = h(
    'button',
    {
      class: 'drawer__clear',
      'data-testid': 'activity-clear',
      onClick: () => {
        list.textContent = '';
      },
    },
    t('ACTIVITY_CLEAR', 'Clear'),
  );

  const closeIcon = h('span', { class: 'btn-icon__inner' });
  closeIcon.append(icon('close-circle', 16));

  const closeBtn = h('button', {
    class: 'btn-icon drawer__close',
    'data-testid': 'activity-close',
    onClick: close,
  });
  closeBtn.append(closeIcon);

  const overlay = h('div', { class: 'drawer__overlay' });
  overlay.addEventListener('click', close);

  const panel = h(
    'div',
    { class: 'drawer__panel' },
    h('div', { class: 'drawer__header' }, h('span', { class: 'drawer__title' }, 'Activity'), closeBtn),
    h('div', { class: 'drawer__body' }, list),
    h('div', { class: 'drawer__footer' }, clearBtn),
  );

  const drawer = h('aside', { class: 'drawer' }, overlay, panel);
  drawer.hidden = true;

  function open() {
    drawer.hidden = false;
    refresh();
    pollTimer = setInterval(refresh, POLL_INTERVAL);
    document.addEventListener('keydown', onKeyDown);
  }

  function close() {
    drawer.hidden = true;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    document.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  async function pollIndicators() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const actResp = await sendMessage({ type: 'GET_ACTIVITY', tabId: tab.id });
      const entries = actResp.type === 'ACTIVITY' ? actResp.entries : [];
      opts?.onHasActivity?.(entries.length > 0);
    } catch {
      // ignore
    }
  }

  // Background poll for indicators (even when drawer is closed)
  pollIndicators();
  setInterval(pollIndicators, POLL_INTERVAL);

  async function refresh() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const actResp = await sendMessage({ type: 'GET_ACTIVITY', tabId: tab.id });
      const entries = actResp.type === 'ACTIVITY' ? actResp.entries : [];
      opts?.onHasActivity?.(entries.length > 0);
      renderEntries(entries);
    } catch {
      // Side panel may not have an active tab
    }
  }

  function renderEntries(entries: ActivityEntry[]) {
    list.textContent = '';

    if (entries.length === 0) {
      list.append(h('div', { class: 'activity__empty' }, t('ACTIVITY_EMPTY', 'No activity yet')));
      return;
    }

    // Aggregate CSS entries by domain+category
    interface AggregatedEntry {
      time: number;
      domain: string;
      category: CategoryId;
      rulesetId: string;
      count: number;
    }

    const cssAggregated = new Map<string, AggregatedEntry>();
    const dnrEntries: ActivityEntry[] = [];

    for (const entry of entries) {
      if (entry.rulesetId.startsWith('css:')) {
        const key = `${entry.domain}:${entry.category}`;
        const existing = cssAggregated.get(key);
        if (existing) {
          existing.count += entry.count ?? 0;
          if (entry.time > existing.time) existing.time = entry.time;
        } else {
          cssAggregated.set(key, {
            time: entry.time,
            domain: entry.domain,
            category: entry.category,
            rulesetId: entry.rulesetId,
            count: entry.count ?? 0,
          });
        }
      } else {
        dnrEntries.push(entry);
      }
    }

    const merged: AggregatedEntry[] = [...dnrEntries.map((e) => ({ ...e, count: 0 })), ...cssAggregated.values()];
    merged.sort((a, b) => b.time - a.time);

    for (let i = 0; i < merged.length; i++) {
      const entry = merged[i];
      const isCss = entry.rulesetId.startsWith('css:');
      const iconName = CATEGORY_ICON_NAMES[entry.category] ?? 'shield-check';
      const iconEl = h('span', { class: 'activity__icon' });
      iconEl.append(icon(iconName, 14));

      const allowBtn = h(
        'button',
        {
          class: 'activity__allow',
          'data-testid': `activity-allow-${i}`,
          onClick: async () => {
            await sendMessage({
              type: 'WHITELIST_SITE',
              domain: entry.domain,
              categories: [entry.category],
            });
            allowBtn.textContent = '\u2713';
            allowBtn.classList.add('activity__allow--done');
            allowBtn.disabled = true;
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) browser.tabs.reload(tab.id);
          },
        },
        t('ACTIVITY_ALLOW', 'Allow on site'),
      );

      const elementsHiddenLabel = browser.i18n.getMessage('ACTIVITY_ELEMENTS_HIDDEN' as MsgKey) || 'elements hidden';
      const domainText = isCss
        ? `${entry.domain} \u2014 ${entry.count} ${elementsHiddenLabel}`
        : entry.domain || entry.rulesetId;

      const categoryLabel = browser.i18n.getMessage(CATEGORY_LABEL_KEYS[entry.category] as MsgKey) || entry.category;
      const tooltip = isCss
        ? `${categoryLabel}\n${entry.domain} \u2014 ${entry.count} ${elementsHiddenLabel}\n${formatTime(entry.time)}`
        : `${categoryLabel}\n${entry.domain}\n${t('ACTIVITY_RULESET', 'Ruleset: $1', entry.rulesetId)}\n${formatTime(entry.time)}`;

      const row = h(
        'div',
        { class: 'activity__row', 'data-testid': `activity-row-${i}`, title: tooltip },
        h('span', { class: 'activity__time' }, formatTime(entry.time)),
        iconEl,
        h('span', { class: 'activity__domain' }, domainText),
        allowBtn,
      );
      list.append(row);
    }
  }

  return { drawer, open };
}
