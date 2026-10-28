import { describe, expect, it, vi } from 'vitest';
import { createFollowRig, dampFactor, followOffset, segmentHitsOrientedBox } from './follow-camera.js';
import { createTriggerTracker } from './village-triggers.js';

describe('follow camera', () => {
  it('damps independently of frame rate', () => {
    const run = (fps, seconds) => {
      const rig = createFollowRig();
      rig.snap({ x: 0, z: 0 });
      for (let i = 0; i < fps * seconds; i += 1) rig.update({ x: 10, z: -4 }, 1 / fps);
      return rig.getTarget();
    };
    const a = run(30, 0.5);
    const b = run(144, 0.5);
    const c = run(60, 0.5);
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.z).toBeCloseTo(c.z, 6);
    expect(a.x).toBeGreaterThan(0);
    expect(a.x).toBeLessThan(10);
    expect(dampFactor(6, 0)).toBe(0);
  });

  it('uses a fixed yaw and the planned pitch/distance', () => {
    const off = followOffset({ pitchDeg: 50, distance: 11, yaw: 0 });
    expect(off.x).toBeCloseTo(0, 9);
    expect(Math.hypot(off.x, off.y, off.z)).toBeCloseTo(11, 9);
    expect(Math.atan2(off.y, off.z) * 180 / Math.PI).toBeCloseTo(50, 6);
    expect(createFollowRig().getAzimuth()).toBe(0);
  });

  it('finds houses between camera and player (cutaway test)', () => {
    const house = { x: 0, z: 4, w: 8, d: 7, h: 4.7, rotationY: 0.4 };
    const player = { x: 0, y: 1, z: 0 };
    const camBehindHouse = { x: 0, y: 8.4, z: 7.1 };
    expect(segmentHitsOrientedBox(camBehindHouse, player, house)).toBe(true);
    expect(segmentHitsOrientedBox({ x: 0, y: 8.4, z: -7 }, { x: 0, y: 1, z: -14 }, house)).toBe(false);
  });
});

describe('trigger API (matches #77 adapter)', () => {
  const seedBox = { id: 'seed_box', type: 'open_seeds', position: { x: 0, y: 0, z: 0 }, radius: 1.2, prompt: 'Seed box', plotId: null, target: null, exit: null };
  const plot = { id: 'plot_home', type: 'enter_plot', position: { x: 1.5, y: 0, z: 0 }, radius: 1.8, prompt: 'Your garden', plotId: 'home', target: null, exit: { x: 1.5, z: 4, facingY: 0.3 } };

  it('calls listener(phase, trigger) with 0.3 m hysteresis and no repeat while lingering', () => {
    const tracker = createTriggerTracker([seedBox]);
    const cb = vi.fn();
    const off = tracker.onTrigger(cb);
    tracker.update({ x: 2, z: 0 });
    expect(cb).not.toHaveBeenCalled();
    tracker.update({ x: 1.15, z: 0 });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toBe('enter');
    expect(cb.mock.calls[0][1]).toMatchObject({ id: 'seed_box', type: 'open_seeds', prompt: 'Seed box' });
    for (const x of [1.25, 1.19, 1.45, 1.21, 1.49]) tracker.update({ x, z: 0 });
    expect(cb).toHaveBeenCalledTimes(1);
    tracker.update({ x: 1.51, z: 0 });
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb.mock.calls[1][0]).toBe('leave');
    off();
    tracker.update({ x: 0, z: 0 });
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('emits overlapping triggers separately, in the order they are entered', () => {
    const tracker = createTriggerTracker([plot, seedBox]);
    const seen = [];
    tracker.onTrigger((phase, t) => seen.push(`${phase}:${t.id}`));
    tracker.update({ x: 3.0, z: 0 }); // inside plot only
    tracker.update({ x: 1.0, z: 0 }); // now inside both
    expect(seen).toEqual(['enter:plot_home', 'enter:seed_box']);
    // same-update double enter: deepest (crossed first) fires first
    const t2 = createTriggerTracker([plot, seedBox]);
    const seen2 = [];
    t2.onTrigger((phase, t) => seen2.push(t.id));
    t2.update({ x: 0.1, z: 0 });
    expect(seen2).toEqual(['seed_box', 'plot_home']);
  });

  it('passes the plot exit spot on the trigger', () => {
    const tracker = createTriggerTracker([plot]);
    const cb = vi.fn();
    tracker.onTrigger(cb);
    tracker.update({ x: 1.5, z: 0 });
    expect(cb.mock.calls[0][1].exit).toEqual({ x: 1.5, z: 4, facingY: 0.3 });
  });

  it('reseed() moves without stale enter/leave events', () => {
    const tracker = createTriggerTracker([plot, seedBox]);
    const cb = vi.fn();
    tracker.onTrigger(cb);
    tracker.update({ x: 0, z: 0 });
    expect(cb).toHaveBeenCalledTimes(2);
    tracker.reseed({ x: 1.5, z: 4 }); // teleport to the exit spot
    tracker.update({ x: 1.5, z: 4 });
    expect(cb).toHaveBeenCalledTimes(2);
    tracker.reseed({ x: 1.5, z: 0.5 }); // land inside the plot: no enter either
    tracker.update({ x: 1.5, z: 0.5 });
    expect(cb).toHaveBeenCalledTimes(2);
    tracker.update({ x: 1.5, z: 3 }); // walking out still leaves normally
    expect(cb).toHaveBeenLastCalledWith('leave', expect.objectContaining({ id: 'plot_home' }));
  });
});
