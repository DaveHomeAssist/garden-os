import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('gardener glb', () => {
  it('is meshopt-compressed, one material, and skinned', () => {
    const buf = readFileSync(resolve(root, 'assets/art/gardener/gardener.glb'));
    expect(buf.subarray(0, 4).toString('utf8')).toBe('glTF');
    const jsonLen = buf.readUInt32LE(12);
    const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
    expect(json.extensionsRequired).toContain('EXT_meshopt_compression');
    expect(json.materials).toHaveLength(1);
    expect(json.skins).toHaveLength(1);
    expect(json.images?.length).toBe(1);
    const atlas = readFileSync(resolve(root, 'assets/art/gardener/gardener-atlas.png'));
    expect(atlas.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });
});
