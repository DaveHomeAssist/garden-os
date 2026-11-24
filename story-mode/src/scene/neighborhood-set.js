// The Neighborhood set dressing: low-poly houses, the rose arbor, the raised
// community bed and a picket fence round the edge
// (art-src/blender/build_neighborhood.py -> assets/art/neighborhood/).
// One geometry-only GLB with a node per piece plus one baked 1024 WebP atlas
// (kept out of the GLB because the CSP blocks GLTFLoader's blob: images).
// Pieces are authored in the zone's world coordinates inside the WORLD_MAP
// blocker footprints, so collision and navigation are unchanged. The blockout
// boxes stay until the art has loaded, and stay for good if it fails.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export const NEIGHBORHOOD_GLB_URL = new URL('../../assets/art/neighborhood/neighborhood.glb', import.meta.url).href;
export const NEIGHBORHOOD_ATLAS_URL = new URL('../../assets/art/neighborhood/neighborhood_atlas.webp', import.meta.url).href;

/** Static pieces, each replacing the blockout meshes registered under the same id. */
export const NEIGHBORHOOD_PIECES = Object.freeze(['house_west', 'house_east', 'cottage_south', 'arbor', 'community_bed']);
export const FENCE_PANEL = 'fence_panel';

// Zone edge fence: 1 m panels just outside the walkable bounds (+-8), with gaps
// for every exit (north 0, east/west z 1.4, south x 0 and x 5).
const FENCE_EDGE = 8.45;
const EXIT_GAPS = {
  north: [[-1.3, 1.3]],
  south: [[-1.5, 1.5], [3.5, 6.5]],
  east: [[0.0, 2.8]],
  west: [[0.0, 2.8]],
};

function inGap(v, gaps) {
  return gaps.some(([a, b]) => v + 0.5 > a && v - 0.5 < b);
}

/** Pure: where the fence panels go ({ x, z, rotY } per 1 m panel). */
export function computeFencePlacements(edge = FENCE_EDGE, span = 8) {
  const out = [];
  for (let i = -span; i < span; i++) {
    const c = i + 0.5;
    if (!inGap(c, EXIT_GAPS.north)) out.push({ x: c, z: edge, rotY: 0 });
    if (!inGap(c, EXIT_GAPS.south)) out.push({ x: c, z: -edge, rotY: Math.PI });
    if (!inGap(c, EXIT_GAPS.east)) out.push({ x: edge, z: c, rotY: Math.PI / 2 });
    if (!inGap(c, EXIT_GAPS.west)) out.push({ x: -edge, z: c, rotY: -Math.PI / 2 });
  }
  return out;
}

let artPromise = null;

/** Load (once) the set GLB + atlas. Resolves to { scene, atlas } or null on failure. */
export function loadNeighborhoodSet({ loader = null, textureLoader = null } = {}) {
  if (artPromise) return artPromise;
  if (!loader && typeof window === 'undefined') return Promise.resolve(null);
  const gltfLoader = loader ?? new GLTFLoader();
  if (!loader) gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  const texLoader = textureLoader ?? new THREE.TextureLoader();
  artPromise = Promise.all([gltfLoader.loadAsync(NEIGHBORHOOD_GLB_URL), texLoader.loadAsync(NEIGHBORHOOD_ATLAS_URL)])
    .then(([gltf, atlas]) => {
      atlas.colorSpace = THREE.SRGBColorSpace;
      atlas.flipY = false; // glTF UV convention
      atlas.anisotropy = 4;
      return { scene: gltf.scene, atlas };
    })
    .catch((err) => {
      console.warn('[neighborhood] set art failed to load; keeping the blockout', err?.message ?? err);
      artPromise = null;
      return null;
    });
  return artPromise;
}

export function resetNeighborhoodSetCache() {
  artPromise = null;
}

export function collectNeighborhoodPieces(gltfScene) {
  const found = {};
  gltfScene?.traverse?.((o) => {
    if (o.isMesh && (NEIGHBORHOOD_PIECES.includes(o.name) || o.name === FENCE_PANEL)) found[o.name] = o;
  });
  const missing = [...NEIGHBORHOOD_PIECES, FENCE_PANEL].filter((n) => !found[n]);
  return { pieces: missing.length ? null : found, missing };
}

function copyNode(src, dst) {
  dst.position.copy(src.position);
  dst.quaternion.copy(src.quaternion);
  dst.scale.copy(src.scale);
  return dst;
}

/**
 * Swap the blockout for the set. `blockout` maps piece id -> meshes to remove.
 * Returns the added objects, or null (blockout untouched) when a piece is missing.
 */
export function applyNeighborhoodSet(root, blockout, art) {
  const { pieces } = collectNeighborhoodPieces(art?.scene);
  if (!root || !pieces) return null;
  const material = new THREE.MeshStandardMaterial({ map: art.atlas ?? null, roughness: 0.88, metalness: 0 });
  material.name = 'neighborhood-baked';
  const added = [];
  NEIGHBORHOOD_PIECES.forEach((id) => {
    (blockout?.[id] ?? []).forEach((mesh) => {
      mesh.parent?.remove(mesh);
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
    });
    const mesh = copyNode(pieces[id], new THREE.Mesh(pieces[id].geometry.clone(), material));
    mesh.name = `neighborhood:${id}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    added.push(mesh);
  });
  // Fence: one instanced draw for every panel.
  const placements = computeFencePlacements();
  const src = pieces[FENCE_PANEL];
  const fence = new THREE.InstancedMesh(src.geometry.clone(), material, placements.length);
  fence.name = 'neighborhood:fence';
  const local = copyNode(src, new THREE.Object3D());
  local.updateMatrix();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  placements.forEach((p, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotY);
    m.compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(1, 1, 1)).multiply(local.matrix);
    fence.setMatrixAt(i, m);
  });
  fence.instanceMatrix.needsUpdate = true;
  fence.computeBoundingSphere();
  root.add(fence);
  added.push(fence);
  return added;
}
