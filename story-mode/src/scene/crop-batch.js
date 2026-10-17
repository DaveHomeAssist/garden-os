/**
 * Crop draw-call batching.
 *
 * A procedural crop is a Group of 8–13 small meshes, most of them leaves
 * that sway on their own ("breeze nodes", see registerBreezeNode in
 * garden-scene.js). Drawing each one separately costs ~11 draw calls per
 * crop plus the same again for the shadow pass, which dominates a full bed.
 *
 * batchCropGroup() merges every opaque mesh that shares a material look
 * into one BufferGeometry and moves the per-leaf breeze into the vertex
 * shader, so the motion is unchanged but a crop draws as 2–5 meshes.
 * Per-vertex attributes carry each leaf's pivot, rest rotation and breeze
 * parameters; per-crop uniforms carry time, phase seed and strength.
 *
 * Anything that does not fit the simple model (transparent, textured,
 * nested breeze nodes, non-XYZ Euler order, breeze node under a
 * transformed sub-group) is left exactly as built.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const BREEZE_PARS = /* glsl */ `
attribute vec3 aLocal;
attribute vec3 aLocalNormal;
attribute vec3 aPivot;
attribute vec3 aBaseRot;
attribute vec4 aBreeze;
attribute vec2 aSpeedPhase;
uniform float uBreezeTime;
uniform float uBreezePhaseSeed;
uniform float uBreezeStrength;
mat3 cropBreezeRotation() {
  float wave = sin(uBreezeTime * aSpeedPhase.x + uBreezePhaseSeed + aSpeedPhase.y);
  float ripple = cos(uBreezeTime * aSpeedPhase.x * 0.58 + uBreezePhaseSeed * 0.7 + aSpeedPhase.y);
  vec3 r = aBaseRot + vec3(ripple * aBreeze.x, ripple * aBreeze.y, wave * aBreeze.z) * uBreezeStrength;
  float cx = cos(r.x), sx = sin(r.x);
  float cy = cos(r.y), sy = sin(r.y);
  float cz = cos(r.z), sz = sin(r.z);
  // Euler 'XYZ' (three.js default): R = Rx * Ry * Rz, written column-major.
  return mat3(
    cy * cz, cx * sz + sx * sy * cz, sx * sz - cx * sy * cz,
    -cy * sz, cx * cz - sx * sy * sz, sx * cz + cx * sy * sz,
    sy, -sx * cy, cx * cy
  );
}
float cropBreezeLift() {
  float wave = sin(uBreezeTime * aSpeedPhase.x + uBreezePhaseSeed + aSpeedPhase.y);
  return max(0.0, wave) * aBreeze.w * uBreezeStrength;
}
`;

function patchShader(shader, uniforms, { normals }) {
  shader.uniforms.uBreezeTime = uniforms.uBreezeTime;
  shader.uniforms.uBreezePhaseSeed = uniforms.uBreezePhaseSeed;
  shader.uniforms.uBreezeStrength = uniforms.uBreezeStrength;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${BREEZE_PARS}`)
    .replace(
      '#include <begin_vertex>',
      'mat3 cropBreezeRot = cropBreezeRotation();\n'
        + 'vec3 transformed = aPivot + vec3(0.0, cropBreezeLift(), 0.0) + cropBreezeRot * aLocal;\n'
        + '#ifdef USE_ALPHAHASH\n\tvPosition = vec3( position );\n#endif',
    );
  if (normals) {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      'vec3 objectNormal = cropBreezeRotation() * aLocalNormal;\n#ifdef USE_TANGENT\n\tvec3 objectTangent = vec3( tangent.xyz );\n#endif',
    );
  }
}

function materialKey(mesh) {
  const m = mesh.material;
  return [
    m.type,
    m.color?.getHex(),
    m.emissive?.getHex(),
    m.emissiveIntensity,
    m.roughness,
    m.metalness,
    m.side,
    m.flatShading,
    mesh.castShadow,
    mesh.receiveShadow,
  ].join('|');
}

function isEligibleMaterial(material) {
  return material
    && !Array.isArray(material)
    && material.isMeshStandardMaterial
    && !material.transparent
    && material.opacity === 1
    && !material.map
    && !material.alphaMap
    && !material.normalMap
    && !material.vertexColors
    && !material.onBeforeCompile?.isCropBreeze
    && material.visible !== false;
}

/** Find the breeze node controlling `mesh` (itself or an ancestor below `group`). */
function breezeOwner(mesh, group) {
  let owner = null;
  for (let node = mesh; node && node !== group; node = node.parent) {
    if (node.userData?.breeze) {
      if (owner) return { invalid: true };
      owner = node;
    }
  }
  return { owner };
}

function isIdentity(matrix) {
  return matrix.equals(new THREE.Matrix4());
}

/** Matrix of `node` relative to `group` (both already have up-to-date local matrices). */
function relativeMatrix(node, group) {
  const result = new THREE.Matrix4();
  const chain = [];
  for (let n = node; n && n !== group; n = n.parent) chain.push(n);
  for (let i = chain.length - 1; i >= 0; i--) {
    chain[i].updateMatrix();
    result.multiply(chain[i].matrix);
  }
  return result;
}

function hasAllVisibleAncestors(node, group) {
  for (let n = node; n && n !== group; n = n.parent) {
    if (!n.visible) return false;
  }
  return true;
}

function buildBatchedGeometry(entries) {
  const pieces = [];
  for (const { mesh, owner, group } of entries) {
    const src = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    // Keep only the attributes we rebuild; mergeGeometries needs a uniform set.
    for (const name of Object.keys(src.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') src.deleteAttribute(name);
    }
    if (!src.attributes.normal) src.computeVertexNormals();
    if (!src.attributes.uv) {
      src.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    }

    const count = src.attributes.position.count;
    const local = new Float32Array(count * 3);
    const localNormal = new Float32Array(count * 3);
    const pivot = new Float32Array(count * 3);
    const baseRot = new Float32Array(count * 3);
    const breeze = new Float32Array(count * 4);
    const speedPhase = new Float32Array(count * 2);

    // Frame in which the vertex shader works: either the breeze owner's
    // parent (identity relative to the crop group, checked by the caller)
    // or the crop group itself for static meshes.
    let localMatrix;
    let pivotVec = new THREE.Vector3();
    let rot = new THREE.Vector3();
    let params = null;
    if (owner) {
      const b = owner.userData.breeze;
      // Everything below the owner's rotation: owner scale, then descendants.
      const ownerScale = new THREE.Matrix4().makeScale(owner.scale.x, owner.scale.y, owner.scale.z);
      const below = mesh === owner ? new THREE.Matrix4() : relativeMatrix(mesh, owner);
      localMatrix = ownerScale.multiply(below);
      pivotVec = new THREE.Vector3(owner.position.x, b.basePositionY, owner.position.z);
      rot = new THREE.Vector3(b.baseRotationX, b.baseRotationY, b.baseRotationZ);
      params = b;
    } else {
      localMatrix = relativeMatrix(mesh, group);
    }
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(localMatrix);

    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const restRotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot.x, rot.y, rot.z, 'XYZ'));
    const restNormalMatrix = new THREE.Matrix3().setFromMatrix4(restRotation);
    const pos = src.attributes.position;
    const nor = src.attributes.normal;
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(localMatrix);
      n.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize();
      local.set([v.x, v.y, v.z], i * 3);
      localNormal.set([n.x, n.y, n.z], i * 3);
      pivot.set([pivotVec.x, pivotVec.y, pivotVec.z], i * 3);
      baseRot.set([rot.x, rot.y, rot.z], i * 3);
      if (params) {
        breeze.set([params.rotX, params.rotY, params.rotZ, params.lift], i * 4);
        speedPhase.set([params.speed, params.phase], i * 2);
      }
      // Rest pose in `position`/`normal` keeps bounds, raycasts and any
      // non-patched consumer correct.
      v.applyMatrix4(restRotation).add(pivotVec);
      n.applyMatrix3(restNormalMatrix).normalize();
      pos.setXYZ(i, v.x, v.y, v.z);
      nor.setXYZ(i, n.x, n.y, n.z);
    }
    src.setAttribute('aLocal', new THREE.BufferAttribute(local, 3));
    src.setAttribute('aLocalNormal', new THREE.BufferAttribute(localNormal, 3));
    src.setAttribute('aPivot', new THREE.BufferAttribute(pivot, 3));
    src.setAttribute('aBaseRot', new THREE.BufferAttribute(baseRot, 3));
    src.setAttribute('aBreeze', new THREE.BufferAttribute(breeze, 4));
    src.setAttribute('aSpeedPhase', new THREE.BufferAttribute(speedPhase, 2));
    pieces.push(src);
  }
  const merged = mergeGeometries(pieces, false);
  pieces.forEach((piece) => piece.dispose());
  merged?.computeBoundingSphere();
  return merged;
}

function makeBreezeMaterial(material, uniforms) {
  const onBeforeCompile = (shader) => patchShader(shader, uniforms, { normals: true });
  onBeforeCompile.isCropBreeze = true;
  material.onBeforeCompile = onBeforeCompile;
  material.customProgramCacheKey = () => 'crop-breeze-v1';
  material.needsUpdate = true;
  return material;
}

function makeDepthMaterial(uniforms, side) {
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side });
  depth.onBeforeCompile = (shader) => patchShader(shader, uniforms, { normals: false });
  depth.customProgramCacheKey = () => 'crop-breeze-depth-v1';
  return depth;
}

/**
 * Merge a freshly built crop group in place. Returns the number of meshes
 * removed (0 when nothing could be merged).
 */
export function batchCropGroup(group) {
  group.updateMatrix();
  const buckets = new Map();
  group.traverse((node) => {
    if (!node.isMesh || node === group) return;
    if (!isEligibleMaterial(node.material)) return;
    if (!hasAllVisibleAncestors(node, group)) return;
    if (node.isInstancedMesh || node.isSkinnedMesh || node.morphTargetInfluences) return;
    // Removing a mesh would drop its children; leave parents as built.
    if (node.children.length > 0) return;
    const { owner, invalid } = breezeOwner(node, group);
    if (invalid) return;
    if (owner) {
      if (owner.rotation.order !== 'XYZ') return;
      if (owner.parent !== group && !isIdentity(relativeMatrix(owner.parent, group))) return;
    }
    const key = materialKey(node);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ mesh: node, owner, group });
  });

  const uniforms = {
    uBreezeTime: { value: 0 },
    uBreezePhaseSeed: { value: 0 },
    uBreezeStrength: { value: 0 },
  };
  let removed = 0;
  const removedMaterials = new Set();
  const keptMaterials = new Set();
  const removedGeometries = new Set();

  for (const entries of buckets.values()) {
    if (entries.length < 2 && !entries[0].owner) continue;
    const geometry = buildBatchedGeometry(entries);
    if (!geometry) continue;
    const first = entries[0].mesh;
    const material = makeBreezeMaterial(first.material, uniforms);
    keptMaterials.add(material);
    const batched = new THREE.Mesh(geometry, material);
    batched.name = 'crop-batch';
    batched.castShadow = first.castShadow;
    batched.receiveShadow = first.receiveShadow;
    batched.customDepthMaterial = makeDepthMaterial(uniforms, material.side);
    batched.userData.cropBatch = { meshCount: entries.length };
    group.add(batched);

    for (const { mesh } of entries) {
      removedGeometries.add(mesh.geometry);
      removedMaterials.add(mesh.material);
      mesh.removeFromParent();
      removed += 1;
    }
    removed -= 1;
  }

  removedGeometries.forEach((geometry) => geometry.dispose());
  removedMaterials.forEach((material) => { if (!keptMaterials.has(material)) material.dispose(); });

  // Drop sub-groups emptied by the merge so traversals stay cheap.
  const emptyGroups = [];
  group.traverse((node) => {
    if (node !== group && !node.isMesh && node.children.length === 0 && node.type === 'Group') emptyGroups.push(node);
  });
  emptyGroups.forEach((node) => node.removeFromParent());

  if (removed > 0 || buckets.size > 0) group.userData.breezeUniforms = uniforms;
  return removed;
}

/** Drive the shader breeze for a batched crop. Mirrors updateCropBreeze's per-leaf math. */
export function setCropBatchBreeze(group, time, phaseSeed, strength) {
  const uniforms = group.userData.breezeUniforms;
  if (!uniforms) return;
  uniforms.uBreezeTime.value = time;
  uniforms.uBreezePhaseSeed.value = phaseSeed;
  uniforms.uBreezeStrength.value = strength;
}
