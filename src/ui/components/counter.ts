import { sendMessage } from '@shared/messaging';
import { h } from '@ui/dom';
import { browser } from 'wxt/browser';

export function createCounter(): HTMLElement {
  const countEl = h('span', { class: 'counter__value' }, '0');
  const container = h(
    'div',
    { class: 'counter' },
    h('span', { class: 'counter__label' }, 'Blocked on this tab:'),
    countEl,
  );

  // Poll for count updates
  async function refresh() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const resp = await sendMessage({ type: 'GET_TAB_COUNT', tabId: tab.id });
      if (resp.type === 'TAB_COUNT') {
        countEl.textContent = String(resp.count);
      }
    } catch {
      // Side panel may be open without an active tab
    }
  }

  refresh();
  setInterval(refresh, 2000);

  return container;
}
