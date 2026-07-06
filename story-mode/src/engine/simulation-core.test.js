import { describe, expect, it } from 'vitest';

import {
  FIXED_SIMULATION_DT,
  checksumSimulationState,
  createSimulationState,
  replaySimulationFrames,
  stepSimulationState,
} from './simulation-core.js';

const CONFIG = {
  blockers: [],
  bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
};

function inputAtFrame(frame) {
  if (frame < 40) return { x: 1, z: 0 };
  if (frame < 80) return { x: 0, z: -1 };
  return { x: -1, z: 1 };
}

describe('fixed-step simulation core', () => {
  it('produces the same checksum for the same 120-frame replay', () => {
    const initial = createSimulationState(CONFIG);
    const left = replaySimulationFrames(initial, {
      config: CONFIG,
      frameCount: 120,
      inputAtFrame,
    });
    const right = replaySimulationFrames(initial, {
      config: CONFIG,
      frameCount: 120,
      inputAtFrame,
    });

    expect(left.checksum).toBe(right.checksum);
    expect(left.state.position.x).toBeCloseTo(right.state.position.x, 6);
    expect(left.state.position.z).toBeCloseTo(right.state.position.z, 6);
  });

  it('matches the same 120-frame checksum when replayed in chunks', () => {
    const initial = createSimulationState(CONFIG);
    const onePass = replaySimulationFrames(initial, {
      config: CONFIG,
      frameCount: 120,
      inputAtFrame,
    });
    const firstChunk = replaySimulationFrames(initial, {
      config: CONFIG,
      frameCount: 60,
      inputAtFrame,
    });
    const secondChunk = replaySimulationFrames(firstChunk.state, {
      config: CONFIG,
      frameCount: 60,
      inputAtFrame: (frame) => inputAtFrame(frame + 60),
    });

    expect(secondChunk.checksum).toBe(onePass.checksum);
  });

  it('uses fixed dt instead of wall-clock-sized jumps', () => {
    const initial = createSimulationState(CONFIG);
    const fixed = replaySimulationFrames(initial, {
      config: CONFIG,
      frameCount: 60,
      inputAtFrame: () => ({ x: 1, z: 0 }),
    });
    let manual = initial;
    for (let index = 0; index < 60; index += 1) {
      manual = stepSimulationState(manual, {
        config: CONFIG,
        dt: FIXED_SIMULATION_DT,
        input: { x: 1, z: 0 },
      });
    }

    expect(checksumSimulationState(manual)).toBe(fixed.checksum);
  });
});
