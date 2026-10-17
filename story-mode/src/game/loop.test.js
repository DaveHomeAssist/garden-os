import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLoop } from './loop.js';

// Drive requestAnimationFrame by hand so frame timing is exact.
let now = 0;
let queue = [];

beforeEach(() => {
  now = 0;
  queue = [];
  vi.stubGlobal('performance', { now: () => now });
  vi.stubGlobal('requestAnimationFrame', (cb) => { queue.push(cb); return queue.length; });
  vi.stubGlobal('cancelAnimationFrame', () => { queue = []; });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function advance(frames, stepMs = 1000 / 60) {
  for (let i = 0; i < frames; i += 1) {
    now += stepMs;
    const pending = queue;
    queue = [];
    pending.forEach((cb) => cb(now));
  }
}

function makeLoop(extra = {}) {
  const calls = { update: 0, render: 0, sync: 0, dts: [] };
  const loop = createLoop({
    scene: {
      setFrameDelta: (dt) => calls.dts.push(dt),
      sync: () => { calls.sync += 1; },
      render: () => {},
    },
    getState: () => ({}),
    update: () => { calls.update += 1; },
    render: () => { calls.render += 1; },
    ...extra,
  });
  return { loop, calls };
}

describe('render loop work avoidance', () => {
  it('renders every frame by default', () => {
    const { loop, calls } = makeLoop();
    loop.start();
    advance(60);
    expect(calls.render).toBe(60);
  });

  it('schedules nothing while held, and resumes on release', () => {
    const { loop, calls } = makeLoop();
    loop.start();
    advance(10);
    loop.hold('hidden');
    advance(1); // the frame already queued drains without rendering
    const before = calls.render;
    advance(120);
    expect(calls.render).toBe(before);
    expect(queue.length).toBe(0);
    loop.release('hidden');
    advance(10);
    expect(calls.render).toBe(before + 10);
    // First frame after release must not carry the whole held time as dt.
    expect(calls.dts.at(-10)).toBeLessThanOrEqual(0.05);
  });

  it('stays held until every reason is released', () => {
    const { loop, calls } = makeLoop();
    loop.start();
    loop.hold('hidden');
    loop.hold('pause-menu');
    advance(5);
    loop.release('hidden');
    advance(5);
    expect(calls.render).toBe(0);
    loop.release('pause-menu');
    advance(5);
    expect(calls.render).toBe(5);
  });

  it('draws exactly one on-demand frame per requestRender while held, without update()', () => {
    const { loop, calls } = makeLoop();
    loop.start();
    loop.hold('pause-menu');
    advance(3);
    loop.requestRender();
    loop.requestRender();
    advance(30);
    expect(calls.render).toBe(1);
    expect(calls.update).toBe(0);
  });

  it('caps the frame rate while idle and passes the real elapsed dt', () => {
    let idle = true;
    const { loop, calls } = makeLoop({ getMinFrameIntervalMs: () => (idle ? 50 : 0) });
    loop.start();
    advance(60); // one second at 60 Hz
    expect(calls.render).toBeGreaterThanOrEqual(19);
    expect(calls.render).toBeLessThanOrEqual(21);
    expect(calls.dts.at(-1)).toBeCloseTo(0.05, 2);
    idle = false;
    const before = calls.render;
    advance(60);
    expect(calls.render - before).toBeGreaterThanOrEqual(59);
  });

  it('manual tick still works while held (window.advanceTime / smoke tests)', () => {
    const { loop, calls } = makeLoop();
    loop.hold('hidden');
    loop.tick(1 / 60);
    expect(calls.render).toBe(1);
    expect(calls.update).toBe(1);
  });
});
