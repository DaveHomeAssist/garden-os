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

describe('touch orbit overlay: mouse / pen input on a touch-capable device', () => {
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

  const mouse = (type, x, y, pointerType = 'mouse') => {
    const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
    Object.defineProperty(e, 'pointerType', { value: pointerType });
    Object.defineProperty(e, 'pointerId', { value: 1 });
    return e;
  };

  it('passes mouse clicks, hover and right-click through to the canvas (Nov 23: 2 of 8 bed clicks planted)', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const got = [];
    ['pointerdown', 'pointermove', 'pointerup', 'click', 'contextmenu'].forEach((t) => canvas.addEventListener(t, (e) => got.push([t, e.clientX, e.clientY, e.pointerType])));
    const orbit = vi.fn();
    const controls = createTouchControls(document.body, { onOrbitDelta: orbit });
    const overlay = document.querySelector('.touch-orbit-zone');
    document.elementFromPoint = vi.fn(() => (overlay.style.pointerEvents === 'none' ? canvas : overlay));

    overlay.dispatchEvent(mouse('pointermove', 300, 400));
    overlay.dispatchEvent(mouse('pointerdown', 300, 400));
    overlay.dispatchEvent(mouse('pointerup', 300, 400));
    overlay.dispatchEvent(mouse('click', 300, 400));
    overlay.dispatchEvent(mouse('contextmenu', 310, 410, 'pen'));
    expect(got.map((g) => g[0])).toEqual(['pointermove', 'pointerdown', 'pointerup', 'click', 'contextmenu']);
    expect(got[3]).toEqual(['click', 300, 400, 'mouse']);
    expect(orbit).not.toHaveBeenCalled();
    expect(overlay.style.pointerEvents).toBe('auto');
    controls.dispose();
  });

  it('does not re-dispatch the click a touch tap generates (forwardTap already sent one)', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const clicks = vi.fn();
    canvas.addEventListener('click', clicks);
    const controls = createTouchControls(document.body);
    const overlay = document.querySelector('.touch-orbit-zone');
    document.elementFromPoint = vi.fn(() => (overlay.style.pointerEvents === 'none' ? canvas : overlay));
    overlay.dispatchEvent(touch('pointerdown', 250, 300));
    overlay.dispatchEvent(touch('pointerup', 250, 300));
    overlay.dispatchEvent(touch('click', 250, 300));
    expect(clicks).toHaveBeenCalledTimes(1);
    controls.dispose();
  });
});
