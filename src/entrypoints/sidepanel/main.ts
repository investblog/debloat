import { detectBrowser } from '@background/browser';
import { CATEGORIES, PRESETS } from '@shared/constants';
import { sendMessage } from '@shared/messaging';
import { loadSettings, patchSettings, toggleCategory, toggleSubToggle } from '@shared/settings';
import type { CategoryId, PresetId } from '@shared/types';
import { createCategoryCard } from '@ui/components/category-card';
import { createCounter } from '@ui/components/counter';
import { $, h } from '@ui/dom';
import '../../assets/styles/tokens.css';

async function render() {
  const app = $('#app')!;
  const browser = detectBrowser();
  let settings = await loadSettings();

  // ── Header ──
  const header = h(
    'header',
    { class: 'header' },
    h(
      'div',
      { class: 'header__brand' },
      h('span', { class: 'header__icon' }, '\u{1F9F9}'),
      h('span', { class: 'header__title' }, 'Debloat'),
    ),
    h('div', { class: 'header__subtitle' }, 'Your browser, decluttered'),
  );

  // ── Quick controls ──
  const pauseBtn = h(
    'button',
    {
      class: 'quick__btn',
      onClick: async () => {
        if (settings.pauseUntil && settings.pauseUntil > Date.now()) {
          await sendMessage({ type: 'UNPAUSE' });
          pauseBtn.textContent = '\u23F8 Pause (1h)';
          pauseBtn.classList.remove('quick__btn--active');
        } else {
          await sendMessage({ type: 'PAUSE', durationMs: 60 * 60 * 1000 });
          pauseBtn.textContent = '\u25B6 Resume';
          pauseBtn.classList.add('quick__btn--active');
        }
        settings = await loadSettings();
      },
    },
    settings.pauseUntil && settings.pauseUntil > Date.now() ? '\u25B6 Resume' : '\u23F8 Pause (1h)',
  );

  const siteBtn = h('button', { class: 'quick__btn' }, '\u{1F6AB} This site');

  const presetSelect = h('select', {
    class: 'quick__select',
    onChange: async (e: Event) => {
      const preset = (e.target as HTMLSelectElement).value as PresetId;
      const values = PRESETS[preset];
      if (!values) return;
      settings = await patchSettings({
        ...values,
        preset,
        subToggles: {},
      });
      renderCards();
    },
  }) as HTMLSelectElement;

  for (const id of ['aggressive', 'balanced', 'minimal', 'custom'] as PresetId[]) {
    const opt = h('option', { value: id }, id.charAt(0).toUpperCase() + id.slice(1));
    presetSelect.append(opt);
  }
  presetSelect.value = settings.preset;

  const quickBar = h('div', { class: 'quick' }, pauseBtn, siteBtn, presetSelect);

  // ── Category cards ──
  const cardsContainer = h('div', { class: 'cards' });

  function renderCards() {
    cardsContainer.textContent = '';
    for (const cat of CATEGORIES) {
      // Skip categories with zero visible sub-toggles for current browser
      const visibleCount = cat.subToggles.filter((s) => s.browsers.includes(browser)).length;
      if (visibleCount === 0) continue;

      const card = createCategoryCard({
        category: cat,
        settings,
        browser,
        onToggleCategory: async (id: CategoryId, enabled: boolean) => {
          settings = await toggleCategory(id, enabled);
          presetSelect.value = 'custom';
        },
        onToggleSub: async (id: string, enabled: boolean) => {
          settings = await toggleSubToggle(id, enabled);
          presetSelect.value = 'custom';
        },
      });
      cardsContainer.append(card);
    }
  }
  renderCards();

  // ── Footer ──
  const counter = createCounter();

  const enableAllBtn = h(
    'button',
    {
      class: 'footer__btn',
      onClick: async () => {
        settings = await patchSettings({ ...PRESETS.aggressive, preset: 'aggressive' as PresetId, subToggles: {} });
        presetSelect.value = 'aggressive';
        renderCards();
      },
    },
    'Enable All',
  );

  const disableAllBtn = h(
    'button',
    {
      class: 'footer__btn footer__btn--danger',
      onClick: async () => {
        settings = await patchSettings({
          ai: false,
          sponsored: false,
          shopping: false,
          telemetry: false,
          annoyances: false,
          preset: 'custom' as PresetId,
        });
        presetSelect.value = 'custom';
        renderCards();
      },
    },
    'Disable All',
  );

  const footer = h(
    'footer',
    { class: 'footer' },
    counter,
    h('div', { class: 'footer__actions' }, enableAllBtn, disableAllBtn),
  );

  // ── Assemble ──
  app.append(header, quickBar, cardsContainer, footer);
}

render();
