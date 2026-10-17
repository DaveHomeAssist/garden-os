#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));

function pngDimensions(buffer, name) {
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${name} must be a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function assertRgbaPng(buffer, name) {
  assert.equal(buffer[25], 6, `${name} must use RGBA color so crop billboards stay transparent`);
}

const guide = await readFile(resolve(repoRoot, 'garden-cage-build-guide.html'), 'utf8');
assert.match(guide, /images\/sheet1-cover\.png/, 'Build guide must reference its cover asset');

const coverPath = resolve(repoRoot, 'images/sheet1-cover.png');
const cover = await readFile(coverPath);
const coverSize = pngDimensions(cover, 'sheet1-cover.png');
assert.ok(coverSize.width >= 800 && coverSize.height >= 800, 'Build guide cover must be at least 800 by 800');
assert.ok((await stat(coverPath)).size <= 2500000, 'Build guide cover must stay under 2.5 MB');

// Unused PNGs were removed from the Story Mode bundle (sprint item 4). Keep
// them out: the loader's dynamic `new URL(...)` path makes Vite ship every
// file in assets/textures/, used or not.
const removedTextures = [
  'bed-cell.png', 'bed-empty.png', 'bed-grid.png', 'crop-sheet.png', 'env-grass.png', 'env-path.png',
  'env-spigot.png', 'grow-master.png', 'ui-badges.png', 'ui-month-card.png', 'ui-nav-pills.png',
];
for (const name of removedTextures) {
  await assert.rejects(stat(resolve(repoRoot, 'story-mode/assets/textures', name)), `${name} was trimmed as unused; do not re-add it without a runtime consumer`);
}

const textureBudgets = Object.fromEntries(
  ['lettuce', 'spinach', 'arugula', 'radish', 'basil', 'marigold'].map((id) => [`grow-${id}.png`, { maxBytes: 200000, maxDimension: 1024 }]),
);

let textureTotal = 0;
for (const [name, budget] of Object.entries(textureBudgets)) {
  const texturePath = resolve(repoRoot, 'story-mode/assets/textures', name);
  const buffer = await readFile(texturePath);
  const dimensions = pngDimensions(buffer, name);
  const bytes = (await stat(texturePath)).size;
  textureTotal += bytes;
  assert.ok(bytes <= budget.maxBytes, `${name} exceeds ${budget.maxBytes} bytes`);
  assert.ok(Math.max(dimensions.width, dimensions.height) <= budget.maxDimension, `${name} exceeds ${budget.maxDimension}px`);
}
assert.ok(textureTotal <= 1000000, `Growth sheets exceed 1 MB total (${textureTotal})`);

const priorityCropTextures = [
  'crop-cherry_tom.png',
  'crop-carrot.png',
  'crop-onion.png',
  'crop-bush_beans.png',
  'crop-peas.png',
];
let priorityCropTextureBytes = 0;
for (const name of priorityCropTextures) {
  const texturePath = resolve(repoRoot, 'story-mode/assets/textures', name);
  const buffer = await readFile(texturePath);
  const dimensions = pngDimensions(buffer, name);
  assert.deepEqual(dimensions, { width: 256, height: 256 }, `${name} must be 256 by 256`);
  assertRgbaPng(buffer, name);
  priorityCropTextureBytes += (await stat(texturePath)).size;
}
assert.ok(priorityCropTextureBytes <= 1500000, `Priority crop textures exceed 1.5 MB total (${priorityCropTextureBytes})`);

console.log(JSON.stringify({
  ok: true,
  cover: coverSize,
  optimizedTextureBytes: textureTotal,
  optimizedTextureCount: Object.keys(textureBudgets).length,
  priorityCropTextureBytes,
  priorityCropTextureCount: priorityCropTextures.length,
}, null, 2));
