import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import WORLD_MAP from 'specs/WORLD_MAP.json';

import {
  FENCE_PANEL,
  NEIGHBORHOOD_PIECES,
  applyNeighborhoodSet,
  collectNeighborhoodPieces,
  computeFencePlacements,
} from './neighborhood-set.js';

const ZONE = WORLD_MAP.zones.neighborhood;
const GLB = readFileSync(new URL('../../assets/art/neighborhood/neighborhood.glb', import.meta.url));
const ATLAS = new URL('../../assets/art/neighborhood/neighborhood_atlas.webp', import.meta.url);

async function parseGlb(bytes) {
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolve, reject) => loader.parse(ab, '', (g) => resolve(g.scene), reject));
}

const blocker = (id) => ZONE.blockers.find((b) => b.id === id);

describe('neighborhood set GLB', () => {
  it('ships every piece as a named node with a separate WebP atlas', () => {
    const jsonLen = GLB.readUInt32LE(12);
    const json = JSON.parse(GLB.subarray(20, 20 + jsonLen).toString('utf8'));
    const names = json.nodes.map((n) => n.name);
    [...NEIGHBORHOOD_PIECES, FENCE_PANEL].forEach((n) => expect(names).toContain(n));
    expect(json.images ?? []).toHaveLength(0); // the CSP blocks embedded (blob:) images
    expect(existsSync(ATLAS)).toBe(true);
    expect(statSync(ATLAS).size).toBeLessThan(300 * 1024);
  });

  it('keeps walls, porches and steps inside the WORLD_MAP blocker footprints', async () => {
    const scene = await parseGlb(GLB);
    const { pieces } = collectNeighborhoodPieces(scene);
    expect(pieces).not.toBeNull();
    const v = new THREE.Vector3();
    const check = (id, blockerIds, maxY = 1.0, pad = 0.03) => {
      const mesh = pieces[id];
      mesh.updateMatrixWorld(true);
      const pos = mesh.geometry.attributes.position;
      const boxes = blockerIds.map(blocker);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        if (v.y > maxY) continue; // eaves and porch roofs (all above 1 m) may overhang the footprint
        const ok = boxes.some((b) => v.x >= b.minX - pad && v.x <= b.maxX + pad && v.z >= b.minZ - pad && v.z <= b.maxZ + pad);
        if (!ok) throw new Error(`${id} vertex outside its footprint at (${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`);
      }
    };
    check('house_west', ['house_west']);
    check('house_east', ['house_east']);
    check('cottage_south', ['cottage_south']);
    // arbor posts stand on the two gate-post blockers (low parts only)
    check('arbor', ['gate_post_east', 'gate_post_west'], 0.3, 0.06);
  });

  it('stays inside the triangle budget per piece', async () => {
    const scene = await parseGlb(GLB);
    const { pieces } = collectNeighborhoodPieces(scene);
    const tris = (m) => (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
    ['house_west', 'house_east', 'cottage_south'].forEach((id) => expect(tris(pieces[id]), id).toBeLessThanOrEqual(2500));
    ['arbor', 'community_bed'].forEach((id) => expect(tris(pieces[id]), id).toBeLessThanOrEqual(750));
    expect(tris(pieces[FENCE_PANEL])).toBeLessThanOrEqual(200);
  });
});

describe('edge fence', () => {
  it('stays outside the walkable bounds and leaves every exit open', () => {
    const placements = computeFencePlacements();
    expect(placements.length).toBeGreaterThan(40);
    const { bounds } = ZONE;
    placements.forEach((p) => {
      expect(Math.abs(p.x) > bounds.maxX || Math.abs(p.z) > bounds.maxZ).toBe(true);
    });
    ZONE.exitPoints.forEach((exit) => {
      const nearest = Math.min(...placements.map((p) => Math.hypot(p.x - exit.position.x, p.z - exit.position.z)));
      expect(nearest, exit.destination).toBeGreaterThan(1.0);
    });
  });
});

describe('blockout swap', () => {
  function fakeArt(names = [...NEIGHBORHOOD_PIECES, FENCE_PANEL]) {
    const scene = new THREE.Group();
    names.forEach((n) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
      m.name = n;
      scene.add(m);
    });
    return { scene, atlas: new THREE.Texture() };
  }
  function blockout(root) {
    const out = {};
    NEIGHBORHOOD_PIECES.forEach((id) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
      root.add(box);
      out[id] = [box];
    });
    return out;
  }

  it('keeps the blockout when a piece is missing', () => {
    const root = new THREE.Group();
    const boxes = blockout(root);
    expect(applyNeighborhoodSet(root, boxes, fakeArt(['house_west']))).toBeNull();
    expect(root.children).toHaveLength(NEIGHBORHOOD_PIECES.length);
  });

  it('replaces the blockout and draws the whole fence as one instanced mesh', () => {
    const root = new THREE.Group();
    const boxes = blockout(root);
    const added = applyNeighborhoodSet(root, boxes, fakeArt());
    expect(added).toHaveLength(NEIGHBORHOOD_PIECES.length + 1);
    Object.values(boxes).flat().forEach((b) => expect(b.parent).toBeNull());
    const fence = root.getObjectByName('neighborhood:fence');
    expect(fence.isInstancedMesh).toBe(true);
    expect(fence.count).toBe(computeFencePlacements().length);
    // all pieces share one material (one atlas)
    const mats = new Set(added.map((m) => m.material));
    expect(mats.size).toBe(1);
  });
});
