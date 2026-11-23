import { detectBrowser } from '@background/browser';
import { ALL_SITES, CATEGORY_RULESETS } from '@shared/constants';
import { GOOGLE_EXTRA_DOMAINS, googleOrigins, googleSearchMatches } from '@shared/google-domains';
import { isPaused, isSubEnabled, loadSettings } from '@shared/settings';
import type { CategoryId, Settings } from '@shared/types';
import { browser } from 'wxt/browser';

const EDGE_UI_SCRIPT_ID = 'debloat-edge-ui';
const AI_APIS_SCRIPT_ID = 'debloat-ai-apis';
const GOOGLE_EXTRA_SCRIPT_ID = 'debloat-google-extra';

export function initRules(): void {
  // Apply saved settings on startup
  applyAllRulesets();
  applyDynamicScripts();

  // Optional host permissions granted/revoked (side panel button or browser UI)
  browser.permissions.onAdded.addListener(() => applyDynamicScripts());
  browser.permissions.onRemoved.addListener(() => applyDynamicScripts());

  // React to storage changes from Side Panel
  browser.storage.onChanged.addListener((changes, area) => {
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

  await browser.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enable,
    disableRulesetIds: disable,
  });
}

export async function toggleCategory(category: CategoryId, enabled: boolean): Promise<void> {
  const rulesetIds = CATEGORY_RULESETS[category];
  if (!rulesetIds?.length) return;

  await browser.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled ? rulesetIds : [],
    disableRulesetIds: enabled ? [] : rulesetIds,
  });
}

// ── Dynamic content script registration ──

async function hasAllUrlsPermission(): Promise<boolean> {
  try {
    return await browser.permissions.contains({ origins: [ALL_SITES] });
  } catch {
    return false;
  }
}

async function isScriptRegistered(id: string): Promise<boolean> {
  try {
    const scripts = await browser.scripting.getRegisteredContentScripts({ ids: [id] });
    return scripts.length > 0;
  } catch {
    return false;
  }
}

async function enableEdgeUI(): Promise<void> {
  if (await isScriptRegistered(EDGE_UI_SCRIPT_ID)) return;
  try {
    await browser.scripting.registerContentScripts([
      {
        id: EDGE_UI_SCRIPT_ID,
        matches: [ALL_SITES],
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
    await browser.scripting.unregisterContentScripts({ ids: [EDGE_UI_SCRIPT_ID] });
  } catch {
    // Script may already be unregistered
  }
}

async function enableAiApis(): Promise<void> {
  if (await isScriptRegistered(AI_APIS_SCRIPT_ID)) return;
  try {
    await browser.scripting.registerContentScripts([
      {
        id: AI_APIS_SCRIPT_ID,
        matches: [ALL_SITES],
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
    await browser.scripting.unregisterContentScripts({ ids: [AI_APIS_SCRIPT_ID] });
  } catch {
    // Script may already be unregistered
  }
}

/** Has the user granted the extra Google country domains (or all sites)? */
async function hasGoogleExtraPermission(): Promise<boolean> {
  try {
    return await browser.permissions.contains({ origins: googleOrigins(GOOGLE_EXTRA_DOMAINS) });
  } catch {
    return false;
  }
}

/** Same Google content script as the manifest one, on the extra domains. It reads settings itself. */
async function applyGoogleExtraScript(granted: boolean): Promise<void> {
  const registered = await isScriptRegistered(GOOGLE_EXTRA_SCRIPT_ID);
  try {
    if (granted && !registered) {
      await browser.scripting.registerContentScripts([
        {
          id: GOOGLE_EXTRA_SCRIPT_ID,
          matches: googleSearchMatches(GOOGLE_EXTRA_DOMAINS.map((d) => `*.${d}`)),
          js: ['content-scripts/google-search.js'],
          css: ['content-scripts/google-search.css'],
          runAt: 'document_start',
        },
      ]);
    } else if (!granted && registered) {
      await browser.scripting.unregisterContentScripts({ ids: [GOOGLE_EXTRA_SCRIPT_ID] });
    }
  } catch {
    // May fail for unpacked extensions
  }
}

async function applyDynamicScripts(): Promise<void> {
  const settings: Settings = await loadSettings();
  const currentBrowser = detectBrowser();
  const hasPermission = await hasAllUrlsPermission();
  // The window.ai script runs in the page's MAIN world and can't read settings, so pause unregisters it
  const paused = isPaused(settings);

  await applyGoogleExtraScript(await hasGoogleExtraPermission());

  // Edge UI: register when ai or shopping enabled + has all-sites permission + is Edge
  if (currentBrowser === 'edge' && hasPermission && !paused && (settings.ai || settings.shopping)) {
    await enableEdgeUI();
  } else {
    await disableEdgeUI();
  }

  // window.ai blocking: register when window_ai sub-toggle enabled + ai master on + has permission
  if (hasPermission && !paused && settings.ai && isSubEnabled(settings, 'window_ai')) {
    await enableAiApis();
  } else {
    await disableAiApis();
  }
}
