import { clearPausedBadge, showPausedBadge } from '@background/badge';
import { PAUSE_DURATION_MS } from '@shared/constants';
import { loadSettings, patchSettings } from '@shared/settings';
import { browser } from 'wxt/browser';

let pauseTimer: ReturnType<typeof setTimeout> | null = null;

export function initPause(): void {
  // Restore pause state on startup
  restorePause();
}

async function restorePause(): Promise<void> {
  const settings = await loadSettings();
  if (!settings.pauseUntil) return;

  const remaining = settings.pauseUntil - Date.now();
  if (remaining <= 0) {
    await unpause();
    return;
  }

  await disableAllRulesets();
  await showPausedBadge();
  pauseTimer = setTimeout(unpause, remaining);
}

export async function pause(durationMs = PAUSE_DURATION_MS): Promise<void> {
  const pauseUntil = Date.now() + durationMs;
  await patchSettings({ pauseUntil });
  await disableAllRulesets();
  await showPausedBadge();

  if (pauseTimer) clearTimeout(pauseTimer);
  pauseTimer = setTimeout(unpause, durationMs);
}

export async function unpause(): Promise<void> {
  if (pauseTimer) {
    clearTimeout(pauseTimer);
    pauseTimer = null;
  }
  await patchSettings({ pauseUntil: null });
  await clearPausedBadge();
  // Rules will re-apply via storage.onChanged listener in rules.ts
}

async function disableAllRulesets(): Promise<void> {
  const current = await browser.declarativeNetRequest.getEnabledRulesets();
  if (current.length > 0) {
    await browser.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: current,
    });
  }
}
