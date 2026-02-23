# Debloat — Technical Specification v1.3 (MVP)

**Domain:** debloat.click
**Stack:** WXT + TypeScript + Vanilla DOM + Biome + Vitest
**Browsers:** Chrome, Edge, Firefox (Chromium-priority)
**Модель:** Бесплатное, open-source

---

## 1. Продукт в одном предложении

Расширение, которое убирает AI-фичи, спонсированный контент, шоппинг, телеметрию и прочий bloat из браузера и поисковой выдачи — в один клик, без прав администратора.

---

## 2. Позиционирование

### Что Debloat НЕ является
- Это не adblocker (не конкурирует с uBlock Origin)
- Это не privacy tool общего назначения (не конкурирует с Privacy Badger)
- Это не системный debloater (не конкурирует с Winslop)

### Что Debloat является
Расширение, которое скрывает и блокирует навязанные фичи браузера — AI, шоппинг, MSN-лента, телеметрия, промо-уведомления — плюс убирает AI-мусор из поисковой выдачи Google.

### Ключевые отличия

| vs | Преимущество Debloat |
|----|---------------------|
| just-the-browser | Без admin/terminal, гранулярные тогглы, авто-обновление |
| Bye Bye Google AI | Не только поиск, но и весь браузер (NTP, sidebar, toolbar) |
| uBlock Origin | Заточен на browser bloat, не на рекламу. Понятный UI, не filter syntax |
| Встроенные настройки | Всё в одном месте, а не 15 шагов по разным edge://settings |

---

## 3. UX-концепция

### 3.1 Принцип: "Работает из коробки"
При установке все категории **включены по умолчанию**. Пользователь сразу получает чистый браузер. Тогглы — для тех, кто хочет вернуть что-то обратно.

### 3.2 Badge (иконка расширения)

Счётчик заблокированных запросов отображается на иконке расширения (badge):
- Обновляется через `declarativeNetRequest.getMatchedRules()` по событиям навигации (`webNavigation.onCommitted`)
- Цвет badge: `#10B981` (emerald) — ассоциация с "чистотой"
- При 0 — badge скрыт
- При 1000+ — отображается "1k+"
- Сбрасывается при навигации (per-tab counter)

> **Почему не `onRuleMatchedDebug`:** этот API доступен только для unpacked-расширений (dev). В production из стора работает только `getMatchedRules()`. Используем polling: обновляем badge по событиям `webNavigation.onCommitted` и периодически (каждые 2 сек) пока таб активен.

### 3.3 Side Panel (единственный интерфейс)

Открывается по клику на иконку расширения. Содержит master-тогглы и детальные настройки в одном scrollable UI.

**Механизм открытия:**
- Chrome/Edge: `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` — клик на иконку сразу открывает Side Panel, popup не нужен
- Firefox: `sidebar_action` в манифесте — клик на иконку тогглит sidebar

```
┌─────────────────────────────────────┐
│  🧹 Debloat                        │
│  Your browser, decluttered          │
│─────────────────────────────────────│
│  ┌─────────────────────────────────┐│
│  │ ⏸ Pause (1h) │ 🚫 This site │ ││
│  │ ☰ Aggressive ▾                 ││
│  └─────────────────────────────────┘│
│─────────────────────────────────────│
│                                     │
│  🤖 AI Features              [ON]  │
│  Gemini, Copilot, AI Overview,      │
│  Help Me Write, Visual Search       │
│  Edge: 12 · Chrome: 4 · Firefox: 6 │
│  ▸ 12 sub-toggles                   │
│                                     │
│  📰 Sponsored Content         [ON]  │
│  NTP feed, sponsored tiles,         │
│  recommended stories                │
│  Edge: 5 · Chrome: 2 · Firefox: 3  │
│  ▸ 8 sub-toggles                    │
│                                     │
│  🛒 Shopping                  [ON]  │
│  Price comparison, coupons,         │
│  shopping assistant                 │
│  Edge: 4 · Chrome: 0 · Firefox: 0  │
│  ▸ 4 sub-toggles                    │
│                                     │
│  📡 Telemetry                 [ON]  │
│  Diagnostic data, usage reports,    │
│  Firefox Studies                    │
│  Edge: 2 · Chrome: 2 · Firefox: 2  │
│  ▸ 5 sub-toggles                    │
│                                     │
│  💡 Annoyances                [ON]  │
│  Rewards prompts, feature tips,     │
│  text prediction, Acrobat button    │
│  Edge: 5 · Chrome: 1 · Firefox: 1  │
│  ▸ 7 sub-toggles                    │
│                                     │
│─────────────────────────────────────│
│  📋 Activity ▸                      │
│  Blocked on this tab: 47            │
│  [Enable All]  [Disable All]        │
└─────────────────────────────────────┘
```

**Per-site quick controls (верхняя панель):**
- **Pause (1h)** — временно отключает все правила на 1 час (таймер в badge)
- **This site** — toggle disable/enable всех правил для текущего домена (whitelist, хранится в `storage.local`)
- **Preset selector** — выпадающий `☰ Aggressive ▾`:
  - `Aggressive` — всё включено (default)
  - `Balanced` — телеметрия + AI, но оставляет shopping и некоторые annoyances
  - `Minimal` — только телеметрия и критичные AI endpoints
  - `Custom` — автоматически при ручном изменении тогглов

**Coverage индикатор:**
- Каждая master-карточка показывает количество активных правил по браузерам: `Edge: 12 · Chrome: 4 · Firefox: 6`
- Цифры рассчитываются динамически из rule sets + selectors
- Текущий браузер выделен цветом, остальные — dimmed
- Снижает негатив "в Chrome ничего не происходит" — пользователь видит реальный scope

### 3.4 Activity drawer (лог доказательства)

Раскрывается по клику на `📋 Activity` в нижней части Side Panel. Критичен для доверия — без него пользователи оставляют 1⭐ "ничего не делает".

```
┌─────────────────────────────────────┐
│  📋 Activity             [Clear]    │
│─────────────────────────────────────│
│  12:04  📡 telemetry.microsoft.com  │
│         Telemetry · edge_telemetry  │
│         [Allow on site] [Report]    │
│                                     │
│  12:03  🤖 alkali-pa.googleapis.com │
│         AI Features · ai_endpoints  │
│         [Allow on site] [Report]    │
│                                     │
│  12:01  📰 ntp.msn.com/edge/ntp     │
│         Sponsored · sponsored       │
│         [Allow on site] [Report]    │
│                                     │
│  ... (scroll, last 100 entries)     │
└─────────────────────────────────────┘
```

**Поля записи:**
- `time` — HH:MM (локальное)
- `domain` — заблокированный домен/URL
- `category` — иконка + название категории
- `rulesetId` — для debug/report
- **Actions на каждой записи:**
  - `Allow on this site` — добавляет домен в per-site whitelist для этой категории
  - `Report broken` — открывает GitHub Issue с предзаполненными полями (domain, rulesetId, browser, version)

**Хранение:**
- Circular buffer в памяти (последние 100 записей per tab)
- Не пишется в storage — чисто runtime, нулевой storage overhead
- Получает данные через `declarativeNetRequest.getMatchedRules()` (prod)
- В dev-режиме дополнительно `onRuleMatchedDebug` для real-time лога

### 3.5 Детальные под-тогглы (внутри Side Panel)

Каждая категория раскрывается по клику на `▸` в Side Panel:

```
🤖 AI Features
├── [ON] Google AI Overview — mode: Hide ▾ (Hide / Collapse with "Show" button)
├── [ON] Google AI Mode (кнопка и результаты)
├── [ON] Gemini suggestions (NTP, адресная строка)
├── [ON] Help Me Write / Rewrite with Copilot
├── [ON] Copilot sidebar & toolbar icon (Edge)
├── [ON] Copilot page context access (Edge)
├── [ON] Visual Search overlay (Edge)
├── [ON] AI History Search (Chrome, Edge)
├── [ON] Text Prediction — Turing service (Edge)
├── [ON] AI Tab Compare / Tab Organization (Chrome, Edge)
├── [ON] Web AI APIs — window.ai (Edge)
├── [ON] AI sidebar & chatbots (Firefox)
├── [ON] AI link previews (Firefox)
└── [ON] AI tab group suggestions (Firefox)

📰 Sponsored Content
├── [ON] MSN / News feed on NTP (Edge)
├── [ON] Sponsored Top Sites on NTP (Edge)
├── [ON] Spotlight experiences & recommendations (Edge)
├── [ON] Sponsored Stories on Firefox Home
├── [ON] Sponsored Top Sites on Firefox Home
├── [ON] Recommended Stories on Firefox Home (varies by region & rollout)
├── [ON] Google Discover-style cards (Chrome NTP)
└── [ON] Perplexity in search engines (Firefox)

🛒 Shopping
├── [ON] Shopping Assistant (Edge)
├── [ON] Price comparison popups
├── [ON] Coupons & rebates notifications
└── [ON] Express checkout suggestions

📡 Telemetry
├── [ON] Google diagnostic endpoints (Chrome)
├── [ON] Microsoft diagnostic data (Edge)
├── [ON] Mozilla telemetry (Firefox)
├── [ON] Firefox Studies (Shield)
└── [ON] Usage/crash reporting endpoints

💡 Annoyances
├── [ON] Microsoft Rewards prompts (Edge)
├── [ON] Feature recommendation banners (Edge)
├── [ON] "Edit with Acrobat" button (Edge)
├── [ON] "Set as default browser" prompts (где возможно)
├── [ON] DALL-E / AI theme suggestions (Edge)
├── [ON] NTP search box redirect to Bing (Edge)
└── [ON] Auto browser sign-in prompt (Edge)
```

**UX-принципы под-тогглов:**
- Каждый под-тоггл показывает бейдж браузера: [Chrome] [Edge] [Firefox]
- Неприменимые к текущему браузеру тогглы скрыты (не disabled, а именно hidden)
- Master-тоггл категории переключает все под-тогглы
- Изменения применяются мгновенно, без кнопки "Save"
- Анимация expand/collapse — smooth, ~200ms

**Архитектура Side Panel:**
- Chrome/Edge: `sidePanel` API (Chrome 114+)
- Firefox: `sidebar_action` API
- Полноценный scrollable layout
- Каждая категория раскрывается inline → под-тогглы с browser badges

**Дизайн-принципы:**
- 5 master-тогглов с expandable под-тогглами (collapsible)
- Описания под каждым тогглом — конкретные названия фич, не абстракции
- Под-тогглы с бейджами браузера: [Chrome] [Edge] [Firefox]
- Неприменимые к текущему браузеру тогглы скрыты (не disabled, а hidden)
- Кнопки "Enable All" / "Disable All" внизу
- Кнопка "Reset to Defaults" (всё ON)
- Изменения применяются мгновенно, без кнопки "Save"
- Тёмная тема по умолчанию, адаптация под системную

---

## 4. Техническая архитектура

### 4.1 Методы воздействия

Расширение использует три комплементарных механизма:

#### Механизм A: declarativeNetRequest (блокировка запросов)
- **Что:** Блокировка HTTP-запросов к known endpoints
- **Где:** Телеметрия, AI API endpoints, shopping services, MSN feed
- **Как:** Статические и динамические rule sets
- **Permissions:** `declarativeNetRequest`, `declarativeNetRequestFeedback`
- **Плюсы:** Быстро, не требует content script access на все сайты
- **Минусы:** Не может скрыть UI-элементы

#### Механизм B: CSS-инъекция (мгновенное скрытие UI)
- **Что:** display:none / visibility:hidden на известных селекторах
- **Где:** NTP элементы, AI Overview в Google Search, Copilot оверлеи, Shopping UI
- **Как:** content_scripts с CSS-файлами, `insertCSS()` API
- **Плюсы:** Мгновенный визуальный эффект, нет мерцания
- **Минусы:** Ломается при обновлениях; требует мониторинга селекторов

#### Механизм C: DOM-манипуляция (глубокая очистка)
- **Что:** Удаление/модификация DOM-элементов, нейтрализация JS APIs
- **Где:** window.ai neutralization, динамические оверлеи Visual Search, MutationObserver для lazy-loaded AI элементов
- **Как:** content_scripts с JS
- **Плюсы:** Работает для динамического контента
- **Минусы:** Потенциальный performance hit; гонка с браузерным JS

### 4.2 Стек разработки

| Инструмент | Версия | Назначение |
|------------|--------|-----------|
| WXT | 0.19+ | Meta-framework для расширений |
| TypeScript | 5.7+ | Язык |
| Biome | 2.x | Linter + formatter (единый инструмент, быстрее ESLint) |
| Vitest | 4.x | Тесты |

### 4.3 Структура проекта (WXT)

Выровнена с паттернами redirect-inspector, cookiepeak, fastweb:

```
debloat/
├── wxt.config.ts                          — WXT конфиг + manifest
├── package.json
├── tsconfig.json
├── biome.json
├── public/
│   ├── rules/
│   │   ├── telemetry-chrome.json          — Chrome telemetry endpoints
│   │   ├── telemetry-edge.json            — Edge/MS diagnostic endpoints
│   │   ├── telemetry-firefox.json         — Mozilla telemetry endpoints
│   │   ├── ai-endpoints.json              — Gemini, Copilot, Turing API
│   │   ├── shopping.json                  — Edge Shopping service URLs
│   │   └── sponsored.json                 — MSN feed, sponsored content
│   ├── _locales/
│   │   ├── en/messages.json
│   │   └── ru/messages.json
│   └── icons/
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       └── icon-128.png
├── src/
│   ├── entrypoints/
│   │   ├── background.ts                  — Bootstrap: импорт и вызов background/*
│   │   ├── sidepanel/                     — Chrome/Edge Side Panel (основной UI)
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   └── style.css
│   │   ├── sidebar/                       — Firefox Sidebar
│   │   │   ├── index.html
│   │   │   └── main.ts                   — Реэкспорт sidepanel/main.ts
│   │   └── content/
│   │       ├── google-search.ts           — AI Overview, AI Mode в Google SERP
│   │       ├── google-search.css          — CSS-скрытие AI Overview
│   │       ├── ntp-edge.ts                — Edge NTP: MSN, Copilot, Sponsored
│   │       ├── ntp-edge.css
│   │       ├── ntp-firefox.ts             — Firefox Home: Sponsored, Recs
│   │       ├── ntp-firefox.css
│   │       ├── edge-ui.ts                 — Copilot overlays, Shopping, Visual Search
│   │       ├── edge-ui.css
│   │       ├── ai-apis.ts                 — window.ai нейтрализация (main world)
│   │       └── common.ts                  — MutationObserver helpers
│   ├── background/
│   │   ├── badge.ts                       — Badge counter (getMatchedRules polling)
│   │   ├── rules.ts                       — dNR rule set enable/disable
│   │   ├── pause.ts                       — Pause timer, per-site whitelist
│   │   └── browser.ts                     — Chrome vs Edge vs Firefox detection
│   ├── shared/
│   │   ├── messaging.ts                   — Background ↔ UI messaging
│   │   ├── settings.ts                    — Defaults, storage, migrations
│   │   ├── types.ts                       — TypeScript interfaces
│   │   └── constants.ts                   — Category IDs, colors, limits
│   ├── selectors/
│   │   ├── google-search.ts               — Селекторы AI Overview, AI Mode
│   │   ├── edge-ntp.ts                    — Селекторы Edge NTP bloat
│   │   ├── edge-copilot.ts                — Селекторы Copilot sidebar/overlays
│   │   ├── edge-shopping.ts               — Селекторы Shopping Assistant UI
│   │   └── firefox-home.ts                — Селекторы Firefox Home bloat
│   ├── ui/
│   │   ├── components/
│   │   │   ├── toggle.ts                  — Reusable toggle component
│   │   │   ├── counter.ts                 — Blocked requests counter
│   │   │   └── category-card.ts           — Collapsible category card
│   │   └── dom.ts                         — DOM construction helpers
│   └── assets/
│       └── styles/
│           └── tokens.css                 — Design tokens (colors, spacing)
├── tests/
│   ├── rules.test.ts                      — Проверка rule sets (valid JSON, no dupes)
│   └── selectors.test.ts                  — Проверка формата селекторов
└── scripts/
    └── update-selectors.ts                — Утилита обновления селекторов
```

### 4.4 Permissions (минимально необходимые)

```jsonc
{
  "permissions": [
    "storage",                              // Хранение настроек
    "declarativeNetRequest",                // Блокировка запросов
    "declarativeNetRequestFeedback",        // getMatchedRules() для badge counter
    "scripting",                            // Dynamic content script registration (4.7)
    "webNavigation"                         // Событие навигации для обновления badge
  ],
  "side_panel": {
    "default_path": "sidepanel/index.html"
  },
  "sidebar_action": {                       // Firefox
    "default_panel": "sidebar/index.html",
    "default_title": "Debloat",
    "open_at_install": false
  },
  "host_permissions": [
    "*://www.google.com/*",                 // AI Overview скрытие
    "*://www.google.*/*",                   // Google country domains
    "*://ntp.msn.com/*",                    // Edge NTP feed
    "*://edge.microsoft.com/*",             // Edge services
    "*://*.bing.com/*"                      // Bing/Copilot services
  ],
  "optional_host_permissions": [
    "*://*/*"                               // Для Edge UI overlays (Visual Search и пр.),
                                            // запрашивается при включении
  ]
}
```

> **Примечание:** `sidePanel` permission не требуется отдельно — достаточно `side_panel` ключа в манифесте. Ранее был указан в permissions ошибочно.

### 4.5 Content Scripts Matching

```jsonc
{
  "content_scripts": [
    {
      // Google Search — AI Overview & AI Mode
      "matches": ["*://www.google.com/search*", "*://www.google.*/search*"],
      "css": ["content/google-search.css"],
      "js": ["content/google-search.ts"],
      "run_at": "document_start"            // CSS максимально рано, без мерцания
    },
    {
      // Edge NTP & UI
      "matches": ["*://ntp.msn.com/*", "*://edge.microsoft.com/*"],
      "css": ["content/ntp-edge.css"],
      "js": ["content/ntp-edge.ts"]
    },
    {
      // Edge-specific UI overlays (Copilot, Visual Search, Shopping)
      // НЕ в манифесте — регистрируется динамически через scripting API
      // см. секцию 4.7 Dynamic Content Script Registration
    }
  ]
}
```

### 4.6 declarativeNetRequest Rule Sets

Организованы по категориям, включаются/отключаются независимо:

```jsonc
// wxt.config.ts → manifest.declarative_net_request
{
  "declarative_net_request": {
    "rule_resources": [
      { "id": "telemetry_chrome",  "enabled": true,  "path": "rules/telemetry-chrome.json"  },
      { "id": "telemetry_edge",    "enabled": true,  "path": "rules/telemetry-edge.json"    },
      { "id": "telemetry_firefox", "enabled": true,  "path": "rules/telemetry-firefox.json" },
      { "id": "ai_endpoints",      "enabled": true,  "path": "rules/ai-endpoints.json"      },
      { "id": "shopping",          "enabled": true,  "path": "rules/shopping.json"           },
      { "id": "sponsored",         "enabled": true,  "path": "rules/sponsored.json"          }
    ]
  }
}
```

### 4.7 Background Service Worker

```typescript
// background.ts — bootstrap
import { initBadge } from '@/background/badge';
import { initRules } from '@/background/rules';
import { initPause } from '@/background/pause';

export default defineBackground(() => {
  initBadge();
  initRules();
  initPause();

  // Chrome/Edge: клик на иконку → Side Panel
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});
```

```typescript
// background/badge.ts — production-ready badge counter
const tabCounts = new Map<number, number>();

export function initBadge() {
  // Обновляем badge при навигации
  chrome.webNavigation.onCommitted.addListener(async (details) => {
    if (details.frameId !== 0) return; // только main frame
    tabCounts.set(details.tabId, 0);
    await refreshBadge(details.tabId);
  });

  // Периодическое обновление для активного таба
  setInterval(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await refreshBadge(tab.id);
  }, 2000);

  // Очистка при закрытии таба
  chrome.tabs.onRemoved.addListener((tabId) => tabCounts.delete(tabId));
}

async function refreshBadge(tabId: number) {
  const { rulesMatchedInfo } = await chrome.declarativeNetRequest.getMatchedRules({
    tabId,
    minTimeStamp: tabCounts.has(tabId)
      ? undefined  // все с момента навигации
      : Date.now() - 2000
  });

  const count = rulesMatchedInfo.length;
  tabCounts.set(tabId, count);

  chrome.action.setBadgeText({
    text: count === 0 ? '' : count > 999 ? '1k+' : String(count),
    tabId
  });
  chrome.action.setBadgeBackgroundColor({ color: '#10B981', tabId });
}
```

```typescript
// background/rules.ts — rule set management
const CATEGORY_RULESETS: Record<string, string[]> = {
  ai:        ['ai_endpoints'],
  sponsored: ['sponsored'],
  shopping:  ['shopping'],
  telemetry: ['telemetry_chrome', 'telemetry_edge', 'telemetry_firefox'],
};

export function initRules() {
  // Listen for settings changes from Side Panel
  chrome.storage.onChanged.addListener((changes) => {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in CATEGORY_RULESETS) {
        toggleRulesets(CATEGORY_RULESETS[key], newValue as boolean);
      }
    }
  });
}

async function toggleRulesets(ids: string[], enabled: boolean) {
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled ? ids : [],
    disableRulesetIds: enabled ? [] : ids,
  });
}
```

### 4.8 Dynamic Content Script Registration

**Проблема:** `<all_urls>` в манифестных `content_scripts` нельзя надёжно "выключить" через optional permissions в MV3. Скрипт матчится по `matches`, а не по permissions.

**Решение:** Edge-specific модули (Copilot overlays, Visual Search, Shopping UI) регистрируются/удаляются динамически через `scripting.registerContentScripts()`:

```typescript
// background/rules.ts (дополнение)
const EDGE_UI_SCRIPT_ID = 'edge-ui-overlays';

async function enableEdgeUI() {
  await chrome.scripting.registerContentScripts([{
    id: EDGE_UI_SCRIPT_ID,
    matches: ['<all_urls>'],
    css: ['content/edge-ui.css'],
    js: ['content/edge-ui.js'],
    runAt: 'document_idle',
    persistAcrossSessions: true
  }]);
}

async function disableEdgeUI() {
  await chrome.scripting.unregisterContentScripts({
    ids: [EDGE_UI_SCRIPT_ID]
  });
}

async function onEdgeModuleToggled(enabled: boolean) {
  if (enabled) {
    const granted = await chrome.permissions.request({
      origins: ['<all_urls>']
    });
    if (granted) await enableEdgeUI();
  } else {
    await disableEdgeUI();
  }
}
```

**Firefox:** Используется `browser.contentScripts.register()` (WebExtension API). Matching сужен до конкретных доменов — не требуется `<all_urls>`.

### 4.9 Browser Detection

```typescript
// background/browser.ts
export type BrowserType = 'chrome' | 'edge' | 'firefox' | 'unknown';

let _browser: BrowserType | null = null;

export function detectBrowser(): BrowserType {
  if (_browser) return _browser;
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) _browser = 'firefox';
  else if (ua.includes('Edg/')) _browser = 'edge';
  else if (ua.includes('Chrome/')) _browser = 'chrome';
  else _browser = 'unknown';
  return _browser;
}
```

В Side Panel — показываются только тогглы для текущего браузера.
В background — активируются только релевантные rule sets.

---

## 5. Данные для блокировки (начальный набор)

### 5.1 Telemetry endpoints

**Chrome:**
- `clients.google.com` (partial — только /tbproxy/, /uma/)
- `update.googleapis.com/service/update2`
- `clientservices.googleapis.com`

**Edge:**
- `telemetry.microsoft.com`
- `vortex.data.microsoft.com`
- `settings-win.data.microsoft.com`
- `activity.windows.com`

**Firefox:**
- `incoming.telemetry.mozilla.org`
- `normandy.cdn.mozilla.net` (Studies)
- `content-signature-2.cdn.mozilla.net`

### 5.2 AI endpoints

- `gemini.google.com/api/*`
- `alkali-pa.googleapis.com` (Gemini in Chrome)
- `copilot.microsoft.com`
- `sydney.bing.com` (Copilot backend)
- `turing.microsoft.com` (text prediction)
- `substrate.office.com/ai/*`

### 5.3 Shopping endpoints

- `microsoftedge.microsoft.com/shopping/*`
- `shoppingcont.microsoft.com`

### 5.4 Sponsored content

- `ntp.msn.com/edge/ntp*`
- `assets.msn.com/content/*`
- `api.msn.com/content/*`

> ⚠️ Все endpoints требуют верификации и регулярного обновления. Необходимо создать процесс мониторинга и community-reporting для добавления новых.

---

## 6. Google Search Integration

Помимо чистки браузера, Debloat включает очистку Google Search как подкатегорию AI Features:

### Что скрывается на SERP
- **AI Overview** — основной блок AI-ответа вверху страницы
- **AI Mode** — кнопка и интерфейс AI Mode
- **"People Also Ask" с AI** — если AI-enhanced (опционально, отдельный тоггл)

### Реализация
- CSS injection на `document_start` — мгновенное скрытие, без мерцания
- MutationObserver — для динамически подгружаемых AI блоков
- Поддержка всех Google country domains (google.ru, google.fr, google.de и т.д.)

### Отличие от Bye Bye Google AI
- Не дублируем функционал блокировки рекламы (для этого есть uBlock)
- Фокус только на AI-элементах в выдаче
- Является частью большего решения, а не standalone

---

## 7. NTP (New Tab Page) Strategy

### CSS/DOM очистка стандартного NTP

Не заменяем NTP целиком (это отдельный проект), а чистим существующий:

**Edge NTP:** Инжектим CSS/JS в ntp.msn.com для скрытия:
- MSN news feed
- Copilot Discover
- Sponsored top sites
- Shopping suggestions
- Microsoft Rewards

**Chrome NTP:** Ограниченная возможность (chrome:// недоступен), фокус на блокировке запросов через dNR.

**Firefox Home:** Блокировка через dNR (sponsored endpoints, recommendations API).

### Будущее (v2): Optional Custom NTP
В отдельном обновлении — опциональная чистая страница через `chrome_url_overrides`. Не в MVP.

---

## 8. Обработка обновлений браузера

### Проблема
CSS-селекторы и API endpoints меняются при обновлениях браузера.

### Решение
1. **Селекторы в отдельных модулях** (`src/selectors/`) — быстрый патч без переписывания логики
2. **Automated monitoring** — CI-скрипт, проверяющий актуальность селекторов еженедельно
3. **Community reporting** — GitHub Issues шаблон "Broken selector" с предзаполненными полями
4. **Graceful degradation** — если селектор не найден, просто не скрываем (без ошибок)
5. **Fast update cycle** — расширение проверяет обновления rule sets через remote JSON (v1.2, не MVP)

---

## 9. Scope & Phasing

### Phase 0 — Edge Focus (proof-of-concept)

Edge — самый bloated браузер, максимальный визуальный эффект. Минимум усилий → максимум wow-фактора.

| Категория | Содержимое |
|-----------|-----------|
| **AI Features** | Copilot sidebar/toolbar скрытие, Copilot endpoint блокировка, Visual Search overlay, Turing text prediction, window.ai нейтрализация |
| **Sponsored** | Edge NTP MSN feed скрытие, sponsored tiles скрытие |
| **Shopping** | Edge Shopping Assistant (endpoints + UI) |
| **Telemetry** | Edge telemetry endpoints |
| **Annoyances** | Rewards, feature banners, Acrobat button, Bing redirect |
| **UI** | Side Panel с 5 master-тогглами + under-тогглы, badge counter, Activity drawer, per-site controls, presets |

**Stores:** Edge Add-ons (быстрая модерация).

### Phase 1 — MVP Release (Chrome + Edge)

Добавляется Chrome:

| Категория | Добавлено |
|-----------|-----------|
| **AI Features** | Google AI Overview (Hide/Collapse), AI Mode скрытие, Gemini endpoint блокировка |
| **Telemetry** | Chrome telemetry endpoints |
| **i18n** | EN, RU |

**Stores:** Chrome Web Store + Edge Add-ons.

### Phase 2 — Firefox (v1.1)

| Категория | Добавлено |
|-----------|-----------|
| **Sponsored** | Firefox Home sponsored/recommended stories |
| **Telemetry** | Mozilla telemetry, Firefox Studies |
| **AI Features** | Firefox AI sidebar, AI link previews |
| **i18n** | DE, FR, ES, PT, JA |

**Stores:** + Firefox Add-ons.
**Дополнительно:** Onboarding page при первой установке, статистика за период.

### v1.2

- Optional Custom NTP (минималистичный)
- Export/Import настроек
- Remote rule updates без обновления расширения (**signed versions**, transparent changelog page, "pin to bundled rules" опция)
- "Companion extensions" рекомендации (uBlock, CookiePeek, FastWeb)

> **⚠️ Remote rule updates и CWS:** Chrome Web Store запрещает загрузку исполняемого кода извне. JSON-правила для declarativeNetRequest — допустимы при условии: только JSON (не JS), signed + versioned, transparent changelog, документация для ревьюеров.

### v2.0

- AI content detection на произвольных страницах
- Per-site whitelist/blacklist (расширенный)
- Sync настроек между устройствами

---

## 10. Маркетинг и ASO

### Store Listing

**Название:** Debloat — Hide AI & Bloat from Your Browser

**Короткое описание (132 символа):**
Declutter your browser: hide AI features, block sponsored content, stop telemetry. One click, no admin rights.

**Ключевые слова для ASO:**
remove ai chrome, disable copilot edge, hide ai overview, debloat browser, declutter new tab, block telemetry, remove gemini, disable ai features, browser debloat, remove msn edge, stop browser ai, hide browser bloat

**Скриншоты (5 штук):**
1. Before/After Edge NTP (Copilot + MSN → чистая страница)
2. Before/After Google Search (AI Overview → чистые результаты)
3. Side Panel с 5 master-тогглами и badge counter
4. Side Panel с раскрытыми под-тогглами AI Features
5. "One click, no terminal" — сравнение с ручным debloat (15 шагов → 1 клик)

### Лендинг debloat.click

Минималистичный, Single-page:
- Hero: "Your browser, decluttered." + кнопки установки для Chrome/Edge/Firefox
- Before/After интерактивный слайдер
- 5 иконок категорий с кратким описанием
- "vs Manual" секция (15 steps → 1 click)
- FAQ
- GitHub ссылка, Privacy Policy

### PR/Контент-стратегия
- Публикация на Hacker News, Reddit r/privacy, r/degoogle, r/browsers
- Статья "How I debloated Chrome/Edge in one click" на dev.to/medium
- GitHub README с красивыми badge и before/after GIF

---

## 11. Privacy Policy

Debloat не собирает, не хранит и не передаёт никаких пользовательских данных.

- Настройки хранятся только в `chrome.storage.local`
- Опционально `chrome.storage.sync` для синхронизации (v2.0, только настройки тогглов)
- Никаких аналитик, никаких внешних запросов
- **No remote config в MVP** — все правила bundled с расширением
- Код open-source на GitHub
- Счётчик заблокированных запросов — только в памяти (per-tab), не пишется в storage
- Activity log — только runtime circular buffer, не сохраняется

---

## 12. Брендинг

### Цветовая схема

| Элемент | Цвет | Назначение |
|---------|------|-----------|
| Primary | `#10B981` (Emerald) | Тогглы ON, акценты "чистоты" |
| Background | `#0F1117` | Тёмный фон |
| Surface | `#1A1D27` | Карточки категорий |
| Text Primary | `#F0F0F0` | Основной текст |
| Text Secondary | `#8B8FA3` | Описания, подписи |
| Danger/OFF | `#EF4444` | Тогглы OFF, предупреждения |
| Chrome badge | `#4285F4` | Индикатор Chrome-only фич |
| Edge badge | `#0078D4` | Индикатор Edge-only фич |
| Firefox badge | `#FF7139` | Индикатор Firefox-only фич |

### Иконка

Метла / щётка в минималистичном стиле — ассоциация с "уборкой".
Или: буква D в круге с визуальной метафорой вычёркивания/стирания.

---

## 13. Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Браузеры меняют CSS-селекторы | Высокая | Модульные селекторы, CI-мониторинг, быстрый патч-цикл |
| Chrome Web Store отказ | Средняя | Минимальные permissions, прозрачная Privacy Policy, open-source |
| Edge блокирует NTP-инъекцию | Средняя | Fallback на endpoint-блокировку через dNR |
| Пользователи путают с adblocker | Средняя | Чёткое позиционирование в описании и onboarding |
| `getMatchedRules()` quota limits | Низкая | Throttle polling, fallback на session-based count |
| Browser vendor запрещает скрытие | Низкая | Open-source community backing, прецедент uBlock |
