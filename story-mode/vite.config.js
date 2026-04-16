import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/garden-os/story-mode/',
  server: {
    host: '0.0.0.0',
    port: 5174,
  },
  build: {
    outDir: 'dist',
    minify: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      specs: resolve(__dirname, '../specs'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/cutscenes.test.js'],
    alias: {
      specs: resolve(__dirname, '../specs'),
    },
  },
});
