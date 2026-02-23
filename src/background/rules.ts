import { CATEGORY_RULESETS } from '@shared/constants';
import { loadSettings } from '@shared/settings';
import type { CategoryId } from '@shared/types';

export function initRules(): void {
  // Apply saved settings on startup
  applyAllRulesets();

  // React to storage changes from Side Panel
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('settings' in changes) {
      applyAllRulesets();
    }
  });
}

async function applyAllRulesets(): Promise<void> {
  const settings = await loadSettings();
  const enable: string[] = [];
  const disable: string[] = [];

  for (const [category, rulesetIds] of Object.entries(CATEGORY_RULESETS)) {
    const enabled = settings[category as CategoryId] ?? true;
    for (const id of rulesetIds) {
      (enabled ? enable : disable).push(id);
    }
  }

  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enable,
    disableRulesetIds: disable,
  });
}

export async function toggleCategory(category: CategoryId, enabled: boolean): Promise<void> {
  const rulesetIds = CATEGORY_RULESETS[category];
  if (!rulesetIds?.length) return;

  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled ? rulesetIds : [],
    disableRulesetIds: enabled ? [] : rulesetIds,
  });
}
