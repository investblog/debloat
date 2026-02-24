import { CATEGORIES } from '@shared/constants';
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

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function buildIssueLink(entry: ActivityEntry): string {
  const params = new URLSearchParams({
    title: `[Report] ${entry.domain} — ${entry.rulesetId}`,
    body: `**Domain:** ${entry.domain}\n**Ruleset:** ${entry.rulesetId}\n**Category:** ${entry.category}\n\n_Describe the issue:_`,
  });
  return `https://github.com/investblog/debloat/issues/new?${params.toString()}`;
}

export function createActivityDrawer(): { drawer: HTMLElement; open: () => void } {
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
    'Clear',
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

    // Aggregate CSS entries by domain+category, keep newest time and sum counts
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

    // Merge and sort by time (newest first)
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
            allowBtn.disabled = true;
          },
        },
        'Allow on site',
      );

      const reportLink = h(
        'a',
        {
          class: 'activity__report',
          'data-testid': `activity-report-${i}`,
          href: buildIssueLink(entry),
          target: '_blank',
        },
        'Report',
      );

      const elementsHiddenLabel = browser.i18n.getMessage('ACTIVITY_ELEMENTS_HIDDEN' as MsgKey) || 'elements hidden';
      const domainText = isCss
        ? `${entry.domain} \u2014 ${entry.count} ${elementsHiddenLabel}`
        : entry.domain || entry.rulesetId;

      const row = h(
        'div',
        { class: 'activity__row', 'data-testid': `activity-row-${i}` },
        h('span', { class: 'activity__time' }, formatTime(entry.time)),
        iconEl,
        h('span', { class: 'activity__domain' }, domainText),
        allowBtn,
        reportLink,
      );
      list.append(row);
    }
  }

  return { drawer, open };
}
