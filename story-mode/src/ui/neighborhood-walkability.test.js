import { describe, expect, it } from 'vitest';

import WORLD_MAP from 'specs/WORLD_MAP.json';
import {
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
import { listAllNPCs } from '../data/npcs.js';
import { resolveNpcPresence } from '../scene/npc-presence.js';
import { getQuestSitesForZone } from '../data/quest-sites.js';

// The Neighborhood used to have bounds but no blockers, so the player walked
// straight through the houses. These tests drive the real movement code in
// fixed steps (no input latency): a grid planner finds a route around the
// blockers and the simulation has to follow it to every exit, NPC, quest site
// and forage spot, from every place the player can arrive.

const ZONE = 'neighborhood';
const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const NPC_RADIUS = 1.2; // makeNpcMarker in scene/zones/neighborhood.js
const FORAGE_RADIUS = 0.8; // makeForageSpotMesh in scene/zones/zone-interactables.js
const EXIT_RADIUS = 1.4;

const config = { bounds: getZoneMovementBounds(ZONE), blockers: getZoneMovementBlockers(ZONE) };

function collides(x, z, pad = PLAYER_RADIUS) {
  return config.blockers.some((b) => {
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    return Math.hypot(x - cx, z - cz) < pad;
  });
}

function clampToBounds({ x, z }) {
  const { minX, maxX, minZ, maxZ } = config.bounds;
  return { x: Math.min(Math.max(x, minX), maxX), z: Math.min(Math.max(z, minZ), maxZ) };
}

// 8-connected A* on a 0.1 m grid over the walkable area (blockers inflated by
// the player radius plus a small margin so the path never grazes a corner).
const STEP = 0.1;
function plan(start, goal, goalRadius) {
  const { minX, maxX, minZ, maxZ } = config.bounds;
  const cols = Math.round((maxX - minX) / STEP) + 1;
  const rows = Math.round((maxZ - minZ) / STEP) + 1;
  const toCell = (p) => [Math.round((p.x - minX) / STEP), Math.round((p.z - minZ) / STEP)];
  const toPoint = (c, r) => ({ x: minX + c * STEP, z: minZ + r * STEP });
  const free = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && !collides(toPoint(c, r).x, toPoint(c, r).z, PLAYER_RADIUS + 0.06);
  const done = (c, r) => {
    const p = toPoint(c, r);
    return Math.hypot(p.x - goal.x, p.z - goal.z) <= goalRadius - 0.1;
  };
  const [sc, sr] = toCell(start);
  const key = (c, r) => r * cols + c;
  const g = new Map([[key(sc, sr), 0]]);
  const parent = new Map();
  const open = [[0, sc, sr]];
  while (open.length) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[best][0]) best = i;
    const [, c, r] = open.splice(best, 1)[0];
    if (done(c, r)) {
      const path = [];
      for (let k = key(c, r); k !== undefined; k = parent.get(k)) path.unshift(toPoint(k % cols, Math.floor(k / cols)));
      return path.filter((_, i) => i % 3 === 0 || i === path.length - 1);
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (!free(nc, nr)) continue;
      const ng = g.get(key(c, r)) + Math.hypot(dc, dr);
      if (ng >= (g.get(key(nc, nr)) ?? Infinity)) continue;
      g.set(key(nc, nr), ng);
      parent.set(key(nc, nr), key(c, r));
      const p = toPoint(nc, nr);
      open.push([ng + Math.hypot(p.x - goal.x, p.z - goal.z) / STEP, nc, nr]);
    }
  }
  return null;
}

/** Follow waypoints with the real simulation; returns the final position or null if stuck. */
function follow(start, waypoints, goal, goalRadius) {
  let state = createSimulationState({ ...config, position: start });
  state = { ...state, position: { x: start.x, y: 0, z: start.z } };
  for (const wp of waypoints) {
    let stalled = 0;
    let best = Infinity;
    for (let t = 0; t < 40; t += FIXED_SIMULATION_DT) {
      const { x, z } = state.position;
      if (Math.hypot(goal.x - x, goal.z - z) <= goalRadius) return state.position;
      const d = Math.hypot(wp.x - x, wp.z - z);
      if (d <= 0.06) break;
      if (d < best - 0.002) { best = d; stalled = 0; } else { stalled += FIXED_SIMULATION_DT; }
      if (stalled > 0.5) return null;
      state = stepSimulationState(state, { config, input: { x: (wp.x - x) / d, z: (wp.z - z) / d } });
    }
  }
  const { x, z } = state.position;
  return Math.hypot(goal.x - x, goal.z - z) <= goalRadius ? state.position : null;
}

function reach(start, target) {
  const from = clampToBounds(start);
  const path = plan(from, target.position, target.radius);
  if (!path) return { ok: false, why: 'no route', target: target.id };
  const end = follow(from, path, target.position, target.radius);
  return end ? { ok: true } : { ok: false, why: 'simulation got stuck', target: target.id };
}

function npcTargets() {
  const targets = new Map();
  for (const season of SEASONS) {
    for (const open of [true, false]) {
      const state = { season: { season }, campaign: { currentSeason: season } };
      for (const npc of listAllNPCs()) {
        const presence = resolveNpcPresence(npc.id, state, { canEnterZone: () => open });
        if (presence?.zone !== ZONE) continue;
        const id = `npc:${npc.id}@${presence.position.x},${presence.position.z}`;
        targets.set(id, { id, position: presence.position, radius: NPC_RADIUS });
      }
    }
  }
  return [...targets.values()];
}

function allTargets() {
  const zone = WORLD_MAP.zones[ZONE];
  return [
    ...WORLD_ZONE_INTERACTABLES[ZONE].map((exit) => ({ id: `exit:${exit.zoneId}`, position: exit.position, radius: EXIT_RADIUS })),
    ...npcTargets(),
    ...getQuestSitesForZone(ZONE).map((site) => ({ id: `site:${site.id}`, position: site.position, radius: site.radius ?? 1.0 })),
    ...(zone.foraging?.spots ?? []).map((spot) => ({ id: `forage:${spot.id}`, position: spot.position, radius: FORAGE_RADIUS })),
  ];
}

function arrivals() {
  return WORLD_MAP.zones[ZONE].connections.map((from) => ({ from, point: resolveZoneSpawnPoint(from, ZONE) }));
}

describe('neighborhood collision', () => {
  it('has solid houses, gate posts and tree trunks', () => {
    const solid = [
      { x: -4.7, z: 4.8 }, // west house
      { x: 4.6, z: 2.2 }, // east house
      { x: -1.4, z: -3.5 }, // south cottage
      { x: 6, z: -2 }, // big oak
      { x: 0.7, z: 7.1 }, // gate post
    ];
    for (const p of solid) expect(collides(p.x, p.z, 0.01), `${p.x},${p.z}`).toBe(true);
  });

  it('cannot walk straight through a house', () => {
    // Old behaviour: east along z=4.8 from (-7.5, 4.8) passed through the west house.
    let state = createSimulationState({ ...config, position: { x: -7.5, z: 4.8 } });
    state = { ...state, position: { x: -7.5, y: 0, z: 4.8 } };
    for (let t = 0; t < 4; t += FIXED_SIMULATION_DT) {
      state = stepSimulationState(state, { config, input: { x: 1, z: 0 } });
    }
    expect(state.position.x).toBeLessThan(-5.9 - PLAYER_RADIUS + 0.01);
  });

  it('keeps every arrival point clear of the blockers', () => {
    for (const { from, point } of arrivals()) {
      const p = clampToBounds(point);
      expect(collides(p.x, p.z), `arrival from ${from}`).toBe(false);
    }
  });

  it('keeps the main paths open', () => {
    // North gate to the south edge along the vertical path. (The east-west
    // path is crossed by the tree at (-6, 1) and the east house's front, so
    // it is checked by the routed walks below instead of a straight line.)
    for (const p of [{ x: 0, z: 7.5 }, { x: 0, z: 3 }, { x: 0, z: 0 }, { x: 0, z: -4 }, { x: 0, z: -8 }]) {
      expect(collides(p.x, p.z), `${p.x},${p.z}`).toBe(false);
    }
  });
});

describe('neighborhood reachability (scripted walk)', () => {
  const targets = allTargets();

  it('covers every exit, NPC, quest site and forage spot', () => {
    const ids = targets.map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining([
      'exit:player_plot', 'exit:meadow', 'exit:forest_edge', 'exit:market_square', 'exit:festival_grounds',
      'site:neighborhood_notice_board', 'site:big_oak_hollow',
    ]));
    expect(ids.some((id) => id.startsWith('npc:lila@'))).toBe(true);
    expect(ids.some((id) => id.startsWith('npc:maya@'))).toBe(true);
    expect(ids.some((id) => id.startsWith('npc:old_gus@'))).toBe(true);
    expect(ids.filter((id) => id.startsWith('forage:'))).toHaveLength(3);
  });

  for (const { from, point } of arrivals()) {
    it(`reaches every target after arriving from ${from}`, () => {
      const failures = targets.map((target) => reach(point, target)).filter((r) => !r.ok);
      expect(failures).toEqual([]);
    });
  }

  it('walks from the home plot gate to Lila (Fresh Basil, Please) around the cottage', () => {
    const start = resolveZoneSpawnPoint('player_plot', ZONE);
    const lila = npcTargets().find((t) => t.id.startsWith('npc:lila@'));
    expect(reach(start, lila)).toEqual({ ok: true });
  });
});
