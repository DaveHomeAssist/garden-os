import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { batchCropGroup, setCropBatchBreeze } from './crop-batch.js';

function leaf(color, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, breeze = null } = {}) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 0.14, 2, 3).translate(0, 0.07, 0),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72, side: THREE.DoubleSide }),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.scale.setScalar(s);
  mesh.castShadow = true;
  if (breeze) {
    mesh.userData.breeze = {
      ...breeze,
      basePositionY: y,
      baseRotationX: rx,
      baseRotationY: ry,
      baseRotationZ: rz,
    };
  }
  return mesh;
}

function buildCrop() {
  const group = new THREE.Group();
  const b = { rotX: 0.05, rotY: 0.03, rotZ: 0.1, lift: 0.01, speed: 1.3, phase: 0.4 };
  group.add(leaf(0x55aa44, { x: 0.03, y: 0.02, rz: 0.4, ry: 1.1, breeze: b }));
  group.add(leaf(0x55aa44, { x: -0.03, y: 0.03, rx: -0.3, ry: 2.2, s: 0.8, breeze: { ...b, phase: 1.7 } }));
  group.add(leaf(0x55aa44, { z: 0.02, y: 0.01, ry: 0.5 })); // static, same look
  group.add(leaf(0x884422, { y: 0.05, breeze: b })); // different colour -> own batch
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.1, 8),
    new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.12 }),
  );
  group.add(shadow); // transparent -> untouched
  return group;
}

/** CPU copy of updateCropBreeze's per-leaf animation (the original code path). */
function animateOriginal(group, time, phaseSeed, strength) {
  group.traverse((child) => {
    const b = child.userData?.breeze;
    if (!b) return;
    const wave = Math.sin(time * b.speed + phaseSeed + b.phase);
    const ripple = Math.cos(time * b.speed * 0.58 + phaseSeed * 0.7 + b.phase);
    child.rotation.x = b.baseRotationX + ripple * b.rotX * strength;
    child.rotation.y = b.baseRotationY + ripple * b.rotY * strength;
    child.rotation.z = b.baseRotationZ + wave * b.rotZ * strength;
    child.position.y = b.basePositionY + Math.max(0, wave) * b.lift * strength;
  });
  group.updateMatrixWorld(true);
}

/** CPU copy of the vertex shader in crop-batch.js. */
function shaderPositions(mesh, time, phaseSeed, strength) {
  const g = mesh.geometry;
  const out = [];
  const a = (name, i, n) => Array.from(g.getAttribute(name).array.slice(i * n, i * n + n));
  for (let i = 0; i < g.getAttribute('position').count; i++) {
    const [lx, ly, lz] = a('aLocal', i, 3);
    const pivot = new THREE.Vector3(...a('aPivot', i, 3));
    const [bx, by, bz] = a('aBaseRot', i, 3);
    const [rx, ry, rz, lift] = a('aBreeze', i, 4);
    const [speed, phase] = a('aSpeedPhase', i, 2);
    const wave = Math.sin(time * speed + phaseSeed + phase);
    const ripple = Math.cos(time * speed * 0.58 + phaseSeed * 0.7 + phase);
    const euler = new THREE.Euler(bx + ripple * rx * strength, by + ripple * ry * strength, bz + wave * rz * strength, 'XYZ');
    const v = new THREE.Vector3(lx, ly, lz).applyEuler(euler).add(pivot);
    v.y += Math.max(0, wave) * lift * strength;
    out.push(v);
  }
  return out;
}

function worldVertices(meshes) {
  const out = [];
  for (const mesh of meshes) {
    const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld));
  }
  return out;
}

describe('batchCropGroup', () => {
  it('merges same-look opaque meshes and leaves transparent ones alone', () => {
    const group = buildCrop();
    const removed = batchCropGroup(group);
    const batches = group.children.filter((c) => c.name === 'crop-batch');
    expect(batches).toHaveLength(2);
    expect(removed).toBe(2); // 4 opaque meshes -> 2
    expect(group.children).toHaveLength(3); // 2 batches + transparent ground shadow
    expect(batches.map((b) => b.userData.cropBatch.meshCount).sort()).toEqual([1, 3]);
    expect(batches.every((b) => b.castShadow && b.customDepthMaterial)).toBe(true);
    expect(group.userData.breezeUniforms).toBeTruthy();
  });

  it('keeps triangle count and the rest pose', () => {
    const reference = buildCrop();
    reference.updateMatrixWorld(true);
    const opaque = reference.children.filter((c) => !c.material.transparent);
    const expected = worldVertices(opaque);

    const group = buildCrop();
    batchCropGroup(group);
    const batches = group.children.filter((c) => c.name === 'crop-batch');
    const actual = batches.flatMap((b) => {
      const p = b.geometry.getAttribute('position');
      return Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i));
    });
    expect(actual).toHaveLength(expected.length);
    const key = (v) => v.toArray().map((n) => n.toFixed(5)).join(',');
    expect(actual.map(key).sort()).toEqual(expected.map(key).sort());
  });

  it('shader breeze reproduces the per-leaf CPU animation', () => {
    const time = 12.34;
    const phaseSeed = 2.1;
    const strength = 0.9;
    const reference = buildCrop();
    animateOriginal(reference, time, phaseSeed, strength);
    const expected = worldVertices(reference.children.filter((c) => !c.material.transparent));

    const group = buildCrop();
    batchCropGroup(group);
    setCropBatchBreeze(group, time, phaseSeed, strength);
    expect(group.userData.breezeUniforms.uBreezeTime.value).toBe(time);
    const actual = group.children.filter((c) => c.name === 'crop-batch').flatMap((b) => shaderPositions(b, time, phaseSeed, strength));
    const key = (v) => v.toArray().map((n) => n.toFixed(4)).join(',');
    expect(actual.map(key).sort()).toEqual(expected.map(key).sort());
  });

  it('patches the standard and depth shaders', () => {
    const group = buildCrop();
    batchCropGroup(group);
    const batch = group.children.find((c) => c.name === 'crop-batch');
    for (const material of [batch.material, batch.customDepthMaterial]) {
      const shader = {
        uniforms: {},
        vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>\n',
      };
      material.onBeforeCompile(shader);
      expect(shader.vertexShader).toContain('cropBreezeRotation');
      expect(shader.vertexShader).not.toContain('#include <begin_vertex>');
      expect(shader.uniforms.uBreezeTime).toBe(group.userData.breezeUniforms.uBreezeTime);
    }
  });

  it('skips nested breeze nodes', () => {
    const group = new THREE.Group();
    const parent = leaf(0x55aa44, { breeze: { rotX: 0, rotY: 0, rotZ: 0.1, lift: 0, speed: 1, phase: 0 } });
    parent.add(leaf(0x55aa44, { y: 0.1, breeze: { rotX: 0, rotY: 0, rotZ: 0.1, lift: 0, speed: 1, phase: 0 } }));
    group.add(parent);
    batchCropGroup(group);
    // The parent has a child and the child has a breeze ancestor: both stay as built.
    const all = [];
    group.traverse((n) => { if (n.isMesh) all.push(n); });
    expect(all).toHaveLength(2);
    expect(all.every((m) => m.name !== 'crop-batch')).toBe(true);
  });
});
