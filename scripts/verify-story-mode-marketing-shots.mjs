#!/usr/bin/env node
import { readFile, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

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

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function analyzePngVisuals(buffer, fileName) {
  const dimensions = readPngDimensions(buffer, fileName);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  assert(bitDepth === 8, `${fileName} uses unsupported PNG bit depth ${bitDepth}.`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  assert(channels, `${fileName} uses unsupported PNG color type ${colorType}.`);

  const idat = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'IDAT') idat.push(buffer.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  assert(idat.length > 0, `${fileName} is missing PNG image data.`);

  const raw = inflateSync(Buffer.concat(idat));
  const rowBytes = dimensions.width * channels;
  assert(raw.length >= (rowBytes + 1) * dimensions.height, `${fileName} has truncated PNG image data.`);
  let previous = Buffer.alloc(rowBytes);
  let cursor = 0;
  let sampled = 0;
  let visible = 0;
  let sum = 0;
  let sumSquares = 0;
  let dark = 0;
  let light = 0;
  const colors = new Set();
  const stride = Math.max(1, Math.floor((dimensions.width * dimensions.height) / 200000));

  for (let y = 0; y < dimensions.height; y += 1) {
    const filter = raw[cursor];
    cursor += 1;
    const encoded = raw.subarray(cursor, cursor + rowBytes);
    cursor += rowBytes;
    const row = Buffer.allocUnsafe(rowBytes);
    for (let x = 0; x < rowBytes; x += 1) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous[x] ?? 0;
      const upLeft = x >= channels ? previous[x - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) predictor = paeth(left, up, upLeft);
      else assert(filter === 0, `${fileName} uses unsupported PNG filter ${filter}.`);
      row[x] = (encoded[x] + predictor) & 255;
    }

    for (let x = 0; x < dimensions.width; x += stride) {
      const i = x * channels;
      let red;
      let green;
      let blue;
      let alpha = 255;
      if (colorType === 0 || colorType === 4) {
        red = green = blue = row[i];
        if (colorType === 4) alpha = row[i + 1];
      } else {
        red = row[i];
        green = row[i + 1];
        blue = row[i + 2];
        if (colorType === 6) alpha = row[i + 3];
      }
      sampled += 1;
      if (alpha < 16) continue;
      visible += 1;
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      sum += luminance;
      sumSquares += luminance * luminance;
      if (luminance < 12) dark += 1;
      if (luminance > 243) light += 1;
      colors.add(((red >> 5) << 6) | ((green >> 5) << 3) | (blue >> 5));
    }
    previous = row;
  }

  const meanLuminance = visible ? sum / visible : 0;
  const variance = visible ? Math.max(0, (sumSquares / visible) - (meanLuminance * meanLuminance)) : 0;
  return {
    ...dimensions,
    sampledPixels: sampled,
    visiblePixelRatio: sampled ? visible / sampled : 0,
    meanLuminance,
    luminanceStdDev: Math.sqrt(variance),
    darkPixelRatio: visible ? dark / visible : 1,
    lightPixelRatio: visible ? light / visible : 1,
    quantizedColorCount: colors.size,
  };
}

function assertSubstantiveVisual(metrics, fileName) {
  assert(metrics.visiblePixelRatio >= 0.9, `${fileName} is mostly transparent.`);
  assert(metrics.luminanceStdDev >= 12, `${fileName} is visually blank (luminance variation ${metrics.luminanceStdDev.toFixed(1)}).`);
  assert(metrics.darkPixelRatio < 0.985, `${fileName} is an almost entirely black frame.`);
  assert(metrics.lightPixelRatio < 0.985, `${fileName} is an almost entirely white frame.`);
  assert(metrics.quantizedColorCount >= 16, `${fileName} has too little visual content (${metrics.quantizedColorCount} color buckets).`);
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
    const visual = analyzePngVisuals(buffer, shot.file);
    const maxBytes = shot.maxBytes ?? defaultMaxBytes;

    assert(dimensions.width >= shot.minWidth, `${shot.file} width ${dimensions.width} is below ${shot.minWidth}.`);
    assert(dimensions.height >= shot.minHeight, `${shot.file} height ${dimensions.height} is below ${shot.minHeight}.`);
    assert(fileStat.size <= maxBytes, `${shot.file} size ${fileStat.size} exceeds budget ${maxBytes}.`);
    assertSubstantiveVisual(visual, shot.file);

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
      visual: {
        visiblePixelRatio: Number(visual.visiblePixelRatio.toFixed(4)),
        meanLuminance: Number(visual.meanLuminance.toFixed(2)),
        luminanceStdDev: Number(visual.luminanceStdDev.toFixed(2)),
        darkPixelRatio: Number(visual.darkPixelRatio.toFixed(4)),
        lightPixelRatio: Number(visual.lightPixelRatio.toFixed(4)),
        quantizedColorCount: visual.quantizedColorCount,
      },
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
