// North-edge follow camera: the camera sits ~7 m behind the player (+z), so at
// the north (maxZ) edge it hangs over the boundary treeline. Trees standing in
// the camera->player foreground corridor must be cut; everywhere else the
// treeline stays.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createVillageScene } from './village-scene.js';
import { getVillageLayout } from './village-layout.js';
import { FOLLOW_DEFAULTS, followOffset, treeInViewCorridor } from './follow-camera.js';

const make = () => createVillageScene({ renderer: null, quality: { tier: 'high', choice: 'high', source: 'test' }, overlayParent: null, loadProps: false });

/** Visible tree instances as { x, z, scale } from the InstancedMesh matrices. */
function visibleTrees(v) {
  const out = [];
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
  v.scene.traverse((o) => {
    if (!o.isInstancedMesh || !o.name.startsWith('village-tree-') || o.name === 'village-tree-bush') return;
    for (let i = 0; i < o.count; i += 1) {
      o.getMatrixAt(i, m); m.decompose(p, q, s);
      if (s.x > 0.5) out.push({ x: p.x, z: p.z, scale: s.x });
    }
  });
  return out;
}

/** Canopy (sphere, ~1 m * scale at ~1.6 m * scale up) hit by the camera->player sight line? */
function canopyBlocksSight(tree, cam, target) {
  const c = new THREE.Vector3(tree.x, 1.6 * tree.scale, tree.z);
  const ray = new THREE.Ray(new THREE.Vector3(cam.x, cam.y, cam.z), new THREE.Vector3(target.x - cam.x, target.y - cam.y, target.z - cam.z).normalize());
  const len = Math.hypot(target.x - cam.x, target.y - cam.y, target.z - cam.z);
  const closest = ray.closestPointToPoint(c, new THREE.Vector3());
  return closest.distanceTo(ray.origin) <= len && closest.distanceTo(c) < 1.0 * tree.scale;
}

describe('treeInViewCorridor', () => {
  const off = followOffset(FOLLOW_DEFAULTS);
  const player = { x: 0, z: 0 };
  const cam = { x: off.x, z: off.z }; // ~7 m on +z
  it('cuts trees between the camera and the player', () => {
    expect(off.z).toBeGreaterThan(6);
    expect(treeInViewCorridor({ x: 0, z: 3, scale: 2.5 }, cam, player)).toBe(true);
    expect(treeInViewCorridor({ x: 4, z: 5, scale: 2.5 }, cam, player)).toBe(true);
    expect(treeInViewCorridor({ x: 0, z: off.z + 1, scale: 2.5 }, cam, player)).toBe(true); // canopy overhangs the camera
  });
  it('keeps trees level with or beyond the player, far to the side, or well behind the camera', () => {
    expect(treeInViewCorridor({ x: 3, z: 0, scale: 2.5 }, cam, player)).toBe(false);
    expect(treeInViewCorridor({ x: 0, z: -5, scale: 2.5 }, cam, player)).toBe(false);
    expect(treeInViewCorridor({ x: 15, z: 3, scale: 2.5 }, cam, player)).toBe(false);
    expect(treeInViewCorridor({ x: 0, z: off.z + 8, scale: 2.5 }, cam, player)).toBe(false);
  });
  it('is a no-op when camera and player coincide', () => {
    expect(treeInViewCorridor({ x: 0, z: 0, scale: 1 }, player, player)).toBe(false);
  });
});

describe('village north-edge camera', () => {
  const layout = getVillageLayout();
  const b = layout.bounds;
  const midX = (b.minX + b.maxX) / 2;

  it('cuts the boundary trees between the camera and a player at the north edge, then restores them', () => {
    const v = make();
    const all = visibleTrees(v).length;
    v.setPlayerPose({ x: midX, z: b.maxZ - 0.3, facingY: 0 });
    for (let i = 0; i < 30; i += 1) v.update(1 / 30);
    const cam = v.camera.position;
    expect(cam.z).toBeGreaterThan(b.maxZ + 3); // the camera really is out over the treeline
    expect(v.getDebugState().treesCut).toBeGreaterThan(0);
    const target = { x: midX, y: 0.9, z: b.maxZ - 0.3 };
    const blockers = visibleTrees(v).filter((t) => canopyBlocksSight(t, cam, target));
    expect(blockers).toEqual([]);
    // no visible tree trunk within the bottom-of-frame foreground strip behind the player
    const fg = visibleTrees(v).filter((t) => t.z > target.z + 0.6 && t.z < cam.z + 1.5 && Math.abs(t.x - cam.x) < 6.5);
    expect(fg).toEqual([]);
    // walk back to the middle: every tree returns
    v.setPlayerPose({ x: midX, z: (b.minZ + b.maxZ) / 2, facingY: 0 });
    for (let i = 0; i < 30; i += 1) v.update(1 / 30);
    expect(v.getDebugState().treesCut).toBe(0);
    expect(visibleTrees(v).length).toBe(all);
    v.dispose();
  });

  it('cuts nothing in the middle of the map or at the south edge', () => {
    const v = make();
    for (const z of [(b.minZ + b.maxZ) / 2, b.minZ + 0.3]) {
      v.setPlayerPose({ x: midX, z, facingY: 0 });
      for (let i = 0; i < 20; i += 1) v.update(1 / 30);
      expect(v.getDebugState().treesCut).toBe(0);
    }
    v.dispose();
  });

  it('has no canopy on the sight line anywhere along the north edge', () => {
    const v = make();
    for (let x = b.minX + 0.5; x <= b.maxX - 0.5; x += (b.maxX - b.minX) / 8) {
      v.setPlayerPose({ x, z: b.maxZ - 0.3, facingY: 0 });
      v.update(1 / 30);
      const cam = v.camera.position;
      const blockers = visibleTrees(v).filter((t) => canopyBlocksSight(t, cam, { x, y: 0.9, z: b.maxZ - 0.3 }));
      expect(blockers, `x=${x.toFixed(1)}`).toEqual([]);
    }
    v.dispose();
  });
});
