// Precompiled root pages regression.
//
// The Pages deploy compiles each root page's JSX ahead of time and drops
// babel-standalone (story-mode/scripts/precompile-root-jsx.mjs). This test
// loads every such page twice in Chromium, once as written (babel compiles in
// the browser) and once precompiled with babel-standalone blocked, and checks
// that the precompiled page renders, throws nothing, never asks for
// babel-standalone, and shows the same text as the babel version.
//
// Run against the source tree (verify-all), or with PRECOMPILED_ONLY=1 after
// the deploy step has rewritten the pages in place, where there is no babel
// version left to compare with.

import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromiumLaunchOptions } from './playwright-launch-options.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const playwrightPath = process.env.PLAYWRIGHT_IMPORT_PATH
  || join(repoRoot, 'story-mode', 'node_modules', 'playwright', 'index.mjs');
const { chromium } = await import(pathToFileURL(playwrightPath).href);
const { precompileHtml } = await import(
  pathToFileURL(join(repoRoot, 'story-mode', 'scripts', 'precompile-root-jsx.mjs')).href
);

const pages = [
  'index-v5.html',
  'garden-planner-v5.html',
  'garden-doctor-v5.html',
  'garden-painting.html',
  'how-it-thinks-v5.html',
];
const precompiledOnly = process.env.PRECOMPILED_ONLY === '1';
const fixedNow = new Date('2026-06-15T15:00:00Z');

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = normalize(join(repoRoot, pathname));
      if (file !== repoRoot && !file.startsWith(repoRoot + sep)) throw new Error('outside root');
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function renderedText(url, { html, blockBabel }) {
  // A fresh context per load, so neither run sees storage the other wrote.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await context.clock.setFixedTime(fixedNow);
  const page = await context.newPage();
  const errors = [];
  const babelRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/babel-standalone/, (route) => {
    babelRequests.push(route.request().url());
    return blockBabel ? route.abort() : route.continue();
  });
  if (html) {
    await page.route(url, (route) => route.fulfill({ status: 200, contentType: types['.html'], body: html }));
  }
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#root')?.childElementCount > 0, null, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  const text = await page.locator('#root').innerText();
  await context.close();
  return { text, errors, babelRequests };
}

const own = process.env.BASE_URL ? null : await startServer();
const baseUrl = (process.env.BASE_URL || own.baseUrl).replace(/\/$/, '');
const browser = await chromium.launch(chromiumLaunchOptions({ headless: true }));

try {
  for (const name of pages) {
    const onDisk = await readFile(join(repoRoot, name), 'utf8');
    const stillBabel = onDisk.includes('type="text/babel"');
    if (precompiledOnly) {
      assert(!stillBabel, `${name} still compiles JSX in the browser after the precompile step`);
    }

    const url = `${baseUrl}/${name}`;

    const compiled = await renderedText(url, {
      html: stillBabel ? await precompileHtml(onDisk, name) : null,
      blockBabel: true,
    });
    assert.deepEqual(compiled.errors, [], `${name} (precompiled) threw: ${compiled.errors.join(' | ')}`);
    assert.deepEqual(compiled.babelRequests, [], `${name} (precompiled) still requested babel-standalone`);
    assert(compiled.text.trim().length > 0, `${name} (precompiled) rendered no text`);

    if (stillBabel) {
      const original = await renderedText(url, { html: null, blockBabel: false });
      assert.deepEqual(original.errors, [], `${name} (babel) threw: ${original.errors.join(' | ')}`);
      assert.equal(compiled.text, original.text, `${name}: precompiled text differs from the babel version`);
      console.log(`ok ${name}: precompiled matches babel (${compiled.text.length} chars of text)`);
    } else {
      console.log(`ok ${name}: precompiled page renders (${compiled.text.length} chars of text)`);
    }
  }
} finally {
  await browser.close();
  if (own) await new Promise((done) => own.server.close(done));
}
