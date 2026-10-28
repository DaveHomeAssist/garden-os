// @vitest-environment jsdom
// Live playtest 2026-10-28: on phones the camera-orbit overlay (right 60%)
// swallowed every tap, so village tap-to-move did nothing there.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTouchControls } from './touch-controls.js';

const touch = (type, x, y, extra = {}) => {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerType', { value: 'touch' });
  Object.defineProperty(e, 'pointerId', { value: 7 });
  Object.entries(extra).forEach(([k, v]) => Object.defineProperty(e, k, { value: v }));
  return e;
};

describe('touch orbit overlay', () => {
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

  it('forwards a short tap to the element underneath, but not an orbit drag', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const got = [];
    ['pointerdown', 'pointerup', 'click'].forEach((t) => canvas.addEventListener(t, (e) => got.push([t, e.clientX, e.clientY])));
    const orbit = vi.fn();
    const controls = createTouchControls(document.body, { onOrbitDelta: orbit });
    const overlay = document.querySelector('.touch-orbit-zone');
    document.elementFromPoint = vi.fn(() => (overlay.style.pointerEvents === 'none' ? canvas : overlay));

    overlay.dispatchEvent(touch('pointerdown', 250, 300));
    overlay.dispatchEvent(touch('pointerup', 252, 301));
    expect(got.map((g) => g[0])).toEqual(['pointerdown', 'pointerup', 'click']);
    expect(got[1].slice(1)).toEqual([252, 301]);
    expect(overlay.style.pointerEvents).toBe('auto');

    got.length = 0;
    overlay.dispatchEvent(touch('pointerdown', 250, 300));
    overlay.dispatchEvent(touch('pointermove', 290, 300));
    overlay.dispatchEvent(touch('pointerup', 290, 300));
    expect(orbit).toHaveBeenCalled();
    expect(got).toEqual([]);
    controls.dispose();
  });
});
