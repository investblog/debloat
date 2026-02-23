import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@background': path.resolve(__dirname, 'src/background'),
      '@selectors': path.resolve(__dirname, 'src/selectors'),
      '@ui': path.resolve(__dirname, 'src/ui'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'happy-dom',
  },
});
