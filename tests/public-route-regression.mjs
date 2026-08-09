import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const sitemap = read('sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expected = [
  'https://davehomeassist.github.io/garden-os/',
  'https://davehomeassist.github.io/garden-os/garden-painting.html',
  'https://davehomeassist.github.io/garden-os/garden-planner-v5.html',
  'https://davehomeassist.github.io/garden-os/garden-doctor-v5.html',
  'https://davehomeassist.github.io/garden-os/journal.html',
  'https://davehomeassist.github.io/garden-os/story-mode/',
  'https://davehomeassist.github.io/garden-os/garden-cage-build-guide.html',
  'https://davehomeassist.github.io/garden-os/garden-cage-ops-guide.html',
  'https://davehomeassist.github.io/garden-os/how-it-thinks-v5.html',
];

assert.deepEqual(urls, expected, 'sitemap should contain only canonical user-facing routes');
assert.doesNotMatch(sitemap, /prompt|issue|build-state|demo|developer|story-mode-live|simulator|visualizer|system-map/i);

const index = read('index.html');
const home = read('home.html');
const currentHome = read('index-v5.html');
const storyAlias = read('story-mode-live/index.html');
assert.match(index, /url=index-v5\.html/);
assert.match(index, /window\.location\.replace\('index-v5\.html'/);
assert.match(currentHome, /rel="canonical" href="https:\/\/davehomeassist\.github\.io\/garden-os\/"/);
assert.match(home, /name="robots" content="noindex,follow"/);
assert.match(storyAlias, /name="robots" content="noindex,follow"/);
assert.match(storyAlias, /url=\.\.\/story-mode\//);

for (const path of [
  'index.html', 'index-v5.html', 'garden-painting.html', 'garden-planner-v5.html',
  'garden-doctor-v5.html', 'journal.html', 'garden-cage-build-guide.html',
  'garden-cage-ops-guide.html', 'manifest.json', 'sw.js',
]) {
  assert.doesNotMatch(read(path), /story-mode-v4|href=["'][^"']*story-mode-live/i, `${path} should not link an obsolete Story route`);
}

for (const path of [
  'index-v5.html', 'garden-painting.html', 'garden-planner-v5.html',
  'garden-doctor-v5.html', 'journal.html', 'garden-cage-build-guide.html',
  'garden-cage-ops-guide.html', 'how-it-thinks-v5.html',
]) {
  assert.doesNotMatch(read(path), /index-v5\.html/, `${path} should link Home through the canonical root`);
}

console.log(JSON.stringify({ ok: true, publicRoutes: urls.length }, null, 2));
