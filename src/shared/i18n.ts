import { browser } from 'wxt/browser';

type MsgKey = Parameters<typeof browser.i18n.getMessage>[0];

/**
 * Localized message for `key`, or the English `fallback` when the key is missing
 * (or the i18n API is unavailable, e.g. in tests). `$1`…`$9` in the fallback are
 * replaced with `subs`; locale messages declare the same values as placeholders.
 */
export function t(key: string, fallback: string, ...subs: (string | number)[]): string {
  const values = subs.map(String);
  try {
    const message = browser.i18n.getMessage(key as MsgKey, values);
    if (message) return message;
  } catch {
    // fall through to the English fallback
  }
  return fallback.replace(/\$(\d)/g, (_, i: string) => values[Number(i) - 1] ?? '');
}

/** Message key for a sub-toggle label (and `${key}_HINT` for its hint) */
export function subToggleKey(id: string): string {
  return `SUB_${id.toUpperCase()}`;
}
