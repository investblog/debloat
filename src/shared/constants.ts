import type { Category, CategoryId, PresetId, Settings } from './types';

/** Top Google country domains for search content script */
export const GOOGLE_SEARCH_DOMAINS = [
  'www.google.com',
  'www.google.co.uk',
  'www.google.de',
  'www.google.fr',
  'www.google.co.jp',
  'www.google.co.in',
  'www.google.com.br',
  'www.google.ca',
  'www.google.com.au',
  'www.google.ru',
  'www.google.it',
  'www.google.es',
  'www.google.com.mx',
  'www.google.co.kr',
  'www.google.nl',
  'www.google.pl',
  'www.google.com.tr',
  'www.google.co.id',
];

export const BADGE_COLOR = '#10B981';
export const BADGE_FLASH_COLOR = '#FFB347';
export const BADGE_FLASH_MS = 600;
export const BADGE_PAUSED_COLOR = '#6B7280';
export const BADGE_REFRESH_MS = 2000;
export const ACTIVITY_BUFFER_SIZE = 100;
export const PAUSE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/** Maps category → static dNR ruleset IDs */
export const CATEGORY_RULESETS: Record<string, string[]> = {
  ai: ['ai_endpoints'],
  sponsored: ['sponsored'],
  shopping: ['shopping'],
  telemetry: ['telemetry_chrome', 'telemetry_edge', 'telemetry_firefox'],
};

/** Preset definitions: which categories are enabled */
export const PRESETS: Record<PresetId, Record<CategoryId, boolean>> = {
  aggressive: { ai: true, sponsored: true, shopping: true, telemetry: true, annoyances: true },
  balanced: { ai: true, sponsored: false, shopping: false, telemetry: true, annoyances: false },
  minimal: { ai: false, sponsored: false, shopping: false, telemetry: true, annoyances: false },
  custom: { ai: true, sponsored: true, shopping: true, telemetry: true, annoyances: true },
};

/** Store listing URLs per browser (replace EXTENSION_ID with real IDs) */
export const STORE_URLS: Record<string, { url: string; icon: string; labelKey: string }> = {
  chrome: {
    url: 'https://chromewebstore.google.com/detail/EXTENSION_ID',
    icon: 'browser-chrome',
    labelKey: 'RATE_CHROME',
  },
  edge: {
    url: 'https://microsoftedge.microsoft.com/addons/detail/EXTENSION_ID',
    icon: 'browser-edge',
    labelKey: 'RATE_EDGE',
  },
  firefox: { url: 'https://addons.mozilla.org/addon/EXTENSION_ID/', icon: 'browser-firefox', labelKey: 'RATE_FIREFOX' },
};

export const DEFAULT_SETTINGS: Settings = {
  ai: true,
  sponsored: true,
  shopping: true,
  telemetry: true,
  annoyances: true,
  subToggles: {},
  preset: 'aggressive',
  siteWhitelist: {},
  pauseUntil: null,
};

export const CATEGORIES: Category[] = [
  {
    id: 'ai',
    icon: 'shield-check',
    labelKey: 'CATEGORY_AI',
    descriptionKey: 'CATEGORY_AI_DESC',
    subToggles: [
      { id: 'ai_overview', label: 'Google AI Overview', browsers: ['chrome', 'edge'], defaultEnabled: true },
      { id: 'ai_mode', label: 'Google AI Mode', browsers: ['chrome', 'edge'], defaultEnabled: true },
      {
        id: 'gemini_suggestions',
        label: 'Gemini suggestions',
        browsers: ['chrome'],
        rulesetIds: ['ai_endpoints'],
        defaultEnabled: true,
      },
      { id: 'help_me_write', label: 'Help Me Write / Rewrite with Copilot', browsers: ['edge'], defaultEnabled: true },
      {
        id: 'copilot_sidebar',
        label: 'Copilot sidebar & toolbar icon',
        browsers: ['edge'],
        rulesetIds: ['ai_endpoints'],
        defaultEnabled: true,
      },
      { id: 'copilot_context', label: 'Copilot page context access', browsers: ['edge'], defaultEnabled: true },
      { id: 'visual_search', label: 'Visual Search overlay', browsers: ['edge'], defaultEnabled: true },
      { id: 'ai_history', label: 'AI History Search', browsers: ['chrome', 'edge'], defaultEnabled: true },
      {
        id: 'text_prediction',
        label: 'Text Prediction (Turing)',
        browsers: ['edge'],
        rulesetIds: ['ai_endpoints'],
        defaultEnabled: true,
      },
      { id: 'ai_tabs', label: 'AI Tab Compare / Organization', browsers: ['chrome', 'edge'], defaultEnabled: true },
      { id: 'window_ai', label: 'Web AI APIs (window.ai)', browsers: ['edge'], defaultEnabled: true },
      { id: 'ai_sidebar_ff', label: 'AI sidebar & chatbots', browsers: ['firefox'], defaultEnabled: true },
      { id: 'ai_previews_ff', label: 'AI link previews', browsers: ['firefox'], defaultEnabled: true },
      { id: 'ai_tabgroup_ff', label: 'AI tab group suggestions', browsers: ['firefox'], defaultEnabled: true },
    ],
  },
  {
    id: 'sponsored',
    icon: 'filter',
    labelKey: 'CATEGORY_SPONSORED',
    descriptionKey: 'CATEGORY_SPONSORED_DESC',
    subToggles: [
      {
        id: 'msn_feed',
        label: 'MSN / News feed on NTP',
        browsers: ['edge'],
        rulesetIds: ['sponsored'],
        defaultEnabled: true,
      },
      { id: 'sponsored_tiles', label: 'Sponsored Top Sites on NTP', browsers: ['edge'], defaultEnabled: true },
      { id: 'spotlight', label: 'Spotlight experiences & recommendations', browsers: ['edge'], defaultEnabled: true },
      {
        id: 'ff_sponsored_stories',
        label: 'Sponsored Stories on Firefox Home',
        browsers: ['firefox'],
        defaultEnabled: true,
      },
      {
        id: 'ff_sponsored_tiles',
        label: 'Sponsored Top Sites on Firefox Home',
        browsers: ['firefox'],
        defaultEnabled: true,
      },
      {
        id: 'ff_recommended',
        label: 'Recommended Stories on Firefox Home',
        browsers: ['firefox'],
        defaultEnabled: true,
      },
      { id: 'chrome_discover', label: 'Google Discover-style cards', browsers: ['chrome'], defaultEnabled: true },
      { id: 'ff_perplexity', label: 'Perplexity in search engines', browsers: ['firefox'], defaultEnabled: true },
    ],
  },
  {
    id: 'shopping',
    icon: 'shopping',
    labelKey: 'CATEGORY_SHOPPING',
    descriptionKey: 'CATEGORY_SHOPPING_DESC',
    subToggles: [
      {
        id: 'shopping_assistant',
        label: 'Shopping Assistant',
        browsers: ['edge'],
        rulesetIds: ['shopping'],
        defaultEnabled: true,
      },
      { id: 'price_compare', label: 'Price comparison popups', browsers: ['edge'], defaultEnabled: true },
      { id: 'coupons', label: 'Coupons & rebates notifications', browsers: ['edge'], defaultEnabled: true },
      { id: 'express_checkout', label: 'Express checkout suggestions', browsers: ['edge'], defaultEnabled: true },
    ],
  },
  {
    id: 'telemetry',
    icon: 'analytics',
    labelKey: 'CATEGORY_TELEMETRY',
    descriptionKey: 'CATEGORY_TELEMETRY_DESC',
    subToggles: [
      {
        id: 'tele_chrome',
        label: 'Google diagnostic endpoints',
        browsers: ['chrome'],
        rulesetIds: ['telemetry_chrome'],
        defaultEnabled: true,
      },
      {
        id: 'tele_edge',
        label: 'Microsoft diagnostic data',
        browsers: ['edge'],
        rulesetIds: ['telemetry_edge'],
        defaultEnabled: true,
      },
      {
        id: 'tele_firefox',
        label: 'Mozilla telemetry',
        browsers: ['firefox'],
        rulesetIds: ['telemetry_firefox'],
        defaultEnabled: true,
      },
      {
        id: 'ff_studies',
        label: 'Firefox Studies (Shield)',
        browsers: ['firefox'],
        rulesetIds: ['telemetry_firefox'],
        defaultEnabled: true,
      },
      {
        id: 'crash_reporting',
        label: 'Usage/crash reporting endpoints',
        browsers: ['chrome', 'edge', 'firefox'],
        defaultEnabled: true,
      },
    ],
  },
  {
    id: 'annoyances',
    icon: 'lightbulb-alert',
    labelKey: 'CATEGORY_ANNOYANCES',
    descriptionKey: 'CATEGORY_ANNOYANCES_DESC',
    subToggles: [
      { id: 'rewards', label: 'Microsoft Rewards prompts', browsers: ['edge'], defaultEnabled: true },
      { id: 'feature_banners', label: 'Feature recommendation banners', browsers: ['edge'], defaultEnabled: true },
      { id: 'acrobat_button', label: '"Edit with Acrobat" button', browsers: ['edge'], defaultEnabled: true },
      {
        id: 'default_prompt',
        label: '"Set as default browser" prompts',
        browsers: ['edge', 'chrome'],
        defaultEnabled: true,
      },
      { id: 'dalle_themes', label: 'DALL-E / AI theme suggestions', browsers: ['edge'], defaultEnabled: true },
      { id: 'bing_redirect', label: 'NTP search box redirect to Bing', browsers: ['edge'], defaultEnabled: true },
      { id: 'auto_signin', label: 'Auto browser sign-in prompt', browsers: ['edge'], defaultEnabled: true },
    ],
  },
];
