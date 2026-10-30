import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { CALVIN_PART_NAMES, collectCalvinParts, applyCalvinModel } from './calvin-model.js';

function fakeGltfScene(names = CALVIN_PART_NAMES) {
  const scene = new THREE.Group();
  for (const n of names) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1));
    m.name = n;
    m.scale.setScalar(0.5); // stands in for meshopt's dequantize scale
    scene.add(m);
  }
  return scene;
}

function fakeRig() {
  const torso = new THREE.Group();
  const headPivot = new THREE.Group();
  torso.add(headPivot);
  const ears = [new THREE.Group(), new THREE.Group()];
  ears.forEach((e) => headPivot.add(e));
  const tailPivot = new THREE.Group();
  torso.add(tailPivot);
  const legRigs = [0.18, -0.12, 0.18, -0.12].map((x) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.x = x;
    const kneePivot = new THREE.Group();
    hipPivot.add(kneePivot);
    torso.add(hipPivot);
    return { hipPivot, kneePivot, phase: 0 };
  });
  const prim = new THREE.Mesh(new THREE.SphereGeometry(0.1));
  torso.add(prim);
  const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.02));
  tongue.position.set(0.25, -0.065, 0.012);
  headPivot.add(tongue);
  return { torso, headPivot, ears, tailPivot, legRigs, tongue, primitives: [prim] };
}

describe('Calvin GLB rig', () => {
  it('ships a GLB with every rig part as a named mesh', () => {
    const bytes = readFileSync(new URL('../../assets/art/yard/calvin.glb', import.meta.url));
    const jsonLen = bytes.readUInt32LE(12);
    const json = JSON.parse(bytes.subarray(20, 20 + jsonLen).toString('utf8'));
    const meshNames = json.meshes.map((m) => m.name);
    for (const n of CALVIN_PART_NAMES) expect(meshNames).toContain(n);
    expect(json.images ?? []).toHaveLength(0); // no textures, painted vertex colour only
  });

  it('reports missing parts instead of half-applying', () => {
    const { parts, missing } = collectCalvinParts(fakeGltfScene(['calvin_body']));
    expect(parts).toBeNull();
    expect(missing).toContain('calvin_head');
    const rig = fakeRig();
    expect(applyCalvinModel(rig, fakeGltfScene(['calvin_body']))).toBeNull();
    expect(rig.primitives[0].parent).toBe(rig.torso); // fallback untouched
  });

  it('hangs each part on the pivot the animation drives and drops the primitives', () => {
    const rig = fakeRig();
    const added = applyCalvinModel(rig, fakeGltfScene());
    expect(added).toHaveLength(5 + 8);
    expect(rig.primitives[0].parent).toBeNull();
    expect(rig.torso.getObjectByName('calvin-body').parent).toBe(rig.torso);
    expect(rig.headPivot.getObjectByName('calvin-head').parent).toBe(rig.headPivot);
    expect(rig.ears[0].children.map((c) => c.name)).toEqual(['calvin-ear-l']);
    expect(rig.ears[1].children.map((c) => c.name)).toEqual(['calvin-ear-r']);
    expect(rig.tailPivot.children.map((c) => c.name)).toEqual(['calvin-tail']);
    rig.legRigs.forEach(({ hipPivot, kneePivot }, i) => {
      expect(hipPivot.children.some((c) => c.name === `calvin-leg-upper-${i}`)).toBe(true);
      expect(kneePivot.children.map((c) => c.name)).toEqual([`calvin-leg-lower-${i}`]);
    });
    // front hips get the white leg, hind hips the grey-thigh leg
    const geoOf = (i) => rig.legRigs[i].hipPivot.getObjectByName(`calvin-leg-upper-${i}`).geometry;
    expect(geoOf(0)).toBe(geoOf(2));
    expect(geoOf(1)).toBe(geoOf(3));
    expect(geoOf(0)).not.toBe(geoOf(1));
    // node transform (dequantize scale) is preserved on the attached part
    expect(rig.torso.getObjectByName('calvin-body').scale.x).toBeCloseTo(0.5);
    // tongue object is reused so the run animation still toggles it
    expect(rig.tongue.parent).toBe(rig.headPivot);
    expect(rig.tongue.material.name).toBe('calvin-coat');
    // every part shares one material (fade traversal writes it once)
    const mats = new Set(added.map((m) => m.material));
    expect(mats.size).toBe(1);
  });
});
