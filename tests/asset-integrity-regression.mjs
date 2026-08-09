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

const guide = await readFile(resolve(repoRoot, 'garden-cage-build-guide.html'), 'utf8');
assert.match(guide, /images\/sheet1-cover\.png/, 'Build guide must reference its cover asset');

const coverPath = resolve(repoRoot, 'images/sheet1-cover.png');
const cover = await readFile(coverPath);
const coverSize = pngDimensions(cover, 'sheet1-cover.png');
assert.ok(coverSize.width >= 800 && coverSize.height >= 800, 'Build guide cover must be at least 800 by 800');
assert.ok((await stat(coverPath)).size <= 2500000, 'Build guide cover must stay under 2.5 MB');

const textureBudgets = {
  'bed-cell.png': { maxBytes: 650000, maxDimension: 512 },
  'bed-empty.png': { maxBytes: 1200000, maxDimension: 1024 },
  'bed-grid.png': { maxBytes: 1200000, maxDimension: 1024 },
  'env-grass.png': { maxBytes: 800000, maxDimension: 512 },
  'env-path.png': { maxBytes: 700000, maxDimension: 512 },
};

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
assert.ok(textureTotal <= 4000000, `Priority Story textures exceed 4 MB total (${textureTotal})`);

console.log(JSON.stringify({
  ok: true,
  cover: coverSize,
  optimizedTextureBytes: textureTotal,
  optimizedTextureCount: Object.keys(textureBudgets).length,
}, null, 2));
