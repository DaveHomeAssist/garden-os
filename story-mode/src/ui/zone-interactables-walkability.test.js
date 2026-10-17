import { describe, expect, it } from 'vitest';

import WORLD_MAP from 'specs/WORLD_MAP.json';
import {
  FIXED_SIMULATION_DT,
  PLAYER_RADIUS,
  createSimulationState,
  stepSimulationState,
} from '../engine/simulation-core.js';
import { getZoneMovementBlockers, getZoneMovementBounds } from './zone-travel.js';

// WORLD_MAP interactables are fixed points the player walks up to. The home
// plot's tool_shed sat at (-2, -1), inside the cedar bed's blocker
// (-2.28..2.28 x -1.42..1.42), so it could never be stood at. Every authored
// interactable must be standable: inside the zone bounds and clear of every
// blocker by the player radius. The one exception is an interactable that IS
// a blocker (same id, e.g. the cedar bed itself), which is used from its edge.

function touches(x, z, b, pad) {
  const cx = Math.max(b.minX, Math.min(x, b.maxX));
  const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
  return Math.hypot(x - cx, z - cz) < pad;
}

const zones = Object.entries(WORLD_MAP.zones);

describe('WORLD_MAP interactables are standable', () => {
  for (const [zoneId, zone] of zones) {
    const items = zone.interactables ?? [];
    if (!items.length) continue;
    it(`${zoneId}: every interactable is inside bounds and clear of blockers`, () => {
      const bounds = getZoneMovementBounds(zoneId);
      const blockers = zone.blockers ?? [];
      const problems = [];
      for (const item of items) {
        const { x, z } = item.position;
        if (bounds && (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ)) {
          problems.push(`${item.id} outside bounds`);
        }
        const hit = blockers.find((b) => b.id !== item.id && touches(x, z, b, PLAYER_RADIUS));
        if (hit) problems.push(`${item.id} inside blocker ${hit.id}`);
      }
      expect(problems).toEqual([]);
    });
  }
});

describe('home plot tool shed', () => {
  it('can be walked to from the spawn point (scripted, fixed steps)', () => {
    const zone = WORLD_MAP.zones.player_plot;
    const shed = zone.interactables.find((item) => item.id === 'tool_shed');
    const config = { bounds: getZoneMovementBounds('player_plot'), blockers: getZoneMovementBlockers('player_plot') };
    // Start in front of the bed and go round its west end.
    const waypoints = [{ x: 0, z: 2.0 }, { x: -2.8, z: 2.0 }, { x: shed.position.x, z: shed.position.z }];
    let state = createSimulationState({ ...config, position: { x: 0, z: 2.0 } });
    state = { ...state, position: { x: 0, y: 0, z: 2.0 } };
    for (const wp of waypoints) {
      for (let t = 0; t < 10; t += FIXED_SIMULATION_DT) {
        const { x, z } = state.position;
        const d = Math.hypot(wp.x - x, wp.z - z);
        if (d < 0.05) break;
        state = stepSimulationState(state, { config, input: { x: (wp.x - x) / d, z: (wp.z - z) / d } });
      }
    }
    const { x, z } = state.position;
    expect(Math.hypot(x - shed.position.x, z - shed.position.z)).toBeLessThan(0.1);
  });
});
