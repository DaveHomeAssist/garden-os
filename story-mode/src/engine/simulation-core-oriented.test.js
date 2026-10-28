import { describe, expect, it } from 'vitest';
import {
  circleIntersectsRect,
  createSimulationState,
  replaySimulationFrames,
  stepSimulationState,
} from './simulation-core.js';

// Golden checksums produced by simulation-core.js on main (06138c3), before
// oriented blockers existed. Axis-aligned blockers must reproduce them exactly.
const GOLDEN_AABB = '9af70eef';
const GOLDEN_DEFAULT = '41327923';

const config = {
  bounds: { minX: -6, maxX: 6, minZ: -6, maxZ: 6 },
  blockers: [{ minX: -2.28, maxX: 2.28, minZ: -1.42, maxZ: 1.42 }, { minX: 3, maxX: 4, minZ: -5, maxZ: 5 }],
};
const inputAtFrame = (f) => ({ x: Math.sin(f * 0.05), z: Math.cos(f * 0.031) - 0.4 });

describe('simulation-core oriented blockers', () => {
  it('keeps the pre-change checksum for axis-aligned blockers', () => {
    const init = createSimulationState({ ...config, initialPosition: { x: 0, z: 3 } });
    expect(replaySimulationFrames(init, { config, frameCount: 900, inputAtFrame }).checksum).toBe(GOLDEN_AABB);
    expect(replaySimulationFrames(createSimulationState(), { frameCount: 600, inputAtFrame }).checksum).toBe(GOLDEN_DEFAULT);
  });

  it('treats rotationY: 0 exactly like no rotation', () => {
    const init = createSimulationState({ ...config, initialPosition: { x: 0, z: 3 } });
    const zeroed = { ...config, blockers: config.blockers.map((b) => ({ ...b, rotationY: 0 })) };
    expect(replaySimulationFrames(init, { config: zeroed, frameCount: 900, inputAtFrame }).checksum).toBe(GOLDEN_AABB);
  });

  it('collides against the rotated rect, not its axis-aligned envelope', () => {
    // 4 x 1 rect rotated 45 degrees about the origin
    const rect = { minX: -2, maxX: 2, minZ: -0.5, maxZ: 0.5, rotationY: Math.PI / 4 };
    // a point on the rotated long axis (local x = 1.8) is inside
    const along = { x: 1.8 * Math.cos(Math.PI / 4), z: -1.8 * Math.sin(Math.PI / 4) };
    expect(circleIntersectsRect(along.x, along.z, 0.18, rect)).toBe(true);
    // (1.8, 0) is inside the unrotated rect but clear of the rotated one
    expect(circleIntersectsRect(1.8, 0, 0.18, rect)).toBe(false);
    expect(circleIntersectsRect(1.8, 0, 0.18, { ...rect, rotationY: undefined })).toBe(true);
  });

  it('never lets the player end a step inside a rotated blocker', () => {
    const rotated = {
      bounds: { minX: -8, maxX: 8, minZ: -8, maxZ: 8 },
      blockers: [{ minX: -3, maxX: 3, minZ: -1, maxZ: 1, rotationY: 0.6 }],
    };
    let state = createSimulationState({ ...rotated, initialPosition: { x: 0, z: 4 } });
    for (let f = 0; f < 1200; f += 1) {
      state = stepSimulationState(state, { config: rotated, input: { x: Math.sin(f * 0.013), z: -1 } });
      expect(circleIntersectsRect(state.position.x, state.position.z, state.radius * 0.999, rotated.blockers[0])).toBe(false);
    }
  });
});
