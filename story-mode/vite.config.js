import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/garden-os/story-mode-live/',
  server: {
    host: '0.0.0.0',
    port: 5174,
  },
  build: {
    outDir: 'dist',
    minify: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules/three')) return undefined;

          if (id.includes('/three/build/three.core.js')) {
            return 'three-core';
          }

          if (id.includes('/three/build/three.module.js')) {
            return 'three-scene';
          }

          return 'three-entry';
        },
      },
    },
  },
  resolve: {
    alias: {
      specs: resolve(__dirname, '../specs'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
