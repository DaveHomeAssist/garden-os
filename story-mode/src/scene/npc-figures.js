// Neighbour figures: stylised low-poly GLB bodies for the Story Mode NPC
// markers (art-src/blender/build_npcs.py -> assets/art/neighborhood/npcs.glb).
// Every figure is two named meshes on one shared vertex-colour material:
// npc_<key>_body (feet at y 0, facing +Z) and npc_<key>_head (authored around
// a neck pivot NECK_Y above the feet), so a figure costs two draw calls.
// The primitive marker a zone builds first stays in place until the GLB has
// loaded, and stays for good if the GLB fails or is missing a part.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export const NPC_GLB_URL = new URL('../../assets/art/neighborhood/npcs.glb', import.meta.url).href;

export const NPC_NECK_Y = 0.64;

/** Figures are authored ~1 m tall; drawn a little larger so they read at the zone camera's distance. */
export const NPC_FIGURE_SCALE = 1.2;

export const NPC_FIGURE_KEYS = Object.freeze(['gus', 'lila', 'maya', 'pat', 'sam', 'jo', 'robin', 'folk']);

// Official NPC ids (data/npcs.js) and neighbour template ids -> figure key.
const FIGURE_BY_NPC_ID = Object.freeze({
  old_gus: 'gus',
  lila: 'lila',
  maya: 'maya',
  neighbor_gardener: 'pat',
  neighbor_beekeeper: 'sam',
  neighbor_sam: 'sam',
  neighbor_composter: 'jo',
  neighbor_birdwatcher: 'robin',
  // quest-side aliases (data/quest-sites.js, ui/quest-text.js)
  neighbor_pat: 'pat',
  neighbor_jo: 'jo',
  neighbor_robin: 'robin',
});

/** Figure key for an NPC; content-pack and unknown neighbours get the plain 'folk' figure. */
export function figureKeyFor(npc) {
  return FIGURE_BY_NPC_ID[npc?.id] ?? 'folk';
}

let gltfPromise = null;

/** Load (once) and cache the figures GLB. Resolves to the glTF scene, or null on failure. */
export function loadNpcFigures({ loader = null, url = NPC_GLB_URL } = {}) {
  if (gltfPromise) return gltfPromise;
  // No DOM (unit tests, workers): keep the primitives, don't try to fetch.
  if (!loader && typeof window === 'undefined') return Promise.resolve(null);
  const gltfLoader = loader ?? new GLTFLoader();
  if (!loader) gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  gltfPromise = gltfLoader.loadAsync(url)
    .then((gltf) => gltf?.scene ?? null)
    .catch((err) => {
      console.warn('[npc-figures] GLB failed to load; keeping the primitive markers', err?.message ?? err);
      gltfPromise = null; // let a later zone visit retry
      return null;
    });
  return gltfPromise;
}

/** Test hook: forget the cached GLB. */
export function resetNpcFigureCache() {
  gltfPromise = null;
}

/** Shared painted material: per-face vertex colours, flat normals baked in the GLB. */
export function createNpcFigureMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
  mat.name = 'npc-figure-paint';
  return mat;
}

/** Find a figure's two part meshes in a loaded glTF scene. */
export function collectNpcFigureParts(gltfScene, key) {
  const want = { body: `npc_${key}_body`, head: `npc_${key}_head` };
  const found = {};
  gltfScene?.traverse?.((o) => {
    if (!o.isMesh) return;
    if (o.name === want.body) found.body = o;
    if (o.name === want.head) found.head = o;
  });
  return found.body && found.head ? found : null;
}

function partMesh(src, material, name) {
  // Clone the geometry so a zone's tracker can dispose its copy without
  // touching the cached GLB. Keep the node transform: meshopt quantisation
  // stores its dequantise scale / offset there.
  const mesh = new THREE.Mesh(src.geometry.clone(), material);
  mesh.name = name;
  mesh.position.copy(src.position);
  mesh.quaternion.copy(src.quaternion);
  mesh.scale.copy(src.scale);
  mesh.castShadow = true;
  return mesh;
}

/**
 * Build a figure group for an NPC from the loaded glTF scene, or null when its
 * parts are missing. The head mesh hangs from a `headPivot` group at the neck so
 * idle and turn-to-face only rotate that pivot.
 */
export function buildNpcFigure(gltfScene, npc, material = createNpcFigureMaterial()) {
  let key = figureKeyFor(npc);
  let parts = collectNpcFigureParts(gltfScene, key);
  if (!parts && key !== 'folk') {
    key = 'folk';
    parts = collectNpcFigureParts(gltfScene, key);
  }
  if (!parts) return null;
  const figure = new THREE.Group();
  figure.name = `npc-figure:${key}`;
  figure.scale.setScalar(NPC_FIGURE_SCALE);
  // Idle breathing scales this pivot, never the mesh: the mesh's own scale is
  // meshopt's dequantise factor.
  const bodyPivot = new THREE.Group();
  bodyPivot.name = 'npc-figure-body-pivot';
  figure.add(bodyPivot);
  const body = partMesh(parts.body, material, `npc-figure-body:${key}`);
  bodyPivot.add(body);
  const headPivot = new THREE.Group();
  headPivot.name = 'npc-figure-head-pivot';
  headPivot.position.set(0, NPC_NECK_Y, 0);
  figure.add(headPivot);
  // The GLB head node sits at the neck already; author it relative to the pivot.
  const head = partMesh(parts.head, material, `npc-figure-head:${key}`);
  head.position.y -= NPC_NECK_Y;
  headPivot.add(head);
  figure.userData.npcFigure = {
    key,
    body: bodyPivot,
    headPivot,
    phase: (key.charCodeAt(0) % 7) * 0.9,
    yaw: 0,
    headYaw: 0,
  };
  return figure;
}

/**
 * Swap a zone's primitive NPC marker for its figure. `primitives` are the marker
 * meshes the figure replaces (removed and disposed only on success). The marker
 * group keeps its interactable, name tag and position. Returns the figure or null.
 */
export function applyNpcFigure(marker, gltfScene, npc, { primitives = [], material } = {}) {
  if (!marker || marker.userData?.npcFigureApplied) return null;
  const figure = buildNpcFigure(gltfScene, npc, material);
  if (!figure) return null;
  primitives.forEach((mesh) => {
    mesh.parent?.remove(mesh);
    mesh.geometry?.dispose?.();
    mesh.material?.dispose?.();
  });
  marker.add(figure);
  marker.userData.npcFigureApplied = true;
  return figure;
}

/**
 * Load the figures (cached) and upgrade a marker when they arrive. Never throws;
 * resolves to the figure or null (primitive kept).
 */
export function upgradeNpcMarker(marker, npc, { primitives = [], material, load = loadNpcFigures } = {}) {
  return Promise.resolve()
    .then(() => load())
    .then((scene) => (scene ? applyNpcFigure(marker, scene, npc, { primitives, material }) : null))
    .catch(() => null);
}

/**
 * Where to draw a figure: the NPC's slot, pushed just outside any house
 * footprint it falls inside (some WORLD_MAP npcSlots sit inside a house
 * blocker). Only the drawing moves; the interactable keeps the slot position.
 */
export function figureStandPosition(position, blockers = [], margin = 0.28) {
  let { x, z } = position;
  for (const b of blockers) {
    if (x <= b.minX || x >= b.maxX || z <= b.minZ || z >= b.maxZ) continue;
    const exits = [
      { d: x - b.minX, x: b.minX - margin, z },
      { d: b.maxX - x, x: b.maxX + margin, z },
      { d: z - b.minZ, x, z: b.minZ - margin },
      { d: b.maxZ - z, x, z: b.maxZ + margin },
    ].sort((a, c) => a.d - c.d);
    ({ x, z } = exits[0]);
  }
  return { x, z };
}

const TURN_RANGE = 3.2;     // metres: start looking at the player
const FACE_RANGE = 2.0;     // metres: turn the whole body as well
const HEAD_LIMIT = 0.9;     // radians either side

const scratch = new THREE.Vector3();

function approachAngle(current, target, rate, dt) {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return current + d * Math.min(1, rate * dt);
}

/**
 * Idle (breathing, gentle sway, head bob) and turn-to-face-player for every
 * figure under `root`. Cheap: a few trig calls per figure per frame.
 */
export function animateNpcFigures(root, dt, time, playerPosition = null) {
  root?.traverse?.((obj) => {
    const f = obj.userData?.npcFigure;
    if (!f) return;
    const t = time + f.phase;
    f.body.scale.set(1 + Math.sin(t * 2.1) * 0.012, 1 + Math.sin(t * 2.1 + 0.6) * 0.018, 1);
    obj.rotation.z = Math.sin(t * 0.9) * 0.025;
    f.headPivot.position.y = NPC_NECK_Y + Math.sin(t * 2.1 + 0.6) * 0.008;
    let bodyTarget = 0;
    let headTarget = 0;
    if (playerPosition) {
      const p = obj.getWorldPosition(scratch);
      const dx = playerPosition.x - p.x;
      const dz = playerPosition.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < TURN_RANGE && dist > 0.05) {
        const want = Math.atan2(dx, dz); // figure faces +Z at yaw 0
        if (dist < FACE_RANGE) bodyTarget = want;
        let rel = want - (dist < FACE_RANGE ? f.yaw : bodyTarget);
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        headTarget = Math.max(-HEAD_LIMIT, Math.min(HEAD_LIMIT, rel));
      }
    }
    f.yaw = approachAngle(f.yaw, bodyTarget, 3.0, dt);
    f.headYaw = approachAngle(f.headYaw, headTarget, 5.0, dt);
    obj.rotation.y = f.yaw;
    f.headPivot.rotation.y = f.headYaw;
    f.headPivot.rotation.x = Math.sin(t * 0.7) * 0.03;
  });
}
