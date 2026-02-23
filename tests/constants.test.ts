import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '@shared/constants';
import { icon } from '@ui/icons';

describe('CATEGORIES icon keys', () => {
  it('every category has a string icon key', () => {
    for (const cat of CATEGORIES) {
      expect(typeof cat.icon, `${cat.id} should have string icon`).toBe('string');
      expect(cat.icon.length, `${cat.id} icon key should be non-empty`).toBeGreaterThan(0);
    }
  });

  it('every category icon key resolves to a valid SVG', () => {
    for (const cat of CATEGORIES) {
      const el = icon(cat.icon);
      expect(el.tagName.toLowerCase(), `icon("${cat.icon}") for ${cat.id} should be svg`).toBe('svg');
      expect(el.querySelector('path'), `icon("${cat.icon}") for ${cat.id} should have path`).not.toBeNull();
    }
  });
});
