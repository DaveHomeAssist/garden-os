import { describe, expect, it } from 'vitest';

import { createPlayerController } from './player-controller.js';

describe('player-controller', () => {
  it('starts at the default spawn position in an idle state', () => {
    const controller = createPlayerController();
    const state = controller.getState();

    expect(state.position).toMatchObject({ x: 0, y: 0, z: 2.55 });
    expect(state.moving).toBe(false);
    expect(state.speed).toBe(0);
    expect(state.enabled).toBe(true);
  });

  it('moves on the XZ plane and rotates to face the movement direction', () => {
    const controller = createPlayerController({
      blockers: [],
      bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
    });

    controller.update(0.2, { x: 1, z: 0 });
    const state = controller.getState();

    expect(state.position.x).toBeGreaterThan(0);
    expect(state.position.z).toBe(2.55);
    expect(state.moving).toBe(true);
    expect(state.speed).toBeGreaterThan(0);
    expect(state.facing).toBeCloseTo(Math.PI / 2, 4);
  });

  it('respects zone bounds and blocker collisions', () => {
    const boundaryController = createPlayerController({
      blockers: [],
      bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
      initialPosition: { x: 0.95, y: 0, z: 0 },
    });

    boundaryController.update(1, { x: 1, z: 0 });
    expect(boundaryController.getState().position.x).toBe(1);

    const blockerController = createPlayerController({
      bounds: { minX: -2, maxX: 2, minZ: -2, maxZ: 2 },
      blockers: [{ minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5 }],
      initialPosition: { x: 0, y: 0, z: 0.8 },
    });

    for (let index = 0; index < 10; index += 1) {
      blockerController.update(0.1, { x: 0, z: -1 });
    }

    expect(blockerController.getState().position.z).toBeGreaterThan(0.5);
  });

  it('stops cleanly when disabled and can be reset to a new spawn point', () => {
    const controller = createPlayerController({
      blockers: [],
      bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
    });

    controller.update(0.1, { x: 0, z: -1 });
    controller.setEnabled(false);
    const disabledState = controller.update(0.1, { x: 1, z: 0 });

    expect(disabledState.moving).toBe(false);
    expect(disabledState.speed).toBe(0);
    expect(disabledState.velocity).toMatchObject({ x: 0, z: 0 });

    const resetState = controller.reset({ x: -1.5, y: 0, z: 1.25 });

    expect(resetState.position).toMatchObject({ x: -1.5, y: 0, z: 1.25 });
    expect(resetState.moving).toBe(false);
    expect(resetState.facing).toBe(Math.PI);
  });
});
