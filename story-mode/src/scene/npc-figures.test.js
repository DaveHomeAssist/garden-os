import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import WORLD_MAP from 'specs/WORLD_MAP.json';

import {
  NPC_FIGURE_KEYS,
  NPC_NECK_Y,
  animateNpcFigures,
  applyNpcFigure,
  buildNpcFigure,
  collectNpcFigureParts,
  figureKeyFor,
  figureStandPosition,
  loadNpcFigures,
  resetNpcFigureCache,
  upgradeNpcMarker,
} from './npc-figures.js';
import { listAllNPCs, NEIGHBOR_TEMPLATES } from '../data/npcs.js';

const GLB = readFileSync(new URL('../../assets/art/neighborhood/npcs.glb', import.meta.url));

function glbJson(bytes) {
  const jsonLen = bytes.readUInt32LE(12);
  return JSON.parse(bytes.subarray(20, 20 + jsonLen).toString('utf8'));
}

async function parseGlb(bytes) {
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolve, reject) => loader.parse(ab, '', (g) => resolve(g.scene), reject));
}

function fakeScene(keys = NPC_FIGURE_KEYS) {
  const scene = new THREE.Group();
  keys.forEach((k) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2));
    body.name = `npc_${k}_body`;
    body.scale.setScalar(0.33); // stands in for meshopt's dequantise scale
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15));
    head.name = `npc_${k}_head`;
    head.position.y = NPC_NECK_Y + 0.15;
    scene.add(body, head);
  });
  return scene;
}

function primitiveMarker() {
  const group = new THREE.Group();
  const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.1, 12));
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.5));
  tag.name = 'npc-name-tag';
  group.add(capsule, tag);
  group.userData.interactable = { id: 'npc_lila', npcId: 'lila', position: { x: -1, z: -3 }, radius: 1.2 };
  return { group, capsule, tag };
}

describe('neighbour figures GLB', () => {
  it('ships a body and a head for every figure, vertex colour only (no textures)', () => {
    const json = glbJson(GLB);
    const names = json.meshes.map((m) => m.name);
    NPC_FIGURE_KEYS.forEach((k) => {
      expect(names).toContain(`npc_${k}_body`);
      expect(names).toContain(`npc_${k}_head`);
    });
    expect(json.images ?? []).toHaveLength(0);
    expect(json.extensionsUsed).toContain('EXT_meshopt_compression');
  });

  it('decodes, stays inside the triangle budget and stands on the ground', async () => {
    const scene = await parseGlb(GLB);
    NPC_FIGURE_KEYS.forEach((k) => {
      const parts = collectNpcFigureParts(scene, k);
      expect(parts, k).not.toBeNull();
      const tris = ['body', 'head'].reduce((n, p) => {
        const g = parts[p].geometry;
        return n + (g.index ? g.index.count : g.attributes.position.count) / 3;
      }, 0);
      expect(tris, k).toBeLessThanOrEqual(1200);
      expect(parts.body.geometry.attributes.color, k).toBeTruthy();
    });
    const fig = buildNpcFigure(scene, { id: 'old_gus' });
    fig.scale.setScalar(1);
    fig.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(fig);
    expect(box.min.y).toBeGreaterThan(-0.02);
    expect(box.min.y).toBeLessThan(0.03);
    expect(box.max.y).toBeGreaterThan(0.9); // hat brim above a ~1 m figure
    expect(box.max.y).toBeLessThan(1.25);
  });
});

describe('figure lookup', () => {
  it('gives every official NPC and neighbour template its own figure', () => {
    expect(figureKeyFor({ id: 'old_gus' })).toBe('gus');
    expect(figureKeyFor({ id: 'lila' })).toBe('lila');
    expect(figureKeyFor({ id: 'maya' })).toBe('maya');
    const byName = Object.fromEntries(NEIGHBOR_TEMPLATES.map((t) => [t.name, figureKeyFor(t)]));
    expect(byName).toEqual({ Pat: 'pat', Sam: 'sam', Jo: 'jo', Robin: 'robin' });
    listAllNPCs().filter((n) => !n.modded).forEach((npc) => expect(figureKeyFor(npc)).not.toBe('folk'));
  });

  it('falls back to the plain neighbour for content-pack NPCs', () => {
    expect(figureKeyFor({ id: 'pack_someone', modded: true })).toBe('folk');
    expect(figureKeyFor(null)).toBe('folk');
  });
});

describe('primitive fallback', () => {
  it('keeps the capsule when the figure parts are missing', () => {
    const { group, capsule } = primitiveMarker();
    const scene = fakeScene(['gus']); // no lila, no folk
    expect(applyNpcFigure(group, scene, { id: 'lila' }, { primitives: [capsule] })).toBeNull();
    expect(capsule.parent).toBe(group);
  });

  it('keeps the capsule when the GLB fails to load', async () => {
    const { group, capsule } = primitiveMarker();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resetNpcFigureCache();
    const loader = { loadAsync: vi.fn(() => Promise.reject(new Error('404'))) };
    const fig = await upgradeNpcMarker(group, { id: 'lila' }, {
      primitives: [capsule],
      load: () => loadNpcFigures({ loader }),
    });
    expect(fig).toBeNull();
    expect(capsule.parent).toBe(group);
    expect(warn).toHaveBeenCalled();
    // a failed load is not cached: the next zone visit retries
    const ok = { loadAsync: vi.fn(() => Promise.resolve({ scene: fakeScene() })) };
    expect(await loadNpcFigures({ loader: ok })).toBeTruthy();
    expect(ok.loadAsync).toHaveBeenCalledTimes(1);
    resetNpcFigureCache();
    warn.mockRestore();
  });

  it('does not try to fetch without a DOM', async () => {
    resetNpcFigureCache();
    expect(await loadNpcFigures()).toBeNull();
  });

  it('swaps the capsule for the figure and keeps the name tag and interactable', async () => {
    const { group, capsule, tag } = primitiveMarker();
    const before = JSON.stringify(group.userData.interactable);
    const fig = await upgradeNpcMarker(group, { id: 'lila' }, { primitives: [capsule], load: async () => fakeScene() });
    expect(fig.name).toBe('npc-figure:lila');
    expect(capsule.parent).toBeNull();
    expect(tag.parent).toBe(group);
    expect(JSON.stringify(group.userData.interactable)).toBe(before);
    // head hangs from a neck pivot; meshopt's node scale survives on the meshes
    const pivot = fig.getObjectByName('npc-figure-head-pivot');
    expect(pivot.position.y).toBeCloseTo(NPC_NECK_Y);
    expect(pivot.getObjectByName('npc-figure-head:lila').position.y).toBeCloseTo(0.15);
    expect(fig.getObjectByName('npc-figure-body:lila').scale.x).toBeCloseTo(0.33);
    // applying twice is a no-op
    expect(applyNpcFigure(group, fakeScene(), { id: 'lila' })).toBeNull();
  });
});

describe('where figures stand', () => {
  const blockers = WORLD_MAP.zones.neighborhood.blockers;
  const slots = Object.fromEntries(WORLD_MAP.zones.neighborhood.npcSlots.map((s) => [s.npcId, s.position]));
  const inside = (p) => blockers.some((b) => p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ);

  it('moves slots that sit inside a house to just outside it, within talking range', () => {
    Object.entries(slots).forEach(([id, slot]) => {
      const stand = figureStandPosition(slot, blockers);
      expect(inside(stand), id).toBe(false);
      expect(Math.hypot(stand.x - slot.x, stand.z - slot.z), id).toBeLessThan(0.9); // NPC talk radius is 1.2
    });
    expect(figureStandPosition(slots.old_gus, blockers)).toEqual(slots.old_gus); // already in the open
  });
});

describe('idle and turn-to-face', () => {
  it('turns toward a nearby player, eases back when they leave, and never rescales the meshes', () => {
    const root = new THREE.Group();
    const fig = buildNpcFigure(fakeScene(), { id: 'maya' });
    root.add(fig);
    const body = fig.getObjectByName('npc-figure-body:maya');
    for (let i = 0; i < 120; i++) animateNpcFigures(root, 1 / 60, i / 60, { x: 1.5, z: 0 });
    expect(fig.rotation.y).toBeGreaterThan(1.2); // facing +X (atan2(1.5, 0) = PI / 2)
    expect(body.scale.x).toBeCloseTo(0.33);
    for (let i = 0; i < 240; i++) animateNpcFigures(root, 1 / 60, 2 + i / 60, { x: 9, z: 9 });
    expect(Math.abs(fig.rotation.y)).toBeLessThan(0.05);
    const pivot = fig.getObjectByName('npc-figure-head-pivot');
    expect(Math.abs(pivot.rotation.y)).toBeLessThan(0.05);
  });
});
