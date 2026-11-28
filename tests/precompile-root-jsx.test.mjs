// Unit tests for story-mode/scripts/precompile-root-jsx.mjs, the deploy step
// that compiles the root pages' JSX ahead of time and drops babel-standalone.
//
// Runs under `node --test` with no browser: it checks the rewrite itself, then
// renders every page in jsdom twice (babel in the page, and precompiled) and
// requires the same #root markup from both.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { Script } from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const storyModeRequire = createRequire(join(repoRoot, 'story-mode', 'package.json'));
const { JSDOM, VirtualConsole } = storyModeRequire('jsdom');
const { precompileHtml, dropBabelPrecache, findBabelPages } = await import(
  pathToFileURL(join(repoRoot, 'story-mode', 'scripts', 'precompile-root-jsx.mjs')).href
);

const expectedPages = [
  'garden-doctor-v5.html',
  'garden-painting.html',
  'garden-planner-v5.html',
  'how-it-thinks-v5.html',
  'index-v5.html',
];
const fixedNow = Date.parse('2026-06-15T15:00:00Z');

test('finds the five root pages that compile JSX in the browser', async () => {
  assert.deepEqual(await findBabelPages(repoRoot), expectedPages);
});

for (const name of expectedPages) {
  test(`${name}: precompiled page has plain JS and no babel-standalone`, async () => {
    const source = await readFile(join(repoRoot, name), 'utf8');
    const out = await precompileHtml(source, name);

    assert(!out.includes('type="text/babel"'), 'text/babel script left behind');
    assert(!out.includes('babel-standalone'), 'babel-standalone tag left behind');
    for (const vendor of ['vendor/react-18.3.1.production.min.js', 'vendor/react-dom-18.3.1.production.min.js']) {
      assert(out.includes(`<script src="${vendor}"></script>`), `${vendor} tag must stay`);
    }

    const scripts = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    const compiled = scripts.find((code) => code.includes('React.createElement'));
    assert(compiled, 'compiled script with React.createElement calls is missing');
    assert.doesNotThrow(() => new Script(compiled, { filename: name }), 'compiled code must parse as a classic script');

    // Everything outside the JSX block and the babel tag is unchanged.
    const strip = (html) => html
      .replace(/<script(?: type="text\/babel" data-presets="react")?>[\s\S]*?<\/script>/g, '')
      .replace(/^[ \t]*<script src="vendor\/babel-standalone-[\d.]+\.min\.js"><\/script>\r?\n/m, '');
    assert.equal(strip(out), strip(source));
  });
}

test('precompileHtml refuses a page without exactly one JSX block', async () => {
  await assert.rejects(precompileHtml('<html><body></body></html>', 'empty.html'), /exactly one text\/babel/);
});

test('dropBabelPrecache removes only the babel-standalone precache entry', async () => {
  const sw = await readFile(join(repoRoot, 'sw.js'), 'utf8');
  const out = dropBabelPrecache(sw);
  assert(!out.includes('babel-standalone'));
  assert.equal(sw.split('\n').length - out.split('\n').length, 1);
  assert(out.includes("'vendor/react-18.3.1.production.min.js',"));
  assert.throws(() => dropBabelPrecache(out), /not in CORE_ASSETS/);
});

async function inlineScripts(html) {
  for (const [tag, src] of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]) {
    const code = /^https?:/.test(src) ? '' : await readFile(join(repoRoot, src), 'utf8');
    html = html.replace(tag, () => `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`);
  }
  // jsdom applies no CSP, but drop it so inlined vendor scripts are not a question.
  return html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
}

async function renderRoot(html, name) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => errors.push(String(error.message || error)));
  const dom = new JSDOM(await inlineScripts(html), {
    url: `http://gos.test/${name}`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.Date.now = () => fixedNow;
      window.matchMedia ??= () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      window.fetch = async (input) => {
        const url = new URL(String(input), 'http://gos.test/');
        try {
          return new Response(await readFile(join(repoRoot, decodeURIComponent(url.pathname))), { status: 200 });
        } catch {
          return new Response('', { status: 404 });
        }
      };
    },
  });
  await new Promise((done) => dom.window.addEventListener('load', done));
  for (let i = 0; i < 100 && !dom.window.document.querySelector('#root')?.childElementCount; i += 1) {
    await new Promise((done) => setTimeout(done, 100));
  }
  await new Promise((done) => setTimeout(done, 500));
  const markup = dom.window.document.querySelector('#root')?.innerHTML || '';
  const babelLoaded = Boolean(dom.window.Babel);
  dom.window.close();
  return { markup, errors, babelLoaded };
}

for (const name of expectedPages) {
  test(`${name}: precompiled page renders the same markup as the babel version`, async () => {
    const source = await readFile(join(repoRoot, name), 'utf8');
    const original = await renderRoot(source, name);
    const precompiled = await renderRoot(await precompileHtml(source, name), name);

    assert.deepEqual(original.errors, [], `babel version threw: ${original.errors.join(' | ')}`);
    assert.deepEqual(precompiled.errors, [], `precompiled version threw: ${precompiled.errors.join(' | ')}`);
    assert(original.babelLoaded, 'babel version should load babel-standalone');
    assert(!precompiled.babelLoaded, 'precompiled version must not load babel-standalone');
    assert(precompiled.markup.length > 0, 'precompiled page rendered nothing');
    assert.equal(precompiled.markup, original.markup);
  });
}
