import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wxt/browser', () => ({ browser: {} }));

const LOCALES_DIR = path.resolve(__dirname, '../src/public/_locales');

type Messages = Record<string, { message: string; description?: string }>;

const read = (locale: string): Messages =>
  JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, locale, 'messages.json'), 'utf-8'));

const en = read('en');
const locales = fs.readdirSync(LOCALES_DIR).filter((d) => d !== 'en');
const placeholders = (s: string) => s.match(/\$\d/g) ?? [];

describe('locales', () => {
  it('ships the planned set of locales', () => {
    expect(locales.length).toBeGreaterThanOrEqual(20);
  });

  for (const locale of locales) {
    describe(locale, () => {
      const msgs = read(locale);

      it('has exactly the English keys', () => {
        expect(Object.keys(msgs).sort()).toEqual(Object.keys(en).sort());
      });

      it('keeps $n placeholders and has no empty messages', () => {
        for (const [key, { message }] of Object.entries(msgs)) {
          expect(message.trim(), `${locale}.${key}`).not.toBe('');
          expect(placeholders(message), `${locale}.${key}`).toEqual(placeholders(en[key].message));
        }
      });

      it('fits store limits for name (45) and description (132)', () => {
        expect(msgs.EXTENSION_NAME.message.length).toBeLessThanOrEqual(45);
        expect(msgs.EXTENSION_DESCRIPTION.message.length).toBeLessThanOrEqual(132);
      });
    });
  }
});

describe('sub-toggle labels', () => {
  it('every sub-toggle has an English label key', async () => {
    const { CATEGORIES } = await import('@shared/constants');
    const { subToggleKey } = await import('@shared/i18n');
    for (const cat of CATEGORIES) {
      for (const sub of cat.subToggles) {
        expect(en[subToggleKey(sub.id)]?.message, sub.id).toBe(sub.label);
        if (sub.hint) expect(en[`${subToggleKey(sub.id)}_HINT`]?.message, sub.id).toBe(sub.hint);
      }
    }
  });
});
