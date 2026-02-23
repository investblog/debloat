import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/constants';
import type { Settings } from '@shared/types';

// Mock chrome.storage.local
let store: Record<string, unknown> = {};

const chromeStorageMock = {
  local: {
    get: vi.fn(async (key: string) => {
      return { [key]: store[key] };
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(store, items);
    }),
  },
};

vi.stubGlobal('chrome', { storage: chromeStorageMock });

// Import after mocking
const { loadSettings, patchSettings, saveSettings } = await import('@shared/settings');

describe('settings', () => {
  beforeEach(() => {
    store = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadSettings', () => {
    it('should return defaults when storage is empty', async () => {
      const settings = await loadSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should merge stored values with defaults', async () => {
      store.settings = { ai: false, preset: 'custom' };
      const settings = await loadSettings();
      expect(settings.ai).toBe(false);
      expect(settings.preset).toBe('custom');
      // defaults still present
      expect(settings.sponsored).toBe(true);
      expect(settings.telemetry).toBe(true);
      expect(settings.siteWhitelist).toEqual({});
    });
  });

  describe('saveSettings', () => {
    it('should persist settings to storage', async () => {
      const settings: Settings = { ...DEFAULT_SETTINGS, ai: false };
      await saveSettings(settings);
      expect(chromeStorageMock.local.set).toHaveBeenCalledWith({ settings });
      expect(store.settings).toEqual(settings);
    });
  });

  describe('patchSettings', () => {
    it('should merge patch with current settings', async () => {
      store.settings = { ...DEFAULT_SETTINGS };
      const result = await patchSettings({ shopping: false, preset: 'custom' });
      expect(result.shopping).toBe(false);
      expect(result.preset).toBe('custom');
      expect(result.ai).toBe(true); // unchanged
    });

    it('should work on empty storage', async () => {
      const result = await patchSettings({ telemetry: false });
      expect(result.telemetry).toBe(false);
      expect(result.ai).toBe(true); // from defaults
    });
  });
});
