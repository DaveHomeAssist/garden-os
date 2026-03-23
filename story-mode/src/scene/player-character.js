import * as THREE from 'three';

export function createPlayerCharacter(tracker = null) {
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

  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 0.3;
  rig.add(torsoPivot);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.11), shirtMat);
  torso.position.y = 0.13;
  torso.castShadow = true;
  torsoPivot.add(torso);

  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.03), apronMat);
  apron.position.set(0, 0.09, 0.065);
  apron.castShadow = true;
  torsoPivot.add(apron);

  const headPivot = new THREE.Group();
  headPivot.position.y = 0.31;
  torsoPivot.add(headPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), skinMat);
  head.castShadow = true;
  headPivot.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.088, 10, 8), hairMat);
  hair.scale.set(1.02, 0.72, 1.02);
  hair.position.y = 0.016;
  hair.castShadow = true;
  headPivot.add(hair);

  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 20), hatMat);
  hatBrim.position.y = 0.065;
  hatBrim.castShadow = true;
  headPivot.add(hatBrim);

  const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.09, 18), hatMat);
  hatCrown.position.y = 0.11;
  hatCrown.castShadow = true;
  headPivot.add(hatCrown);

  const armPivots = [];
  for (const side of [-1, 1]) {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.13, 0.22, 0);
    torsoPivot.add(armPivot);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.17, 0.055), shirtMat);
    upperArm.position.y = -0.085;
    upperArm.castShadow = true;
    armPivot.add(upperArm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), skinMat);
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
      new THREE.ConeGeometry(0.034, 0.12, 4),
      new THREE.MeshStandardMaterial({ color: 0x8aa667, roughness: 0.72 }),
    ),
    harvest: new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.045, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xc7a954, roughness: 0.78 }),
    ),
    protect: new THREE.Mesh(
      new THREE.OctahedronGeometry(0.05, 0),
      new THREE.MeshStandardMaterial({ color: 0x8898af, roughness: 0.48 }),
    ),
    mulch: new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.075, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x7a5a33, roughness: 0.9 }),
    ),
  };

  toolMeshes.water.rotation.z = Math.PI / 2;
  toolMeshes.water.position.set(0.015, -0.03, 0.03);
  toolMeshes.plant.rotation.z = -0.85;
  toolMeshes.plant.position.set(0.02, -0.02, 0.04);
  toolMeshes.harvest.position.set(0.016, -0.04, 0.03);
  toolMeshes.protect.position.set(0.02, -0.03, 0.045);
  toolMeshes.mulch.position.set(0.015, -0.035, 0.02);

  Object.values(toolMeshes).forEach((mesh) => {
    mesh.castShadow = true;
    mesh.visible = false;
    toolGroup.add(mesh);
  });

  const legPivots = [];
  for (const side of [-1, 1]) {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.055, 0.1, 0);
    rig.add(legPivot);

    const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.07), pantsMat);
    upperLeg.position.y = -0.11;
    upperLeg.castShadow = true;
    legPivot.add(upperLeg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.05, 0.12), bootMat);
    boot.position.set(0, -0.24, 0.02);
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

  function update(snapshot) {
    if (!snapshot) return;
    lastSnapshot = snapshot;
    const strideStrength = snapshot.moving ? Math.min(1, snapshot.speed / 1.7) : 0;
    const stride = Math.sin(snapshot.time * 9.5) * 0.55 * strideStrength;
    const bob = Math.abs(Math.sin(snapshot.time * 9.5)) * 0.025 * strideStrength;

    group.position.set(snapshot.position.x, snapshot.position.y ?? 0, snapshot.position.z);
    group.rotation.y = snapshot.facing;
    torsoPivot.position.y = 0.3 + bob;
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
    target.y += 0.58;
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
  setEquippedTool(equippedToolId);

  return {
    group,
    update,
    getFocusTarget,
    setEquippedTool,
  };
}
