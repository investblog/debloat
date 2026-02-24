import { describe, expect, it } from 'vitest';
import { icon } from '@ui/icons';

describe('icon()', () => {
  it('returns an SVG element with correct attributes', () => {
    const el = icon('shield-check');
    expect(el.tagName.toLowerCase()).toBe('svg');
    expect(el.getAttribute('width')).toBe('20');
    expect(el.getAttribute('height')).toBe('20');
    expect(el.getAttribute('viewBox')).toBe('0 0 20 20');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('path child has fill="currentColor" and a d attribute', () => {
    const el = icon('filter');
    const path = el.querySelector('path');
    expect(path).not.toBeNull();
    expect(path!.getAttribute('fill')).toBe('currentColor');
    expect(path!.getAttribute('d')).toBeTruthy();
  });

  it('respects custom size parameter', () => {
    for (const size of [14, 16, 20]) {
      const el = icon('sun', size);
      expect(el.getAttribute('width')).toBe(String(size));
      expect(el.getAttribute('height')).toBe(String(size));
    }
  });

  it('returns <span>?</span> for unknown icon name', () => {
    const el = icon('nonexistent-icon-xyz');
    expect(el.tagName.toLowerCase()).toBe('span');
    expect(el.textContent).toBe('?');
  });

  it('all registered icon names produce valid SVG', async () => {
    // Access PATHS indirectly by testing every icon name exported through CATEGORIES
    const knownNames = [
      'shield-check',
      'filter',
      'shopping',
      'analytics',
      'lightbulb-alert',
      'chevron-down',
      'chevron-up',
      'check-circle',
      'close-circle',
      'sun',
      'moon',
      'web-plus',
      'play',
      'pause',
      'star',
      'browser-chrome',
      'browser-edge',
      'browser-firefox',
      'console-log',
    ];

    for (const name of knownNames) {
      const el = icon(name);
      expect(el.tagName.toLowerCase(), `icon("${name}") should be svg`).toBe('svg');
      expect(el.querySelector('path'), `icon("${name}") should have a path`).not.toBeNull();
    }
  });

  it('uses custom viewBox for console-log icon', () => {
    const el = icon('console-log');
    expect(el.getAttribute('viewBox')).toBe('0 0 23 20');
  });

  it('uses default viewBox for standard icons', () => {
    const el = icon('shield-check');
    expect(el.getAttribute('viewBox')).toBe('0 0 20 20');
  });
});
