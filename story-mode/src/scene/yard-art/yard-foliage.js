/**
 * Tree/bush family, grass clumps and wildflowers — low-poly, faceted, painted
 * with per-face vertex colour, every repeated thing instanced (one draw call
 * per variant). Wind sway runs in the vertex shader.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeRng } from './yard-layout.js';

export const TREE_VARIANTS = ['oak', 'poplar', 'pine', 'bush'];


/** Paint each triangle a single colour (faceted "painted" look). */
function paintFaces(geometry, colorFor) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3();
  const n = new THREE.Vector3(); const cen = new THREE.Vector3();
  const e1 = new THREE.Vector3(); const e2 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    cen.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    e1.subVectors(c, b); e2.subVectors(a, b);
    n.crossVectors(e1, e2).normalize();
    const col = colorFor(cen, n, i / 3);
    for (let k = 0; k < 3; k += 1) {
      colors[(i + k) * 3] = col.r; colors[(i + k) * 3 + 1] = col.g; colors[(i + k) * 3 + 2] = col.b;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function blobGeometry(radius, detail, rng, squash = [1, 1, 1], jitter = 0.16) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.getAttribute('position');
  // jitter shared vertices identically so the blob stays closed
  const seen = new Map();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
    let k = seen.get(key);
    if (k === undefined) { k = 1 + (rng() * 2 - 1) * jitter; seen.set(key, k); }
    pos.setXYZ(i, v.x * squash[0] * k, v.y * squash[1] * k, v.z * squash[2] * k);
  }
  return geo;
}

function trunkGeometry(height, r0, r1, rng, lean = 0.06) {
  const geo = new THREE.CylinderGeometry(r1, r0, height, 6, 2);
  geo.translate(0, height / 2, 0);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    pos.setX(i, pos.getX(i) + (y / height) ** 2 * lean);
  }
  return geo;
}

function canopyPainter(pal, rng, { top = 1.6, sunSide = new THREE.Vector3(-0.6, 0.5, 0.6).normalize() } = {}) {
  const dark = new THREE.Color(pal.leafDark);
  const mid = new THREE.Color(pal.leafMid);
  const light = new THREE.Color(pal.leafLight);
  return (cen, n) => {
    const h = THREE.MathUtils.clamp(cen.y / top, 0, 1);
    const sun = THREE.MathUtils.clamp(n.dot(sunSide) * 0.5 + 0.5, 0, 1);
    const t = THREE.MathUtils.clamp(h * 0.55 + sun * 0.45 + (rng() - 0.5) * 0.28, 0, 1);
    const out = new THREE.Color();
    if (t < 0.5) out.copy(dark).lerp(mid, t * 2); else out.copy(mid).lerp(light, (t - 0.5) * 2);
    return out;
  };
}

function barkPainter(pal, rng) {
  const bark = new THREE.Color(pal.bark);
  return () => bark.clone().multiplyScalar(0.85 + rng() * 0.3);
}

/** One merged, vertex-painted geometry per tree variant (local origin at trunk base). */
export function buildTreeGeometry(variant, pal, seed = 1) {
  const rng = makeRng(seed);
  const parts = [];
  if (variant === 'oak') {
    parts.push(paintFaces(trunkGeometry(1.15, 0.13, 0.08, rng, 0.08), barkPainter(pal, rng)));
    const b1 = trunkGeometry(0.5, 0.05, 0.03, rng, 0.0); b1.rotateZ(0.9); b1.translate(0.05, 0.75, 0);
    const b2 = trunkGeometry(0.45, 0.05, 0.03, rng, 0.0); b2.rotateZ(-0.8); b2.rotateY(1.2); b2.translate(-0.04, 0.82, 0.02);
    parts.push(paintFaces(b1, barkPainter(pal, rng)), paintFaces(b2, barkPainter(pal, rng)));
    const blobs = [[0, 1.55, 0, 0.62], [0.42, 1.35, 0.15, 0.46], [-0.4, 1.4, -0.1, 0.5], [0.1, 1.38, -0.42, 0.44], [-0.12, 1.95, 0.08, 0.42], [0.05, 1.28, 0.44, 0.42]];
    blobs.forEach(([x, y, z, r]) => {
      const g = blobGeometry(r, 1, rng, [1, 0.86, 1]);
      g.translate(x, y, z);
      parts.push(paintFaces(g, canopyPainter(pal, rng, { top: 2.3 })));
    });
  } else if (variant === 'poplar') {
    parts.push(paintFaces(trunkGeometry(0.9, 0.1, 0.06, rng, 0.04), barkPainter(pal, rng)));
    [[0, 1.2, 0, 0.42, 1.25], [0.06, 1.85, 0.02, 0.36, 1.3], [-0.03, 2.4, -0.02, 0.26, 1.35]].forEach(([x, y, z, r, s]) => {
      const g = blobGeometry(r, 1, rng, [1, s, 1], 0.12);
      g.translate(x, y, z);
      parts.push(paintFaces(g, canopyPainter(pal, rng, { top: 2.8 })));
    });
  } else if (variant === 'pine') {
    parts.push(paintFaces(trunkGeometry(0.55, 0.09, 0.06, rng, 0.0), barkPainter(pal, rng)));
    const pine = { ...pal, leafDark: new THREE.Color(pal.pine).multiplyScalar(0.72).getHex(), leafMid: pal.pine, leafLight: new THREE.Color(pal.pine).lerp(new THREE.Color(pal.leafLight), 0.45).getHex() };
    [[0.45, 0.62, 0.9], [0.95, 0.5, 0.8], [1.4, 0.37, 0.7], [1.8, 0.24, 0.55]].forEach(([y, r, h]) => {
      const g = new THREE.ConeGeometry(r, h, 7, 1);
      const p = g.getAttribute('position');
      const seen = new Map();
      for (let i = 0; i < p.count; i += 1) {
        if (p.getY(i) >= 0) continue;
        const key = `${p.getX(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
        let k = seen.get(key);
        if (k === undefined) { k = 0.88 + rng() * 0.24; seen.set(key, k); }
        p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
      }
      g.translate(0, y + h / 2, 0);
      parts.push(paintFaces(g, canopyPainter(pine, rng, { top: 2.6 })));
    });
  } else {
    // bush: low clump of three blobs, no trunk
    [[0, 0.3, 0, 0.42], [0.32, 0.22, 0.1, 0.3], [-0.28, 0.24, -0.06, 0.32], [0.05, 0.22, 0.3, 0.26]].forEach(([x, y, z, r]) => {
      const g = blobGeometry(r, 1, rng, [1, 0.78, 1]);
      g.translate(x, y, z);
      parts.push(paintFaces(g, canopyPainter(pal, rng, { top: 0.75 })));
    });
  }
  const merged = mergeGeometries(parts.map((p) => {
    // mergeGeometries needs identical attribute sets
    const q = p.index ? p.toNonIndexed() : p;
    ['uv', 'uv1'].forEach((k) => q.deleteAttribute?.(k));
    return q;
  }), false);
  merged.computeBoundingSphere();
  merged.userData.variant = variant;
  return merged;
}


/**
 * Add the reverse-wound copy of every triangle so foliage cards render from
 * both sides with FrontSide materials, keeping the "up" normal on both faces
 * (DoubleSide would flip it and turn the back of every blade black).
 */
function doubleFaces(positions, colors) {
  const triCount = positions.length / 9;
  for (let t = 0; t < triCount; t += 1) {
    const p = positions.slice(t * 9, t * 9 + 9);
    const c = colors.slice(t * 9, t * 9 + 9);
    positions.push(p[0], p[1], p[2], p[6], p[7], p[8], p[3], p[4], p[5]);
    colors.push(c[0], c[1], c[2], c[6], c[7], c[8], c[3], c[4], c[5]);
  }
}

/** Grass clump: a fan of 6 tapered blades, base dark to tip warm, normals up. */
export function buildGrassClumpGeometry(pal, seed = 3) {
  const rng = makeRng(seed);
  const positions = [];
  const colors = [];
  // base matches the painted lawn so clumps grow out of it instead of sitting on it
  const base = new THREE.Color(pal.grassDark).lerp(new THREE.Color(pal.grassMid), 0.8);
  const mid = new THREE.Color(pal.grassMid).multiplyScalar(1.15);
  const tip = new THREE.Color(pal.grassTip);
  const blades = 9;
  for (let i = 0; i < blades; i += 1) {
    const a = (i / blades) * Math.PI * 2 + rng() * 0.6;
    const lean = 0.4 + rng() * 0.5;
    const h = 0.075 + rng() * 0.085;
    const w = 0.016 + rng() * 0.012;
    const dx = Math.cos(a); const dz = Math.sin(a);
    const px = -dz * w; const pz = dx * w;
    const r0 = 0.02 + rng() * 0.03;
    const bx = dx * r0; const bz = dz * r0;
    const mx = bx + dx * lean * h * 0.45; const mz = bz + dz * lean * h * 0.45;
    const tx = bx + dx * lean * h; const tz = bz + dz * lean * h;
    const midY = h * 0.55;
    // two triangles per blade: base quad -> tip
    positions.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, mx + px * 0.6, midY, mz + pz * 0.6);
    positions.push(bx - px, 0, bz - pz, mx + px * 0.6, midY, mz + pz * 0.6, mx - px * 0.6, midY, mz - pz * 0.6);
    positions.push(mx - px * 0.6, midY, mz - pz * 0.6, mx + px * 0.6, midY, mz + pz * 0.6, tx, h, tz);
    const tipCol = mid.clone().lerp(tip, 0.4 + rng() * 0.6);
    [base, base, mid, base, mid, mid, mid, mid, tipCol].forEach((c) => colors.push(c.r, c.g, c.b));
  }
  doubleFaces(positions, colors);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < normals.length; i += 3) { normals[i] = 0; normals[i + 1] = 1; normals[i + 2] = 0; }
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.computeBoundingSphere();
  return geo;
}

/** Wildflower: short stem + 5-petal star head; instanceColor tints the petals. */
export function buildFlowerGeometry() {
  const positions = [];
  const colors = [];
  // stems are pre-divided by a mid flower tint so instanceColor leaves them green-ish
  const stem = new THREE.Color(0x4f7a34);
  const white = new THREE.Color(1, 1, 1);
  const eye = new THREE.Color(1.25, 1.05, 0.35);
  // a little cluster of three heads at different heights
  const heads = [[0, 0, 0.2, 1], [0.05, 0.03, 0.15, 0.85], [-0.04, 0.045, 0.12, 0.75]];
  for (const [ox, oz, h, sc] of heads) {
    positions.push(ox - 0.006, 0, oz, ox + 0.006, 0, oz, ox, h, oz);
    colors.push(stem.r, stem.g, stem.b, stem.r, stem.g, stem.b, stem.r, stem.g, stem.b);
    const petals = 5;
    for (let i = 0; i < petals; i += 1) {
      const a0 = (i / petals) * Math.PI * 2;
      const a1 = a0 + Math.PI / petals;
      const a2 = a0 + (2 * Math.PI) / petals;
      const r = 0.045 * sc; const ri = 0.016 * sc;
      positions.push(ox, h + 0.004, oz, ox + Math.cos(a0) * ri, h, oz + Math.sin(a0) * ri, ox + Math.cos(a1) * r, h + 0.01, oz + Math.sin(a1) * r);
      positions.push(ox, h + 0.004, oz, ox + Math.cos(a1) * r, h + 0.01, oz + Math.sin(a1) * r, ox + Math.cos(a2) * ri, h, oz + Math.sin(a2) * ri);
      for (let k = 0; k < 2; k += 1) colors.push(eye.r, eye.g, eye.b, white.r, white.g, white.b, white.r, white.g, white.b);
    }
  }
  doubleFaces(positions, colors);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < normals.length; i += 3) normals[i + 1] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.computeBoundingSphere();
  return geo;
}

/** Vertex-shader wind for instanced foliage (sway grows with local height). */
export function applyWind(material, uniforms, { strength = 0.05, key = 'wind' } = {}) {
  const local = { uSway: { value: strength } };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = uniforms.uWindTime;
    shader.uniforms.uWindStrength = uniforms.uWindStrength;
    shader.uniforms.uSway = local.uSway;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;\nuniform float uWindStrength;\nuniform float uSway;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  float hgt = max(position.y, 0.0);
  #ifdef USE_INSTANCING
    vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  #else
    vec3 ip = vec3(0.0);
  #endif
  float ph = ip.x * 0.37 + ip.z * 0.23;
  float s = uSway * uWindStrength * hgt * hgt;
  transformed.x += (sin(uWindTime * 1.3 + ph) + 0.35 * sin(uWindTime * 3.1 + ph * 2.0)) * s;
  transformed.z += cos(uWindTime * 1.05 + ph * 1.3) * s * 0.6;
}`);
  };
  material.customProgramCacheKey = () => `yard-art-${key}`;
  material.userData.windSway = local.uSway;
  return material;
}

/** Build an InstancedMesh from placements [{x,z,scale,rotationY,y?,tilt?}]. */
export function instancePlacements(geometry, material, placements, { color = null } = {}) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, placements.length));
  const dummy = new THREE.Object3D();
  placements.forEach((p, i) => {
    dummy.position.set(p.x, p.y ?? 0, p.z);
    dummy.rotation.set(p.tiltX ?? 0, p.rotationY ?? 0, p.tiltZ ?? 0);
    dummy.scale.setScalar(p.scale ?? 1);
    if (p.scaleY) dummy.scale.y *= p.scaleY;
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (color) mesh.setColorAt(i, color(p, i));
  });
  mesh.count = placements.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}
