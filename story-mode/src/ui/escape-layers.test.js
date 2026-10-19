// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InputManager } from '../input/input-manager.js';
import { topEscapeLayer } from './escape-layers.js';

const here = dirname(fileURLToPath(import.meta.url));
const binderSrc = readFileSync(join(here, 'ui-binder.js'), 'utf8');

describe('topEscapeLayer', () => {
  it('returns nothing when no sheet is open, so Esc reaches pause', () => {
    expect(topEscapeLayer()).toBeNull();
    expect(topEscapeLayer({})).toBeNull();
  });

  it('names the open sheet', () => {
    expect(topEscapeLayer({ cropPaletteOpen: true })).toBe('crop-palette');
    expect(topEscapeLayer({ backpackOpen: true })).toBe('backpack');
    expect(topEscapeLayer({ worldMapOpen: true })).toBe('world-map');
  });

  it('picks the crop picker first if several flags are set', () => {
    expect(topEscapeLayer({ cropPaletteOpen: true, backpackOpen: true, worldMapOpen: true })).toBe('crop-palette');
    expect(topEscapeLayer({ backpackOpen: true, worldMapOpen: true })).toBe('backpack');
  });

  it('leaves Esc to pause (resume) and cutscenes (skip)', () => {
    expect(topEscapeLayer({ pauseOpen: true, cropPaletteOpen: true })).toBeNull();
    expect(topEscapeLayer({ cutsceneActive: true, cropPaletteOpen: true })).toBeNull();
  });
});

describe('one Esc closes only the top-most layer', () => {
  let keyboardTarget;
  let input;
  beforeEach(() => {
    keyboardTarget = new EventTarget();
    const pointerTarget = new EventTarget();
    pointerTarget.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
    input = new InputManager(pointerTarget, { keyboardTarget, pointerTarget });
    // Same bindings and order as ui-binder.js.
    input.registerAction('cancel', { keys: ['Escape'] });
    input.registerAction('pause', { keys: ['Escape'] });
  });
  afterEach(() => input.dispose());

  function wire(ui) {
    const closePalette = vi.fn(() => { ui.cropPaletteOpen = false; });
    const togglePause = vi.fn(() => { ui.pauseOpen = !ui.pauseOpen; ui.cropPaletteOpen = false; });
    input.on('cancel', (payload) => {
      const layer = topEscapeLayer(ui);
      if (!layer) return;
      payload.preventDefault();
      if (layer === 'crop-palette') closePalette();
    });
    input.on('pause', (payload) => { payload.preventDefault(); togglePause(); });
    return { closePalette, togglePause };
  }
  const esc = () => keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

  it('first Esc closes the crop picker without pausing; the second Esc pauses', () => {
    const ui = { cropPaletteOpen: true, pauseOpen: false };
    const { closePalette, togglePause } = wire(ui);
    esc();
    expect(closePalette).toHaveBeenCalledTimes(1);
    expect(togglePause).not.toHaveBeenCalled();
    expect(ui).toMatchObject({ cropPaletteOpen: false, pauseOpen: false });
    esc();
    expect(togglePause).toHaveBeenCalledTimes(1);
    expect(ui.pauseOpen).toBe(true);
  });

  it('ui-binder routes the cancel action through topEscapeLayer for all three sheets', () => {
    const handler = binderSrc.slice(binderSrc.indexOf("inputManager.on('cancel'"), binderSrc.indexOf("inputManager.on('pause'"));
    expect(handler).toMatch(/topEscapeLayer\(/);
    expect(handler).toMatch(/closePalette\(\)/);
    expect(handler).toMatch(/closeBackpackPanel\(\)/);
    expect(handler).toMatch(/closeWorldMap\(\)/);
    // cancel must be registered before pause so it sees Escape first.
    expect(binderSrc.indexOf("registerAction('cancel'")).toBeLessThan(binderSrc.indexOf("registerAction('pause'"));
  });
});
