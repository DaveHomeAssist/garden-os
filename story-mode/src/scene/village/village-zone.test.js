import { describe, expect, it, vi } from 'vitest';
import { registerVillageZone } from '../zones/zone-registry.js';
import { FREEPLAY_SAVE_TARGET } from '../../game/save-target.js';
import { getZoneMovementBlockers, getZoneMovementBounds, resolveZoneSpawnPoint } from '../../ui/zone-travel.js';
import { nearestPointOutsideBlockers } from '../../game/walk-autopilot.js';
import { circleIntersectsRect } from '../../engine/simulation-core.js';
import { getVillageLayout } from './village-layout.js';
import WORLD_MAP from 'specs/WORLD_MAP.json';

describe('village zone registration', () => {
  it('registers only for the Free Play save target', () => {
    const zm = { renderer: null, registerZone: vi.fn() };
    expect(registerVillageZone(zm, { slot: 0 })).toBe(false);
    expect(registerVillageZone(zm, { slot: 2 })).toBe(false);
    expect(zm.registerZone).not.toHaveBeenCalled();
    expect(registerVillageZone(zm, { slot: FREEPLAY_SAVE_TARGET })).toBe(true);
    expect(zm.registerZone).toHaveBeenCalledWith('village', expect.any(Function));
  });

  it('leaves WORLD_MAP (Story Mode zones) untouched', () => {
    expect(WORLD_MAP.zones.village).toBeUndefined();
  });

  it('feeds the walk sim the village bounds and oriented blockers', () => {
    const layout = getVillageLayout();
    expect(getZoneMovementBounds('village')).toEqual(layout.bounds);
    const blockers = getZoneMovementBlockers('village');
    expect(blockers).toHaveLength(layout.blockers.length);
    expect(blockers.some((b) => b.rotationY)).toBe(true);
    expect(resolveZoneSpawnPoint('player_plot', 'village')).toEqual({ x: layout.spawn.x, y: 0, z: layout.spawn.z });
  });
});

describe('walk-autopilot oriented push-out', () => {
  it('pushes a target out of a rotated blocker to its nearest face', () => {
    const rect = { minX: -2, maxX: 2, minZ: -0.5, maxZ: 0.5, rotationY: 0.7 };
    const p = nearestPointOutsideBlockers(0.1, 0.05, [rect], 0.25);
    expect(circleIntersectsRect(p.x, p.z, 0.2, rect)).toBe(false);
    expect(Math.hypot(p.x - 0.1, p.z - 0.05)).toBeLessThan(1.0);
    // axis-aligned path unchanged
    expect(nearestPointOutsideBlockers(0, 0.4, [{ minX: -2, maxX: 2, minZ: -0.5, maxZ: 0.5 }], 0.25)).toEqual({ x: 0, z: 0.75 });
  });
});
