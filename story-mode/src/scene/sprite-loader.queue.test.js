// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Fake TextureLoader: every load waits until the test releases it.
const held = [];
vi.mock('three', async (importOriginal) => {
  const THREE = await importOriginal();
  class FakeTextureLoader {
    load(url, onLoad) { held.push(() => onLoad(new THREE.Texture())); }
  }
  return { ...THREE, TextureLoader: FakeTextureLoader };
});

const loader = await import('./sprite-loader.js');
const THREE = await import('three');
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('sprite loader constraints (shared cache, bounded fetches, teardown)', () => {
  beforeEach(() => { loader.disposeSprites(); held.length = 0; });

  it('never runs more than MAX_CONCURRENT_SPRITE_LOADS fetches at once', async () => {
    const crops = ['carrot', 'onion', 'peas', 'bush_beans', 'cherry_tom', 'beet', 'kale', 'dill'];
    crops.forEach((id) => loader.getGrowthTexture(id, 2));
    expect(loader.getPendingSpriteCount()).toBe(crops.length);
    expect(held.length).toBe(loader.MAX_CONCURRENT_SPRITE_LOADS);
    expect(loader.getActiveSpriteLoadCount()).toBe(loader.MAX_CONCURRENT_SPRITE_LOADS);
    while (held.length) { held.shift()(); await flush(); expect(loader.getActiveSpriteLoadCount()).toBeLessThanOrEqual(loader.MAX_CONCURRENT_SPRITE_LOADS); }
    await loader.whenSpritesSettled();
    expect(loader.getPendingSpriteCount()).toBe(0);
  });

  it('creates each texture once, sRGB, and returns the cached instance', async () => {
    loader.getCropIcon('carrot');
    loader.getCropIcon('carrot');
    expect(held.length).toBe(1);
    held.shift()(); await loader.whenSpritesSettled();
    const a = loader.getCropIcon('carrot');
    expect(a).toBe(loader.getCropIcon('carrot'));
    expect(a.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it('a load that lands after disposeSprites() is dropped and disposed', async () => {
    loader.getCropIcon('onion');
    const release = held.shift();
    loader.disposeSprites();
    const dispose = vi.spyOn(THREE.Texture.prototype, 'dispose');
    release(); await flush();
    expect(loader.getTexture('crop-onion')).toBeNull();
    expect(dispose).toHaveBeenCalled();
    dispose.mockRestore();
  });
});
