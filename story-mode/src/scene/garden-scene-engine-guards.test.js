// Bug pass 2026-11-25 (Scaler engine items): picking must not cast NaN rays
// from a 0x0 canvas, and a lost WebGL context must stay recoverable.
import { describe, it, expect, vi } from 'vitest';
import { clientToNdc, attachContextLossRecovery } from './garden-scene.js';

describe('clientToNdc', () => {
  it('maps client px to NDC for a laid-out canvas', () => {
    const out = { x: 9, y: 9 };
    expect(clientToNdc(150, 50, { left: 100, top: 0, width: 100, height: 100 }, out)).toBe(true);
    expect(out.x).toBeCloseTo(0);
    expect(out.y).toBeCloseTo(0);
  });

  it('reports a miss (and leaves the pointer untouched) for a 0x0 or missing rect', () => {
    const out = { x: 0.25, y: -0.5 };
    expect(clientToNdc(10, 10, { left: 0, top: 0, width: 0, height: 0 }, out)).toBe(false);
    expect(clientToNdc(10, 10, { left: 0, top: 0, width: 100, height: 0 }, out)).toBe(false);
    expect(clientToNdc(10, 10, null, out)).toBe(false);
    expect(clientToNdc(Number.NaN, 10, { left: 0, top: 0, width: 100, height: 100 }, out)).toBe(false);
    expect(out).toEqual({ x: 0.25, y: -0.5 });
  });
});

function fakeCanvas() {
  const listeners = new Map();
  return {
    addEventListener: vi.fn((type, fn) => listeners.set(type, fn)),
    removeEventListener: vi.fn((type, fn) => { if (listeners.get(type) === fn) listeners.delete(type); }),
    fire(type, event = {}) { listeners.get(type)?.(event); },
    has(type) { return listeners.has(type); },
  };
}

describe('attachContextLossRecovery', () => {
  it('prevents the default on loss and refreshes shadows + size on restore', () => {
    const canvas = fakeCanvas();
    const renderer = { domElement: canvas, shadowMap: { needsUpdate: false } };
    const onRestore = vi.fn();
    const onChange = vi.fn();
    const recovery = attachContextLossRecovery(renderer, { onRestore, onChange });

    const lostEvent = { preventDefault: vi.fn() };
    canvas.fire('webglcontextlost', lostEvent);
    expect(lostEvent.preventDefault).toHaveBeenCalled();
    expect(recovery.isLost()).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(true);

    canvas.fire('webglcontextrestored');
    expect(recovery.isLost()).toBe(false);
    expect(renderer.shadowMap.needsUpdate).toBe(true);
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('a throwing restore hook still clears the lost flag', () => {
    const canvas = fakeCanvas();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const recovery = attachContextLossRecovery({ domElement: canvas }, { onRestore: () => { throw new Error('boom'); } });
    canvas.fire('webglcontextlost', { preventDefault() {} });
    canvas.fire('webglcontextrestored');
    expect(recovery.isLost()).toBe(false);
    warn.mockRestore();
  });

  it('dispose() detaches both listeners so teardown forceContextLoss is not handled', () => {
    const canvas = fakeCanvas();
    const recovery = attachContextLossRecovery({ domElement: canvas });
    recovery.dispose();
    expect(canvas.has('webglcontextlost')).toBe(false);
    expect(canvas.has('webglcontextrestored')).toBe(false);
  });

  it('is inert without a canvas', () => {
    const recovery = attachContextLossRecovery(null);
    expect(recovery.isLost()).toBe(false);
    expect(() => recovery.dispose()).not.toThrow();
  });
});
