import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/constants';
import type { Settings } from '@shared/types';

// vi.hoisted runs before vi.mock hoisting, so these are available in the factory
const { storeRef, storageMock } = vi.hoisted(() => {
  const storeRef = { current: {} as Record<string, unknown> };
  const storageMock = {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: storeRef.current[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storeRef.current, items);
      }),
    },
  };
  return { storeRef, storageMock };
});

vi.mock('wxt/browser', () => ({
  browser: { storage: storageMock },
}));

// Import after mocking
const { loadSettings, patchSettings, saveSettings } = await import('@shared/settings');

describe('settings', () => {
  beforeEach(() => {
    storeRef.current = {};
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
      storeRef.current.settings = { ai: false, preset: 'custom' };
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
      expect(storageMock.local.set).toHaveBeenCalledWith({ settings });
      expect(storeRef.current.settings).toEqual(settings);
    });
  });

  describe('patchSettings', () => {
    it('should merge patch with current settings', async () => {
      storeRef.current.settings = { ...DEFAULT_SETTINGS };
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
