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
  const brandSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  brandSvg.setAttribute('width', '64');
  brandSvg.setAttribute('height', '64');
  brandSvg.setAttribute('viewBox', '0 0 36 36');
  brandSvg.setAttribute('fill', 'none');
  brandSvg.setAttribute('aria-hidden', 'true');
  const brandPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  brandPath.setAttribute(
    'd',
    'M3.376.281C4.41.175 5.886.256 6.952.256l5.854-.003c1.922 0 4.955-.092 6.807.055a17.5 17.5 0 0 1 10.674 4.697c.937.874 2.101 2.196 2.708 3.331.898 1.678-.23 3.049-1.17 4.264q-.975 1.252-1.932 2.517l-4.406 5.886c-.624.825-1.426 2.045-2.106 2.708-2.006 1.957-3.83.75-5.182-1.132-.53-.74-1.677-1.991-2.303-2.6-.783.914-1.878 2.472-2.611 3.461l-4.821 6.54 6.653.021c2.1.007 3.927.092 6.004-.402 3.332-.79 6.609-3.224 8.02-6.376q.38-.86.626-1.767c.074-.279.363-1.61.497-1.767 1.669-1.939 3.331-4.15 5.013-6.066.934 3.669 1.075 7.036-.248 10.662-1.666 4.566-4.79 7.752-9.135 9.815a16.2 16.2 0 0 1-3.136 1.108c-2.737.672-4.755.561-7.546.56l-6.235-.003-3.519-.003c-2.37-.003-4.665.06-5.363-2.833-.45-1.868.795-2.974 1.827-4.32.563-.735 1.173-1.479 1.75-2.222a681 681 0 0 1 5.74-7.446l2.92-3.796c.713-.925 1.329-2.017 2.519-2.33 2.216-.58 3.332 1.04 4.576 2.491l1.79 2.07a267 267 0 0 0 3.283-4.289c.788-1.038 1.596-2.046 2.352-3.11q-.355-.37-.72-.732c-3.733-3.648-7.815-3.27-12.558-3.27q-3.9-.005-7.8.034c-.142 4.103.119 8.325-.046 12.437a18 18 0 0 1-.764 1.074C3.35 21.657 1.662 23.73.06 25.875c-.04-1.657-.012-3.422-.013-5.087l-.003-9.28V6.455c0-.948-.038-1.952.046-2.892C.25 1.792 1.654.525 3.376.282',
  );
  brandPath.setAttribute('fill', 'currentColor');
  brandSvg.appendChild(brandPath);
  heroIcon.appendChild(brandSvg);

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
