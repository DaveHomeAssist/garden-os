/**
 * Shared prop-kit loader (one GLB with one named node per prop -> geometries by
 * name -> one merged geometry at a list of placements). Extracted from
 * yard-art.js unchanged so the yard and the village place props the same way.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Meshopt/quantized glTF attributes are normalized int8/int16 (decoded by the
 * node transform). Bake them to float so the geometry can be transformed and
 * merged without clamping to [-1, 1].
 */
export function toFloatGeometry(source) {
  const geo = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(source.attributes)) {
    const n = attr.itemSize;
    const out = new Float32Array(attr.count * n);
    for (let i = 0; i < attr.count; i += 1) {
      for (let k = 0; k < n; k += 1) out[i * n + k] = attr.getComponent ? attr.getComponent(i, k) : attr.array[i * n + k];
    }
    geo.setAttribute(name, new THREE.BufferAttribute(out, n));
  }
  if (source.index) geo.setIndex(Array.from(source.index.array));
  return geo;
}

/** Loaded glTF -> { propName: float geometry in kit space }. */
export function propKitGeometriesFromGltf(gltf) {
  const byName = {};
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const key = (o.name || o.parent?.name || '').replace(/_\d+$/, '');
    byName[key] = toFloatGeometry(o.geometry).applyMatrix4(o.matrixWorld);
  });
  return byName;
}

/**
 * Place props ({prop, x, z, rotationY?, lean?, leanZ?, scale?, y?}) and merge
 * them into one geometry. Missing prop names are reported through `errors`.
 */
export function mergePropPlacements(byName, placements, name, errors = []) {
  const parts = [];
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler();
  for (const p of placements) {
    const g = byName[p.prop];
    if (!g) { errors.push(`missing prop ${p.prop}`); continue; }
    e.set(p.lean ?? 0, p.rotationY ?? 0, p.leanZ ?? 0, 'YXZ');
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(p.x, p.y ?? (p.prop === 'stepping_stone' ? -0.005 : 0), p.z), q, new THREE.Vector3().setScalar(p.scale ?? 1));
    parts.push(g.clone().applyMatrix4(m));
  }
  if (!parts.length) throw new Error(`${name}: no props placed`);
  return mergeGeometries(parts.map((g) => {
    // identical attribute sets for merging
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    return g;
  }), false);
}

/** Kit-space x/z bounding box per prop: { name: { minX, maxX, minZ, maxZ, height } }. */
export function propKitBounds(byName) {
  const out = {};
  for (const [name, g] of Object.entries(byName)) {
    g.computeBoundingBox();
    const b = g.boundingBox;
    out[name] = { minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, height: b.max.y };
  }
  return out;
}
