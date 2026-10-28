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

describe('input.stopAt (tap-to-move goal)', () => {
  it('never steps past stopAt along the input direction, and stays there while the input repeats', async () => {
    const { createSimulationState: create, stepSimulationState: step } = await import('./simulation-core.js');
    const config = { bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, blockers: [] };
    let s = create({ ...config, initialPosition: { x: 0, z: 0 } });
    const input = { x: 1, z: 0, stopAt: { x: 0.5, z: 0 } };
    for (let i = 0; i < 120; i += 1) s = step(s, { config, input, dt: 1 / 60 });
    expect(s.position.x).toBeCloseTo(0.5, 6);
    expect(s.moving).toBe(false);
    // without stopAt the same input keeps going
    let t = create({ ...config, initialPosition: { x: 0, z: 0 } });
    for (let i = 0; i < 120; i += 1) t = step(t, { config, input: { x: 1, z: 0 }, dt: 1 / 60 });
    expect(t.position.x).toBeGreaterThan(3);
  });
});
