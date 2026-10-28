// V4 / V6: reachability from spawn and a 60 s random walk over the real
// village collision (oriented blockers + bounds), using the shipped sim.
import { describe, expect, it } from 'vitest';
import { createSimulationState, stepSimulationState, FIXED_SIMULATION_DT, circleIntersectsRect } from '../../engine/simulation-core.js';
import { buildWalkGrid, findPath, createPathWalker, hasLineOfSight } from '../../game/village-path.js';
import { nearestPointOutsideBlockers } from '../../game/walk-autopilot.js';
import { loadVillageLayout } from './village-layout.js';

const layout = loadVillageLayout();
const config = { bounds: layout.bounds, blockers: layout.blockers };
const grid = buildWalkGrid(config);

function walkPath(from, to, maxSeconds = 120) {
  let state = createSimulationState({ ...config, initialPosition: from });
  const path = findPath(grid, state.position, to);
  if (!path) return { reached: false, state, path };
  let arrived = false;
  const walker = createPathWalker({
    getPosition: () => state.position,
    lineOfSight: (a, b) => hasLineOfSight(grid, a, b),
    replan: (pos, goal) => findPath(grid, pos, goal),
    onArrive: () => { arrived = true; },
  });
  walker.setPath(path);
  for (let f = 0; f < maxSeconds / FIXED_SIMULATION_DT && walker.hasPath(); f += 1) {
    state = stepSimulationState(state, { config, input: walker.getVector(FIXED_SIMULATION_DT) });
  }
  return { reached: arrived, state, path };
}

describe('village reachability (V6)', () => {
  it('has a walkable spawn cell', () => {
    const c = grid.toCell(layout.spawn.x, layout.spawn.z);
    expect(grid.isWalkable(c.c, c.r)).toBe(true);
  });

  it.each(layout.interactables.map((i) => [i.id, i]))('walks from spawn into the %s trigger', (_id, item) => {
    const { reached, state } = walkPath(layout.spawn, item.position);
    expect(reached).toBe(true);
    expect(Math.hypot(state.position.x - item.position.x, state.position.z - item.position.z)).toBeLessThanOrEqual(item.radius);
  });

  it.each(layout.plots.map((p) => [p.id, p]))('walks from spawn to the %s exit sidewalk spot', (_id, plot) => {
    const { reached, state } = walkPath(layout.spawn, plot.exit);
    expect(reached).toBe(true);
    expect(Math.hypot(state.position.x - plot.exit.x, state.position.z - plot.exit.z)).toBeLessThan(0.3);
  });

  it('string-pulls paths into a few straight legs with clear line of sight', () => {
    const target = layout.interactables.find((i) => i.type === 'open_compost').position;
    const path = findPath(grid, layout.spawn, target);
    expect(path.length).toBeLessThan(20);
    let prev = layout.spawn;
    path.forEach((p) => { expect(hasLineOfSight(grid, prev, p)).toBe(true); prev = p; });
  });

  it('snaps taps inside a house to a walkable spot outside it', () => {
    const house = layout.blockers.find((b) => b.id === 'house_home');
    const centre = { x: (house.minX + house.maxX) / 2, z: (house.minZ + house.maxZ) / 2 };
    const { reached, state } = walkPath(layout.spawn, centre);
    expect(reached).toBe(true);
    expect(circleIntersectsRect(state.position.x, state.position.z, 0.17, house)).toBe(false);
    const pushed = nearestPointOutsideBlockers(centre.x, centre.z, [house]);
    expect(circleIntersectsRect(pushed.x, pushed.z, 0.2, house)).toBe(false);
  });
});

describe('village 60 s random walk (V4)', () => {
  it('stays in bounds, never enters a blocker and never gets stuck', () => {
    let seed = 20261027;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    let state = createSimulationState({ ...config, initialPosition: layout.spawn });
    const frames = Math.round(60 / FIXED_SIMULATION_DT);
    let dir = { x: 0, z: -1 };
    let legLeft = 0;
    let legStart = state.position;
    let stuckLegs = 0;
    let maxStuckLegs = 0;
    let travelled = 0;
    for (let f = 0; f < frames; f += 1) {
      if (legLeft <= 0) {
        const moved = Math.hypot(state.position.x - legStart.x, state.position.z - legStart.z);
        stuckLegs = moved < 0.05 ? stuckLegs + 1 : 0;
        maxStuckLegs = Math.max(maxStuckLegs, stuckLegs);
        const a = rnd() * Math.PI * 2;
        dir = { x: Math.cos(a), z: Math.sin(a) };
        legLeft = Math.round((0.6 + rnd() * 1.4) / FIXED_SIMULATION_DT);
        legStart = state.position;
      }
      const prev = state.position;
      state = stepSimulationState(state, { config, input: dir });
      travelled += Math.hypot(state.position.x - prev.x, state.position.z - prev.z);
      legLeft -= 1;
      const p = state.position;
      expect(p.x >= layout.bounds.minX && p.x <= layout.bounds.maxX && p.z >= layout.bounds.minZ && p.z <= layout.bounds.maxZ).toBe(true);
      for (const b of layout.blockers) expect(circleIntersectsRect(p.x, p.z, state.radius * 0.999, b)).toBe(false);
    }
    // sliding along walls keeps the player moving; a dead stop on two legs in a row means a trap
    expect(maxStuckLegs).toBeLessThan(2);
    expect(travelled).toBeGreaterThan(40);
  });

  it('tap-to-move reaches 40 random walkable targets', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    let from = { ...layout.spawn };
    let reachedCount = 0;
    for (let i = 0; i < 40; i += 1) {
      let target;
      do {
        target = { x: layout.bounds.minX + rnd() * (layout.bounds.maxX - layout.bounds.minX), z: layout.bounds.minZ + rnd() * (layout.bounds.maxZ - layout.bounds.minZ) };
        const c = grid.toCell(target.x, target.z);
        if (grid.isWalkable(c.c, c.r)) break;
      } while (true);
      const { reached, state } = walkPath(from, target, 90);
      if (reached) reachedCount += 1;
      from = state.position;
    }
    expect(reachedCount).toBe(40);
  });
});

// Live playtest 2026-10-28: the sim runs in a worker that keeps applying the
// last input at 60 Hz until the main thread sends the next one, so on slow
// frames (phones, software GL) the player stepped past the goal and
// ping-ponged around it. `lagTicks` sim steps run per main-thread decision.
function walkLagged(from, to, lagTicks, maxSeconds = 120) {
  let state = createSimulationState({ ...config, initialPosition: from });
  const path = findPath(grid, state.position, to);
  let arrived = false;
  let stalled = false;
  const walker = createPathWalker({
    getPosition: () => state.position,
    lineOfSight: (a, b) => hasLineOfSight(grid, a, b),
    replan: (pos, goal) => findPath(grid, pos, goal),
    onArrive: () => { arrived = true; },
    onStall: () => { stalled = true; },
  });
  walker.setPath(path);
  const trace = [];
  let input = { x: 0, z: 0 };
  // keep stepping after arrival too: the last input must not carry the player on
  const total = Math.round(maxSeconds / FIXED_SIMULATION_DT);
  for (let f = 0; f < total; f += 1) {
    if (f % lagTicks === 0) input = walker.getVector(FIXED_SIMULATION_DT * lagTicks);
    state = stepSimulationState(state, { config, input });
    trace.push({ ...state.position });
    if (!walker.hasPath() && trace.length > 1 && f % lagTicks === lagTicks - 1 && arrived) break;
  }
  return { arrived, stalled, state, trace, path };
}

describe('tap-to-move arrival on slow frames', () => {
  const homeExit = layout.plots.find((p) => p.id === 'plot_home').exit;
  it.each([[1], [6], [20], [45]])('stops on the goal without overshoot or ping-pong (%i sim ticks per frame)', (lag) => {
    const goal = { x: homeExit.x + 2, z: homeExit.z + 2 };
    const { arrived, state, trace } = walkLagged(homeExit, goal, lag, 20);
    expect(arrived).toBe(true);
    expect(Math.hypot(state.position.x - goal.x, state.position.z - goal.z)).toBeLessThanOrEqual(0.1); // arriveRadius
    // never further past the goal than a hair, and no reversal along the approach
    const ux = goal.x - homeExit.x; const uz = goal.z - homeExit.z; const len = Math.hypot(ux, uz);
    const along = trace.map((p) => ((p.x - homeExit.x) * ux + (p.z - homeExit.z) * uz) / len);
    expect(Math.max(...along) - len).toBeLessThan(0.02);
    for (let i = 1; i < along.length; i += 1) expect(along[i]).toBeGreaterThanOrEqual(along[i - 1] - 1e-6);
  });

  it('a long corner-to-corner walk reaches its target on slow frames (live sweep stopped 31 m short)', () => {
    const corners = [
      { x: layout.bounds.minX + 2, z: layout.bounds.minZ + 2 },
      { x: layout.bounds.maxX - 2, z: layout.bounds.minZ + 2 },
      { x: layout.bounds.maxX - 2, z: layout.bounds.maxZ - 2 },
      { x: layout.bounds.minX + 2, z: layout.bounds.maxZ - 2 },
    ];
    let from = { ...homeExit };
    for (const lag of [1, 20]) {
      for (const c of corners) {
        const { arrived, stalled, state } = walkLagged(from, c, lag, 180);
        expect(stalled).toBe(false);
        expect(arrived).toBe(true);
        expect(Math.hypot(state.position.x - c.x, state.position.z - c.z)).toBeLessThan(0.3);
        from = state.position;
      }
    }
  });
});
