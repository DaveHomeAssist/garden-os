import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      specs: resolve(__dirname, '../specs'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/cutscenes.test.js'],
  },
});
