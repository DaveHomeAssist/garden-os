import { describe, expect, it, vi } from 'vitest';

import { Actions } from '../game/store.js';
import { applyZoneTravelState, resolveZoneSpawnPoint } from './zone-travel.js';

describe('zone-travel', () => {
  it('resolves destination spawn points from the reverse route when available', () => {
    expect(resolveZoneSpawnPoint('player_plot', 'neighborhood')).toEqual({ x: 0.2, y: 0, z: 4.4 });
    expect(resolveZoneSpawnPoint('meadow', 'forest_edge')).toEqual({ x: -4.2, y: 0, z: 0.8 });
  });

  it('falls back to a zone default spawn when no reverse route exists', () => {
    expect(resolveZoneSpawnPoint('unknown_zone', 'player_plot')).toEqual({ x: 0, y: 0, z: 2.55 });
    expect(resolveZoneSpawnPoint('unknown_zone', 'market_square')).toEqual({ x: 0.2, y: 0, z: 4.4 });
  });

  it('resets the player and refreshes scene interaction state after a zone change', () => {
    const playerState = { position: { x: 0.2, y: 0, z: 4.4 }, moving: false };
    const playerController = {
      reset: vi.fn(() => playerState),
    };
    const scene = {
      setPlayerState: vi.fn(),
      clearPointerHover: vi.fn(),
    };
    const interactionSystem = {
      update: vi.fn(),
    };

    const result = applyZoneTravelState(
      {
        type: Actions.ZONE_CHANGED,
      },
      {
        campaign: {
          worldState: {
            lastSpawnPoint: { x: 0.2, y: 0, z: 4.4 },
          },
        },
      },
      { playerController, scene, interactionSystem },
    );

    expect(result).toBe(playerState);
    expect(playerController.reset).toHaveBeenCalledWith({ x: 0.2, y: 0, z: 4.4 });
    expect(scene.setPlayerState).toHaveBeenCalledWith(playerState);
    expect(scene.clearPointerHover).toHaveBeenCalledTimes(1);
    expect(interactionSystem.update).toHaveBeenCalledWith(0);
  });

  it('ignores unrelated actions and missing spawn points', () => {
    const playerController = { reset: vi.fn() };

    expect(
      applyZoneTravelState(
        { type: 'ADVANCE_PHASE' },
        { campaign: { worldState: { lastSpawnPoint: { x: 1, y: 0, z: 1 } } } },
        { playerController },
      ),
    ).toBeNull();

    expect(
      applyZoneTravelState(
        { type: Actions.ZONE_CHANGED },
        { campaign: { worldState: { lastSpawnPoint: null } } },
        { playerController },
      ),
    ).toBeNull();

    expect(playerController.reset).not.toHaveBeenCalled();
  });
});
