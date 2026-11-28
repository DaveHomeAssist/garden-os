import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// A sheet capped at 82vh runs under a phone browser's collapsing URL bar, because
// vh counts the space the bar covers. dvh follows the visible screen. Browsers
// that predate dvh drop the declaration they do not understand, so every vh cap
// must be followed by its dvh twin. jsdom drops dvh too, so these tests read the
// source text. This file runs in the plain Node environment on purpose: under a
// jsdom file, new URL() is jsdom's class and fs.readFileSync rejects it.

const SHEETS = ['shop-panel.js', 'compost-panel.js'];

describe('Story Mode sheets size their height in dvh with a vh fallback', () => {
  for (const file of SHEETS) {
    it(`${file} follows every 82vh cap with an 82dvh cap`, () => {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
      const vhCaps = source.match(/max-height:\s*82vh;/g) ?? [];
      const pairs = source.match(/max-height:\s*82vh;\s*max-height:\s*82dvh;/g) ?? [];
      expect(vhCaps.length, `${file} should keep a vh fallback`).toBeGreaterThan(0);
      expect(pairs.length, `${file} has a vh cap without a dvh line after it`).toBe(vhCaps.length);
    });
  }

  // The backpack sheet sets its height from script rather than in a CSS string.
  it('backpack-panel.js sets the 82vh fallback first and the 82dvh cap right after it', () => {
    const source = readFileSync(new URL('./backpack-panel.js', import.meta.url), 'utf8');
    const vhCaps = source.match(/maxHeight = '82vh';/g) ?? [];
    const pairs = source.match(/maxHeight = '82vh';\s*sheet\.style\.maxHeight = '82dvh';/g) ?? [];
    expect(vhCaps.length, 'backpack-panel.js should keep a vh fallback').toBeGreaterThan(0);
    expect(pairs.length, 'backpack-panel.js has a vh cap without a dvh line after it').toBe(vhCaps.length);
  });
});
