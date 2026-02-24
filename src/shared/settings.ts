import { DEFAULT_SETTINGS } from './constants';
import type { CategoryId, Settings } from './types';
import { normalizeHost } from './url';

const STORAGE_KEY = 'settings';
const SCHEMA_VERSION = 2;

function migrateSettings(stored: Partial<Settings> | undefined): Settings {
  const merged: Settings = {
    ...DEFAULT_SETTINGS,
    ...(stored ?? {}),
    subToggles: { ...DEFAULT_SETTINGS.subToggles, ...(stored?.subToggles ?? {}) },
    siteWhitelist: {},
    schemaVersion: SCHEMA_VERSION,
  };

  for (const [host, categories] of Object.entries(stored?.siteWhitelist ?? {})) {
    const normalized = normalizeHost(host);
    const current = new Set(merged.siteWhitelist[normalized] ?? []);
    for (const category of categories ?? []) current.add(category);
    merged.siteWhitelist[normalized] = [...current] as CategoryId[];
  }

  return merged;
}

export async function loadSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const migrated = migrateSettings(result[STORAGE_KEY]);
  await chrome.storage.local.set({ [STORAGE_KEY]: migrated });
  return migrated;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: { ...settings, schemaVersion: SCHEMA_VERSION } });
}

export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const updated = migrateSettings({ ...current, ...patch });
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
  current.siteWhitelist[host] = [...existing];
  await saveSettings(current);
}

export async function removeSiteWhitelist(domain: string): Promise<void> {
  const current = await loadSettings();
  delete current.siteWhitelist[normalizeHost(domain)];
  await saveSettings(current);
}
