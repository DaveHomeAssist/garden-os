import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const canonicalRootRoutes = [
  'index-v5.html',
  'garden-painting.html',
  'garden-planner-v5.html',
  'garden-doctor-v5.html',
  'journal.html',
  'garden-cage-build-guide.html',
  'garden-cage-ops-guide.html',
  'how-it-thinks-v5.html',
];

for (const route of canonicalRootRoutes) {
  const html = read(route);
  assert.match(html, /garden-theme\.js/, `${route} must load the shared theme controller`);
  assert.match(html, /garden-pwa\.js/, `${route} must load the shared PWA registration`);
  assert.match(html, /rel=["']manifest["']/, `${route} must expose the shared web manifest`);
}

const storyMain = read('story-mode/src/main.js');
assert.match(storyMain, /garden-theme\.js/, 'Story Mode must share the same saved theme');
assert.match(storyMain, /garden-pwa\.js/, 'Story Mode must share PWA registration');
assert.match(read('story-mode/index.html'), /rel="manifest"/, 'Story Mode must expose the web manifest');

const theme = read('garden-theme.js');
assert.match(theme, /return VALID_THEMES\.has\(stored\) \? stored : 'light'/, 'first visit must default to light');
assert.match(theme, /min-height: 44px|garden-theme-toggle/, 'theme controller must mount the visible toggle');

const serviceWorker = read('sw.js');
assert.match(serviceWorker, /garden-theme\.js/);
assert.match(serviceWorker, /garden-pwa\.js/);
assert.match(serviceWorker, /2026-10-19-origin-agnostic/);

const manifest = JSON.parse(read('manifest.json'));
assert.equal(manifest.name, 'Garden OS');
// Relative so the same manifest works at /garden-os/ (github.io) and at / (custom domain).
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
for (const shortcut of manifest.shortcuts ?? []) assert.doesNotMatch(shortcut.url, /^\//, `shortcut ${shortcut.name} must be relative`);
const storyManifest = JSON.parse(read('story-mode/public/manifest.webmanifest'));
assert.equal(storyManifest.start_url, '../');
assert.equal(storyManifest.scope, '../');
for (const shortcut of storyManifest.shortcuts ?? []) assert.doesNotMatch(shortcut.url, /^\//, `story shortcut ${shortcut.name} must be relative`);

console.log(JSON.stringify({ ok: true, canonicalRoutes: canonicalRootRoutes.length + 1 }, null, 2));
