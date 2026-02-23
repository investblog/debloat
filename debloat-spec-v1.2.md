# Debloat — Technical Specification (MVP)

**Domain:** debloat.click
**Stack:** WXT + TypeScript + Vanilla DOM
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
- Обновляется в реальном времени через `declarativeNetRequestFeedback`
- Цвет badge: `#10B981` (emerald) — ассоциация с "чистотой"
- При 0 — badge скрыт
- При 1000+ — отображается "1k+"
- Сбрасывается при навигации (per-tab counter)

### 3.3 Side Panel (основной интерфейс)

Открывается по клику на иконку расширения. Содержит и master-тогглы, и детальные настройки в одном scrollable UI.

```
┌─────────────────────────────────────┐
│  🧹 Debloat                        │
│  Your browser, decluttered          │
│─────────────────────────────────────│
│  ┌─────────────────────────────────┐│
│  │ ⏸ Pause (1h) │ 🚫 This site │ ││
│  │ ☰ Balanced ▾                   ││
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
- **Preset selector** — выпадающий `☰ Balanced ▾`:
  - `Aggressive` — всё включено (default)
  - `Balanced` — телеметрия + AI, но оставляет shopping и некоторые annoyances
  - `Minimal` — только телеметрия и критичные AI endpoints
  - `Custom` — автоматически при ручном изменении тогглов

**Coverage индикатор:**
- Каждая master-карточка показывает количество активных правил по браузерам: `Edge: 12 · Chrome: 4 · Firefox: 6`
- Цифры рассчитываются динамически из rule sets + selectors
- Текущий браузер выделен цветом, остальные — dimmed
- Драматически снижает негатив "в Chrome ничего не происходит" — пользователь видит реальный scope

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
- Получает данные через `declarativeNetRequest.onRuleMatchedDebug` (dev) / `getMatchedRules()` (prod)

**Архитектура Side Panel:**
- Chrome: `sidePanel` API (Chrome 114+)
- Firefox: `sidebar_action` API
- Клик на иконку → `chrome.sidePanel.open()` / sidebar toggle
- Каждая категория раскрывается inline → под-тогглы с browser badges
- Полноценный scrollable layout, не ограничен размерами popup

**Дизайн-принципы:**
- 5 master-тогглов с expandable под-тогглами (collapsible)
- Описания под каждым тогглом — конкретные названия фич, не абстракции
- Под-тогглы с бейджами браузера: [Chrome] [Edge] [Firefox]
- Неприменимые к текущему браузеру тогглы скрыты (не disabled, а hidden)
- Кнопки "Enable All" / "Disable All" внизу
- Кнопка "Reset to Defaults" (всё ON)
- Изменения применяются мгновенно, без кнопки "Save"
- Тёмная тема по умолчанию, адаптация под системную

### 3.5 Popup (минимальный, опционально)

Popup не является основным UI. Используется только как fallback или quick-access:

```
┌───────────────────────────────┐
│  🧹 Debloat     47 blocked   │
│  [Open Panel ▸]               │
│  ─────────────────────────    │
│  [⏸ Pause 1h] [🚫 This site]│
└───────────────────────────────┘
```

- "Open Panel" → открывает Side Panel
- Quick actions дублируют верхнюю панель: "Pause 1h" + "Disable on this site"
- Счётчик заблокированных (дублирует badge)

### 3.6 Детальные под-тогглы (внутри Side Panel)

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

---

## 4. Техническая архитектура

### 4.1 Методы воздействия

Расширение использует три комплементарных механизма:

#### Механизм A: declarativeNetRequest (блокировка запросов)
- **Что:** Блокировка HTTP-запросов к known endpoints
- **Где:** Телеметрия, AI API endpoints, shopping services, MSN feed
- **Как:** Статические и динамические rule sets
- **Permissions:** `declarativeNetRequest`, `declarativeNetRequestWithHostAccess`
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

### 4.2 Структура проекта (WXT)

```
debloat/
├── wxt.config.ts
├── package.json
├── src/
│   ├── entrypoints/
│   │   ├── sidepanel/                     — Chrome Side Panel (основной UI)
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   └── style.css
│   │   ├── sidebar/                       — Firefox Sidebar (основной UI)
│   │   │   ├── index.html
│   │   │   └── main.ts                    — Реэкспорт sidepanel/main.ts
│   │   ├── popup/                         — Минимальный popup (Open Panel + Pause)
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   └── style.css
│   │   ├── background.ts                  — Rule management, badge counter, browser detection
│   │   └── content/
│   │       ├── google-search.ts        — AI Overview, AI Mode в Google SERP
│   │       ├── google-search.css       — CSS-скрытие AI Overview элементов
│   │       ├── ntp-chrome.ts           — Chrome New Tab Page очистка
│   │       ├── ntp-chrome.css
│   │       ├── ntp-edge.ts             — Edge NTP: MSN, Copilot, Sponsored
│   │       ├── ntp-edge.css
│   │       ├── ntp-firefox.ts          — Firefox Home: Sponsored, Recommendations
│   │       ├── ntp-firefox.css
│   │       ├── edge-ui.ts              — Copilot overlays, Shopping, Visual Search
│   │       ├── edge-ui.css
│   │       ├── ai-apis.ts              — window.ai нейтрализация (main world)
│   │       └── common.ts               — MutationObserver helpers, utilities
│   ├── modules/
│   │   ├── rules/
│   │   │   ├── telemetry-chrome.json   — Chrome telemetry endpoints
│   │   │   ├── telemetry-edge.json     — Edge/MS diagnostic endpoints
│   │   │   ├── telemetry-firefox.json  — Mozilla telemetry endpoints
│   │   │   ├── ai-endpoints.json       — Gemini, Copilot, Turing API URLs
│   │   │   ├── shopping.json           — Edge Shopping service URLs
│   │   │   └── sponsored.json          — MSN feed, sponsored content URLs
│   │   ├── selectors/
│   │   │   ├── google-search.ts        — Селекторы AI Overview, AI Mode
│   │   │   ├── chrome-ntp.ts           — Селекторы Chrome NTP AI элементов
│   │   │   ├── edge-ntp.ts             — Селекторы Edge NTP bloat
│   │   │   ├── edge-copilot.ts         — Селекторы Copilot sidebar/overlays
│   │   │   ├── edge-shopping.ts        — Селекторы Shopping Assistant UI
│   │   │   └── firefox-home.ts         — Селекторы Firefox Home bloat
│   │   ├── browser-detect.ts           — Chrome vs Edge vs Firefox detection
│   │   └── settings.ts                 — Defaults, storage sync, migrations
│   ├── components/
│   │   ├── Toggle.ts                   — Reusable toggle component
│   │   ├── Counter.ts                  — Blocked requests counter
│   │   └── CategoryCard.ts             — Collapsible category in popup
│   ├── types/
│   │   └── settings.ts                 — TypeScript interfaces
│   └── assets/
│       ├── icons/                      — Extension icons (16, 32, 48, 128)
│       └── _locales/                   — i18n files
│           ├── en/messages.json
│           ├── ru/messages.json
│           ├── de/messages.json
│           ├── fr/messages.json
│           ├── es/messages.json
│           ├── pt/messages.json
│           └── ja/messages.json
├── tests/
│   ├── rules.test.ts                   — Проверка rule sets
│   └── selectors.test.ts              — Проверка актуальности селекторов
└── scripts/
    └── update-selectors.ts             — Утилита обновления селекторов
```

### 4.3 Permissions (минимально необходимые)

```jsonc
{
  "permissions": [
    "storage",                              // Хранение настроек
    "sidePanel",                            // Chrome Side Panel API
    "scripting",                            // Dynamic content script registration (4.5)
    "declarativeNetRequest",                // Блокировка запросов
    "declarativeNetRequestFeedback"         // Счётчик заблокированных (badge)
  ],
  "side_panel": {
    "default_path": "sidepanel/index.html"
  },
  "sidebar_action": {                       // Firefox
    "default_panel": "sidebar/index.html",
    "default_title": "Debloat"
  },
  "host_permissions": [
    "*://www.google.com/*",                 // AI Overview скрытие
    "*://www.google.*//*",                  // Google country domains
    "*://ntp.msn.com/*",                    // Edge NTP feed
    "*://edge.microsoft.com/*",             // Edge services
    "*://*.bing.com/*"                      // Bing/Copilot services
  ],
  "optional_host_permissions": [
    "*://*/*"                               // Для Visual Search overlay и подобных фич,
                                            // запрашивается только при включении
  ]
}
```

**Принцип:** Запрашиваем минимум при установке. Расширенные permissions — optional, запрашиваются при активации конкретных фич. Это важно для trust factor в сторе.

### 4.4 Content Scripts Matching

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

### 4.5 Dynamic Content Script Registration

**Проблема:** `<all_urls>` в манифестных `content_scripts` нельзя надёжно "выключить" через optional permissions в MV3. Скрипт матчится по `matches`, а не по permissions.

**Решение:** Edge-specific модули (Copilot overlays, Visual Search, Shopping UI) регистрируются/удаляются динамически через `scripting.registerContentScripts()`:

```typescript
// background.ts
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

// При изменении тоггла "Annoyances" / "AI Features" на Edge
async function onEdgeModuleToggled(enabled: boolean) {
  if (enabled) {
    // Запрашиваем optional permission, затем регистрируем
    const granted = await chrome.permissions.request({
      origins: ['<all_urls>']
    });
    if (granted) await enableEdgeUI();
  } else {
    await disableEdgeUI();
  }
}
```

**Firefox:** Используется `browser.contentScripts.register()` (WebExtension API). Matching сужен до конкретных доменов Edge-эквивалентов (не требуется `<all_urls>`).

**Преимущества:**
- Никаких scary permissions при установке
- `<all_urls>` запрашивается только при включении конкретных фич
- Полный контроль: register при ON, unregister при OFF
- `persistAcrossSessions: true` — переживает перезапуск браузера

### 4.6 declarativeNetRequest Rule Sets

Организованы по категориям, включаются/отключаются независимо:

```jsonc
// wxt.config.ts
declarativeNetRequest: {
  rulesets: [
    { id: "telemetry_chrome",  enabled: true, path: "rules/telemetry-chrome.json"  },
    { id: "telemetry_edge",    enabled: true, path: "rules/telemetry-edge.json"    },
    { id: "telemetry_firefox", enabled: true, path: "rules/telemetry-firefox.json" },
    { id: "ai_endpoints",      enabled: true, path: "rules/ai-endpoints.json"      },
    { id: "shopping",          enabled: true, path: "rules/shopping.json"           },
    { id: "sponsored",         enabled: true, path: "rules/sponsored.json"          }
  ]
}
```

Background script переключает rule sets при изменении тогглов:

```typescript
// background.ts (псевдокод)

// Badge counter — обновляется при каждом заблокированном запросе
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  const tabId = info.request.tabId;
  if (tabId < 0) return;
  // Increment per-tab counter, update badge
  updateBadge(tabId);
});

async function updateBadge(tabId: number) {
  const count = await getTabBlockCount(tabId);
  chrome.action.setBadgeText({
    text: count === 0 ? '' : count > 999 ? '1k+' : String(count),
    tabId
  });
  chrome.action.setBadgeBackgroundColor({ color: '#10B981', tabId });
}

// Side Panel — открывается по клику на иконку
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Toggle rule sets
async function onSettingChanged(category: string, enabled: boolean) {
  const rulesetMap = {
    'ai':        ['ai_endpoints'],
    'sponsored': ['sponsored'],
    'shopping':  ['shopping'],
    'telemetry': ['telemetry_chrome', 'telemetry_edge', 'telemetry_firefox']
  };

  const rulesets = rulesetMap[category] || [];
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled ? rulesets : [],
    disableRulesetIds: enabled ? [] : rulesets
  });
}
```

### 4.7 Browser Detection & Conditional Logic

```typescript
// browser-detect.ts
export type BrowserType = 'chrome' | 'edge' | 'firefox' | 'unknown';

export function detectBrowser(): BrowserType {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return 'firefox';
  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Chrome/')) return 'chrome';
  return 'unknown';
}
```

В Side Panel — показываются только тогглы для текущего браузера.
В background — активируются только релевантные rule sets.

---

## 5. Данные для блокировки (начальный набор)

### 5.1 Telemetry endpoints (примеры)

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

### 5.2 AI endpoints (примеры)

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

## 6. Google Search Integration (заимствование от Bye Bye Google AI)

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

### Вариант: CSS/DOM очистка стандартного NTP

**Предпочтительный подход для MVP.** Не заменяем NTP целиком (это отдельный проект), а чистим существующий:

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
CSS-селекторы и API endpoints меняются при обновлениях браузера. Bye Bye Google AI прямо указывает: "if Google changes its CSS, we'll have to update."

### Решение
1. **Селекторы в отдельных модулях** — быстрый патч без переписывания логики
2. **Automated monitoring** — CI-скрипт, проверяющий актуальность селекторов еженедельно
3. **Community reporting** — GitHub Issues шаблон "Broken selector" с предзаполненными полями
4. **Graceful degradation** — если селектор не найден, просто не скрываем (без ошибок)
5. **Fast update cycle** — расширение проверяет обновления rule sets через remote JSON (без обновления всего расширения)

---

## 9. Scope: MVP vs Backlog

### MVP

| Категория | Содержимое |
|-----------|-----------|
| **AI Features** | Google AI Overview скрытие (Hide/Collapse), AI Mode скрытие, блокировка Gemini/Copilot/Turing endpoints, Visual Search overlay скрытие, window.ai нейтрализация |
| **Sponsored** | Edge NTP MSN feed скрытие, Edge sponsored tiles скрытие, Firefox sponsored/recommended stories блокировка |
| **Shopping** | Edge Shopping Assistant блокировка (endpoints + UI) |
| **Telemetry** | Блокировка known telemetry endpoints для Chrome/Edge/Firefox |
| **Annoyances** | Edge Rewards скрытие, feature recommendation banners скрытие |
| **UI** | Side Panel с 5 master-тогглами + expandable под-тогглы, badge counter на иконке, Activity drawer, per-site controls, presets (Aggressive/Balanced/Minimal), minimal popup |
| **i18n** | EN, RU (остальные языки — в v1.1) |
| **Stores** | Chrome Web Store, Edge Add-ons |

### v1.1

- Полная локализация: DE, FR, ES, PT, JA
- Firefox Add-ons store публикация
- Onboarding page при первой установке (before/after скриншоты)
- Статистика за период (blocked per day/week)

### v1.2

- Optional Custom NTP (минималистичный, с поиском и пользовательскими ссылками)
- Export/Import настроек
- Remote rule updates без обновления расширения (**signed versions**, transparent changelog page, возможность "pin to bundled rules" — иначе модерация стора задаст вопросы)
- "Companion extensions" рекомендации в Side Panel (uBlock, CookiePeek, FastWeb)

### v2.0

- AI content detection на произвольных страницах (пометка AI-сгенерированного контента)
- Whitelist/blacklist для конкретных сайтов
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
3. Side Panel с 5 master-тогглами и badge counter на иконке
4. Side Panel с раскрытыми под-тогглами категории AI Features
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
- Опционально `chrome.storage.sync` для синхронизации между устройствами (только настройки тогглов)
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
| Background | `#0F1117` | Тёмный фон popup/options |
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
| Chrome Web Store отказ в публикации | Средняя | Минимальные permissions, прозрачная Privacy Policy, open-source |
| Edge блокирует NTP-инъекцию | Средняя | Fallback на endpoint-блокировку через dNR |
| Пользователи путают с adblocker | Средняя | Чёткое позиционирование в описании и onboarding |
| Конкурент делает то же | Низкая | First mover advantage, community, быстрая итерация |
| Browser vendor запрещает скрытие своих фич | Низкая | Open-source community backing, прецедент uBlock |
