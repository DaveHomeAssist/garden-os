/**
 * World edge: layered low-poly hills with far tree dots, and the rustic yard
 * fence (posts, rails, gate) merged into a single mesh.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeRng, GATE } from './yard-layout.js';

export const HILL_LAYERS = [
  { radius: 48, depth: 16, height: 3.4, rough: 1.4, colorKey: 'hillNear', seed: 3 },
  { radius: 76, depth: 22, height: 7.5, rough: 2.6, colorKey: 'hillMid', seed: 7 },
  { radius: 118, depth: 30, height: 15, rough: 4.5, colorKey: 'hillFar', seed: 11 },
];

/** Height of a hill layer crest at angle a (deterministic, periodic). */
export function hillCrest(layer, a) {
  const s = layer.seed;
  return layer.height * (0.55
    + 0.25 * Math.sin(a * 3 + s)
    + 0.15 * Math.sin(a * 7 + s * 2.1)
    + 0.08 * Math.sin(a * 13 + s * 0.7))
    + layer.rough * Math.sin(a * 23 + s) * 0.15;
}

export function buildHillsGeometry(palette) {
  const parts = [];
  const segs = 120;
  const rings = 5;
  HILL_LAYERS.forEach((layer) => {
    const positions = [];
    const colors = [];
    const top = new THREE.Color(palette[layer.colorKey]);
    const base = top.clone().multiplyScalar(0.78);
    const rng = makeRng(layer.seed * 31);
    for (let i = 0; i < segs; i += 1) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      for (let r = 0; r < rings; r += 1) {
        // radial profile: rise from the inner foot to the crest, roll off behind
        const prof = (k) => {
          const t = k / rings;
          return { rad: layer.radius - layer.depth + t * layer.depth * 1.4, h: Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5) };
        };
        const p0 = prof(r); const p1 = prof(r + 1);
        const v = (a, p) => [Math.cos(a) * p.rad, hillCrest(layer, a) * p.h - 0.6, Math.sin(a) * p.rad];
        const A = v(a0, p0); const B = v(a1, p0); const C = v(a1, p1); const D = v(a0, p1);
        positions.push(...A, ...C, ...B, ...A, ...D, ...C);
        for (let t = 0; t < 2; t += 1) {
          const k = (r + 0.5 + t * 0.5) / rings;
          const c = base.clone().lerp(top, Math.min(1, k * 1.2)).multiplyScalar(0.94 + rng() * 0.1);
          for (let q = 0; q < 3; q += 1) colors.push(c.r, c.g, c.b);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    parts.push(g);
  });
  const merged = mergeGeometries(parts, false);
  merged.computeBoundingSphere();
  return merged;
}

/** Positions for distant tree dots sitting on the near and mid hill layers. */
export function buildFarTreePlacements(count, seed = 77) {
  const rng = makeRng(seed);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const layer = HILL_LAYERS[rng() < 0.65 ? 0 : 1];
    const a = rng() * Math.PI * 2;
    const t = 0.15 + rng() * 0.6;
    const rad = layer.radius - layer.depth + t * layer.depth * 1.4;
    const h = hillCrest(layer, a) * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5) - 0.6;
    out.push({ x: Math.cos(a) * rad, y: h - 0.2, z: Math.sin(a) * rad, scale: (layer === HILL_LAYERS[0] ? 1.5 : 2.4) * (0.7 + rng() * 0.6), rotationY: rng() * 6.28 });
  }
  return out;
}

// ---------------------------------------------------------------- fence ----

/** Planar-project UVs per triangle so the wood grain runs along each board. */
export function projectUVs(geometry, scale, vertical = false) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3();
  const n = new THREE.Vector3(); const e1 = new THREE.Vector3(); const e2 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
    const ax = Math.abs(n.x); const ay = Math.abs(n.y); const az = Math.abs(n.z);
    for (let k = 0; k < 3; k += 1) {
      const p = [a, b, c][k];
      let u; let v;
      if (ay >= ax && ay >= az) { u = p.x; v = p.z; } else if (ax >= az) { u = p.z; v = p.y; } else { u = p.x; v = p.y; }
      if (vertical) { const t = u; u = v; v = t; }
      uv[(i + k) * 2] = u * scale; uv[(i + k) * 2 + 1] = v * scale;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

function tintGeometry(g, color) {
  const pos = g.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) { col[i * 3] = color.r; col[i * 3 + 1] = color.g; col[i * 3 + 2] = color.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  return g;
}

function postGeometry(height, w) {
  const body = new THREE.BoxGeometry(w, height, w);
  body.translate(0, height / 2, 0);
  const cap = new THREE.ConeGeometry(w * 0.72, w * 0.9, 4, 1);
  cap.rotateY(Math.PI / 4);
  cap.translate(0, height + w * 0.45, 0);
  return [body, cap];
}

/**
 * Rustic post-and-rail fence along the yard edge with a gate at the
 * neighbourhood exit gap. Runs match the old fence (movement bounds stay ±9).
 */
export function buildFenceGeometry(seed = 21) {
  const rng = makeRng(seed);
  const parts = [];
  const add = (geo, vertical, shade) => {
    const g = projectUVs(geo, 0.9, vertical);
    tintGeometry(g, new THREE.Color(1, 1, 1).multiplyScalar(shade));
    parts.push(g);
  };
  const runs = [
    [-9.3, -9.3, -9.3, 9.3],
    [9.3, -9.3, 9.3, 9.3],
    [-9.3, 9.3, 9.3, 9.3],
    [-9.3, -9.3, -GATE.halfWidth, -9.3],
    [GATE.halfWidth, -9.3, 9.3, -9.3],
  ];
  const postAt = new Map();
  for (const [x1, z1, x2, z2] of runs) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.max(2, Math.round(len / 1.55) + 1);
    const ang = Math.atan2(x2 - x1, z2 - z1);
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1);
      const x = x1 + (x2 - x1) * t; const z = z1 + (z2 - z1) * t;
      const key = `${x.toFixed(2)},${z.toFixed(2)}`;
      if (!postAt.has(key)) {
        postAt.set(key, true);
        const h = 0.86 + rng() * 0.08;
        for (const g of postGeometry(h, 0.11)) {
          g.rotateY(ang + (rng() - 0.5) * 0.12);
          g.rotateZ((rng() - 0.5) * 0.05);
          g.translate(x, 0, z);
          add(g, true, 0.86 + rng() * 0.22);
        }
      }
      if (i === n - 1) continue;
      const nx = x1 + (x2 - x1) * ((i + 1) / (n - 1));
      const nz = z1 + (z2 - z1) * ((i + 1) / (n - 1));
      const spanLen = Math.hypot(nx - x, nz - z) + 0.12;
      for (const ry of [0.3, 0.62]) {
        const rail = new THREE.BoxGeometry(0.05, 0.1, spanLen);
        const sag = (rng() - 0.5) * 0.03;
        rail.rotateX((rng() - 0.5) * 0.04);
        rail.rotateY(ang);
        rail.translate((x + nx) / 2, ry + sag, (z + nz) / 2);
        // weathered boards: a few run greyer
        add(rail, false, rng() < 0.18 ? 0.78 : 0.92 + rng() * 0.18);
      }
    }
  }
  // gate: tall posts, lintel, open leaf swung outward on the right post
  for (const sx of [-1, 1]) {
    for (const g of postGeometry(1.32, 0.15)) { g.translate(sx * (GATE.halfWidth + 0.02), 0, GATE.z); add(g, true, 0.95); }
  }
  const lintel = new THREE.BoxGeometry(GATE.halfWidth * 2 + 0.5, 0.13, 0.13);
  lintel.translate(0, 1.36, GATE.z);
  add(lintel, false, 0.88);
  const leaf = [];
  const leafW = 1.5;
  for (const y of [0.22, 0.52, 0.82]) {
    const r = new THREE.BoxGeometry(leafW, 0.08, 0.04); r.translate(leafW / 2, y, 0); leaf.push([r, false]);
  }
  for (const x of [0.06, leafW / 2, leafW - 0.06]) {
    const s = new THREE.BoxGeometry(0.07, 0.72, 0.04); s.translate(x, 0.52, 0.02); leaf.push([s, true]);
  }
  const brace = new THREE.BoxGeometry(0.06, Math.hypot(leafW, 0.6), 0.03);
  brace.rotateZ(Math.atan2(leafW, 0.6)); brace.translate(leafW / 2, 0.52, 0.04); leaf.push([brace, true]);
  for (const [g, vertical] of leaf) {
    g.rotateY(Math.PI / 2 + 0.5); // swung open, outward
    g.translate(GATE.halfWidth - 0.06, 0, GATE.z - 0.04);
    add(g, vertical, 0.9);
  }
  const merged = mergeGeometries(parts.map((g) => { g.deleteAttribute('uv1'); return g; }), false);
  merged.computeBoundingSphere();
  return merged;
}
