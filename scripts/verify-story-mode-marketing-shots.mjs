#!/usr/bin/env node
import { readFile, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const manifestPath = resolve(repoRoot, process.env.GOS_MARKETING_SHOT_MANIFEST || 'docs/story-mode-marketing-shots.json');
const screenshotDirArg = process.argv[2] || process.env.GOS_SCREENSHOT_OUTPUT_DIR;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isInside(rootDir, candidate) {
  const rel = relative(rootDir, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function readPngDimensions(buffer, fileName) {
  const signature = buffer.subarray(0, 8).toString('hex');
  assert(signature === '89504e470d0a1a0a', `${fileName} is not a PNG file.`);
  assert(buffer.subarray(12, 16).toString('ascii') === 'IHDR', `${fileName} is missing a PNG IHDR chunk.`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function uniqueValues(values) {
  return new Set(values).size === values.length;
}

if (!screenshotDirArg) {
  console.error('Usage: node scripts/verify-story-mode-marketing-shots.mjs <screenshot-output-dir>');
  process.exit(2);
}

const screenshotDir = resolve(screenshotDirArg);

try {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert(Array.isArray(manifest.shots), 'Marketing shot manifest must include a shots array.');
  assert(manifest.shots.length > 0, 'Marketing shot manifest has no shots.');
  assert(uniqueValues(manifest.shots.map((shot) => shot.id)), 'Marketing shot ids must be unique.');
  assert(uniqueValues(manifest.shots.map((shot) => shot.file)), 'Marketing shot files must be unique.');

  const storeShots = manifest.shots.filter((shot) => Number.isInteger(shot.storeSlot));
  assert(storeShots.length === manifest.storeShotCount, `Expected ${manifest.storeShotCount} store shots, got ${storeShots.length}.`);
  assert(uniqueValues(storeShots.map((shot) => shot.storeSlot)), 'Store shot slots must be unique.');
  assert(
    storeShots.every((shot) => shot.storeSlot >= 1 && shot.storeSlot <= manifest.storeShotCount),
    'Store shot slots must be contiguous within the declared store shot count.',
  );

  const defaultMaxBytes = manifest.budgets?.defaultMaxBytes ?? 4000000;
  const totalMaxBytes = manifest.budgets?.totalMaxBytes ?? 30000000;
  const records = [];
  let totalBytes = 0;

  for (const shot of manifest.shots) {
    assert(shot.id && typeof shot.id === 'string', 'Each marketing shot needs an id.');
    assert(shot.file && typeof shot.file === 'string', `Marketing shot ${shot.id} needs a file.`);
    assert(shot.caption && typeof shot.caption === 'string', `Marketing shot ${shot.id} needs a caption.`);
    assert(shot.trailerBeat && typeof shot.trailerBeat === 'string', `Marketing shot ${shot.id} needs a trailerBeat.`);
    assert(shot.mustReadAs && typeof shot.mustReadAs === 'string', `Marketing shot ${shot.id} needs mustReadAs.`);

    const filePath = resolve(screenshotDir, shot.file);
    assert(isInside(screenshotDir, filePath), `Marketing shot ${shot.file} resolves outside the screenshot directory.`);
    const buffer = await readFile(filePath);
    const fileStat = await stat(filePath);
    const dimensions = readPngDimensions(buffer, shot.file);
    const maxBytes = shot.maxBytes ?? defaultMaxBytes;

    assert(dimensions.width >= shot.minWidth, `${shot.file} width ${dimensions.width} is below ${shot.minWidth}.`);
    assert(dimensions.height >= shot.minHeight, `${shot.file} height ${dimensions.height} is below ${shot.minHeight}.`);
    assert(fileStat.size <= maxBytes, `${shot.file} size ${fileStat.size} exceeds budget ${maxBytes}.`);

    totalBytes += fileStat.size;
    records.push({
      id: shot.id,
      file: shot.file,
      caption: shot.caption,
      storeSlot: shot.storeSlot ?? null,
      trailerBeat: shot.trailerBeat,
      viewport: shot.viewport ?? null,
      mustReadAs: shot.mustReadAs,
      width: dimensions.width,
      height: dimensions.height,
      bytes: fileStat.size,
      maxBytes,
    });
  }

  assert(totalBytes <= totalMaxBytes, `Marketing screenshot set size ${totalBytes} exceeds total budget ${totalMaxBytes}.`);

  const report = {
    ok: true,
    manifest: relative(repoRoot, manifestPath),
    screenshotDir,
    generatedAt: new Date().toISOString(),
    storeShotCount: storeShots.length,
    totalBytes,
    totalMaxBytes,
    shots: records,
  };

  const reportPath = join(screenshotDir, 'story-mode-marketing-shots.manifest.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
} catch (error) {
  console.error(`Marketing shot verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
