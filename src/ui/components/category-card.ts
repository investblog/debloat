import { subToggleKey, t } from '@shared/i18n';
import { isSubEnabled } from '@shared/settings';
import type { BrowserType, Category, CategoryId, Settings } from '@shared/types';
import { h } from '@ui/dom';
import { icon } from '@ui/icons';
import { browser as webBrowser } from 'wxt/browser';
import { createToggle, setToggleState } from './toggle';

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

  // Each sub-toggle's own setting, kept current so the master toggle can redraw them in place.
  const subToggles: Array<{ id: string; el: HTMLElement }> = [];
  const subOn = new Map(visibleSubs.map((s) => [s.id, isSubEnabled(settings, s.id)]));

  for (const sub of visibleSubs) {
    const subEnabled = isSubEnabled(settings, sub.id);
    const subToggle = createToggle({
      checked: subEnabled && masterEnabled,
      onChange: (val) => {
        subOn.set(sub.id, val);
        onToggleSub(sub.id, val);
      },
      size: 'small',
      testId: `sub-toggle-${sub.id}`,
    });
    subToggles.push({ id: sub.id, el: subToggle });

    const subRow = h(
      'div',
      { class: 'card__sub-row', 'data-testid': `sub-row-${sub.id}` },
      subToggle,
      sub.hint
        ? h(
            'span',
            { class: 'card__sub-label' },
            t(subToggleKey(sub.id), sub.label),
            h('span', { class: 'card__sub-hint' }, t(`${subToggleKey(sub.id)}_HINT`, sub.hint)),
          )
        : h('span', { class: 'card__sub-label' }, t(subToggleKey(sub.id), sub.label)),
    );
    subContainer.append(subRow);
  }

  let expanded = false;

  const chevron = h('span', { class: 'card__chevron' });
  chevron.append(icon('chevron-down', 14));

  const expandBtn = h(
    'button',
    {
      class: 'card__expand',
      'data-testid': `expand-${category.id}`,
      onClick: () => {
        expanded = !expanded;
        subContainer.style.display = expanded ? 'block' : 'none';
        chevron.textContent = '';
        chevron.append(icon(expanded ? 'chevron-up' : 'chevron-down', 14));
      },
    },
    chevron,
    ` ${t('SUB_TOGGLES_COUNT', '$1 sub-toggles', visibleSubs.length)}`,
  );

  const masterToggle = createToggle({
    checked: masterEnabled,
    onChange: (val) => {
      // The cards are not re-rendered on a master switch: redraw this one in place.
      card.classList.toggle('card--off', !val);
      for (const { id, el } of subToggles) setToggleState(el, val && (subOn.get(id) ?? false));
      onToggleCategory(category.id, val);
    },
    testId: `master-toggle-${category.id}`,
  });

  const coverageLine = buildCoverageLine(counts, browser);

  const iconEl = h('span', { class: 'card__icon' });
  iconEl.append(icon(category.icon));

  const card = h(
    'div',
    { class: `card ${masterEnabled ? '' : 'card--off'}`, 'data-testid': `category-${category.id}` },
    h(
      'div',
      { class: 'card__header' },
      iconEl,
      h(
        'div',
        { class: 'card__info' },
        h(
          'div',
          { class: 'card__title-row' },
          h(
            'span',
            { class: 'card__title' },
            webBrowser.i18n.getMessage(category.labelKey as Parameters<typeof webBrowser.i18n.getMessage>[0]) ||
              category.id,
          ),
          masterToggle,
        ),
        h(
          'div',
          { class: 'card__desc' },
          webBrowser.i18n.getMessage(category.descriptionKey as Parameters<typeof webBrowser.i18n.getMessage>[0]) || '',
        ),
        h('div', { class: 'card__coverage', 'data-testid': `coverage-${category.id}` }, coverageLine),
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
