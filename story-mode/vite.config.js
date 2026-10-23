import { defineConfig } from 'vite';
import { resolve } from 'path';

// Site root the build is served from. GitHub Pages serves this repo at
// /garden-os/ on davehomeassist.github.io, and at / on a custom domain
// (garden.mixmash.games). The Pages workflow passes
// actions/configure-pages' base_path here; anything unset keeps today's path.
export function siteBase(raw = process.env.GOS_SITE_BASE) {
  const value = String(raw ?? '').trim();
  if (!value) return '/garden-os/';
  if (value === '/') return '/';
  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

export default defineConfig({
  base: `${siteBase()}story-mode/`,
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
