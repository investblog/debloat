import { detectBrowser } from '@background/browser';
import { CATEGORY_RULESETS } from '@shared/constants';
import { loadSettings } from '@shared/settings';
import type { CategoryId, Settings } from '@shared/types';

const EDGE_UI_SCRIPT_ID = 'debloat-edge-ui';
const AI_APIS_SCRIPT_ID = 'debloat-ai-apis';

export function initRules(): void {
  // Apply saved settings on startup
  applyAllRulesets();
  applyDynamicScripts();

  // React to storage changes from Side Panel
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('settings' in changes) {
      applyAllRulesets();
      applyDynamicScripts();
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

// ── Dynamic content script registration ──

async function hasAllUrlsPermission(): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ origins: ['<all_urls>'] });
  } catch {
    return false;
  }
}

async function isScriptRegistered(id: string): Promise<boolean> {
  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
    return scripts.length > 0;
  } catch {
    return false;
  }
}

async function enableEdgeUI(): Promise<void> {
  if (await isScriptRegistered(EDGE_UI_SCRIPT_ID)) return;
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: EDGE_UI_SCRIPT_ID,
        matches: ['<all_urls>'],
        js: ['content-scripts/edge-ui.js'],
        runAt: 'document_idle',
      },
    ]);
  } catch {
    // May fail for unpacked extensions in Edge MV3
  }
}

async function disableEdgeUI(): Promise<void> {
  if (!(await isScriptRegistered(EDGE_UI_SCRIPT_ID))) return;
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [EDGE_UI_SCRIPT_ID] });
  } catch {
    // Script may already be unregistered
  }
}

async function enableAiApis(): Promise<void> {
  if (await isScriptRegistered(AI_APIS_SCRIPT_ID)) return;
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: AI_APIS_SCRIPT_ID,
        matches: ['<all_urls>'],
        js: ['content-scripts/ai-apis.js'],
        runAt: 'document_start',
        world: 'MAIN',
      },
    ]);
  } catch {
    // May fail for unpacked extensions
  }
}

async function disableAiApis(): Promise<void> {
  if (!(await isScriptRegistered(AI_APIS_SCRIPT_ID))) return;
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [AI_APIS_SCRIPT_ID] });
  } catch {
    // Script may already be unregistered
  }
}

async function applyDynamicScripts(): Promise<void> {
  const settings: Settings = await loadSettings();
  const browser = detectBrowser();
  const hasPermission = await hasAllUrlsPermission();

  // Edge UI: register when ai or shopping enabled + has <all_urls> permission + is Edge
  if (browser === 'edge' && hasPermission && (settings.ai || settings.shopping)) {
    await enableEdgeUI();
  } else {
    await disableEdgeUI();
  }

  // window.ai blocking: register when window_ai sub-toggle enabled + ai master on + has permission
  const windowAiEnabled = settings.subToggles.window_ai ?? true;
  if (hasPermission && settings.ai && windowAiEnabled) {
    await enableAiApis();
  } else {
    await disableAiApis();
  }
}
