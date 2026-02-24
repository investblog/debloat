import { detectBrowser } from '@background/browser';
import { CATEGORIES } from '@shared/constants';
import { $, h } from '@ui/dom';
import { icon } from '@ui/icons';
import '../../assets/styles/tokens.css';

function msg(key: string, fallback: string): string {
  return chrome.i18n.getMessage(key) || fallback;
}

async function render() {
  const app = $('#app')!;
  const currentBrowser = detectBrowser();

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
      title: msg('THEME_TOGGLE_TOOLTIP', 'Toggle theme'),
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

  // ── Hero ──
  const heroIcon = h('span', { class: 'welcome__hero-icon' });
  heroIcon.append(icon('shield-check', 64));

  const hero = h(
    'section',
    { class: 'welcome__hero' },
    heroIcon,
    h('h1', { class: 'welcome__title' }, 'Debloat'),
    h('p', { class: 'welcome__tagline' }, msg('WELCOME_TAGLINE', 'Your browser, decluttered')),
  );

  // ── Feature cards ──
  const featuresTitle = h('h2', { class: 'welcome__section-title' }, msg('WELCOME_FEATURES_TITLE', 'What it blocks'));

  const featuresGrid = h('div', { class: 'welcome__features' });
  for (const cat of CATEGORIES) {
    const cardIcon = h('span', { class: 'welcome__feature-icon' });
    cardIcon.append(icon(cat.icon, 24));

    const card = h(
      'div',
      { class: 'welcome__feature-card' },
      cardIcon,
      h('h3', { class: 'welcome__feature-name' }, msg(cat.labelKey, cat.id)),
      h('p', { class: 'welcome__feature-desc' }, msg(cat.descriptionKey, '')),
    );
    featuresGrid.append(card);
  }

  // ── How it works ──
  const howTitle = h('h2', { class: 'welcome__section-title' }, msg('WELCOME_HOW_TITLE', 'How it works'));

  const steps = [
    {
      num: '1',
      titleKey: 'WELCOME_STEP1_TITLE',
      titleFb: 'Install',
      descKey: 'WELCOME_STEP1_DESC',
      descFb: 'Add the extension — no admin rights needed',
    },
    {
      num: '2',
      titleKey: 'WELCOME_STEP2_TITLE',
      titleFb: 'Customize',
      descKey: 'WELCOME_STEP2_DESC',
      descFb: 'Pick which categories to block or allow',
    },
    {
      num: '3',
      titleKey: 'WELCOME_STEP3_TITLE',
      titleFb: 'Browse',
      descKey: 'WELCOME_STEP3_DESC',
      descFb: 'Enjoy a cleaner, faster browser',
    },
  ];

  const stepsRow = h('div', { class: 'welcome__steps' });
  for (const step of steps) {
    stepsRow.append(
      h(
        'div',
        { class: 'welcome__step' },
        h('span', { class: 'welcome__step-num' }, step.num),
        h('h3', { class: 'welcome__step-title' }, msg(step.titleKey, step.titleFb)),
        h('p', { class: 'welcome__step-desc' }, msg(step.descKey, step.descFb)),
      ),
    );
  }

  // ── CTA ──
  const ctaText = msg('WELCOME_CTA', 'Open Side Panel');
  const ctaFallbackText = msg('WELCOME_CTA_FALLBACK', 'Click the Debloat icon in your toolbar to get started');

  const ctaBtn = h(
    'button',
    {
      class: 'welcome__cta',
      onClick: async () => {
        try {
          if (currentBrowser === 'firefox') {
            // @ts-expect-error -- Firefox sidebar API via globalThis
            await globalThis.browser.sidebarAction.open();
          } else if (chrome.sidePanel?.open) {
            const win = await chrome.windows.getCurrent();
            if (!win.id) throw new Error('no-window');
            await chrome.sidePanel.open({ windowId: win.id });
          } else {
            throw new Error('no-api');
          }
        } catch {
          ctaBtn.textContent = ctaFallbackText;
          ctaBtn.disabled = true;
          ctaBtn.classList.add('welcome__cta--fallback');
        }
      },
    },
    ctaText,
  );

  // ── Assemble ──
  app.append(themeBtn, hero, featuresTitle, featuresGrid, howTitle, stepsRow, ctaBtn);
}

render();
