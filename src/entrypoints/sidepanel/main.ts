import { detectBrowser } from '@background/browser';
import { CATEGORIES, PRESETS, STORE_URLS } from '@shared/constants';
import { sendMessage } from '@shared/messaging';
import { loadSettings, patchSettings, toggleCategory, toggleSubToggle } from '@shared/settings';
import type { CategoryId, PresetId } from '@shared/types';
import { createActivityDrawer } from '@ui/components/activity-drawer';
import { createCategoryCard } from '@ui/components/category-card';
import { $, h } from '@ui/dom';
import { icon } from '@ui/icons';
import '../../assets/styles/tokens.css';

async function render() {
  const app = $('#app')!;
  const browser = detectBrowser();
  let settings = await loadSettings();

  // ── Theme ──
  const stored = await chrome.storage.local.get('theme');
  const initialTheme = (stored.theme as string) ?? 'dark';
  document.documentElement.setAttribute('data-theme', initialTheme);

  let currentTheme = initialTheme;
  const themeIcon = h('span', { class: 'theme-toggle__icon' });
  themeIcon.append(icon(currentTheme === 'dark' ? 'sun' : 'moon', 16));

  const themeBtn = h(
    'button',
    {
      class: 'theme-toggle',
      'data-testid': 'theme-toggle',
      title: chrome.i18n.getMessage('THEME_TOGGLE_TOOLTIP') || 'Toggle theme',
      onClick: async () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        await chrome.storage.local.set({ theme: currentTheme });
        themeIcon.textContent = '';
        themeIcon.append(icon(currentTheme === 'dark' ? 'sun' : 'moon', 16));
      },
    },
    themeIcon,
  );

  // ── Site whitelist button (header icon) ──
  const siteIconEl = h('span', { class: 'btn-icon__inner' });
  siteIconEl.append(icon('web-plus', 16));

  let siteFlashTimer: ReturnType<typeof setTimeout> | null = null;

  const siteBtn = h('button', {
    class: 'btn-icon',
    'data-testid': 'whitelist-site',
    title: chrome.i18n.getMessage('WHITELIST_SITE_TOOLTIP') || 'Allow on this site',
    onClick: () => {
      // Flash success feedback immediately
      if (siteFlashTimer) clearTimeout(siteFlashTimer);
      siteIconEl.textContent = '';
      siteIconEl.append(icon('check-circle', 16));
      siteBtn.classList.add('btn-icon--ok');
      siteFlashTimer = setTimeout(() => {
        siteIconEl.textContent = '';
        siteIconEl.append(icon('web-plus', 16));
        siteBtn.classList.remove('btn-icon--ok');
        siteFlashTimer = null;
      }, 2000);

      // Fire-and-forget whitelist
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (!tab?.url) return;
        const domain = new URL(tab.url).hostname;
        const allCats: CategoryId[] = ['ai', 'sponsored', 'shopping', 'telemetry', 'annoyances'];
        sendMessage({ type: 'WHITELIST_SITE', domain, categories: allCats });
      });
    },
  });
  siteBtn.append(siteIconEl);

  // ── Header ──
  const headerIcon = h('span', { class: 'header__icon' });
  headerIcon.append(icon('shield-check', 20));

  const header = h(
    'header',
    { class: 'header', 'data-testid': 'header' },
    h(
      'div',
      { class: 'header__top' },
      h(
        'div',
        { class: 'header__brand' },
        headerIcon,
        h('span', { class: 'header__title', 'data-testid': 'header-title' }, 'Debloat'),
      ),
      h('div', { class: 'header__actions' }, siteBtn, themeBtn),
    ),
    h('div', { class: 'header__subtitle' }, 'Your browser, decluttered'),
  );

  // ── Preset pills ──
  const presetIds: PresetId[] = ['aggressive', 'balanced', 'minimal', 'custom'];
  const presetLabels: Record<PresetId, string> = {
    aggressive: 'Aggressive',
    balanced: 'Balanced',
    minimal: 'Minimal',
    custom: 'Custom',
  };

  const presetBar = h('div', { class: 'presets', 'data-testid': 'preset-selector' });
  const presetPills: Record<string, HTMLElement> = {};

  for (const id of presetIds) {
    const pill = h(
      'button',
      {
        class: `preset${id === settings.preset ? ' preset--active' : ''}`,
        'data-testid': `preset-${id}`,
        type: 'button',
        onClick: async () => {
          const values = PRESETS[id];
          if (!values) return;
          settings = await patchSettings({ ...values, preset: id, subToggles: {} });
          setPreset(id);
          renderCards();
        },
      },
      presetLabels[id],
    );
    presetPills[id] = pill;
    presetBar.append(pill);
  }

  function setPreset(id: PresetId) {
    for (const [pid, pill] of Object.entries(presetPills)) {
      pill.classList.toggle('preset--active', pid === id);
    }
  }

  const presetSelect = {
    set value(v: PresetId) {
      setPreset(v);
    },
  };

  // ── Pause ──
  const pauseBtn = h('button', {
    class: 'quick__btn',
    'data-testid': 'pause-1h',
    onClick: async () => {
      if (settings.pauseUntil && settings.pauseUntil > Date.now()) {
        await sendMessage({ type: 'UNPAUSE' });
        pauseBtn.textContent = '';
        pauseBtn.append(icon('pause', 14), ' Pause (1h)');
        pauseBtn.classList.remove('quick__btn--active');
      } else {
        await sendMessage({ type: 'PAUSE', durationMs: 60 * 60 * 1000 });
        pauseBtn.textContent = '';
        pauseBtn.append(icon('play', 14), ' Resume');
        pauseBtn.classList.add('quick__btn--active');
      }
      settings = await loadSettings();
    },
  });
  if (settings.pauseUntil && settings.pauseUntil > Date.now()) {
    pauseBtn.append(icon('play', 14), ' Resume');
  } else {
    pauseBtn.append(icon('pause', 14), ' Pause (1h)');
  }

  const quickBar = h('div', { class: 'quick', 'data-testid': 'quick-controls' }, pauseBtn);

  // ── Category cards ──
  const cardsContainer = h('div', { class: 'cards', 'data-testid': 'categories' });

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

  // ── Activity drawer ──
  const activityDrawer = createActivityDrawer();

  // ── Review link ──
  const storeInfo = STORE_URLS[browser];
  const reviewLink = storeInfo
    ? h(
        'a',
        { class: 'footer__review', href: storeInfo.url, target: '_blank' },
        icon(storeInfo.icon, 16),
        chrome.i18n.getMessage(storeInfo.labelKey) || 'Rate this extension',
      )
    : null;

  // ── Footer ──
  const enableAllBtn = h(
    'button',
    {
      class: 'footer__btn',
      'data-testid': 'enable-all',
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
      'data-testid': 'disable-all',
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

  const footerChildren: (Node | string)[] = [activityDrawer];
  if (reviewLink) footerChildren.push(reviewLink);
  footerChildren.push(h('div', { class: 'footer__actions' }, enableAllBtn, disableAllBtn));

  const footer = h('footer', { class: 'footer' });
  for (const child of footerChildren) footer.append(child);

  // ── Assemble ──
  app.append(header, presetBar, quickBar, cardsContainer, footer);
}

render();
