import * as THREE from 'three';
import { getPlayerProfilePalette, normalizePlayerProfile } from '../data/player-profile.js';

export function createPlayerCharacter(tracker = null, initialProfile = null) {
  const group = new THREE.Group();
  group.name = 'player-character';

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 18),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  const rig = new THREE.Group();
  rig.position.y = 0.02;
  group.add(rig);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd8b08c, roughness: 0.82 });
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x6d4d33, roughness: 0.88 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x7f9a62, roughness: 0.78 });
  const apronMat = new THREE.MeshStandardMaterial({ color: 0xc9b072, roughness: 0.92 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x4a5b76, roughness: 0.84 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x38281d, roughness: 0.92 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 0.9 });

  // Proportion pass: longer legs (hip 0.28) + higher torso so the character
  // reads as a person, not a head on a stub. Keep torsoPivot base in sync with
  // the hardcoded value in update() below.
  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 0.47;
  rig.add(torsoPivot);

  // Fuller torso — taller and broader so the character reads as a body, not a
  // head balanced on a stub. (Head is 0.085; the old 0.07 torso was narrower
  // than the head, which is what made it look like a bobblehead.)
  // Torso must SPAN hips (world ~0.31) to head (world ~0.80): capsule total
  // height 0.516 centered at pivot+0.12 covers 0.33..0.85. The previous short
  // capsule left a visible gap of lawn between shirt and pants.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.34, 8, 14), shirtMat);
  torso.scale.set(1.12, 1.0, 0.86);
  torso.position.y = 0.12;
  torso.castShadow = true;
  torsoPivot.add(torso);

  const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.28, 16, 1, true), apronMat);
  apron.position.set(0, 0.06, 0.07);
  apron.rotation.y = Math.PI / 2;
  apron.rotation.z = Math.PI / 2;
  apron.scale.set(1, 1, 0.36);
  apron.castShadow = true;
  torsoPivot.add(apron);

  const headPivot = new THREE.Group();
  headPivot.position.y = 0.4;
  torsoPivot.add(headPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.076, 20, 16), skinMat);
  head.castShadow = true;
  headPivot.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.079, 18, 14), hairMat);
  hair.scale.set(1.02, 0.72, 1.02);
  hair.position.y = 0.015;
  hair.castShadow = true;
  headPivot.add(hair);

  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.015, 28), hatMat);
  hatBrim.position.y = 0.058;
  hatBrim.castShadow = true;
  headPivot.add(hatBrim);

  const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.085, 24), hatMat);
  hatCrown.position.y = 0.1;
  hatCrown.castShadow = true;
  headPivot.add(hatCrown);

  const armPivots = [];
  for (const side of [-1, 1]) {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.13, 0.26, 0);
    torsoPivot.add(armPivot);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.1, 5, 10), shirtMat);
    upperArm.position.y = -0.085;
    upperArm.castShadow = true;
    armPivot.add(upperArm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), skinMat);
    hand.position.y = -0.18;
    hand.castShadow = true;
    armPivot.add(hand);

    armPivots.push(armPivot);
  }

  const toolGroup = new THREE.Group();
  toolGroup.position.set(0.015, -0.165, 0.035);
  armPivots[1].add(toolGroup);

  const toolMeshes = {
    water: new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.026, 0.16, 8),
      new THREE.MeshStandardMaterial({ color: 0x4e8fc8, roughness: 0.52 }),
    ),
    plant: new THREE.Mesh(
      new THREE.ConeGeometry(0.034, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0x8aa667, roughness: 0.72 }),
    ),
    harvest: new THREE.Mesh(
      new THREE.CapsuleGeometry(0.022, 0.04, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xc7a954, roughness: 0.78 }),
    ),
    protect: new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x8898af, roughness: 0.48 }),
    ),
    mulch: new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x7a5a33, roughness: 0.9 }),
    ),
  };

  toolMeshes.water.rotation.z = Math.PI / 2;
  toolMeshes.water.position.set(0.015, -0.03, 0.03);
  toolMeshes.plant.rotation.z = -0.85;
  toolMeshes.plant.position.set(0.02, -0.02, 0.04);
  toolMeshes.harvest.rotation.z = Math.PI / 2;
  toolMeshes.harvest.scale.set(1, 0.86, 0.8);
  toolMeshes.harvest.position.set(0.016, -0.04, 0.03);
  toolMeshes.protect.position.set(0.02, -0.03, 0.045);
  toolMeshes.mulch.scale.set(1.08, 0.72, 0.86);
  toolMeshes.mulch.position.set(0.015, -0.035, 0.02);

  Object.values(toolMeshes).forEach((mesh) => {
    mesh.castShadow = true;
    mesh.visible = false;
    toolGroup.add(mesh);
  });

  const legPivots = [];
  for (const side of [-1, 1]) {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.055, 0.28, 0);
    rig.add(legPivot);

    const upperLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.12, 6, 12), pantsMat);
    upperLeg.position.y = -0.075;
    upperLeg.castShadow = true;
    legPivot.add(upperLeg);

    const lowerLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.031, 0.1, 5, 10), pantsMat);
    lowerLeg.position.y = -0.185;
    lowerLeg.castShadow = true;
    legPivot.add(lowerLeg);

    const boot = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.05, 4, 10), bootMat);
    boot.scale.set(0.95, 0.65, 1.4);
    boot.position.set(0, -0.26, 0.02);
    boot.castShadow = true;
    legPivot.add(boot);

    legPivots.push(legPivot);
  }

  let lastSnapshot = {
    position: { x: 0, y: 0, z: 2.55 },
    facing: Math.PI,
    moving: false,
    speed: 0,
    time: 0,
  };
  let equippedToolId = 'hand';
  let profile = normalizePlayerProfile(initialProfile);

  function setProfile(nextProfile) {
    profile = normalizePlayerProfile(nextProfile ?? profile);
    const palette = getPlayerProfilePalette(profile);
    skinMat.color.setHex(palette.skin);
    hairMat.color.setHex(palette.hair);
    shirtMat.color.setHex(palette.shirt);
    apronMat.color.setHex(palette.apron);
    pantsMat.color.setHex(palette.pants);
    hatMat.color.setHex(palette.hat);
  }

  function update(snapshot) {
    if (!snapshot) return;
    lastSnapshot = snapshot;
    const strideStrength = snapshot.moving ? Math.min(1, snapshot.speed / 1.7) : 0;
    const stride = Math.sin(snapshot.time * 9.5) * 0.55 * strideStrength;
    const bob = Math.abs(Math.sin(snapshot.time * 9.5)) * 0.025 * strideStrength;

    group.position.set(snapshot.position.x, snapshot.position.y ?? 0, snapshot.position.z);
    group.rotation.y = snapshot.facing;
    torsoPivot.position.y = 0.47 + bob;
    torsoPivot.rotation.z = stride * 0.06;
    headPivot.rotation.z = -stride * 0.04;
    shadow.scale.setScalar(1 - bob * 0.8);
    shadow.material.opacity = 0.18 - bob * 0.4;

    armPivots[0].rotation.x = stride;
    armPivots[1].rotation.x = -stride;
    legPivots[0].rotation.x = -stride * 0.9;
    legPivots[1].rotation.x = stride * 0.9;
  }

  function getFocusTarget(target = new THREE.Vector3()) {
    target.copy(group.position);
    target.y += 0.74; // head height after the proportion pass
    return target;
  }

  function setEquippedTool(toolId) {
    equippedToolId = toolId ?? 'hand';
    Object.entries(toolMeshes).forEach(([id, mesh]) => {
      mesh.visible = id === equippedToolId;
    });
  }

  tracker?.trackObject(group);

  update(lastSnapshot);
  setProfile(profile);
  setEquippedTool(equippedToolId);

  return {
    group,
    update,
    getFocusTarget,
    setEquippedTool,
    setProfile,
  };
}
