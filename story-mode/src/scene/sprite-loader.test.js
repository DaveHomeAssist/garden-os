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
