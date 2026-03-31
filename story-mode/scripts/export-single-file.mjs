import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');
const distDir = resolve(projectRoot, 'dist');
const outputDir = resolve(projectRoot, 'dist-single');
const outputFile = resolve(outputDir, 'story-mode-standalone.html');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const LOCAL_ASSET_PATTERN = /(?:\/garden-os\/story-mode(?:-live)?\/)?assets\/[A-Za-z0-9._-]+/g;
const JS_IMPORT_PATTERN = /((?:import|export)\s[^"'`]*?\sfrom\s*|import\s*\(\s*|import\s+)(["'])(\.\/[^"'`]+?\.js)\2/g;
const ASSET_URL_PATTERN = /(["'`])((?:\/garden-os\/story-mode(?:-live)?\/)?assets\/[A-Za-z0-9._-]+)\1/g;
const CSS_URL_PATTERN = /url\((['"]?)([^)'"]+)\1\)/g;

function mimeTypeFor(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function toDataUrl(buffer, filePath) {
  return `data:${mimeTypeFor(filePath)};base64,${buffer.toString('base64')}`;
}

function normalizeAssetPath(assetPath) {
  return assetPath
    .replace(/\\/g, '/')
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/garden-os\/story-mode-live\//, '')
    .replace(/^\/garden-os\/story-mode\//, '')
    .replace(/^\/+/, '');
}

async function collectFiles(rootDir, currentDir = rootDir) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(rootDir, absolutePath));
      continue;
    }

    if (entry.isFile()) {
      files.push({
        absolutePath,
        relativePath: relative(rootDir, absolutePath).replace(/\\/g, '/'),
      });
    }
  }

  return files;
}

async function buildAssetMaps() {
  const files = await collectFiles(distDir);
  const assetBuffers = new Map();
  const assetDataUrls = new Map();
  const jsFiles = [];

  for (const file of files) {
    if (file.relativePath === 'index.html') continue;
    if (file.relativePath === 'build-meta.json') continue;
    if (file.relativePath.endsWith('.map')) continue;

    const buffer = await readFile(file.absolutePath);
    assetBuffers.set(file.relativePath, buffer);

    if (file.relativePath.endsWith('.js')) {
      jsFiles.push(file.relativePath);
      continue;
    }

    assetDataUrls.set(file.relativePath, toDataUrl(buffer, file.relativePath));
  }

  return { assetBuffers, assetDataUrls, jsFiles };
}

function replaceCssUrls(cssSource, assetDataUrls) {
  return cssSource.replace(CSS_URL_PATTERN, (fullMatch, quote, rawUrl) => {
    const normalized = normalizeAssetPath(rawUrl);
    if (!normalized.startsWith('assets/')) {
      return fullMatch;
    }
    const dataUrl = assetDataUrls.get(normalized);
    return dataUrl ? `url("${dataUrl}")` : fullMatch;
  });
}

function rewriteAssetStrings(source, assetUrlMap, warnings, contextLabel) {
  return source.replace(ASSET_URL_PATTERN, (fullMatch, quote, assetPath) => {
    const normalized = normalizeAssetPath(assetPath);
    const dataUrl = assetUrlMap.get(normalized);
    if (!dataUrl) {
      warnings.add(`${contextLabel}: unresolved asset ${normalized}`);
      return fullMatch;
    }
    return `${quote}${dataUrl}${quote}`;
  });
}

async function buildModuleDataUrl(modulePath, assetBuffers, assetUrlMap, warnings, cache) {
  if (cache.has(modulePath)) {
    return cache.get(modulePath);
  }

  const buffer = assetBuffers.get(modulePath);
  if (!buffer) {
    throw new Error(`Missing JS module in dist: ${modulePath}`);
  }

  let source = buffer.toString('utf-8');
  source = source.replace(/return\s*["']\/garden-os\/story-mode-live\/["']\s*\+\s*e/g, 'return globalThis.__GOS_SINGLE_FILE_ASSETS?.[e] ?? e');
  source = source.replace(/return\s*["']\/garden-os\/story-mode\/["']\s*\+\s*e/g, 'return globalThis.__GOS_SINGLE_FILE_ASSETS?.[e] ?? e');
  source = source.replace(/const __vite__mapDeps=.*?=>i\.map\(i=>d\[i\]\);/, 'const __vite__mapDeps=(i)=>[];');

  const importMatches = [...source.matchAll(JS_IMPORT_PATTERN)];
  const replacements = [];

  for (const match of importMatches) {
    const [fullMatch, prefix, quote, specifier] = match;
    const resolvedModule = posix.normalize(posix.join(posix.dirname(modulePath), specifier));
    const nestedDataUrl = await buildModuleDataUrl(resolvedModule, assetBuffers, assetUrlMap, warnings, cache);
    replacements.push({
      start: match.index,
      end: match.index + fullMatch.length,
      value: `${prefix}${quote}${nestedDataUrl}${quote}`,
    });
  }

  if (replacements.length) {
    let next = '';
    let cursor = 0;
    for (const replacement of replacements) {
      next += source.slice(cursor, replacement.start);
      next += replacement.value;
      cursor = replacement.end;
    }
    next += source.slice(cursor);
    source = next;
  }

  source = rewriteAssetStrings(source, assetUrlMap, warnings, modulePath);

  const dataUrl = `data:application/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  cache.set(modulePath, dataUrl);
  assetUrlMap.set(modulePath, dataUrl);
  return dataUrl;
}

function injectStandaloneBoot(htmlSource, cssText, entryModuleDataUrl, assetUrlMap) {
  const withoutGoogleFonts = htmlSource
    .replace(/<link rel="preconnect"[^>]*fonts\.googleapis\.com[^>]*>\s*/gi, '')
    .replace(/<link rel="preconnect"[^>]*fonts\.gstatic\.com[^>]*>\s*/gi, '')
    .replace(/<link[^>]*href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*>\s*/gi, '')
    .replace(/<link[^>]*href="(?:\/garden-os\/story-mode(?:-live)?\/)?assets\/[^"]+\.css"[^>]*>\s*/gi, '');

  const assetMapBase64 = Buffer.from(JSON.stringify(Object.fromEntries(assetUrlMap))).toString('base64');
  const standaloneMeta = `
  <meta name="x-story-mode-export" content="single-file" />
  <style id="gos-single-file-css">
${cssText}
  </style>
  <script>
    globalThis.__GOS_SINGLE_FILE_ASSETS = JSON.parse(atob("${assetMapBase64}"));
  </script>
  <script type="module" id="gos-single-file-entry">
    import "${entryModuleDataUrl}";
  </script>`;

  return withoutGoogleFonts
    .replace(/<script[^>]*type="module"[^>]*src="(?:\/garden-os\/story-mode(?:-live)?\/)?assets\/[^"]+\.js"[^>]*><\/script>\s*/gi, '')
    .replace('</head>', `${standaloneMeta}\n</head>`);
}

async function verifyNoLocalRefs(htmlPath) {
  const html = await readFile(htmlPath, 'utf-8');
  const leftoverLocalRefs = html.match(LOCAL_ASSET_PATTERN) ?? [];
  const externalLinks = [...html.matchAll(/<(?:script|link|img)[^>]+(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith('data:'))
    .filter((value) => !value.startsWith('blob:'))
    .filter((value) => !value.startsWith('#'))
    .filter((value) => !value.startsWith('mailto:'));

  return {
    leftoverLocalRefs,
    externalLinks,
  };
}

async function main() {
  const htmlPath = resolve(distDir, 'index.html');
  await stat(htmlPath);

  const [htmlSource, { assetBuffers, assetDataUrls }] = await Promise.all([
    readFile(htmlPath, 'utf-8'),
    buildAssetMaps(),
  ]);

  const warnings = new Set();
  const moduleCache = new Map();
  const assetUrlMap = new Map(assetDataUrls);

  const cssLinks = [...htmlSource.matchAll(/<link[^>]*href="([^"]+\.css)"[^>]*>/gi)].map((match) => normalizeAssetPath(match[1]));
  const cssSources = [];
  for (const cssPath of cssLinks) {
    const cssBuffer = assetBuffers.get(cssPath);
    if (!cssBuffer) {
      warnings.add(`index.html: missing CSS asset ${cssPath}`);
      continue;
    }
    cssSources.push(replaceCssUrls(cssBuffer.toString('utf-8'), assetDataUrls));
  }

  const entryMatch = htmlSource.match(/<script[^>]*type="module"[^>]*src="([^"]+\.js)"[^>]*><\/script>/i);
  if (!entryMatch) {
    throw new Error('Could not find entry module script in dist/index.html');
  }

  const entryModulePath = normalizeAssetPath(entryMatch[1]);
  const entryModuleDataUrl = await buildModuleDataUrl(entryModulePath, assetBuffers, assetUrlMap, warnings, moduleCache);
  const standaloneHtml = injectStandaloneBoot(htmlSource, cssSources.join('\n\n'), entryModuleDataUrl, assetUrlMap);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, standaloneHtml, 'utf-8');

  const verification = await verifyNoLocalRefs(outputFile);
  const summary = {
    outputFile,
    warnings: [...warnings],
    leftoverLocalRefs: verification.leftoverLocalRefs,
    externalLinks: verification.externalLinks,
    moduleCount: moduleCache.size,
    assetCount: assetUrlMap.size,
    outputBytes: (await stat(outputFile)).size,
  };

  console.log(JSON.stringify(summary, null, 2));
}

await main();
