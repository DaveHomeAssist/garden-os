/**
 * Yard art layout — where the opening-yard art pass puts things.
 *
 * Pure data + deterministic helpers (no three.js), so tests can prove the
 * art never sits on top of gameplay: collision, walk lanes, interactables and
 * exits come from specs/WORLD_MAP.json and are not changed by the art pass.
 * World units: metres, three.js axes (x right, z toward the default camera).
 */

/** Cottage placement. Footprint matches the WORLD_MAP `rowhouse` blocker. */
export const COTTAGE = {
  position: { x: -2.47, z: -7.4 },
  rotationY: 0,
  // Wall block half-extents in world units (front wall at z = -6.15).
  halfWidth: 1.7,
  halfDepth: 1.25,
  doorX: -2.89,
  frontZ: -6.15,
  // Neighbour cottages peeking over the treeline (same mesh, instanced).
  neighbours: [
    { x: -15.5, z: -19.5, rotationY: 0.35, scale: 0.95 },
    { x: 17.5, z: -16.5, rotationY: -0.6, scale: 0.9 },
  ],
};

export const YARD_BOUNDS = { min: -9.3, max: 9.3 };
export const GATE = { x: 0, z: -9.3, halfWidth: 1.8 };

/** Worn paths as polylines (x, z) with a width in metres. */
export const PATHS = [
  {
    id: 'door-path',
    width: 0.95,
    points: [[-2.89, -5.5], [-2.86, -4.4], [-2.98, -3.2], [-3.05, -2.0], [-2.95, -0.6], [-2.6, 1.3], [-1.7, 2.25], [-0.3, 2.65], [1.3, 2.85], [3.1, 3.5], [4.4, 4.6]],
  },
  {
    id: 'gate-path',
    width: 0.9,
    points: [[0.0, -1.55], [0.3, -3.1], [0.62, -4.9], [0.55, -6.7], [0.22, -8.3], [0.0, -9.9], [0.0, -14.0]],
  },
];

/** Soft worn-earth zones: the ring the gardener walks round the bed, the tool corner. */
export const WEAR_ZONES = [
  { kind: 'rect', cx: 0, cz: 0, hx: 2.62, hz: 1.6, feather: 0.55, strength: 0.85 },
  { kind: 'circle', cx: -3.2, cz: -1.15, r: 0.95, feather: 0.5, strength: 0.7 },
  { kind: 'circle', cx: -2.89, cz: -5.6, r: 0.75, feather: 0.4, strength: 0.75 },
];

/** Ground-contact darkening painted into the ground mask (cheap fake AO). */
export const CONTACT_SHADOWS = [
  { kind: 'rect', cx: 0, cz: 0, hx: 2.2, hz: 1.2, feather: 0.32, strength: 0.75 },
  { kind: 'rect', cx: COTTAGE.position.x, cz: COTTAGE.position.z, hx: 1.82, hz: 1.37, feather: 0.55, strength: 0.85 },
  { kind: 'rect', cx: -0.55, cz: -7.08, hx: 0.3, hz: 0.42, feather: 0.3, strength: 0.6 },
];

/** Tree family placements inside the yard. The two trunks match WORLD_MAP tree blockers. */
export const YARD_TREES = [
  { variant: 'oak', x: 4.8, z: 0.1, scale: 1.0, rotationY: 0.4, collides: 'tree_east' },
  { variant: 'poplar', x: -4.7, z: 3.8, scale: 0.92, rotationY: 1.9, collides: 'tree_west' },
];

/** Bushes are walk-through dressing kept off paths and lanes, as the old shrubs were. */
export const YARD_BUSHES = [
  { x: -4.1, z: 2.6, scale: 0.95, rotationY: 0.2 },
  { x: 5.1, z: 3.0, scale: 0.8, rotationY: 1.1 },
  { x: -1.85, z: -5.8, scale: 0.62, rotationY: 0.5 },
  { x: -1.25, z: -5.88, scale: 0.5, rotationY: 2.2 },
  { x: -4.8, z: -5.75, scale: 0.7, rotationY: 1.4 },
  { x: 8.6, z: -8.5, scale: 1.0, rotationY: 0.8 },
  { x: -8.6, z: -8.4, scale: 1.1, rotationY: 2.6 },
  { x: 8.7, z: 8.6, scale: 0.9, rotationY: 1.7 },
  { x: -8.65, z: 8.5, scale: 1.0, rotationY: 0.1 },
  { x: 8.75, z: -2.2, scale: 0.75, rotationY: 2.9 },
  { x: -8.75, z: -1.0, scale: 0.85, rotationY: 0.6 },
  { x: 3.6, z: -8.7, scale: 0.85, rotationY: 1.0 },
];

/**
 * Prop kit placements. `lean` tilts a tool about its local X axis (radians)
 * so it rests against the crate. All positions sit outside every blocker.
 */
export const PROP_PLACEMENTS = [
  { prop: 'watering_can', x: 2.62, z: 0.78, rotationY: -2.2 },
  { prop: 'crate', x: 2.78, z: 1.88, rotationY: 0.28 },
  { prop: 'pot_large', x: 3.08, z: 2.48, rotationY: 0.0 },
  { prop: 'pot_small', x: 2.7, z: 2.72, rotationY: 1.2 },
  { prop: 'seed_sack', x: -2.62, z: 1.9, rotationY: 0.6 },
  // tool corner by the tool_shed interactable (-3, -1)
  { prop: 'crate', x: -3.42, z: -1.32, rotationY: 1.75 },
  { prop: 'spade', x: -3.12, z: -1.12, rotationY: 1.6, lean: -0.32, leanZ: 0.08 },
  { prop: 'rake', x: -3.66, z: -0.92, rotationY: 1.95, lean: -0.36, leanZ: -0.05 },
  { prop: 'seed_sack', x: -3.75, z: -1.75, rotationY: 2.4, scale: 0.85 },
  // doorstep
  { prop: 'pot_large', x: -3.62, z: -5.95, rotationY: 0.4 },
  { prop: 'pot_small', x: -2.16, z: -5.92, rotationY: 2.0 },
  { prop: 'watering_can', x: -3.95, z: -5.55, rotationY: 0.9, scale: 0.85 },
  // stepping stones down the door path
  { prop: 'stepping_stone', x: -2.86, z: -5.0, rotationY: 0.2 },
  { prop: 'stepping_stone', x: -2.82, z: -4.4, rotationY: 1.4, scale: 0.92 },
  { prop: 'stepping_stone', x: -2.94, z: -3.8, rotationY: 2.3 },
  { prop: 'stepping_stone', x: -3.0, z: -3.2, rotationY: 0.9, scale: 1.05 },
  { prop: 'stepping_stone', x: -3.04, z: -2.6, rotationY: 2.9, scale: 0.9 },
];

/**
 * Prop set 1 (props_set1.glb). Blender -Y front = three.js +Z, so rotationY = -PI/2
 * faces a prop toward -X. All clear of blockers, paths, interactables and the exit lane.
 */
export const PROP_SET1_PLACEMENTS = [
  // parked just outside the tool corner (tool_shed interactable at -3, -1), handles toward the shed
  { prop: 'wheelbarrow', x: -4.75, z: -2.35, rotationY: 2.35 },
  // under the front-right (east) eave corner, where the gutter downspout would drop; in view of the default camera
  { prop: 'rain_barrel', x: -0.55, z: -5.75, rotationY: 0.4 },
  // in the oak's shade, facing the bed
  { prop: 'garden_bench', x: 4.05, z: 1.4, rotationY: -Math.PI / 2 },
  // near the east fence, left of the gate path
  { prop: 'birdhouse', x: 3.4, z: -4.6, rotationY: -0.5 },
];

/** Deterministic hash-based RNG (mulberry32). */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1e-6;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  const qx = ax + dx * t;
  const qz = az + dz * t;
  return Math.hypot(px - qx, pz - qz);
}

export function distanceToPath(path, x, z) {
  let best = Infinity;
  for (let i = 0; i < path.points.length - 1; i += 1) {
    const [ax, az] = path.points[i];
    const [bx, bz] = path.points[i + 1];
    best = Math.min(best, distToSegment(x, z, ax, az, bx, bz));
  }
  return best;
}

function zoneValue(zone, x, z) {
  if (zone.kind === 'circle') {
    const d = Math.hypot(x - zone.cx, z - zone.cz);
    return (1 - smoothstep(zone.r - zone.feather, zone.r, d)) * zone.strength;
  }
  const dx = Math.max(0, Math.abs(x - zone.cx) - zone.hx + zone.feather);
  const dz = Math.max(0, Math.abs(z - zone.cz) - zone.hz + zone.feather);
  const d = Math.hypot(dx, dz);
  return (1 - smoothstep(0, zone.feather, d)) * zone.strength;
}

/**
 * Ground mask at a world point: path (packed earth), wear (scuffed dirt) and
 * ao (contact darkening), each 0..1. Same function paints the GPU mask and
 * drives grass/flower scatter, so grass never grows on a path.
 */
export function groundMaskAt(x, z) {
  let path = 0;
  for (const p of PATHS) {
    const d = distanceToPath(p, x, z);
    path = Math.max(path, 1 - smoothstep(p.width * 0.32, p.width * 0.62, d));
  }
  let wear = 0;
  for (const zone of WEAR_ZONES) wear = Math.max(wear, zoneValue(zone, x, z));
  // paths are fringed by a little scuffed earth
  for (const p of PATHS) {
    const d = distanceToPath(p, x, z);
    wear = Math.max(wear, (1 - smoothstep(p.width * 0.5, p.width * 1.05, d)) * 0.55);
  }
  let ao = 0;
  for (const zone of CONTACT_SHADOWS) ao = Math.max(ao, zoneValue(zone, x, z));
  for (const t of YARD_TREES) ao = Math.max(ao, (1 - smoothstep(0.15, 1.15 * t.scale, Math.hypot(x - t.x, z - t.z))) * 0.55);
  for (const b of YARD_BUSHES) ao = Math.max(ao, (1 - smoothstep(0.05, 0.6 * b.scale, Math.hypot(x - b.x, z - b.z))) * 0.5);
  for (const p of [...PROP_PLACEMENTS, ...PROP_SET1_PLACEMENTS]) {
    if (p.prop === 'stepping_stone') continue;
    ao = Math.max(ao, (1 - smoothstep(0.04, 0.32 * (p.scale ?? 1), Math.hypot(x - p.x, z - p.z))) * 0.45);
  }
  // fence foot: posts and rails sit in a thin line of shade
  const fenceD = Math.min(Math.abs(Math.abs(x) - 9.3), Math.abs(Math.abs(z) - 9.3));
  const insideFenceSpan = Math.abs(x) <= 9.4 && Math.abs(z) <= 9.4;
  if (insideFenceSpan) ao = Math.max(ao, (1 - smoothstep(0.02, 0.3, fenceD)) * 0.35);
  return { path, wear, ao };
}

/** Footprints where no grass, flowers or bushes may be scattered. */
export const NO_SCATTER = [
  { minX: -2.3, maxX: 2.3, minZ: -1.45, maxZ: 1.45 }, // bed (+ blocker margin)
  { minX: -4.45, maxX: -0.25, minZ: -9.35, maxZ: -5.4 }, // cottage + steps
];

export function isScatterBlocked(x, z) {
  return NO_SCATTER.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
}

/** Treeline outside the fence, deterministic Poisson-ish scatter. */
export function buildTreeline(count, seed = 4242) {
  const rng = makeRng(seed);
  const out = [];
  const variants = ['oak', 'poplar', 'pine', 'oak', 'pine', 'bush'];
  let guard = 0;
  while (out.length < count && guard < count * 60) {
    guard += 1;
    const a = rng() * Math.PI * 2;
    const r = 13.5 + Math.pow(rng(), 0.75) * 26;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.abs(x) < 10.6 && Math.abs(z) < 10.6) continue; // yard + margin
    if (z > 8 && r < 24) continue; // keep the default camera side open
    if (x > 7 && z > 5 && r < 26) continue; // and the reference three-quarter camera
    if (Math.abs(x) < 2.6 && z < -9 && z > -26) continue; // lane out of the gate
    if (out.some((t) => Math.hypot(t.x - x, t.z - z) < 1.9)) continue;
    const variant = variants[Math.floor(rng() * variants.length)];
    out.push({ variant, x, z, scale: 0.8 + rng() * 0.6, rotationY: rng() * Math.PI * 2 });
  }
  return out;
}

/** Scatter for instanced grass clumps / flowers inside and just outside the yard. */
export function buildGroundScatter(count, { seed = 99, flowers = false } = {}) {
  const rng = makeRng(seed);
  const out = [];
  let guard = 0;
  while (out.length < count && guard < count * 40) {
    guard += 1;
    const x = (rng() * 2 - 1) * 12.5;
    const z = (rng() * 2 - 1) * 12.5;
    if (isScatterBlocked(x, z)) continue;
    const m = groundMaskAt(x, z);
    if (m.path > 0.08 || m.wear > (flowers ? 0.15 : 0.42)) continue;
    // denser along edges people do not walk: fence line, house, trees
    const edge = Math.max(
      1 - Math.min(Math.abs(Math.abs(x) - 9.3), Math.abs(Math.abs(z) - 9.3)) / 2.2,
      m.ao * 1.4,
      0,
    );
    const keep = flowers ? 0.12 + edge * 0.88 : 0.07 + edge * 0.93;
    if (rng() > keep) continue;
    out.push({ x, z, scale: 0.7 + rng() * 0.6, rotationY: rng() * Math.PI * 2, tint: rng(), edge: Math.min(1, edge) });
  }
  return out;
}
