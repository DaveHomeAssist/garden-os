#!/usr/bin/env node
// Precompile the JSX in the root React pages for deploy.
//
// The root tools (index-v5, planner, doctor, beds, how it thinks) load React
// from vendor/ and keep their JSX in one <script type="text/babel"> block, which
// babel-standalone (about 650 KiB gzipped, render blocking) compiles in the
// browser on every cold load. This script compiles that block ahead of time
// with esbuild, removes the babel-standalone tag, and drops babel-standalone
// from the service worker precache list. The source files stay as they are,
// so `python3 -m http.server` keeps working with no build step; only the Pages
// artifact is rewritten (see .github/workflows/pages.yml).
//
// Build tooling lives in story-mode/, so this script runs on Story Mode's
// esbuild. It does not touch story-mode/ itself.
//
// Usage:
//   node story-mode/scripts/precompile-root-jsx.mjs --check   (compile in memory, write nothing)
//   node story-mode/scripts/precompile-root-jsx.mjs --write   (rewrite the pages and sw.js in place)

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));

const BABEL_BLOCK = /<script type="text\/babel"(?: data-presets="react")?>([\s\S]*?)<\/script>/g;
const BABEL_TAG = /^[ \t]*<script src="vendor\/babel-standalone-[\d.]+\.min\.js"><\/script>\r?\n/m;
const BABEL_PRECACHE = /^[ \t]*'vendor\/babel-standalone-[\d.]+\.min\.js',\r?\n/m;

/** Compile one page's JSX block and remove its babel-standalone tag. */
export async function precompileHtml(html, file = 'page.html') {
  const blocks = [...html.matchAll(BABEL_BLOCK)];
  if (blocks.length !== 1) {
    throw new Error(`${file}: expected exactly one text/babel script, found ${blocks.length}`);
  }
  if (!BABEL_TAG.test(html)) {
    throw new Error(`${file}: has a text/babel script but no vendor babel-standalone tag`);
  }

  const [block, source] = blocks[0];
  // Same output shape as babel-standalone with only the react preset: classic
  // React.createElement calls, everything else left as written (no downlevel,
  // no minify, no module wrapper), so the compiled code runs in the same
  // global script scope the babel version did.
  const { code, warnings } = await transform(source, {
    loader: 'jsx',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    target: 'esnext',
    sourcefile: file,
  });
  if (warnings.length) {
    throw new Error(`${file}: esbuild warnings:\n${warnings.map((w) => w.text).join('\n')}`);
  }
  if (/<\/script/i.test(code)) {
    throw new Error(`${file}: compiled script contains a closing script tag`);
  }

  return html
    .replace(block, () => `<script>\n${code}</script>`)
    .replace(BABEL_TAG, '');
}

/** Remove babel-standalone from the service worker precache list. */
export function dropBabelPrecache(swSource) {
  if (!BABEL_PRECACHE.test(swSource)) {
    throw new Error('sw.js: babel-standalone is not in CORE_ASSETS (already removed, or the list changed)');
  }
  return swSource.replace(BABEL_PRECACHE, '');
}

/** Root HTML pages that still compile JSX in the browser. */
export async function findBabelPages(root = repoRoot) {
  const names = (await readdir(root)).filter((name) => name.endsWith('.html')).sort();
  const pages = [];
  for (const name of names) {
    const html = await readFile(join(root, name), 'utf8');
    if (html.includes('type="text/babel"')) pages.push(name);
  }
  return pages;
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  if (!write && !args.includes('--check')) {
    console.error('Usage: precompile-root-jsx.mjs --check | --write');
    process.exit(2);
  }

  const pages = await findBabelPages();
  if (pages.length === 0) throw new Error('No root pages with a text/babel script were found');

  for (const name of pages) {
    const path = join(repoRoot, name);
    const before = await readFile(path, 'utf8');
    const after = await precompileHtml(before, name);
    if (write) await writeFile(path, after);
    console.log(`${write ? 'compiled' : 'ok'} ${name} (${before.length} -> ${after.length} chars)`);
  }

  const swPath = join(repoRoot, 'sw.js');
  const sw = dropBabelPrecache(await readFile(swPath, 'utf8'));
  if (write) await writeFile(swPath, sw);
  console.log(`${write ? 'updated' : 'ok'} sw.js precache (babel-standalone removed)`);

  if (write) {
    const left = await findBabelPages();
    if (left.length) throw new Error(`Pages still compile JSX in the browser: ${left.join(', ')}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
