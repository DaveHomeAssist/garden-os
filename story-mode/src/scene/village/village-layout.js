/**
 * Village placements loader (pure data, no three.js).
 *
 * Validates a village-placements.json document and derives what the engine
 * needs from it: collision blockers (oriented rects from footprint + rotation),
 * walk bounds, the spawn point and the interactables list. The renderer and
 * the game layer both read this one result, so collision, visuals and triggers
 * can't drift apart.
 *
 * Schema (one entry per object, metres, three.js axes, rotation = rotationY):
 *   { id, kind: building|prop|plot|path|spawn, asset, x, z, rotation,
 *     footprint?: { w, d, offsetX?, offsetZ? }, collides, trigger?, plotId?,
 *     exit?: { x, z, facingY } (plots: sidewalk spot to return to), anchors?, labels?, triBudget?, points?/width?/sidewalkWidth?/displayName? (paths) }
 */
import VILLAGE_PLACEMENTS from '../../data/village-placements.json';

export const VILLAGE_ZONE_ID = 'village';
export const ENTRY_KINDS = Object.freeze(['building', 'prop', 'plot', 'path', 'spawn']);
export const TRIGGER_TYPES = Object.freeze([
  'enter_plot', 'open_shop', 'open_seeds', 'open_compost', 'open_tools', 'neighbour_plot_reserved',
]);
export const TRIGGER_RADIUS = Object.freeze({ min: 1.2, max: 1.8 });
export const TRIGGER_HYSTERESIS = 0.3;
/** Every plot holds the 8x8 max bed plus a 1 m border. */
export const MIN_PLOT_SIZE = 10;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export class VillageLayoutError extends Error {
  constructor(problems) {
    super(`village layout invalid:\n- ${problems.join('\n- ')}`);
    this.name = 'VillageLayoutError';
    this.problems = problems;
  }
}

/** Footprint centre in world space (footprint offset is in the entry's local frame). */
function footprintCentre(entry) {
  const f = entry.footprint;
  const r = entry.rotation ?? 0;
  const ox = f?.offsetX ?? 0;
  const oz = f?.offsetZ ?? 0;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: entry.x + (ox * c) + (oz * s), z: entry.z - (ox * s) + (oz * c) };
}

/** Gap between a solid object's front face and its trigger anchor (metres). */
export const TRIGGER_ANCHOR_GAP = 0.2;

/**
 * Where a trigger sits. Solid objects (stand, shed, seed box, bin) can't be
 * walked into, so their trigger anchors just in front of the face that looks
 * at the street (local +Z); walk-through spots (plots) trigger at their centre.
 */
export function triggerAnchor(entry) {
  if (!entry.collides || !entry.footprint) return { x: entry.x, y: 0, z: entry.z };
  const centre = footprintCentre(entry);
  const r = entry.rotation ?? 0;
  const ahead = (entry.footprint.d / 2) + TRIGGER_ANCHOR_GAP;
  return { x: centre.x + Math.sin(r) * ahead, y: 0, z: centre.z + Math.cos(r) * ahead };
}

/** Oriented rect blocker in the simulation-core shape ({min/max} + optional rotationY). */
export function blockerFromEntry(entry) {
  const { w, d } = entry.footprint;
  const centre = footprintCentre(entry);
  const blocker = {
    id: entry.id,
    minX: centre.x - (w / 2),
    maxX: centre.x + (w / 2),
    minZ: centre.z - (d / 2),
    maxZ: centre.z + (d / 2),
  };
  if (entry.rotation) blocker.rotationY = entry.rotation;
  return blocker;
}

/** Circle-vs-oriented-rect, the same maths as simulation-core (kept here so this module stays dependency-free). */
export function pointInsideBlocker(x, z, blocker, radius = 0) {
  const cx = (blocker.minX + blocker.maxX) / 2;
  const cz = (blocker.minZ + blocker.maxZ) / 2;
  const r = blocker.rotationY ?? 0;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const dx = x - cx;
  const dz = z - cz;
  const lx = (dx * c) - (dz * s);
  const lz = (dx * s) + (dz * c);
  const hw = (blocker.maxX - blocker.minX) / 2;
  const hd = (blocker.maxZ - blocker.minZ) / 2;
  const ox = lx - Math.max(-hw, Math.min(hw, lx));
  const oz = lz - Math.max(-hd, Math.min(hd, lz));
  return radius > 0 ? (ox * ox) + (oz * oz) < radius * radius : (ox === 0 && oz === 0);
}

export function validateVillagePlacements(doc) {
  const problems = [];
  if (!doc || typeof doc !== 'object') return ['document is not an object'];
  if (doc.zoneId !== VILLAGE_ZONE_ID) problems.push(`zoneId must be "${VILLAGE_ZONE_ID}"`);
  const b = doc.bounds;
  if (!b || ![b.minX, b.maxX, b.minZ, b.maxZ].every(isNum) || b.minX >= b.maxX || b.minZ >= b.maxZ) {
    problems.push('bounds must be {minX<maxX, minZ<maxZ}');
  }
  if (!Array.isArray(doc.credits) || !doc.credits.some((c) => typeof c === 'string' && c.includes('OpenStreetMap'))) {
    problems.push('credits must include the OpenStreetMap contributors (ODbL) line');
  }
  if (!Array.isArray(doc.entries) || doc.entries.length === 0) {
    problems.push('entries must be a non-empty array');
    return problems;
  }
  const ids = new Set();
  let spawns = 0;
  doc.entries.forEach((e, i) => {
    const tag = e?.id ? `entry ${e.id}` : `entry #${i}`;
    if (!e || typeof e.id !== 'string' || !e.id) { problems.push(`${tag}: missing id`); return; }
    if (ids.has(e.id)) problems.push(`${tag}: duplicate id`);
    ids.add(e.id);
    if (!ENTRY_KINDS.includes(e.kind)) problems.push(`${tag}: kind "${e.kind}" not in ${ENTRY_KINDS.join('|')}`);
    if (e.kind === 'spawn') spawns += 1;
    if (e.kind === 'path') {
      if (!Array.isArray(e.points) || e.points.length < 2 || !e.points.every((p) => Array.isArray(p) && isNum(p[0]) && isNum(p[1]))) {
        problems.push(`${tag}: path needs >= 2 [x, z] points`);
      }
      if (!isNum(e.width) || e.width <= 0) problems.push(`${tag}: path width must be > 0`);
      if (e.sidewalkWidth !== undefined && (!isNum(e.sidewalkWidth) || e.sidewalkWidth < 0)) problems.push(`${tag}: sidewalkWidth must be >= 0`);
      if (typeof e.displayName !== 'string' || !e.displayName.trim()) problems.push(`${tag}: path needs a displayName`);
      if (e.collides) problems.push(`${tag}: paths never collide`);
    } else {
      if (!isNum(e.x) || !isNum(e.z)) problems.push(`${tag}: x/z must be numbers`);
      if (e.rotation !== undefined && !isNum(e.rotation)) problems.push(`${tag}: rotation must be a number`);
    }
    const f = e.footprint;
    if (f != null) {
      if (!isNum(f.w) || !isNum(f.d) || f.w <= 0 || f.d <= 0) problems.push(`${tag}: footprint needs w > 0 and d > 0`);
      if ((f.offsetX !== undefined && !isNum(f.offsetX)) || (f.offsetZ !== undefined && !isNum(f.offsetZ))) problems.push(`${tag}: footprint offsets must be numbers`);
    }
    if (e.collides && !f) problems.push(`${tag}: collides but has no footprint`);
    if (e.kind === 'plot') {
      if (!e.plotId) problems.push(`${tag}: plot needs a plotId`);
      if (!e.exit || !isNum(e.exit.x) || !isNum(e.exit.z) || !isNum(e.exit.facingY)) problems.push(`${tag}: plot needs an exit {x, z, facingY} sidewalk spot`);
      if (!f || f.w < MIN_PLOT_SIZE || f.d < MIN_PLOT_SIZE) problems.push(`${tag}: plot must be at least ${MIN_PLOT_SIZE}x${MIN_PLOT_SIZE} m (8x8 bed + 1 m border)`);
    }
    const t = e.trigger;
    if (t != null) {
      if (!TRIGGER_TYPES.includes(t.type)) problems.push(`${tag}: trigger.type "${t.type}" not in the vocabulary`);
      if (!isNum(t.radius) || t.radius < TRIGGER_RADIUS.min || t.radius > TRIGGER_RADIUS.max) {
        problems.push(`${tag}: trigger.radius must be ${TRIGGER_RADIUS.min}-${TRIGGER_RADIUS.max}`);
      }
      if (typeof t.prompt !== 'string' || !t.prompt.trim()) problems.push(`${tag}: trigger needs a prompt`);
    }
  });
  if (spawns !== 1) problems.push(`exactly one spawn entry required (found ${spawns})`);
  if (problems.length) return problems;

  // Cross-entry checks on the derived data.
  const blockers = doc.entries.filter((e) => e.collides).map(blockerFromEntry);
  const spawn = doc.entries.find((e) => e.kind === 'spawn');
  if (spawn.x < b.minX || spawn.x > b.maxX || spawn.z < b.minZ || spawn.z > b.maxZ) problems.push('spawn is outside bounds');
  blockers.forEach((bl) => {
    if (pointInsideBlocker(spawn.x, spawn.z, bl, 0.25)) problems.push(`spawn overlaps blocker ${bl.id}`);
  });
  const triggered = doc.entries.filter((e) => e.trigger);
  triggered.forEach((e) => {
    const anchor = triggerAnchor(e);
    const dist = Math.hypot(spawn.x - anchor.x, spawn.z - anchor.z);
    if (dist <= e.trigger.radius + TRIGGER_HYSTERESIS) problems.push(`spawn sits inside the ${e.id} trigger (${dist.toFixed(2)} m)`);
  });
  // plot exits: walkable sidewalk spots outside every trigger, so returning never re-opens anything
  doc.entries.filter((e) => e.kind === 'plot').forEach((e) => {
    const { x, z } = e.exit;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) problems.push(`${e.id}: exit is outside bounds`);
    blockers.forEach((bl) => { if (pointInsideBlocker(x, z, bl, 0.25)) problems.push(`${e.id}: exit overlaps blocker ${bl.id}`); });
    triggered.forEach((t) => {
      const a = triggerAnchor(t);
      const dist = Math.hypot(x - a.x, z - a.z);
      if (dist <= t.trigger.radius + TRIGGER_HYSTERESIS) problems.push(`${e.id}: exit sits inside the ${t.id} trigger (${dist.toFixed(2)} m)`);
    });
  });
  return problems;
}

/**
 * Validate and derive. Throws VillageLayoutError on any problem.
 * Returns { zoneId, bounds, blockers, spawn, interactables, entries, paths, plots, credits, seed }.
 */
export function loadVillageLayout(doc = VILLAGE_PLACEMENTS) {
  const problems = validateVillagePlacements(doc);
  if (problems.length) throw new VillageLayoutError(problems);
  const entries = doc.entries.map((e) => ({ rotation: 0, ...e }));
  const spawnEntry = entries.find((e) => e.kind === 'spawn');
  const interactables = entries.filter((e) => e.trigger).map((e) => ({
    id: e.id,
    type: e.trigger.type,
    position: triggerAnchor(e),
    objectPosition: { x: e.x, y: 0, z: e.z },
    radius: e.trigger.radius,
    prompt: e.trigger.prompt,
    plotId: e.plotId ?? null,
    target: e.trigger.target ?? null,
    exit: e.exit ? { x: e.exit.x, z: e.exit.z, facingY: e.exit.facingY } : null,
  }));
  return {
    zoneId: doc.zoneId,
    seed: doc.seed ?? 1,
    bounds: { minX: doc.bounds.minX, maxX: doc.bounds.maxX, minZ: doc.bounds.minZ, maxZ: doc.bounds.maxZ },
    blockers: entries.filter((e) => e.collides).map(blockerFromEntry),
    spawn: { x: spawnEntry.x, y: 0, z: spawnEntry.z, facing: spawnEntry.rotation ?? 0 },
    interactables,
    entries,
    paths: entries.filter((e) => e.kind === 'path'),
    plots: entries.filter((e) => e.kind === 'plot'),
    credits: [...doc.credits],
  };
}

let cached = null;
/** The shipped layout, validated once. */
export function getVillageLayout() {
  if (!cached) cached = loadVillageLayout(VILLAGE_PLACEMENTS);
  return cached;
}
