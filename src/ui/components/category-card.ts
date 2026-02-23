import type { BrowserType, Category, CategoryId, Settings } from '@shared/types';
import { h } from '@ui/dom';
import { createToggle } from './toggle';

export interface CategoryCardOptions {
  category: Category;
  settings: Settings;
  browser: BrowserType;
  onToggleCategory: (id: CategoryId, enabled: boolean) => void;
  onToggleSub: (id: string, enabled: boolean) => void;
}

export function createCategoryCard({
  category,
  settings,
  browser,
  onToggleCategory,
  onToggleSub,
}: CategoryCardOptions): HTMLElement {
  const visibleSubs = category.subToggles.filter((s) => s.browsers.includes(browser));
  const masterEnabled = settings[category.id] ?? true;

  // Count rules per browser
  const counts = countByBrowser(category);

  const subContainer = h('div', { class: 'card__subs' });
  subContainer.style.display = 'none';

  for (const sub of visibleSubs) {
    const subEnabled = settings.subToggles[sub.id] ?? sub.defaultEnabled;
    const subToggle = createToggle({
      checked: subEnabled && masterEnabled,
      onChange: (val) => onToggleSub(sub.id, val),
      size: 'small',
    });

    const subRow = h('div', { class: 'card__sub-row' }, subToggle, h('span', { class: 'card__sub-label' }, sub.label));
    subContainer.append(subRow);
  }

  let expanded = false;

  const chevron = h('span', { class: 'card__chevron' }, '\u25B8');

  const expandBtn = h(
    'button',
    {
      class: 'card__expand',
      onClick: () => {
        expanded = !expanded;
        subContainer.style.display = expanded ? 'block' : 'none';
        chevron.textContent = expanded ? '\u25BE' : '\u25B8';
      },
    },
    chevron,
    ` ${visibleSubs.length} sub-toggles`,
  );

  const masterToggle = createToggle({
    checked: masterEnabled,
    onChange: (val) => onToggleCategory(category.id, val),
  });

  const coverageLine = buildCoverageLine(counts, browser);

  const card = h(
    'div',
    { class: `card ${masterEnabled ? '' : 'card--off'}` },
    h(
      'div',
      { class: 'card__header' },
      h('span', { class: 'card__icon' }, category.icon),
      h(
        'div',
        { class: 'card__info' },
        h(
          'div',
          { class: 'card__title-row' },
          h('span', { class: 'card__title' }, chrome.i18n.getMessage(category.labelKey) || category.id),
          masterToggle,
        ),
        h('div', { class: 'card__desc' }, chrome.i18n.getMessage(category.descriptionKey) || ''),
        h('div', { class: 'card__coverage' }, coverageLine),
      ),
    ),
    visibleSubs.length > 0 ? expandBtn : h('span'),
    subContainer,
  );

  return card;
}

function countByBrowser(category: Category): Record<BrowserType, number> {
  const counts: Record<string, number> = { chrome: 0, edge: 0, firefox: 0 };
  for (const sub of category.subToggles) {
    for (const b of sub.browsers) {
      counts[b] = (counts[b] ?? 0) + 1;
    }
  }
  return counts as Record<BrowserType, number>;
}

function buildCoverageLine(counts: Record<BrowserType, number>, _current: BrowserType): string {
  const parts: string[] = [];
  for (const [b, n] of Object.entries(counts)) {
    if (n > 0) {
      const label = b.charAt(0).toUpperCase() + b.slice(1);
      parts.push(`${label}: ${n}`);
    }
  }
  return parts.join(' \u00B7 ');
}
