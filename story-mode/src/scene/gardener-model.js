/**
 * Stylised low-poly gardener. One skinned mesh, one material, one atlas.
 * Vertex colours carry a simple baked AO. The same builder is what
 * `scripts/art/build-gardener.mjs` writes to the compressed glb.
 *
 * Original design. No reference photos.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getPlayerProfilePalette } from '../data/player-profile.js';

const ATLAS = 128;
const COLS = 8;
const ROWS = 4;

export const GARDENER_REGIONS = {
  skin: 0,
  skinShade: 1,
  blush: 2,
  hair: 3,
  shirt: 4,
  apron: 5,
  pants: 6,
  hat: 7,
  hatBand: 8,
  glove: 9,
  boot: 10,
  sole: 11,
  scarf: 12,
  wood: 13,
  metal: 14,
  eye: 15,
  mouth: 16,
  buckle: 17,
  bow: 18,
};

export const LEG = Object.freeze({
  hipY: 0.52,
  hipX: 0.105,
  thighDrop: 0.02,
  thigh: 0.23,
  shin: 0.21,
});

const FIXED = {
  glove: 0xd97848,
  boot: 0x3a261c,
  sole: 0x6a4630,
  scarf: 0xe2b143,
  wood: 0xa56b3c,
  metal: 0xd9d3c6,
  eye: 0x241813,
  mouth: 0x8a4b38,
  buckle: 0xe8c84a,
};

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function shade(hex, factor) {
  return new THREE.Color(hex).multiplyScalar(factor).getHex();
}

function mix(a, b, t) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
}

export function gardenerPalette(profile) {
  const p = getPlayerProfilePalette(profile);
  return {
    skin: p.skin,
    skinShade: shade(p.skin, 0.84),
    blush: mix(p.skin, 0xe2574d, 0.38),
    hair: p.hair,
    shirt: mix(p.shirt, 0xf3e0c4, 0.18),
    apron: p.apron,
    pants: p.pants,
    hat: p.hat,
    hatBand: shade(p.hat, 0.62),
    glove: FIXED.glove,
    boot: FIXED.boot,
    sole: FIXED.sole,
    scarf: FIXED.scarf,
    wood: FIXED.wood,
    metal: FIXED.metal,
    eye: FIXED.eye,
    mouth: FIXED.mouth,
    buckle: FIXED.buckle,
    bow: FIXED.scarf,
  };
}

function paintAtlas(data, palette) {
  const cw = ATLAS / COLS;
  const ch = ATLAS / ROWS;
  for (const [name, index] of Object.entries(GARDENER_REGIONS)) {
    const hex = palette[name] ?? 0x888888;
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const color = new THREE.Color(hex);
    const dark = color.clone().multiplyScalar(0.72);
    for (let y = 0; y < ch; y += 1) {
      const t = y / Math.max(1, ch - 1);
      const c = dark.clone().lerp(color, 0.28 + 0.72 * t);
      for (let x = 0; x < cw; x += 1) {
        const px = col * cw + x;
        const py = row * ch + y;
        const i = (py * ATLAS + px) * 4;
        data[i] = Math.round(clamp01(c.r) * 255);
        data[i + 1] = Math.round(clamp01(c.g) * 255);
        data[i + 2] = Math.round(clamp01(c.b) * 255);
        data[i + 3] = 255;
      }
    }
  }
}

function createAtlas(palette) {
  const data = new Uint8Array(ATLAS * ATLAS * 4);
  paintAtlas(data, palette);
  const tex = new THREE.DataTexture(data, ATLAS, ATLAS);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  tex.generateMipmaps = true;
  return {
    texture: tex,
    data,
    repaint(next) {
      paintAtlas(data, next);
      tex.needsUpdate = true;
    },
  };
}

function applyRim(material) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      {
        vec3 rimView = normalize(vViewPosition);
        float fres = pow(1.0 - clamp(dot(normalize(normal), rimView), 0.0, 1.0), 2.55);
        outgoingLight += vec3(1.0, 0.84, 0.64) * fres * 0.24;
      }
      #include <opaque_fragment>
      `,
    );
  };
  material.customProgramCacheKey = () => 'gardener-rim-v1';
}

function cellCenter(index) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    u: (col + 0.5) / COLS,
    v: (row + 0.5) / ROWS,
  };
}

function xf(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4();
  m.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
  return m;
}

function aoAt(x, y, z, ny) {
  let ao = 0.7 + 0.3 * clamp01(ny * 0.5 + 0.5);
  if (y < 0.1) ao *= 0.62 + y * 2.2;
  if (y > 1.02 && y < 1.14 && Math.hypot(x, z) < 0.16 && ny > 0.1) ao *= 0.72;
  if (z > 0.04 && y > 0.55 && y < 0.9 && Math.abs(x) < 0.12) ao *= 0.9;
  return Math.min(1, Math.max(0.46, ao));
}

function bake(geometry, matrix, boneIndex, region, { flat = false } = {}) {
  geometry.applyMatrix4(matrix);
  let geo = geometry;
  if (flat && geometry.index) geo = geometry.toNonIndexed();
  else if (!flat) geometry.computeVertexNormals();
  if (!flat && geometry.index) geo = geometry.toNonIndexed();
  if (flat) geo.computeVertexNormals();
  if (geo !== geometry) geometry.dispose();
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const count = pos.count;
  const uv = new Float32Array(count * 2);
  const color = new Float32Array(count * 3);
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  const center = cellCenter(GARDENER_REGIONS[region] ?? 0);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < count; i += 1) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const span = Math.max(0.001, maxY - minY);
  for (let i = 0; i < count; i += 1) {
    const y = pos.getY(i);
    const t = (y - minY) / span;
    uv[i * 2] = center.u;
    uv[i * 2 + 1] = center.v + (t - 0.5) * (0.5 / ROWS);
    const ao = aoAt(pos.getX(i), y, pos.getZ(i), nrm.getY(i));
    color[i * 3] = ao;
    color[i * 3 + 1] = ao;
    color[i * 3 + 2] = ao;
    skinIndex[i * 4] = boneIndex;
    skinWeight[i * 4] = 1;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  geo.clearGroups();
  return geo;
}

function makeBone(name, parent, x, y, z, bones) {
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.set(x, y, z);
  parent.add(bone);
  bones.push(bone);
  return bone;
}

function triCount(geo) {
  if (geo.index) return geo.index.count / 3;
  return geo.attributes.position.count / 3;
}

export function buildGardener(profile = null) {
  const palette = gardenerPalette(profile);
  const atlas = createAtlas(palette);
  const material = new THREE.MeshStandardMaterial({
    name: 'gardener',
    map: atlas.texture,
    vertexColors: true,
    roughness: 0.74,
    metalness: 0.02,
    color: 0xffffff,
  });
  applyRim(material);

  const bones = [];
  const rootBone = new THREE.Bone();
  rootBone.name = 'root';
  bones.push(rootBone);
  const hips = makeBone('hips', rootBone, 0, LEG.hipY, 0, bones);
  const spine = makeBone('spine', hips, 0, 0.08, 0, bones);
  const chest = makeBone('chest', spine, 0, 0.13, 0, bones);
  const head = makeBone('head', chest, 0, 0.18, 0, bones);
  const armL = makeBone('armL', chest, -0.16, 0.06, 0, bones);
  const foreL = makeBone('foreL', armL, 0, -0.16, 0, bones);
  const handL = makeBone('handL', foreL, 0, -0.15, 0, bones);
  const armR = makeBone('armR', chest, 0.16, 0.06, 0, bones);
  const foreR = makeBone('foreR', armR, 0, -0.16, 0, bones);
  const handR = makeBone('handR', foreR, 0, -0.15, 0, bones);
  const thighL = makeBone('thighL', hips, -LEG.hipX, -LEG.thighDrop, 0, bones);
  const shinL = makeBone('shinL', thighL, 0, -LEG.thigh, 0, bones);
  const footL = makeBone('footL', shinL, 0, -LEG.shin, 0, bones);
  const thighR = makeBone('thighR', hips, LEG.hipX, -LEG.thighDrop, 0, bones);
  const shinR = makeBone('shinR', thighR, 0, -LEG.thigh, 0, bones);
  const footR = makeBone('footR', shinR, 0, -LEG.shin, 0, bones);

  const indexOf = Object.fromEntries(bones.map((b, i) => [b.name, i]));
  rootBone.updateMatrixWorld(true);
  // Torso, head and hat are authored in character space. Limbs are authored
  // in their bone's local space (the joint is the origin), so fold in the
  // bone's bind matrix or the arms and legs sit on the ground.
  const limbBones = new Set([
    'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR',
    'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR',
  ]);
  const parts = [];
  const push = (geo, matrix, bone, region, opts) => {
    const placed = limbBones.has(bone)
      ? bones[indexOf[bone]].matrixWorld.clone().multiply(matrix)
      : matrix;
    parts.push(bake(geo, placed, indexOf[bone], region, opts));
  };

  push(new THREE.SphereGeometry(0.12, 18, 14), xf(0, 0.52, 0, 0, 0, 0, 1.2, 0.72, 0.95), 'hips', 'pants');
  push(new THREE.CapsuleGeometry(0.11, 0.16, 6, 14), xf(0, 0.7, 0, 0, 0, 0, 1.15, 0.95, 0.9), 'chest', 'shirt');
  push(new THREE.BoxGeometry(0.1, 0.12, 0.025), xf(0, 0.74, 0.1), 'chest', 'apron');
  push(new THREE.CylinderGeometry(0.07, 0.13, 0.16, 16), xf(0, 0.56, 0.06, -0.08, 0, 0, 1.15, 1, 0.55), 'hips', 'apron');
  push(new THREE.BoxGeometry(0.028, 0.16, 0.02), xf(-0.06, 0.78, 0.02, 0.15, 0, 0.35), 'chest', 'pants');
  push(new THREE.BoxGeometry(0.028, 0.16, 0.02), xf(0.06, 0.78, 0.02, 0.15, 0, -0.35), 'chest', 'pants');
  push(new THREE.BoxGeometry(0.045, 0.035, 0.02), xf(0, 0.66, 0.115), 'chest', 'buckle', { flat: true });
  push(new THREE.BoxGeometry(0.16, 0.045, 0.05), xf(0, 0.86, 0.02, 0.4, 0, 0), 'chest', 'scarf');
  push(new THREE.BoxGeometry(0.04, 0.16, 0.012), xf(0.02, 0.74, -0.1, -0.2, 0, 0.15), 'spine', 'scarf');
  push(new THREE.BoxGeometry(0.07, 0.035, 0.02), xf(-0.03, 0.6, -0.11, 0, 0, 0.5), 'spine', 'bow', { flat: true });
  push(new THREE.BoxGeometry(0.07, 0.035, 0.02), xf(0.03, 0.6, -0.11, 0, 0, -0.5), 'spine', 'bow', { flat: true });

  push(new THREE.SphereGeometry(0.115, 20, 16), xf(0, 1.02, 0.01, 0, 0, 0, 1, 1.02, 0.98), 'head', 'skin');
  push(new THREE.SphereGeometry(0.118, 16, 12), xf(0, 1.05, -0.01, 0, 0, 0, 1.02, 0.62, 1.02), 'head', 'hair');
  push(new THREE.SphereGeometry(0.016, 10, 8), xf(-0.04, 1.03, 0.1), 'head', 'eye');
  push(new THREE.SphereGeometry(0.016, 10, 8), xf(0.04, 1.03, 0.1), 'head', 'eye');
  push(new THREE.SphereGeometry(0.006, 8, 6), xf(-0.046, 1.038, 0.112), 'head', 'metal');
  push(new THREE.SphereGeometry(0.006, 8, 6), xf(0.034, 1.038, 0.112), 'head', 'metal');
  push(new THREE.SphereGeometry(0.016, 8, 6), xf(0, 1.0, 0.108, 0, 0, 0, 0.8, 0.65, 0.7), 'head', 'skinShade');
  push(new THREE.TorusGeometry(0.02, 0.005, 6, 12, Math.PI * 0.7), xf(0, 0.975, 0.1, 0, 0, Math.PI + 0.45), 'head', 'mouth');
  push(new THREE.SphereGeometry(0.02, 8, 6), xf(-0.07, 0.995, 0.07, 0, 0.4, 0, 1, 0.55, 0.35), 'head', 'blush');
  push(new THREE.SphereGeometry(0.02, 8, 6), xf(0.07, 0.995, 0.07, 0, -0.4, 0, 1, 0.55, 0.35), 'head', 'blush');
  push(new THREE.CylinderGeometry(0.2, 0.2, 0.018, 28), xf(0, 1.1, 0), 'head', 'hat');
  push(new THREE.CylinderGeometry(0.09, 0.12, 0.1, 18), xf(0, 1.16, 0), 'head', 'hat');
  push(new THREE.CylinderGeometry(0.105, 0.125, 0.028, 18), xf(0, 1.12, 0), 'head', 'hatBand');

  const armUpper = new THREE.CapsuleGeometry(0.038, 0.1, 5, 12);
  const armUpperR = armUpper.clone();
  const armFore = new THREE.CapsuleGeometry(0.032, 0.09, 4, 10);
  const armForeR = armFore.clone();
  const glove = new THREE.SphereGeometry(0.042, 12, 10);
  const gloveR = glove.clone();
  push(armUpper, xf(0, -0.08, 0), 'armL', 'shirt');
  push(armUpperR, xf(0, -0.08, 0), 'armR', 'shirt');
  push(armFore, xf(0, -0.08, 0), 'foreL', 'shirt');
  push(armForeR, xf(0, -0.08, 0), 'foreR', 'shirt');
  push(glove, xf(0, -0.02, 0.01, 0, 0, 0, 1, 0.85, 1.1), 'handL', 'glove');
  push(gloveR, xf(0, -0.02, 0.01, 0, 0, 0, 1, 0.85, 1.1), 'handR', 'glove');

  const thighGeo = new THREE.CapsuleGeometry(0.05, 0.12, 5, 12);
  const shinGeo = new THREE.CapsuleGeometry(0.042, 0.1, 4, 10);
  const bootGeo = new THREE.CapsuleGeometry(0.048, 0.06, 4, 10);
  const soleGeo = new THREE.BoxGeometry(0.09, 0.025, 0.14);
  const thighGeoR = thighGeo.clone();
  const shinGeoR = shinGeo.clone();
  const bootGeoR = bootGeo.clone();
  const soleGeoR = soleGeo.clone();
  push(thighGeo, xf(0, -0.1, 0), 'thighL', 'pants');
  push(shinGeo, xf(0, -0.09, 0), 'shinL', 'pants');
  push(bootGeo, xf(0, -0.02, 0.02, 0, 0, 0, 1, 0.7, 1.35), 'footL', 'boot');
  push(soleGeo, xf(0, -0.055, 0.03), 'footL', 'sole', { flat: true });
  push(thighGeoR, xf(0, -0.1, 0), 'thighR', 'pants');
  push(shinGeoR, xf(0, -0.09, 0), 'shinR', 'pants');
  push(bootGeoR, xf(0, -0.02, 0.02, 0, 0, 0, 1, 0.7, 1.35), 'footR', 'boot');
  push(soleGeoR, xf(0, -0.055, 0.03), 'footR', 'sole', { flat: true });

  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error('gardener mesh failed to merge');
  parts.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  if (merged.boundingSphere) merged.boundingSphere.radius *= 1.4;

  const mesh = new THREE.SkinnedMesh(merged, material);
  mesh.name = 'gardener';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.add(rootBone);
  const skeleton = new THREE.Skeleton(bones);
  mesh.bind(skeleton);

  const byName = Object.fromEntries(bones.map((b) => [b.name, b]));
  const tools = buildTools(material, byName.handR);

  return {
    mesh,
    bones: byName,
    skeleton,
    material,
    atlas,
    tools,
    triangleCount: triCount(merged) + tools.triangles,
  };
}

function buildTools(material, hand) {
  let triangles = 0;
  const make = (name, geo, matrix) => {
    geo.applyMatrix4(matrix);
    geo.computeVertexNormals();
    const count = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
    triangles += count;
    const n = geo.attributes.position.count;
    const color = new Float32Array(n * 3);
    color.fill(0.92);
    geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.visible = false;
    hand.add(mesh);
    return mesh;
  };
  const trowel = make('tool-trowel', new THREE.CapsuleGeometry(0.012, 0.12, 3, 8), xf(0.02, -0.04, 0.04, 0.9, 0, 0));
  const blade = make('tool-blade', new THREE.BoxGeometry(0.055, 0.008, 0.04), xf(0.02, -0.1, 0.07, 0.4, 0, 0));
  trowel.userData.partner = blade;
  const can = make('tool-water', new THREE.CylinderGeometry(0.028, 0.034, 0.09, 10), xf(0.02, -0.02, 0.05, 0, 0, 1.1));
  const spout = make('tool-spout', new THREE.CylinderGeometry(0.01, 0.012, 0.06, 8), xf(0.05, 0.02, 0.06, 0, 0, 1.4));
  can.userData.partner = spout;
  const basket = make('tool-harvest', new THREE.CylinderGeometry(0.04, 0.03, 0.045, 10), xf(0.01, -0.02, 0.05));
  const spray = make('tool-protect', new THREE.SphereGeometry(0.035, 10, 8), xf(0.02, -0.02, 0.05));
  const sack = make('tool-mulch', new THREE.SphereGeometry(0.04, 10, 8), xf(0.015, -0.02, 0.04, 0, 0, 0, 1.1, 0.8, 0.9));
  // Paint tool UVs into their swatches.
  const uvFor = {
    'tool-trowel': 'wood',
    'tool-blade': 'metal',
    'tool-water': 'metal',
    'tool-spout': 'metal',
    'tool-harvest': 'wood',
    'tool-protect': 'metal',
    'tool-mulch': 'boot',
  };
  for (const child of hand.children) {
    if (!child.isMesh || !uvFor[child.name]) continue;
    const center = cellCenter(GARDENER_REGIONS[uvFor[child.name]]);
    const n = child.geometry.attributes.position.count;
    const uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i += 1) {
      uv[i * 2] = center.u;
      uv[i * 2 + 1] = center.v;
    }
    child.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  const sets = {
    hand: [trowel, blade],
    plant: [trowel, blade],
    water: [can, spout],
    harvest: [basket],
    protect: [spray],
    mulch: [sack],
  };
  return {
    triangles,
    show(id) {
      const visible = new Set(sets[id] ?? sets.hand);
      for (const list of Object.values(sets)) {
        for (const mesh of list) mesh.visible = visible.has(mesh);
      }
    },
  };
}

export function triangleCountOf(result) {
  return result.triangleCount;
}
