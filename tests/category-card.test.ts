import { describe, expect, it, vi } from 'vitest';
import type { Category, Settings } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/constants';

vi.mock('wxt/browser', () => ({
  browser: {
    i18n: { getMessage: vi.fn((key: string) => `[${key}]`) },
  },
}));

const { createCategoryCard } = await import('@ui/components/category-card');

const AI_CATEGORY: Category = {
  id: 'ai',
  icon: 'shield-check',
  labelKey: 'CATEGORY_AI',
  descriptionKey: 'CATEGORY_AI_DESC',
  subToggles: [
    { id: 'ai_overview', label: 'Google AI Overview', browsers: ['chrome', 'edge'], defaultEnabled: true },
    { id: 'copilot_sidebar', label: 'Copilot sidebar', browsers: ['edge'], defaultEnabled: true },
    { id: 'ai_sidebar_ff', label: 'AI sidebar', browsers: ['firefox'], defaultEnabled: true },
  ],
};

function makeCard(overrides: Partial<Parameters<typeof createCategoryCard>[0]> = {}) {
  return createCategoryCard({
    category: AI_CATEGORY,
    settings: { ...DEFAULT_SETTINGS },
    browser: 'chrome',
    onToggleCategory: () => {},
    onToggleSub: () => {},
    ...overrides,
  });
}

describe('createCategoryCard()', () => {
  it('renders card structure: .card > .card__header > .card__icon + .card__info', () => {
    const card = makeCard();
    expect(card.classList.contains('card')).toBe(true);
    const header = card.querySelector('.card__header');
    expect(header).not.toBeNull();
    expect(header!.querySelector('.card__icon')).not.toBeNull();
    expect(header!.querySelector('.card__info')).not.toBeNull();
  });

  it('icon is an SVG element (not emoji text)', () => {
    const card = makeCard();
    const iconEl = card.querySelector('.card__icon');
    const svg = iconEl!.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('master toggle exists in title row', () => {
    const card = makeCard();
    const titleRow = card.querySelector('.card__title-row');
    expect(titleRow).not.toBeNull();
    const toggle = titleRow!.querySelector('.toggle');
    expect(toggle).not.toBeNull();
  });

  it('card--off class when category disabled', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, ai: false };
    const card = makeCard({ settings });
    expect(card.classList.contains('card--off')).toBe(true);
  });

  it('no card--off class when category enabled', () => {
    const card = makeCard();
    expect(card.classList.contains('card--off')).toBe(false);
  });

  it('sub-toggles filtered by browser — chrome sees chrome subs only', () => {
    const card = makeCard({ browser: 'chrome' });
    const subRows = card.querySelectorAll('.card__sub-row');
    // ai_overview (chrome+edge) visible, copilot_sidebar (edge) hidden, ai_sidebar_ff (firefox) hidden
    expect(subRows.length).toBe(1);
  });

  it('sub-toggles filtered by browser — edge sees edge subs', () => {
    const card = makeCard({ browser: 'edge' });
    const subRows = card.querySelectorAll('.card__sub-row');
    // ai_overview (chrome+edge) + copilot_sidebar (edge) = 2
    expect(subRows.length).toBe(2);
  });

  it('sub-toggles filtered by browser — firefox sees firefox subs only', () => {
    const card = makeCard({ browser: 'firefox' });
    const subRows = card.querySelectorAll('.card__sub-row');
    // ai_sidebar_ff (firefox) only — ai_overview (chrome+edge) and copilot_sidebar (edge) hidden
    expect(subRows.length).toBe(1);
    const label = card.querySelector('.card__sub-label');
    expect(label!.textContent).toBe('AI sidebar');
  });

  it('expand button shows sub count and toggles visibility', () => {
    const card = makeCard({ browser: 'edge' });
    const expandBtn = card.querySelector<HTMLButtonElement>('.card__expand');
    expect(expandBtn).not.toBeNull();
    expect(expandBtn!.textContent).toContain('2 sub-toggles');

    const subs = card.querySelector<HTMLElement>('.card__subs')!;
    expect(subs.style.display).toBe('none');

    expandBtn!.click();
    expect(subs.style.display).toBe('block');

    expandBtn!.click();
    expect(subs.style.display).toBe('none');
  });

  it('chevron SVG swaps on expand/collapse', () => {
    const card = makeCard({ browser: 'edge' });
    const expandBtn = card.querySelector<HTMLButtonElement>('.card__expand')!;
    const chevron = expandBtn.querySelector('.card__chevron')!;

    // Initially chevron-down
    const initialPath = chevron.querySelector('path')!.getAttribute('d');

    expandBtn.click();
    const expandedPath = chevron.querySelector('path')!.getAttribute('d');
    expect(expandedPath).not.toBe(initialPath);

    expandBtn.click();
    const collapsedPath = chevron.querySelector('path')!.getAttribute('d');
    expect(collapsedPath).toBe(initialPath);
  });

  it('onToggleCategory callback fires from master toggle', () => {
    const onToggleCategory = vi.fn();
    const card = makeCard({ onToggleCategory });
    const toggleInput = card.querySelector<HTMLInputElement>('.card__title-row .toggle__input')!;

    toggleInput.checked = false;
    toggleInput.dispatchEvent(new Event('change'));
    expect(onToggleCategory).toHaveBeenCalledWith('ai', false);
  });

  it('onToggleSub callback fires from sub-toggle', () => {
    const onToggleSub = vi.fn();
    const card = makeCard({ browser: 'edge', onToggleSub });
    const subInputs = card.querySelectorAll<HTMLInputElement>('.card__sub-row .toggle__input');
    expect(subInputs.length).toBeGreaterThan(0);

    subInputs[0].checked = false;
    subInputs[0].dispatchEvent(new Event('change'));
    expect(onToggleSub).toHaveBeenCalledWith('ai_overview', false);
  });
});
