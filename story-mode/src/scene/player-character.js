import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getPlayerProfilePalette, normalizePlayerProfile } from '../data/player-profile.js';

// Canonical humanoid template. Future characters derive from this rig by
// overriding palette/features via buildCharacterModel(options) instead of
// building their own geometry from scratch.
export const CHARACTER_TEMPLATE = {
  palette: {
    skin: 0xd8b08c,
    hat: 0x6d4d33,
    shirt: 0x7f9a62,
    apron: 0xc9b072,
    pants: 0x4a5b76,
    boots: 0x38281d,
    hair: 0x3b2c20,
    eyes: 0x241813,
    mouth: 0x7c4a35,
  },
  features: {
    hat: true,
    apron: true,
    blush: true,
  },
};

const shadeHex = (hex, factor) => new THREE.Color(hex).multiplyScalar(factor).getHex();
const blushHex = (skinHex) => new THREE.Color(skinHex).lerp(new THREE.Color(0xe2574d), 0.38).getHex();

// Proportion targets (rig-local units, character ~0.84 tall with hat):
// hips at y 0.34, head center at y 0.66, roughly 3 heads tall — short legs,
// round torso, oversized head. Adjacent parts always overlap so animation
// bob never opens seams.
export function buildCharacterModel(options = {}) {
  const palette = { ...CHARACTER_TEMPLATE.palette, ...(options.palette ?? {}) };
  const features = { ...CHARACTER_TEMPLATE.features, ...(options.features ?? {}) };

  const rig = new THREE.Group();

  const mat = (color, roughness = 0.85) =>
    new THREE.MeshStandardMaterial({ color, roughness });

  const materials = {
    skin: mat(palette.skin, 0.82),
    skinShade: mat(shadeHex(palette.skin, 0.88), 0.82),
    blush: mat(blushHex(palette.skin), 0.95),
    hair: mat(palette.hair, 0.9),
    shirt: mat(palette.shirt, 0.78),
    apron: mat(palette.apron, 0.92),
    pants: mat(palette.pants, 0.84),
    boots: mat(palette.boots, 0.92),
    hat: mat(palette.hat, 0.88),
    hatBand: mat(shadeHex(palette.hat, 0.68), 0.86),
    eyes: mat(palette.eyes, 0.4),
    mouth: mat(palette.mouth, 0.6),
  };

  // Retint the whole model from a partial palette; derived tints (nose shade,
  // blush, hat band) follow their base color automatically.
  function applyPalette(next = {}) {
    if (next.skin != null) {
      materials.skin.color.setHex(next.skin);
      materials.skinShade.color.setHex(shadeHex(next.skin, 0.88));
      materials.blush.color.setHex(blushHex(next.skin));
    }
    if (next.hair != null) materials.hair.color.setHex(next.hair);
    if (next.shirt != null) materials.shirt.color.setHex(next.shirt);
    if (next.apron != null) materials.apron.color.setHex(next.apron);
    if (next.pants != null) materials.pants.color.setHex(next.pants);
    if (next.boots != null) materials.boots.color.setHex(next.boots);
    if (next.hat != null) {
      materials.hat.color.setHex(next.hat);
      materials.hatBand.color.setHex(shadeHex(next.hat, 0.68));
    }
  }

  const addMesh = (parent, geometry, material) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // --- Torso ---------------------------------------------------------------
  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 0.34;
  rig.add(torsoPivot);

  const hips = addMesh(torsoPivot, new THREE.SphereGeometry(0.1, 18, 14), materials.pants);
  hips.scale.set(1.05, 0.62, 0.88);

  const torso = addMesh(torsoPivot, new THREE.CapsuleGeometry(0.095, 0.09, 8, 16), materials.shirt);
  torso.scale.set(1.12, 0.85, 0.88);
  torso.position.y = 0.15;

  if (features.apron) {
    // Closed geometry only — an open-ended cylinder here reads as a floating
    // crescent once backfaces cull.
    const bib = addMesh(torsoPivot, new RoundedBoxGeometry(0.09, 0.11, 0.02, 3, 0.008), materials.apron);
    bib.position.set(0, 0.155, 0.078);
    bib.rotation.x = 0.06;

    const skirt = addMesh(torsoPivot, new THREE.CylinderGeometry(0.05, 0.088, 0.13, 18), materials.apron);
    skirt.scale.set(1.05, 1, 0.4);
    skirt.position.set(0, 0.045, 0.058);
    skirt.rotation.x = -0.05;
  }

  // --- Head ----------------------------------------------------------------
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.32;
  torsoPivot.add(headPivot);

  const head = addMesh(headPivot, new THREE.SphereGeometry(0.095, 24, 18), materials.skin);
  head.scale.set(1, 0.96, 0.97);

  // Sits up and back so the face stays clear; shows at the sides, back, and
  // under the hat brim without masking the eyes.
  const hair = addMesh(headPivot, new THREE.SphereGeometry(0.099, 20, 16), materials.hair);
  hair.scale.set(1.02, 0.72, 1);
  hair.position.set(0, 0.03, -0.015);

  // Face sits on +z, the rig's forward side.
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xfff6e8 });
  for (const side of [-1, 1]) {
    const eye = addMesh(headPivot, new THREE.SphereGeometry(0.0115, 12, 10), materials.eyes);
    eye.position.set(side * 0.034, 0.006, 0.086);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 8, 6), glintMat);
    glint.position.set(side * 0.038, 0.01, 0.095);
    headPivot.add(glint);

    const brow = addMesh(headPivot, new THREE.CapsuleGeometry(0.006, 0.02, 4, 8), materials.hair);
    brow.position.set(side * 0.035, 0.037, 0.083);
    brow.rotation.z = Math.PI / 2 + side * 0.18;

    if (features.blush) {
      const blush = addMesh(headPivot, new THREE.SphereGeometry(0.016, 10, 8), materials.blush);
      blush.scale.set(1, 0.6, 0.25);
      blush.position.set(side * 0.056, -0.021, 0.068);
      blush.rotation.y = side * 0.42;
    }
  }

  const nose = addMesh(headPivot, new THREE.SphereGeometry(0.0135, 12, 10), materials.skinShade);
  nose.scale.set(0.85, 0.75, 0.9);
  nose.position.set(0, -0.012, 0.09);

  const mouth = addMesh(
    headPivot,
    new THREE.TorusGeometry(0.016, 0.0048, 6, 14, Math.PI * 0.72),
    materials.mouth,
  );
  mouth.position.set(0, -0.028, 0.084);
  mouth.rotation.z = Math.PI + (Math.PI - Math.PI * 0.72) / 2;

  if (features.hat) {
    const brim = addMesh(headPivot, new THREE.CylinderGeometry(0.145, 0.145, 0.014, 28), materials.hat);
    brim.position.y = 0.068;
    const crown = addMesh(headPivot, new THREE.CylinderGeometry(0.082, 0.098, 0.085, 24), materials.hat);
    crown.position.y = 0.115;
    const band = addMesh(headPivot, new THREE.CylinderGeometry(0.09, 0.102, 0.026, 24), materials.hatBand);
    band.position.y = 0.082;
  }

  // --- Arms ----------------------------------------------------------------
  const armPivots = [];
  for (const side of [-1, 1]) {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.122, 0.24, 0);
    armPivot.rotation.z = side * 0.12;
    torsoPivot.add(armPivot);

    const upperArm = addMesh(armPivot, new THREE.CapsuleGeometry(0.03, 0.09, 5, 10), materials.shirt);
    upperArm.position.y = -0.06;

    const forearm = addMesh(armPivot, new THREE.CapsuleGeometry(0.026, 0.06, 5, 10), materials.skin);
    forearm.position.y = -0.135;

    const hand = addMesh(armPivot, new THREE.SphereGeometry(0.034, 12, 10), materials.skin);
    hand.position.y = -0.185;

    armPivots.push(armPivot);
  }

  // --- Legs ----------------------------------------------------------------
  const legPivots = [];
  for (const side of [-1, 1]) {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.06, 0.3, 0);
    rig.add(legPivot);

    const upperLeg = addMesh(legPivot, new THREE.CapsuleGeometry(0.042, 0.08, 6, 12), materials.pants);
    upperLeg.position.y = -0.06;

    const lowerLeg = addMesh(legPivot, new THREE.CapsuleGeometry(0.037, 0.07, 5, 10), materials.pants);
    lowerLeg.position.y = -0.16;

    const boot = addMesh(legPivot, new THREE.CapsuleGeometry(0.042, 0.045, 4, 10), materials.boots);
    boot.scale.set(1, 0.62, 1.45);
    boot.position.set(0, -0.265, 0.025);

    legPivots.push(legPivot);
  }

  return { rig, torsoPivot, headPivot, armPivots, legPivots, torso, materials, applyPalette };
}

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

  const model = buildCharacterModel();
  const { rig, torsoPivot, headPivot, armPivots, legPivots, torso } = model;
  rig.position.y = 0.02;
  group.add(rig);

  const toolGroup = new THREE.Group();
  toolGroup.position.set(0.01, -0.19, 0.03);
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
    model.applyPalette(getPlayerProfilePalette(profile));
  }

  const torsoBaseScaleY = torso.scale.y;

  function update(snapshot) {
    if (!snapshot) return;
    lastSnapshot = snapshot;
    const strideStrength = snapshot.moving ? Math.min(1, snapshot.speed / 1.7) : 0;
    const stride = Math.sin(snapshot.time * 9.5) * 0.55 * strideStrength;
    const bob = Math.abs(Math.sin(snapshot.time * 9.5)) * 0.025 * strideStrength;
    const breathe = Math.sin(snapshot.time * 2.4) * 0.008 * (1 - strideStrength);

    group.position.set(snapshot.position.x, snapshot.position.y ?? 0, snapshot.position.z);
    group.rotation.y = snapshot.facing;
    torsoPivot.position.y = 0.34 + bob;
    torsoPivot.rotation.z = stride * 0.06;
    headPivot.rotation.z = -stride * 0.04;
    torso.scale.y = torsoBaseScaleY * (1 + breathe);
    shadow.scale.setScalar(1 - bob * 0.8);
    shadow.material.opacity = 0.18 - bob * 0.4;

    armPivots[0].rotation.x = stride;
    armPivots[1].rotation.x = -stride;
    legPivots[0].rotation.x = -stride * 0.9;
    legPivots[1].rotation.x = stride * 0.9;
  }

  function getFocusTarget(target = new THREE.Vector3()) {
    target.copy(group.position);
    target.y += 0.66; // head height for this rig's proportions
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
