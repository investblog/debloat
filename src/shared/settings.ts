import { browser } from 'wxt/browser';
import { CATEGORIES, DEFAULT_SETTINGS } from './constants';
import type { CategoryId, Settings } from './types';
import { normalizeHost } from './url';

const STORAGE_KEY = 'settings';

/** Keys from removed features (AI Scout, ≤1.0.3) — dropped on load so they don't linger in storage */
const OBSOLETE_KEYS = ['scoutReporting', 'scoutInstallId'];

export async function loadSettings(): Promise<Settings> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const stored = { ...(result[STORAGE_KEY] as Record<string, unknown> | undefined) };
  for (const key of OBSOLETE_KEYS) delete stored[key];
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
}

/** Sub-toggle state: the saved override, else the sub-toggle's default */
export function isSubEnabled(settings: Settings, subId: string): boolean {
  if (subId in settings.subToggles) return settings.subToggles[subId];
  for (const cat of CATEGORIES) {
    const sub = cat.subToggles.find((s) => s.id === subId);
    if (sub) return sub.defaultEnabled;
  }
  return true;
}

export function isPaused(settings: Settings, now = Date.now()): boolean {
  return settings.pauseUntil != null && settings.pauseUntil > now;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: settings });
}

export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const updated = { ...current, ...patch };
  await saveSettings(updated);
  return updated;
}

export async function toggleCategory(id: CategoryId, enabled: boolean): Promise<Settings> {
  const current = await loadSettings();
  current[id] = enabled;
  current.preset = 'custom';
  await saveSettings(current);
  return current;
}

export async function toggleSubToggle(id: string, enabled: boolean): Promise<Settings> {
  const current = await loadSettings();
  current.subToggles[id] = enabled;
  current.preset = 'custom';
  await saveSettings(current);
  return current;
}

export async function addSiteWhitelist(domain: string, categories: CategoryId[]): Promise<void> {
  const current = await loadSettings();
  const host = normalizeHost(domain);
  const existing = new Set(current.siteWhitelist[host] ?? []);
  for (const c of categories) existing.add(c);
  current.siteWhitelist[host] = [...existing] as CategoryId[];
  await saveSettings(current);
}

export async function removeSiteWhitelist(domain: string): Promise<void> {
  const current = await loadSettings();
  delete current.siteWhitelist[normalizeHost(domain)];
  await saveSettings(current);
}
