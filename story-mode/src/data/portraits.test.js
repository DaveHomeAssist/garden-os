import { describe, expect, it } from 'vitest';
import { resolvePortraitLayers } from './portraits.js';

describe('Calvin portrait path', () => {
  it('resolves under the story-mode asset base instead of the site root', () => {
    const layers = resolvePortraitLayers('calvin', 'neutral');
    expect(layers?.base).toBeTruthy();
    expect(layers.base).toMatch(/portrait-calvin\.svg(?:\?.*)?$/);
    expect(layers.base).toMatch(/\/assets\/textures\/portrait-calvin\.svg/);
    // Must not be a bare relative path that resolves to the github.io root.
    expect(layers.base.startsWith('../../')).toBe(false);
  });
});
