/**
 * Playable gardener. The mesh is the stylised hero from gardener-model.js
 * (one material, atlas, vertex AO, rim). Motion comes from gardener-anim.js.
 */
import * as THREE from 'three';
import { buildGardener, gardenerPalette } from './gardener-model.js';
import { createGardenerAnimator, footWorld } from './gardener-anim.js';

function shadowTexture() {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x - c, y - c) / c;
      const a = Math.round(Math.max(0, 1 - d) ** 1.7 * 150);
      const i = (y * size + x) * 4;
      data[i] = 28;
      data[i + 1] = 22;
      data[i + 2] = 16;
      data[i + 3] = a;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function createDust() {
  const geo = new THREE.PlaneGeometry(0.16, 0.16);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xc4a574,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, 12);
  mesh.name = 'gardener-dust';
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  const dummy = new THREE.Object3D();
  const puffs = [];
  return {
    mesh,
    spawn(x, z) {
      if (puffs.length > 10) puffs.shift();
      puffs.push({ x, z, y: 0.04, t: 0, s: 0.55 });
    },
    update(dt) {
      for (let i = puffs.length - 1; i >= 0; i -= 1) {
        const p = puffs[i];
        p.t += dt;
        p.y += dt * 0.35;
        p.s += dt * 0.8;
        if (p.t > 0.45) puffs.splice(i, 1);
      }
      mesh.count = puffs.length;
      puffs.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.setScalar(p.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, new THREE.Color(0xc4a574));
      });
      if (puffs.length) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    },
  };
}

export function createPlayerCharacter(tracker = null, initialProfile = null) {
  const group = new THREE.Group();
  group.name = 'player-character';

  const view = buildGardener(initialProfile);
  group.add(view.mesh);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.38),
    new THREE.MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  shadow.renderOrder = 1;
  shadow.name = 'gardener-contact-shadow';
  group.add(shadow);

  const dust = createDust();
  group.add(dust.mesh);

  const animator = createGardenerAnimator(view);
  view.tools.show('hand');

  let lastSnapshot = {
    position: { x: 0, y: 0, z: 2.55 },
    facing: Math.PI,
    moving: false,
    speed: 0,
    time: 0,
  };
  let lastTime = 0;

  function setProfile(nextProfile) {
    view.atlas.repaint(gardenerPalette(nextProfile));
  }

  function update(snapshot, dtOverride) {
    if (!snapshot) return;
    const time = snapshot.time ?? lastTime;
    let dt = Number.isFinite(dtOverride) ? dtOverride : time - lastTime;
    lastTime = time;
    if (!(dt > 0) || dt > 0.1) dt = dt > 0.1 ? 0.1 : 0;
    lastSnapshot = snapshot;
    group.position.set(snapshot.position.x, snapshot.position.y ?? 0, snapshot.position.z);
    group.rotation.y = snapshot.facing ?? group.rotation.y;
    const pose = animator.update({ ...snapshot, facing: snapshot.facing ?? Math.PI }, dt, group);
    for (const step of pose.steps) dust.spawn(step.x, step.z);
    dust.update(dt);
    const hop = view.bones.root.position.y;
    shadow.position.y = 0.012;
    shadow.scale.setScalar(1 - hop * 1.4);
    shadow.material.opacity = 0.85;
  }

  function getFocusTarget(target = new THREE.Vector3()) {
    target.copy(group.position);
    target.y += 0.9;
    return target;
  }

  function setEquippedTool(toolId) {
    view.tools.show(toolId ?? 'hand');
  }

  function playAction(name) {
    return animator.playAction(name);
  }

  function getFootWorld(side, target = new THREE.Vector3()) {
    const bone = view.bones[side === 'R' ? 'footR' : 'footL'];
    return footWorld(group, bone, target);
  }

  tracker?.trackObject(group);
  setProfile(initialProfile);
  update(lastSnapshot);

  return {
    group,
    update,
    getFocusTarget,
    setEquippedTool,
    setProfile,
    playAction,
    getFootWorld,
    triangleCount: view.triangleCount,
    materialCount: 1,
  };
}
