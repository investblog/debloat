import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Files share one Chromium profile dir (tests/e2e/helpers.ts) — run them one at a time
    fileParallelism: false,
    // No environment — runs in Node, talks to Chrome via Puppeteer
  },
});
