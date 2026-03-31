import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const PROJECT_ROOT = resolve(__dirname, '..');
const DIST_DIR = resolve(PROJECT_ROOT, 'dist');
const DIST_BUILD_META_PATH = resolve(DIST_DIR, 'build-meta.json');
const SOURCE_INPUTS = [
  'src',
  'assets',
  'index.html',
  'package.json',
  'vite.config.js',
];

function toIso(timestampMs) {
  return Number.isFinite(timestampMs) && timestampMs > 0
    ? new Date(timestampMs).toISOString()
    : null;
}

async function getPathLatestMtimeMs(targetPath) {
  try {
    const entry = await stat(targetPath);
    if (entry.isFile()) {
      return entry.mtimeMs;
    }
    if (entry.isDirectory()) {
      let latest = entry.mtimeMs;
      const children = await readdir(targetPath, { withFileTypes: true });
      for (const child of children) {
        latest = Math.max(latest, await getPathLatestMtimeMs(join(targetPath, child.name)));
      }
      return latest;
    }
    return 0;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return 0;
    }
    throw error;
  }
}

async function readPackageVersion(projectRoot = PROJECT_ROOT) {
  try {
    const raw = await readFile(resolve(projectRoot, 'package.json'), 'utf-8');
    return JSON.parse(raw).version ?? null;
  } catch {
    return null;
  }
}

export async function getLatestSourceMtimeMs(projectRoot = PROJECT_ROOT) {
  let latest = 0;
  for (const relativePath of SOURCE_INPUTS) {
    latest = Math.max(latest, await getPathLatestMtimeMs(resolve(projectRoot, relativePath)));
  }
  return latest;
}

export async function createBuildMeta(projectRoot = PROJECT_ROOT) {
  const builtAtMs = Date.now();
  const sourceLatestMtimeMs = await getLatestSourceMtimeMs(projectRoot);
  return {
    version: await readPackageVersion(projectRoot),
    builtAt: toIso(builtAtMs),
    builtAtMs,
    sourceLatestMtime: toIso(sourceLatestMtimeMs),
    sourceLatestMtimeMs,
    sourceInputs: [...SOURCE_INPUTS],
  };
}

export async function writeBuildMeta(projectRoot = PROJECT_ROOT) {
  const meta = await createBuildMeta(projectRoot);
  await mkdir(resolve(projectRoot, 'dist'), { recursive: true });
  await writeFile(resolve(projectRoot, 'dist', 'build-meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');
  return meta;
}

export async function readBuildMeta(projectRoot = PROJECT_ROOT) {
  try {
    const raw = await readFile(resolve(projectRoot, 'dist', 'build-meta.json'), 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export function getBuildStatus(meta, latestSourceMtimeMs = meta?.sourceLatestMtimeMs ?? 0) {
  if (!meta?.builtAtMs) {
    return {
      state: 'missing',
      stale: true,
      label: 'Build metadata missing',
      builtAt: null,
      builtAtMs: 0,
      latestSourceMtime: toIso(latestSourceMtimeMs),
      latestSourceMtimeMs,
    };
  }

  const builtAtMs = Number(meta.builtAtMs) || 0;
  const stale = latestSourceMtimeMs > builtAtMs + 1000;
  return {
    state: stale ? 'stale' : 'fresh',
    stale,
    label: stale
      ? `Source changed after dist build (${toIso(latestSourceMtimeMs) ?? 'unknown source time'})`
      : `Dist built ${meta.builtAt ?? toIso(builtAtMs)}`,
    builtAt: meta.builtAt ?? toIso(builtAtMs),
    builtAtMs,
    latestSourceMtime: toIso(latestSourceMtimeMs),
    latestSourceMtimeMs,
  };
}

export async function getBuildStatusSnapshot(projectRoot = PROJECT_ROOT) {
  const [meta, latestSourceMtimeMs] = await Promise.all([
    readBuildMeta(projectRoot),
    getLatestSourceMtimeMs(projectRoot),
  ]);
  return {
    meta,
    ...getBuildStatus(meta, latestSourceMtimeMs),
  };
}

export {
  DIST_BUILD_META_PATH,
  DIST_DIR,
  PROJECT_ROOT,
  SOURCE_INPUTS,
};
