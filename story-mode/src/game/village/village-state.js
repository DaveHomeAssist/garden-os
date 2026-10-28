/**
 * Village state (Free Play only, campaign schema v10).
 *
 * campaign.village = {
 *   position: [x, z],   // metres, three.js axes (same as playerController)
 *   facingY: number,    // radians, rotation about +y
 *   insidePlot: boolean // true while the garden (bed) screen is open
 * }
 *
 * Saves from v9 and earlier have no `village` and get the default spawn.
 * They get the village spawn from 3D BOT's placement data.
 */

import VILLAGE_PLACEMENTS from '../../data/village-placements.json';

// 3D BOT's sidewalk spawn from village-placements.json (#78). Saves without a
// village (v9 and earlier) land here instead of the yard's old walk-sim spawn
// (0, 2.55), which sits in the middle of the village street.
const SPAWN_ENTRY = (VILLAGE_PLACEMENTS.entries ?? []).find((entry) => entry.kind === 'spawn');
export const VILLAGE_DEFAULT_SPAWN = Object.freeze(SPAWN_ENTRY
  ? { x: SPAWN_ENTRY.x, z: SPAWN_ENTRY.z, facingY: SPAWN_ENTRY.rotation ?? 0 }
  : { x: 0, z: 2.55, facingY: 0 });

export function createDefaultVillageState(spawn = VILLAGE_DEFAULT_SPAWN) {
  return {
    position: [spawn.x, spawn.z],
    facingY: spawn.facingY ?? 0,
    insidePlot: false,
  };
}

function finite(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Bring any stored value (missing, partial, garbage) to a valid village state. Pure. */
export function normalizeVillageState(raw, spawn = VILLAGE_DEFAULT_SPAWN) {
  const fallback = createDefaultVillageState(spawn);
  if (!raw || typeof raw !== 'object') return fallback;
  const pos = Array.isArray(raw.position) ? raw.position : null;
  const x = finite(pos?.[0], NaN);
  const z = finite(pos?.[1], NaN);
  const hasPosition = Number.isFinite(x) && Number.isFinite(z);
  return {
    position: hasPosition ? [x, z] : fallback.position,
    facingY: hasPosition ? finite(raw.facingY, fallback.facingY) : fallback.facingY,
    insidePlot: raw.insidePlot === true,
  };
}

/**
 * Pick where to put the player on load. Returns { x, z, facingY, insidePlot }.
 * `bounds` is { minX, maxX, minZ, maxZ }; `blockers` are AABBs
 * { minX, maxX, minZ, maxZ }. An out-of-bounds or inside-a-blocker position
 * (e.g. after a layout change) falls back to the spawn.
 */
export function resolveVillageSpawn(village, { bounds = null, blockers = [], spawn = VILLAGE_DEFAULT_SPAWN } = {}) {
  const state = normalizeVillageState(village, spawn);
  const [x, z] = state.position;
  const inBounds = !bounds || (x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ);
  const blocked = (blockers ?? []).some((b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ);
  if (!inBounds || blocked) {
    return { x: spawn.x, z: spawn.z, facingY: spawn.facingY ?? 0, insidePlot: state.insidePlot };
  }
  return { x, z, facingY: state.facingY, insidePlot: state.insidePlot };
}
