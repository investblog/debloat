import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS } from './constants';
import type { CategoryId, Settings } from './types';

const STORAGE_KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEY] as Partial<Settings> | undefined) };
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
  current.siteWhitelist[domain] = categories;
  await saveSettings(current);
}

export async function removeSiteWhitelist(domain: string): Promise<void> {
  const current = await loadSettings();
  delete current.siteWhitelist[domain];
  await saveSettings(current);
}
