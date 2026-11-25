// @vitest-environment jsdom
// The props_set1 model loads asynchronously. If the player leaves the village
// first (ZoneManager disposes the scene), the late callback must not build a mesh
// into the cleared scene.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

const pendingLoads = [];
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setMeshoptDecoder() { return this; }
    load(url, onLoad, _onProgress, onError) { pendingLoads.push({ url, onLoad, onError }); }
  },
}));

import { createVillageScene } from './village-scene.js';
import { getVillageLayout } from './village-layout.js';

const QUALITY = { tier: 'low', choice: 'low', source: 'test' };
const make = () => createVillageScene({ renderer: null, quality: QUALITY, overlayParent: null });
const propNames = [...new Set(getVillageLayout().entries
  .filter((e) => typeof e.asset === 'string' && e.asset.startsWith('props_set1.glb#'))
  .map((e) => e.asset.split('#')[1]))];

/** A GLTF-shaped scene with one box per prop, and a record of which geometries were disposed. */
function fakeGltf() {
  const scene = new THREE.Group();
  const geometries = propNames.map((name) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    mesh.name = name;
    scene.add(mesh);
    return mesh.geometry;
  });
  const disposed = new Set();
  geometries.forEach((g, i) => g.addEventListener('dispose', () => disposed.add(i)));
  return { gltf: { scene }, disposedCount: () => disposed.size };
}

beforeEach(() => {
  pendingLoads.length = 0;
});

describe('village props model loading', () => {
  it('has props to load in the shipped layout', () => {
    expect(propNames.length).toBeGreaterThan(0);
  });

  it('control: a load that finishes while the village is alive adds one merged props mesh, and dispose() frees it', async () => {
    const village = make();
    expect(pendingLoads).toHaveLength(1);
    pendingLoads.shift().onLoad(fakeGltf().gltf);
    await village.ready;
    const mesh = village.scene.getObjectByName('village-props');
    expect(mesh).toBeTruthy();
    const freed = { geometry: false, material: false };
    mesh.geometry.addEventListener('dispose', () => { freed.geometry = true; });
    mesh.material.addEventListener('dispose', () => { freed.material = true; });
    village.dispose();
    expect(freed).toEqual({ geometry: true, material: true });
  });

  it('a load that finishes after dispose() builds nothing, frees the parsed geometries, and still resolves ready', async () => {
    const village = make();
    village.dispose();
    const late = fakeGltf();
    pendingLoads.shift().onLoad(late.gltf);
    const result = await Promise.race([village.ready, new Promise((resolve) => setTimeout(() => resolve('timeout'), 1000))]);
    expect(village.scene.getObjectByName('village-props')).toBeUndefined();
    expect(village.scene.children).toHaveLength(0);
    expect(village.getDebugState().props).toBe(false);
    expect(late.disposedCount()).toBe(propNames.length);
    expect(result).not.toBe('timeout');
    expect(result.errors).toEqual([]);
  });

  it('a failed load after dispose() still resolves ready with the error', async () => {
    const village = make();
    village.dispose();
    pendingLoads.shift().onError(new Error('network down'));
    const result = await village.ready;
    expect(result.errors).toEqual(['props_set1: network down']);
    expect(village.scene.children).toHaveLength(0);
  });
});
