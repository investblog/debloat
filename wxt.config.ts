import path from 'node:path';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',

  vite: () => ({
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@background': path.resolve(__dirname, 'src/background'),
        '@selectors': path.resolve(__dirname, 'src/selectors'),
        '@ui': path.resolve(__dirname, 'src/ui'),
      },
    },
  }),

  manifest: ({ browser }) => ({
    name: '__MSG_EXTENSION_NAME__',
    description: '__MSG_EXTENSION_DESCRIPTION__',
    version: '0.1.0',
    author: 'Debloat <support@debloat.click>',
    homepage_url: 'https://debloat.click',
    default_locale: 'en',

    permissions: [
      'storage',
      'declarativeNetRequest',
      ...(browser !== 'firefox' ? ['declarativeNetRequestFeedback', 'sidePanel'] : []),
      'scripting',
      'webNavigation',
    ],

    ...(browser !== 'firefox' && {
      minimum_chrome_version: '116',
      side_panel: {
        default_path: 'sidepanel.html',
      },
    }),

    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: 'debloat@debloat.click',
          strict_min_version: '109.0',
        },
      },
    }),

    host_permissions: [
      '*://www.google.com/*',
      '*://www.google.co.uk/*',
      '*://www.google.de/*',
      '*://www.google.fr/*',
      '*://www.google.co.jp/*',
      '*://www.google.co.in/*',
      '*://www.google.com.br/*',
      '*://www.google.ca/*',
      '*://www.google.com.au/*',
      '*://www.google.ru/*',
      '*://www.google.it/*',
      '*://www.google.es/*',
      '*://www.google.com.mx/*',
      '*://www.google.co.kr/*',
      '*://www.google.nl/*',
      '*://www.google.pl/*',
      '*://www.google.com.tr/*',
      '*://www.google.co.id/*',
      '*://ntp.msn.com/*',
      '*://edge.microsoft.com/*',
      '*://*.bing.com/*',
    ],

    optional_host_permissions: ['*://*/*'],

    declarative_net_request: {
      rule_resources: [
        { id: 'telemetry_chrome', enabled: true, path: 'rules/telemetry-chrome.json' },
        { id: 'telemetry_edge', enabled: true, path: 'rules/telemetry-edge.json' },
        { id: 'telemetry_firefox', enabled: true, path: 'rules/telemetry-firefox.json' },
        { id: 'ai_endpoints', enabled: true, path: 'rules/ai-endpoints.json' },
        { id: 'shopping', enabled: true, path: 'rules/shopping.json' },
        { id: 'sponsored', enabled: true, path: 'rules/sponsored.json' },
      ],
    },

    icons: {
      16: 'icons/16.png',
      32: 'icons/32.png',
      48: 'icons/48.png',
      128: 'icons/128.png',
    },
  }),

  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      // WXT auto-adds <all_urls> from runtime content scripts to host_permissions.
      // We want it ONLY in optional_host_permissions to avoid scary install prompts.
      if (manifest.host_permissions) {
        manifest.host_permissions = manifest.host_permissions.filter((p: string) => p !== '<all_urls>');
      }

      // Firefox AMO requires data_collection_permissions (mandatory H1 2026)
      if (manifest.browser_specific_settings?.gecko) {
        (manifest.browser_specific_settings.gecko as Record<string, unknown>).data_collection_permissions = {
          required: ['none'],
        };
      }

      // Firefox MV2: no sidePanel API — enrich auto-generated sidebar_action
      if (wxt.config.browser === 'firefox') {
        const sa = manifest as unknown as Record<string, unknown>;
        if (sa.sidebar_action && typeof sa.sidebar_action === 'object') {
          const sidebar = sa.sidebar_action as Record<string, unknown>;
          sidebar.open_at_install = false;
          sidebar.default_icon = { '16': 'icons/16.png', '32': 'icons/32.png' };
        }
        // MV2 has no optional_host_permissions — convert to optional_permissions
        if (!manifest.optional_permissions) {
          manifest.optional_permissions = [];
        }
        const ohp = (manifest as unknown as Record<string, unknown>).optional_host_permissions as string[] | undefined;
        if (ohp) {
          manifest.optional_permissions.push(...ohp);
          delete (manifest as unknown as Record<string, unknown>).optional_host_permissions;
        }
      }
    },
  },

  browser: 'chrome',
});
