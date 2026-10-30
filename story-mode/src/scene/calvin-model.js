// Calvin (the Old English Sheepdog) — low-poly GLB body for the procedural rig
// in garden-scene.js. The GLB (art-src/blender/build_calvin.py) carries one
// named mesh per rig part, each authored in the local frame of the pivot it
// hangs from, so the existing run / idle / hold animation drives it unchanged.
// Until the GLB arrives (or if it fails to load) the primitive fallback stays.
import * as THREE from 'three';

export const CALVIN_GLB_URL = new URL('../../assets/art/yard/calvin.glb', import.meta.url).href;

export const CALVIN_PART_NAMES = Object.freeze([
  'calvin_body',
  'calvin_head',
  'calvin_ear_l',
  'calvin_ear_r',
  'calvin_tail',
  'calvin_leg_upper',
  'calvin_leg_lower',
  'calvin_tongue',
]);

/** Shared painted material: per-face vertex colours, flat normals baked in the GLB. */
export function createCalvinMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
  mat.name = 'calvin-coat';
  return mat;
}

/** Find the named part meshes in a loaded glTF scene. Returns null if any is missing. */
export function collectCalvinParts(gltfScene) {
  const parts = {};
  gltfScene?.traverse?.((o) => {
    if (o.isMesh && CALVIN_PART_NAMES.includes(o.name)) parts[o.name] = o;
  });
  const missing = CALVIN_PART_NAMES.filter((n) => !parts[n]);
  return missing.length ? { parts: null, missing } : { parts, missing };
}

function attach(src, pivot, material, name) {
  // Keep the node's own transform (meshopt quantization stores its dequantize
  // scale/offset there); the part geometry is already in the pivot frame.
  const mesh = new THREE.Mesh(src.geometry, material);
  mesh.name = name;
  mesh.position.copy(src.position);
  mesh.quaternion.copy(src.quaternion);
  mesh.scale.copy(src.scale);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  pivot.add(mesh);
  return mesh;
}

/**
 * Swap the primitive sheepdog for the GLB parts.
 * rig: { torso, headPivot, ears: [l, r], tailPivot, legRigs: [{ hipPivot, kneePivot }], tongue, primitives: Mesh[] }
 * Returns the list of meshes added (for disposal), or null when the GLB is incomplete.
 */
export function applyCalvinModel(rig, gltfScene, material = createCalvinMaterial()) {
  const { parts } = collectCalvinParts(gltfScene);
  if (!parts) return null;
  for (const mesh of rig.primitives) {
    mesh.parent?.remove(mesh);
    mesh.geometry?.dispose?.();
  }
  const added = [];
  added.push(attach(parts.calvin_body, rig.torso, material, 'calvin-body'));
  added.push(attach(parts.calvin_head, rig.headPivot, material, 'calvin-head'));
  added.push(attach(parts.calvin_ear_l, rig.ears[0], material, 'calvin-ear-l'));
  added.push(attach(parts.calvin_ear_r, rig.ears[1], material, 'calvin-ear-r'));
  added.push(attach(parts.calvin_tail, rig.tailPivot, material, 'calvin-tail'));
  rig.legRigs.forEach(({ hipPivot, kneePivot }, i) => {
    added.push(attach(parts.calvin_leg_upper, hipPivot, material, `calvin-leg-upper-${i}`));
    added.push(attach(parts.calvin_leg_lower, kneePivot, material, `calvin-leg-lower-${i}`));
  });
  // The tongue keeps its object (the run animation toggles and swings it); only
  // its geometry/material change, and the GLB tongue already hangs downward.
  const tongue = rig.tongue;
  const t = parts.calvin_tongue;
  tongue.geometry?.dispose?.();
  tongue.geometry = t.geometry;
  tongue.material = material;
  tongue.scale.copy(t.scale);
  tongue.position.add(t.position);
  tongue.rotation.set(0, 0, 0.1);
  return added;
}
