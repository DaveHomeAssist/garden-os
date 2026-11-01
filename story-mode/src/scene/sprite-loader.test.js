import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getSpriteManifestFiles } from './sprite-loader.js';

const texturesDir = fileURLToPath(new URL('../../assets/textures/', import.meta.url));

describe('sprite manifest', () => {
  it('every manifest file exists', () => {
    const present = new Set(readdirSync(texturesDir));
    for (const file of getSpriteManifestFiles()) expect(present.has(file), file).toBe(true);
  });

  it('ships no PNG the loader never fetches (Vite bundles the whole folder)', () => {
    const manifest = new Set(getSpriteManifestFiles());
    const unused = readdirSync(texturesDir).filter((file) => file.endsWith('.png') && !manifest.has(file));
    expect(unused).toEqual([]);
  });
});

describe('on-demand crop sprites (PERF-01)', () => {
  it('fetches nothing up front: loadSprites() with no crops starts no loads', async () => {
    const { loadSprites, getPendingSpriteCount } = await import('./sprite-loader.js');
    await loadSprites();
    expect(getPendingSpriteCount()).toBe(0);
  });

  it('getGrowthTexture is safe before any PNG has loaded (no DOM: returns null, no fetch)', async () => {
    const { getGrowthTexture, getPendingSpriteCount } = await import('./sprite-loader.js');
    expect(getGrowthTexture('lettuce', 2)).toBeNull();
    expect(getPendingSpriteCount()).toBe(0);
  });
});
