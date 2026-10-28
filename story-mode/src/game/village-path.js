/**
 * 0.5 m grid pathfinder for tap-to-move (and the reachability test).
 *
 * A cell is walkable when the player's collision circle (plus a small margin)
 * at its centre clears every blocker and the bounds. A* runs 8-connected with
 * no corner cutting, then the path is string-pulled with line-of-sight checks
 * so the player walks straight lines between the few corners that matter.
 */
import { PLAYER_RADIUS, circleIntersectsRect } from '../engine/simulation-core.js';

export const GRID_CELL = 0.5;
const CLEARANCE = PLAYER_RADIUS + 0.07;
const SQRT2 = Math.SQRT2;

export function buildWalkGrid({ bounds, blockers = [] }, { cell = GRID_CELL, clearance = CLEARANCE } = {}) {
  const cols = Math.max(1, Math.floor((bounds.maxX - bounds.minX) / cell));
  const rows = Math.max(1, Math.floor((bounds.maxZ - bounds.minZ) / cell));
  const walkable = new Uint8Array(cols * rows);
  const originX = bounds.minX + ((bounds.maxX - bounds.minX) - (cols * cell)) / 2 + cell / 2;
  const originZ = bounds.minZ + ((bounds.maxZ - bounds.minZ) - (rows * cell)) / 2 + cell / 2;
  for (let r = 0; r < rows; r += 1) {
    const z = originZ + r * cell;
    for (let c = 0; c < cols; c += 1) {
      const x = originX + c * cell;
      const inside = x - clearance >= bounds.minX && x + clearance <= bounds.maxX
        && z - clearance >= bounds.minZ && z + clearance <= bounds.maxZ;
      walkable[r * cols + c] = inside && !blockers.some((b) => circleIntersectsRect(x, z, clearance, b)) ? 1 : 0;
    }
  }
  const toCell = (x, z) => ({
    c: Math.max(0, Math.min(cols - 1, Math.round((x - originX) / cell))),
    r: Math.max(0, Math.min(rows - 1, Math.round((z - originZ) / cell))),
  });
  const toWorld = (c, r) => ({ x: originX + c * cell, z: originZ + r * cell });
  const isWalkable = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && walkable[r * cols + c] === 1;
  return { cols, rows, cell, walkable, toCell, toWorld, isWalkable, bounds, blockers, clearance };
}

/** Nearest walkable cell to (x, z), searching outward ring by ring. */
export function nearestWalkableCell(grid, x, z, maxRing = 12) {
  const start = grid.toCell(x, z);
  if (grid.isWalkable(start.c, start.r)) return start;
  let best = null;
  for (let ring = 1; ring <= maxRing && !best; ring += 1) {
    let bestD = Infinity;
    for (let dr = -ring; dr <= ring; dr += 1) {
      for (let dc = -ring; dc <= ring; dc += 1) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const c = start.c + dc;
        const r = start.r + dr;
        if (!grid.isWalkable(c, r)) continue;
        const w = grid.toWorld(c, r);
        const d = Math.hypot(w.x - x, w.z - z);
        if (d < bestD) { bestD = d; best = { c, r }; }
      }
    }
  }
  return best;
}

function heuristic(ac, ar, bc, br) {
  const dx = Math.abs(ac - bc);
  const dz = Math.abs(ar - br);
  return (dx + dz) + (SQRT2 - 2) * Math.min(dx, dz);
}

/** Binary min-heap keyed by f. */
function createHeap() {
  const items = [];
  return {
    get size() { return items.length; },
    push(node, f) {
      items.push({ node, f });
      let i = items.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (items[p].f <= items[i].f) break;
        [items[p], items[i]] = [items[i], items[p]];
        i = p;
      }
    },
    pop() {
      const top = items[0];
      const last = items.pop();
      if (items.length) {
        items[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1;
          const r = l + 1;
          let m = i;
          if (l < items.length && items[l].f < items[m].f) m = l;
          if (r < items.length && items[r].f < items[m].f) m = r;
          if (m === i) break;
          [items[m], items[i]] = [items[i], items[m]];
          i = m;
        }
      }
      return top.node;
    },
  };
}

/** Grid cells from start to goal (inclusive) or null. */
export function findGridPath(grid, start, goal) {
  const { cols } = grid;
  const startId = start.r * cols + start.c;
  const goalId = goal.r * cols + goal.c;
  const g = new Float64Array(cols * grid.rows).fill(Infinity);
  const from = new Int32Array(cols * grid.rows).fill(-1);
  const closed = new Uint8Array(cols * grid.rows);
  const heap = createHeap();
  g[startId] = 0;
  heap.push(startId, heuristic(start.c, start.r, goal.c, goal.r));
  while (heap.size) {
    const id = heap.pop();
    if (closed[id]) continue;
    if (id === goalId) break;
    closed[id] = 1;
    const c = id % cols;
    const r = (id - c) / cols;
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (!dr && !dc) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (!grid.isWalkable(nc, nr)) continue;
        // no corner cutting
        if (dr && dc && (!grid.isWalkable(c + dc, r) || !grid.isWalkable(c, r + dr))) continue;
        const nid = nr * cols + nc;
        if (closed[nid]) continue;
        const cost = g[id] + (dr && dc ? SQRT2 : 1);
        if (cost < g[nid]) {
          g[nid] = cost;
          from[nid] = id;
          heap.push(nid, cost + heuristic(nc, nr, goal.c, goal.r));
        }
      }
    }
  }
  if (startId !== goalId && from[goalId] === -1) return null;
  const cells = [];
  for (let id = goalId; id !== -1; id = from[id]) {
    const c = id % cols;
    cells.push({ c, r: (id - c) / cols });
    if (id === startId) break;
  }
  return cells.reverse();
}

/** True when the straight walk a->b stays clear of blockers (sampled every quarter cell). */
export function hasLineOfSight(grid, a, b) {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(dist / (grid.cell * 0.25)));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    if (x - grid.clearance < grid.bounds.minX || x + grid.clearance > grid.bounds.maxX
      || z - grid.clearance < grid.bounds.minZ || z + grid.clearance > grid.bounds.maxZ) return false;
    if (grid.blockers.some((bl) => circleIntersectsRect(x, z, grid.clearance, bl))) return false;
  }
  return true;
}

/**
 * World-space waypoints from `from` to `to` (excluding the start), or null if
 * unreachable. A goal inside a blocker snaps to the nearest walkable cell.
 */
export function findPath(grid, from, to) {
  const start = nearestWalkableCell(grid, from.x, from.z);
  const goal = nearestWalkableCell(grid, to.x, to.z);
  if (!start || !goal) return null;
  const cells = findGridPath(grid, start, goal);
  if (!cells) return null;
  const goalCellWorld = grid.toWorld(goal.c, goal.r);
  const goalWorld = hasLineOfSight(grid, goalCellWorld, to) ? { x: to.x, z: to.z } : goalCellWorld;
  const raw = [{ x: from.x, z: from.z }, ...cells.slice(1, -1).map((cell) => grid.toWorld(cell.c, cell.r)), goalWorld];
  // string-pull
  const out = [];
  let anchor = raw[0];
  let i = 1;
  while (i < raw.length) {
    let j = i;
    while (j + 1 < raw.length && hasLineOfSight(grid, anchor, raw[j + 1])) j += 1;
    out.push(raw[j]);
    anchor = raw[j];
    i = j + 1;
  }
  return out;
}

/**
 * Follows waypoints with the same arrival/stall rules as walk-autopilot, but
 * without stopping at intermediate corners. A corner is cut early only when
 * the straight line from the player's actual position to the next waypoint is
 * clear (`lineOfSight`); a stall re-plans from where the player is (`replan`)
 * up to twice before giving up. Returns unit vectors for the walk sim.
 */
export function createPathWalker({
  getPosition, arriveRadius = 0.1, cornerRadius = 0.4, stallSeconds = 1.2,
  lineOfSight = null, replan = null, onArrive = null, onStall = null,
} = {}) {
  let waypoints = [];
  let best = Infinity;
  let stalled = 0;
  let replans = 0;
  const near = (pos, wp, r) => Math.hypot(wp.x - pos.x, wp.z - pos.z) <= r;
  return {
    setPath(points, { keepReplans = false } = {}) {
      waypoints = Array.isArray(points) ? points.map((p) => ({ x: p.x, z: p.z })) : [];
      best = Infinity;
      stalled = 0;
      if (!keepReplans) replans = 0;
    },
    clear() { waypoints = []; },
    hasPath: () => waypoints.length > 0,
    getWaypoints: () => waypoints.map((p) => ({ ...p })),
    getVector(dt = 1 / 60) {
      const pos = getPosition();
      if (!waypoints.length || !pos) return { x: 0, z: 0 };
      for (;;) {
        const wp = waypoints[0];
        const last = waypoints.length === 1;
        const reached = near(pos, wp, arriveRadius)
          || (!last && near(pos, wp, cornerRadius) && (!lineOfSight || lineOfSight(pos, waypoints[1])));
        if (reached) {
          waypoints.shift();
          best = Infinity;
          stalled = 0;
          if (!waypoints.length) { onArrive?.(); return { x: 0, z: 0 }; }
          continue;
        }
        const d = Math.hypot(wp.x - pos.x, wp.z - pos.z);
        if (d < best - 0.02) { best = d; stalled = 0; } else {
          stalled += dt;
          if (stalled > stallSeconds) {
            const goal = waypoints[waypoints.length - 1];
            const next = replan && replans < 2 ? replan(pos, goal) : null;
            if (next && next.length) {
              replans += 1;
              this.setPath(next, { keepReplans: true });
              return { x: 0, z: 0 };
            }
            waypoints = [];
            onStall?.();
            return { x: 0, z: 0 };
          }
        }
        return { x: (wp.x - pos.x) / d, z: (wp.z - pos.z) / d };
      }
    },
  };
}
