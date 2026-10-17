import { describe, expect, it } from 'vitest';

import WORLD_MAP from 'specs/WORLD_MAP.json';
import {
  DEFAULT_POSITION,
  FIXED_SIMULATION_DT,
  PLAYER_RADIUS,
  createSimulationState,
  stepSimulationState,
} from '../engine/simulation-core.js';
import {
  WORLD_ZONE_INTERACTABLES,
  getZoneMovementBlockers,
  getZoneMovementBounds,
  resolveZoneSpawnPoint,
} from './zone-travel.js';
import { getNPC } from '../data/npcs.js';

// The home plot used to clamp the player to a 5 x 4 m box hugging the bed
// (bounds ±2.5 / ±2.0), so walking north toward the rowhouse hit an invisible
// wall at z = -2 and the Neighborhood path at z = -8.5 was unreachable on foot.
// These tests walk the real collision config in code (fixed steps, no input
// latency) from the home plot to Lila, the "Fresh Basil, Please" quest giver.

function zoneConfig(zoneId) {
  return { bounds: getZoneMovementBounds(zoneId), blockers: getZoneMovementBlockers(zoneId) };
}

function walk(zoneId, start, waypoints, { arriveRadius = 0.15, maxSeconds = 30 } = {}) {
  const config = zoneConfig(zoneId);
  let state = createSimulationState({ ...config, position: start });
  state = { ...state, position: { x: start.x, y: 0, z: start.z } };
  const trace = [];
  for (const [index, target] of waypoints.entries()) {
    const radius = target.radius ?? arriveRadius;
    let best = Infinity;
    let stalled = 0;
    let t = 0;
    for (;;) {
      const { x, z } = state.position;
      const distance = Math.hypot(target.x - x, target.z - z);
      if (distance <= radius) break;
      if (distance < best - 0.002) { best = distance; stalled = 0; } else { stalled += FIXED_SIMULATION_DT; }
      if (stalled > 0.5 || t > maxSeconds) {
        return { ok: false, zoneId, leg: index, target, at: { x, z }, trace };
      }
      state = stepSimulationState(state, {
        config,
        input: { x: (target.x - x) / distance, z: (target.z - z) / distance },
      });
      t += FIXED_SIMULATION_DT;
    }
    trace.push({ ...state.position, t: +t.toFixed(2) });
  }
  return { ok: true, at: state.position, trace };
}

function exitFor(zoneId, destination) {
  return WORLD_ZONE_INTERACTABLES[zoneId].find((entry) => entry.zoneId === destination);
}

function insideBlocker(x, z, blockers, pad = 0) {
  return blockers.some((b) => x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad);
}

describe('home plot walkability', () => {
  it('lets the player walk north past the bed toward the rowhouse', () => {
    const result = walk('player_plot', DEFAULT_POSITION, [
      { x: 3.2, z: 2.0 },
      { x: 3.2, z: -5.0 },
    ]);
    expect(result).toMatchObject({ ok: true });
    expect(result.at.z).toBeLessThan(-4.8);
  });

  it('walks from the bed front to the Neighborhood path at the back gate', () => {
    const exit = exitFor('player_plot', 'neighborhood');
    const result = walk('player_plot', DEFAULT_POSITION, [
      { x: 3.0, z: 2.2 },
      { x: 3.0, z: -4.0 },
      { x: 0.4, z: -7.6 },
      { x: exit.position.x, z: exit.position.z, radius: exit.radius - 0.05 },
    ]);
    expect(result).toMatchObject({ ok: true });
  });

  it('keeps the bed and the rowhouse solid', () => {
    const blocked = walk('player_plot', { x: 0, z: 2.0 }, [{ x: 0, z: -3.0 }]);
    expect(blocked.ok).toBe(false);
    expect(blocked.at.z).toBeGreaterThanOrEqual(1.42 + PLAYER_RADIUS - 0.01);

    const house = walk('player_plot', { x: -2.1, z: -4.0 }, [{ x: -2.1, z: -8.0 }]);
    expect(house.ok).toBe(false);
    expect(house.at.z).toBeGreaterThanOrEqual(-6.15 + PLAYER_RADIUS - 0.01);
  });

  it('keeps spawn points, exits and bounds consistent with the scenery', () => {
    const bounds = getZoneMovementBounds('player_plot');
    // Perimeter fence posts sit at ±9.3 (scenery.js); the walkable yard stays inside it.
    expect(bounds.minX).toBeGreaterThan(-9.3);
    expect(bounds.maxX).toBeLessThan(9.3);
    expect(bounds.minZ).toBeGreaterThan(-9.3);
    expect(bounds.maxZ).toBeLessThan(9.3);
    const blockers = getZoneMovementBlockers('player_plot');
    for (const exit of WORLD_ZONE_INTERACTABLES.player_plot) {
      expect(insideBlocker(exit.position.x, exit.position.z, blockers)).toBe(false);
    }
    const arrival = resolveZoneSpawnPoint('neighborhood', 'player_plot');
    expect(insideBlocker(arrival.x, arrival.z, blockers, PLAYER_RADIUS)).toBe(false);
  });
});

// The simulation clamps the player's centre to the zone's movement bounds and
// pushes it out of blockers (inflated by PLAYER_RADIUS). An exit only works on
// foot if some spot the player can stand on lies inside its trigger circle.
// meadow_to_neighborhood, meadow_to_riverside_2 and market_square_to_neighborhood
// used to sit 1.5-2.5 m outside their zone bounds (world-map travel only).
const EXIT_STAND_MARGIN = 0.3; // stand at least this far inside the trigger radius

function standPoint(zoneId, exit) {
  const bounds = getZoneMovementBounds(zoneId);
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, exit.position.x)),
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, exit.position.z)),
  };
}

function arrivalPoints(zoneId) {
  // Every way the player can enter this zone: from each neighbour's exit.
  return Object.keys(WORLD_MAP.zones)
    .filter((from) => WORLD_ZONE_INTERACTABLES[from].some((entry) => entry.zoneId === zoneId))
    .map((from) => ({ from, point: resolveZoneSpawnPoint(from, zoneId) }));
}

describe('zone exits are reachable on foot', () => {
  const zoneIds = Object.keys(WORLD_MAP.zones);

  it('covers every zone and exit in the world map', () => {
    expect(zoneIds.length).toBeGreaterThanOrEqual(8);
    const count = zoneIds.reduce((n, id) => n + WORLD_ZONE_INTERACTABLES[id].length, 0);
    expect(count).toBe(zoneIds.reduce((n, id) => n + (WORLD_MAP.zones[id].exitPoints ?? []).length, 0));
  });

  it('every exit trigger in every zone sits within the walkable area', () => {
    const problems = [];
    for (const zoneId of zoneIds) {
      const blockers = getZoneMovementBlockers(zoneId);
      for (const exit of WORLD_ZONE_INTERACTABLES[zoneId]) {
        const stand = standPoint(zoneId, exit);
        const gap = Math.hypot(exit.position.x - stand.x, exit.position.z - stand.z);
        if (gap > exit.radius - EXIT_STAND_MARGIN) problems.push(`${exit.id}: ${gap.toFixed(2)} m outside bounds`);
        if (insideBlocker(stand.x, stand.z, blockers, PLAYER_RADIUS)) problems.push(`${exit.id}: inside a blocker`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('the three formerly unreachable exits now sit inside their zone bounds', () => {
    for (const [zoneId, id] of [
      ['meadow', 'meadow_to_neighborhood'],
      ['meadow', 'meadow_to_riverside_2'],
      ['market_square', 'market_square_to_neighborhood'],
    ]) {
      const exit = WORLD_ZONE_INTERACTABLES[zoneId].find((entry) => entry.id === id);
      expect(exit, id).toBeTruthy();
      const bounds = getZoneMovementBounds(zoneId);
      expect(exit.position.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(exit.position.x).toBeLessThanOrEqual(bounds.maxX);
      expect(exit.position.z).toBeGreaterThanOrEqual(bounds.minZ);
      expect(exit.position.z).toBeLessThanOrEqual(bounds.maxZ);
    }
  });

  it('walks from every arrival point of every zone (except the walled home plot) to each of its exits', () => {
    const failures = [];
    for (const zoneId of zoneIds) {
      // The home plot has interior blockers; its single exit has a dedicated waypoint walk above.
      if (zoneId === 'player_plot') continue;
      for (const { from, point } of arrivalPoints(zoneId)) {
        for (const exit of WORLD_ZONE_INTERACTABLES[zoneId]) {
          const result = walk(zoneId, point, [
            { x: exit.position.x, z: exit.position.z, radius: exit.radius - EXIT_STAND_MARGIN },
          ]);
          if (!result.ok) failures.push(`${zoneId} (from ${from}) -> ${exit.id} stuck at ${result.at.x.toFixed(2)},${result.at.z.toFixed(2)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('path to Lila (Fresh Basil, Please)', () => {
  it('reaches Lila in the Neighborhood after arriving from the home plot', () => {
    const lila = getNPC('lila');
    const spot = lila.schedule.spring;
    expect(spot.zone).toBe('neighborhood');
    const arrival = resolveZoneSpawnPoint('player_plot', 'neighborhood');
    const result = walk('neighborhood', arrival, [
      { x: spot.position.x, z: spot.position.z, radius: 1.0 },
    ]);
    expect(result).toMatchObject({ ok: true });
  });
});
