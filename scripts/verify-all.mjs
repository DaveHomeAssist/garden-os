#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const storyModeDir = join(repoRoot, 'story-mode');
const nodeBin = process.execPath;
const playwrightImportPath = join(storyModeDir, 'node_modules', 'playwright', 'index.mjs');
const args = process.argv.slice(2);

const liveOnly = args.includes('--live-only');
const includeLive = liveOnly || args.includes('--include-live');
const liveUrl = readOption('--live-url') || process.env.LIVE_URL || 'https://davehomeassist.github.io/garden-os/story-mode/';

if (args.includes('--help')) {
  console.log(`Usage:
  node scripts/verify-all.mjs
  node scripts/verify-all.mjs --include-live
  node scripts/verify-all.mjs --live-only --live-url https://davehomeassist.github.io/garden-os/story-mode/`);
  process.exit(0);
}

function readOption(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function runStep(name, command, commandArgs, options = {}) {
  console.log(`\n==> ${name}`);
  return new Promise((resolveStep, rejectStep) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd || repoRoot,
      env: options.env || process.env,
      shell: false,
      stdio: 'inherit',
    });

    child.on('error', rejectStep);
    child.on('close', (code) => {
      if (code === 0) {
        resolveStep();
        return;
      }
      rejectStep(new Error(`${name} failed with exit code ${code}`));
    });
  });
}

async function requirePlaywright() {
  try {
    await access(playwrightImportPath);
  } catch {
    throw new Error('Playwright is missing. Run `cd story-mode && npm ci` before `node scripts/verify-all.mjs`.');
  }
}

function browserEnv(extra = {}) {
  return {
    ...process.env,
    PLAYWRIGHT_IMPORT_PATH: playwrightImportPath,
    ...extra,
  };
}

function contentType(filePath) {
  const byExt = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
  };
  return byExt[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function isInside(rootDir, candidate) {
  const rel = relative(rootDir, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

async function resolveStaticPath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const candidate = resolve(repoRoot, `.${decodedPath}`);
  if (!isInside(repoRoot, candidate)) return null;

  let filePath = candidate;
  let fileStat = await stat(filePath).catch(() => null);
  if (fileStat?.isDirectory()) {
    filePath = join(filePath, 'index.html');
    fileStat = await stat(filePath).catch(() => null);
  }
  return fileStat?.isFile() ? filePath : null;
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      if (requestUrl.pathname === '/favicon.ico') {
        response.writeHead(204);
        response.end();
        return;
      }
      const filePath = await resolveStaticPath(requestUrl.pathname);
      if (!filePath) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }

      response.writeHead(200, { 'content-type': contentType(filePath) });
      createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise((resolveServer, rejectServer) => {
    server.once('error', rejectServer);
    server.listen(0, '127.0.0.1', () => resolveServer());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Static server did not expose a TCP address.');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`\n==> Static fixture server: ${baseUrl}`);
  return { baseUrl, server };
}

async function runLocalVerification() {
  await runStep('Story Mode Vitest suite', 'npm', ['test'], { cwd: storyModeDir });
  await runStep('Open world phases smoke', nodeBin, ['docs/open-world-phases-smoke.mjs']);
  await runStep('Story Mode production build', 'npm', ['run', 'build'], { cwd: storyModeDir });
  await runStep('Story Mode screenshot regression', nodeBin, ['tests/story-mode-screenshot-regression.mjs'], {
    env: browserEnv(),
  });

  const nodeRegressionScripts = [
    ['V5 nav copy regression', ['tests/v5-nav-copy-regression.mjs']],
    ['Mobile details sheet regression', ['tests/mobile-details-sheet-regression.mjs']],
    ['Mom garden data regression', ['tests/mom-garden-data-regression.mjs']],
    ['Journal filter sort regression', ['tests/journal-filter-sort-regression.mjs']],
    ['Authority cache IndexedDB tests', ['test', '--', 'src/engine/authority-cache.test.js'], { cwd: storyModeDir }],
    ['Fixed-step simulation worker tests', ['test', '--', 'src/engine/simulation-core.test.js', 'src/engine/simulation-worker.test.js'], { cwd: storyModeDir }],
    ['Sync client worker URL tests', ['--test', 'tests/sync-client-worker-url.test.mjs']],
    ['Sync worker security tests', ['--test', 'tests/sync-worker-security.test.mjs']],
    ['Authority worker security tests', ['--test', 'tests/authority-worker.test.mjs']],
    ['Vercel authority API import tests', ['--test', 'tests/vercel-authority-api-import.test.mjs']],
  ];

  for (const [name, scriptArgs, options] of nodeRegressionScripts) {
    await runStep(name, options?.cwd ? 'npm' : nodeBin, scriptArgs, options);
  }

  await requirePlaywright();
  const suppliedBaseUrl = process.env.GOS_VERIFY_BASE_URL;
  const staticServer = suppliedBaseUrl
    ? { baseUrl: new URL(suppliedBaseUrl).href.replace(/\/$/, ''), server: null }
    : await startStaticServer();
  const { baseUrl, server } = staticServer;
  const outputDir = process.env.GOS_VERIFY_OUTPUT_DIR || join(tmpdir(), `garden-os-verify-${Date.now()}`);

  try {
    await runStep('Planner reset browser regression', nodeBin, ['tests/planner-reset-regression.mjs'], {
      env: browserEnv({ PLANNER_URL: `${baseUrl}/garden-planner-v4.html` }),
    });
    await runStep('Browser HTML fixture tests', nodeBin, ['tests/browser-fixture-pages.mjs'], {
      env: browserEnv({ BASE_URL: baseUrl }),
    });
    await runStep('Planner reasoning browser smoke', nodeBin, ['docs/phase-reasoning-smoke.mjs'], {
      env: browserEnv({
        BASE_URL: baseUrl,
        OUTPUT_DIR: join(outputDir, 'phase-reasoning'),
      }),
    });
  } finally {
    if (server) {
      await new Promise((resolveClose) => server.close(resolveClose));
    }
  }
}

async function runLiveVerification() {
  await requirePlaywright();
  await runStep('Live Story Mode browser smoke', nodeBin, ['tests/live-story-mode-smoke.mjs'], {
    env: browserEnv({ LIVE_URL: liveUrl }),
  });
}

try {
  if (!liveOnly) {
    await runLocalVerification();
  }
  if (includeLive) {
    await runLiveVerification();
  }
  console.log('\nAll requested Garden OS verification gates passed.');
} catch (error) {
  console.error(`\nVerification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
