import { describe, expect, it, vi } from 'vitest';

import { createWalkAutopilot, nearestPointOutsideBlockers } from './walk-autopilot.js';

function createHarness({ position = { x: 0, y: 0, z: 0 }, zone = 'player_plot' } = {}) {
  const state = { position: { ...position }, zone };
  const onUnreachable = vi.fn();
  const autopilot = createWalkAutopilot({
    getPosition: () => ({ ...state.position }),
    getZoneId: () => state.zone,
    onUnreachable,
  });
  return { autopilot, state, onUnreachable };
}

describe('createWalkAutopilot', () => {
  it('fires onArrive immediately when already within radius', () => {
    const { autopilot } = createHarness();
    const onArrive = vi.fn();
    autopilot.queue({ x: 0.3, z: 0, radius: 0.6, onArrive });
    expect(onArrive).toHaveBeenCalledTimes(1);
    expect(autopilot.hasTarget()).toBe(false);
  });

  it('returns a normalized vector toward the target and arrives once in range', () => {
    const { autopilot, state } = createHarness();
    const onArrive = vi.fn();
    autopilot.queue({ x: 3, z: 4, radius: 0.5, onArrive });

    const vector = autopilot.getVector(1 / 60);
    expect(vector.x).toBeCloseTo(0.6);
    expect(vector.z).toBeCloseTo(0.8);
    expect(onArrive).not.toHaveBeenCalled();

    state.position = { x: 2.8, y: 0, z: 3.7 };
    expect(autopilot.getVector(1 / 60)).toEqual({ x: 0, z: 0 });
    expect(onArrive).toHaveBeenCalledTimes(1);
    expect(autopilot.hasTarget()).toBe(false);
  });

  it('skips the arrival action when stillValid fails at arrival time', () => {
    const { autopilot, state } = createHarness();
    const onArrive = vi.fn();
    let phase = 'PLANNING';
    autopilot.queue({ x: 2, z: 0, radius: 0.5, onArrive, stillValid: () => phase === 'PLANNING' });

    phase = 'EARLY_SEASON';
    state.position = { x: 1.8, y: 0, z: 0 };
    autopilot.getVector(1 / 60);

    expect(onArrive).not.toHaveBeenCalled();
    expect(autopilot.hasTarget()).toBe(false);
  });

  it('skips the arrival action when the zone changed since queueing', () => {
    const { autopilot, state } = createHarness();
    const onArrive = vi.fn();
    autopilot.queue({ x: 2, z: 0, radius: 0.5, onArrive });

    state.zone = 'meadow';
    state.position = { x: 1.9, y: 0, z: 0 };
    autopilot.getVector(1 / 60);

    expect(onArrive).not.toHaveBeenCalled();
  });

  it('cancels a stalled walk after 1.2s of stepped time and reports unreachable', () => {
    const { autopilot, onUnreachable } = createHarness();
    const onArrive = vi.fn();
    autopilot.queue({ x: 5, z: 0, radius: 0.5, onArrive });

    // Position never changes: 1.2s of accumulated dt (plus the first
    // progress-recording tick) cancels the walk.
    for (let i = 0; i < 80; i += 1) autopilot.getVector(1 / 60);

    expect(autopilot.hasTarget()).toBe(false);
    expect(onArrive).not.toHaveBeenCalled();
    expect(onUnreachable).toHaveBeenCalledTimes(1);
  });

  it('does not accrue stall time between calls (pause/hidden tab safe)', () => {
    const { autopilot } = createHarness();
    autopilot.queue({ x: 5, z: 0, radius: 0.5, onArrive: vi.fn() });

    // Two ticks separated by an arbitrary real-time gap: only stepped dt
    // counts, so the walk survives.
    autopilot.getVector(1 / 60);
    autopilot.getVector(1 / 60);
    expect(autopilot.hasTarget()).toBe(true);
  });

  it('stays quiet on unreachable walks with no action attached', () => {
    const { autopilot, onUnreachable } = createHarness();
    autopilot.queue({ x: 5, z: 0, radius: 0.5 });
    for (let i = 0; i < 80; i += 1) autopilot.getVector(1 / 60);
    expect(autopilot.hasTarget()).toBe(false);
    expect(onUnreachable).not.toHaveBeenCalled();
  });

  it('clear() drops the target so the next vector is zero', () => {
    const { autopilot } = createHarness();
    autopilot.queue({ x: 5, z: 0, radius: 0.5 });
    expect(autopilot.hasTarget()).toBe(true);
    autopilot.clear();
    expect(autopilot.getVector(1 / 60)).toEqual({ x: 0, z: 0 });
  });

  it('fires the action on stall when still within reachDistance (wall-pinned reach)', () => {
    const { autopilot, onUnreachable } = createHarness({ position: { x: 0, y: 0, z: 1.6 } });
    const onArrive = vi.fn();
    // Target 1.85 away, blocked forever: within reach 2.75 → act anyway.
    autopilot.queue({ x: 0, z: -0.25, radius: 0.45, reachDistance: 2.75, onArrive });
    for (let i = 0; i < 80; i += 1) autopilot.getVector(1 / 60);

    expect(onArrive).toHaveBeenCalledTimes(1);
    expect(onUnreachable).not.toHaveBeenCalled();
    expect(autopilot.hasTarget()).toBe(false);
  });

  it('reports unreachable on stall beyond reachDistance', () => {
    const { autopilot, onUnreachable } = createHarness();
    const onArrive = vi.fn();
    autopilot.queue({ x: 9, z: 0, radius: 0.45, reachDistance: 2.75, onArrive });
    for (let i = 0; i < 80; i += 1) autopilot.getVector(1 / 60);

    expect(onArrive).not.toHaveBeenCalled();
    expect(onUnreachable).toHaveBeenCalledTimes(1);
  });
});

describe('nearestPointOutsideBlockers', () => {
  const BED = [{ minX: -2.28, maxX: 2.28, minZ: -1.42, maxZ: 1.42 }];

  it('leaves points outside all blockers untouched', () => {
    expect(nearestPointOutsideBlockers(0, 2.55, BED, 0.25)).toEqual({ x: 0, z: 2.55 });
  });

  it('pushes an interior north-row cell to the near north edge', () => {
    const point = nearestPointOutsideBlockers(0, -0.25, BED, 0.25);
    expect(point.x).toBe(0);
    expect(point.z).toBeCloseTo(-1.67);
  });

  it('pushes an edge-column cell sideways when that is the cheaper exit', () => {
    const point = nearestPointOutsideBlockers(-1.75, -0.25, BED, 0.25);
    expect(point.x).toBeCloseTo(-2.53);
    expect(point.z).toBe(-0.25);
  });

  it('handles no blockers', () => {
    expect(nearestPointOutsideBlockers(1, 2, [], 0.25)).toEqual({ x: 1, z: 2 });
  });
});
