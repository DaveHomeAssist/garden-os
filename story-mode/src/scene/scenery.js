/**
 * Background Scenery — fence, trees, path, props around the garden bed.
 * All procedural geometry, no external models.
 */
import * as THREE from 'three';

const WOOD_COLOR = 0x6B4226;
const WOOD_DARK = 0x4A2E18;
const PATH_COLOR = 0x8a7a5a;
const GRASS_DARK = 0x3a5a2a;

const SEASON_TREE_COLORS = {
  spring: [0x5aaa55, 0x6dbb68, 0x4a9a45],
  summer: [0x3a8a35, 0x4a9a40, 0x2d7a28],
  fall:   [0xcc7722, 0xdd5533, 0xeeaa22],
  winter: [0x6a6a6a, 0x7a7a7a, 0x5a5a5a],
};

export function buildScenery() {
  const group = new THREE.Group();
  const treeCanopies = [];

  const sidingMat = new THREE.MeshStandardMaterial({ color: 0xb9c3c9, roughness: 0.9, side: THREE.DoubleSide });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d1, roughness: 0.78 });
  const porchMat = new THREE.MeshStandardMaterial({ color: 0xd7d0c0, roughness: 0.88 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a4844, roughness: 0.92 });
  const windowGlassMat = new THREE.MeshStandardMaterial({ color: 0xc7d8df, roughness: 0.2, metalness: 0.05 });
  const fenceMat = new THREE.MeshStandardMaterial({ color: WOOD_COLOR, roughness: 0.88 });
  const fenceDarkMat = new THREE.MeshStandardMaterial({ color: WOOD_DARK, roughness: 0.9 });
  const gravelMat = new THREE.MeshStandardMaterial({ color: PATH_COLOR, roughness: 1.0 });

  // --- Back house wall directly behind the bed ---
  const houseWall = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 3.5), sidingMat);
  houseWall.position.set(0, 1.75, -6.15);
  houseWall.receiveShadow = true;
  group.add(houseWall);

  for (let i = 0; i < 11; i++) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.045, 0.02), trimMat);
    board.position.set(0, 0.22 + i * 0.29, -6.12);
    group.add(board);
  }

  // Porch left
  const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.12, 1.6), porchMat);
  porchFloor.position.set(-2.95, 0.06, -5.45);
  porchFloor.receiveShadow = true;
  group.add(porchFloor);

  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.08, 1.72), porchMat);
  porchRoof.position.set(-2.95, 2.72, -5.42);
  group.add(porchRoof);

  for (const x of [-3.38, -1.72]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.58, 0.1), trimMat);
    post.position.set(x - 0.4, 1.29, -5.38);
    group.add(post);
  }

  const backDoor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.62, 0.08), trimMat);
  backDoor.position.set(-2.95, 0.95, -6.18);
  group.add(backDoor);

  // Back window centered above bed
  const backWindow = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.12, 0.08), trimMat);
  backWindow.position.set(0.25, 1.95, -6.18);
  group.add(backWindow);
  const backGlass = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.88, 0.04), windowGlassMat);
  backGlass.position.set(0.25, 1.95, -6.22);
  group.add(backGlass);

  // Neighbor house right
  const neighborWall = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), sidingMat);
  neighborWall.position.set(5.15, 1.2, -4.65);
  neighborWall.rotation.y = Math.PI / 2.7;
  group.add(neighborWall);

  const neighborRoof = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.08, 1.35), roofMat);
  neighborRoof.position.set(5.45, 2.28, -4.15);
  neighborRoof.rotation.y = Math.PI / 2.7;
  group.add(neighborRoof);

  // Side fence line on the right edge of the yard
  for (let i = 0; i < 10; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42 + (i % 2) * 0.04, 0.03), i % 3 === 0 ? fenceDarkMat : fenceMat);
    slat.position.set(4.95, slat.geometry.parameters.height / 2, -0.2 + i * 0.36);
    slat.rotation.y = -0.08;
    group.add(slat);
  }

  // Gravel border around the bed instead of a single front pad
  const gravelPatches = [
    { w: 5.8, h: 1.9, x: 0, z: 2.05 },
    { w: 0.95, h: 2.9, x: -3.05, z: 0.85 },
    { w: 0.95, h: 2.9, x: 3.05, z: 0.85 },
    { w: 5.8, h: 1.15, x: 0, z: -1.95 },
  ];
  gravelPatches.forEach(({ w, h, x, z }) => {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, h), gravelMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.006, z);
    patch.receiveShadow = true;
    group.add(patch);
  });

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb29c7c, roughness: 0.92 });
  for (let i = 0; i < 48; i++) {
    const pebble = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025 + (i % 3) * 0.012, 0.025 + (i % 3) * 0.012, 0.014, 6),
      stoneMat
    );
    const band = i % 4;
    const x = band === 0
      ? -2.7 + (i % 12) * 0.48
      : band === 1
        ? -3.18 + (i % 12) * 0.04
        : band === 2
          ? 3.18 - (i % 12) * 0.04
          : -2.7 + (i % 12) * 0.48;
    const z = band === 0
      ? 1.35 + Math.floor(i / 12) * 0.24
      : band === 1
        ? -0.45 + Math.floor(i / 12) * 0.42
        : band === 2
          ? -0.45 + Math.floor(i / 12) * 0.42
          : -2.2 + Math.floor(i / 12) * 0.12;
    pebble.position.set(x, 0.014, z);
    pebble.rotation.y = i * 0.37;
    group.add(pebble);
  }

  // Yard framing foliage kept minimal so the bed stays the subject
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });
  const treePositions = [
    { x: 4.8, z: 0.1, scale: 0.82 },
    { x: -4.7, z: 3.8, scale: 0.75 },
  ];
  for (const tp of treePositions) {
    const treeGroup = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06 * tp.scale, 0.1 * tp.scale, 1.1 * tp.scale, 6),
      trunkMat
    );
    trunk.position.y = 0.55 * tp.scale;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const canopyGroup = new THREE.Group();
    const sizes = [0.46, 0.36, 0.26];
    const heights = [0.9, 1.2, 1.42];
    for (let j = 0; j < 3; j++) {
      const canopyMat = new THREE.MeshStandardMaterial({
        color: SEASON_TREE_COLORS.spring[j],
        roughness: 0.75,
      });
      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(sizes[j] * tp.scale, 8, 6),
        canopyMat
      );
      canopy.position.y = heights[j] * tp.scale;
      canopy.castShadow = true;
      canopyGroup.add(canopy);
    }
    treeGroup.add(canopyGroup);
    treeGroup.position.set(tp.x, 0, tp.z);
    group.add(treeGroup);
    treeCanopies.push(canopyGroup);
  }

  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x3f6f32, roughness: 0.82 });
  for (const [x, z, scale] of [[-4.1, 2.6, 0.9], [4.0, 3.9, 0.72]]) {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.34 * scale, 7, 5), shrubMat);
    shrub.scale.set(1.1, 0.8, 1);
    shrub.position.set(x, 0.22 * scale, z);
    group.add(shrub);
  }

  // --- Props ---
  // Watering can (near front-right of bed)
  const canGroup = new THREE.Group();
  const canBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a8a6a, roughness: 0.6, metalness: 0.2 })
  );
  canBody.position.y = 0.06;
  canGroup.add(canBody);

  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.025, 0.1, 5),
    new THREE.MeshStandardMaterial({ color: 0x4a8a6a, roughness: 0.6, metalness: 0.2 })
  );
  spout.position.set(0.06, 0.1, 0);
  spout.rotation.z = -0.6;
  canGroup.add(spout);

  canGroup.position.set(2.8, 0, 1.2);
  canGroup.rotation.y = -0.3;
  group.add(canGroup);

  // Garden hose (coiled near left side)
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.7 });
  const hoseGroup = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2.5;
    const r = 0.15 + i * 0.008;
    const segment = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 4, 3),
      hoseMat
    );
    segment.position.set(Math.cos(angle) * r, 0.02, Math.sin(angle) * r);
    hoseGroup.add(segment);
  }
  hoseGroup.position.set(-3, 0, 1.5);
  group.add(hoseGroup);

  // Garden gloves near the gravel work area
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0xb7b1a0, roughness: 0.92 });
  const gloveCuffMat = new THREE.MeshStandardMaterial({ color: 0x6a8b8c, roughness: 0.8 });
  for (const [x, z, rot] of [[0.8, 2.55, 0.35], [1.02, 2.45, -0.28]]) {
    const glove = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.09), gloveMat);
    glove.position.set(x, 0.02, z);
    glove.rotation.y = rot;
    group.add(glove);

    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.1), gloveCuffMat);
    cuff.position.set(x - 0.08, 0.02, z);
    cuff.rotation.y = rot;
    group.add(cuff);
  }

  // Harvest basket with produce
  const basketMat = new THREE.MeshStandardMaterial({ color: 0x8a6032, roughness: 0.88 });
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.28), basketMat);
  basket.position.set(2.45, 0.08, 2.35);
  group.add(basket);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 5, 18, Math.PI), basketMat);
  handle.position.set(2.45, 0.19, 2.35);
  handle.rotation.z = Math.PI;
  group.add(handle);

  const produceMatA = new THREE.MeshStandardMaterial({ color: 0xd45a33, roughness: 0.55 });
  const produceMatB = new THREE.MeshStandardMaterial({ color: 0x4a8a4a, roughness: 0.7 });
  for (const [x, y, z, mat] of [
    [2.36, 0.16, 2.31, produceMatA],
    [2.48, 0.17, 2.37, produceMatB],
    [2.56, 0.16, 2.28, produceMatA],
  ]) {
    const produce = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), mat);
    produce.position.set(x, y, z);
    group.add(produce);
  }

  // --- Architectural detail and grounding props ---

  // 1. Dryer vent — small cylinder on house wall, to the right of the window
  const dryerVentMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.5, metalness: 0.6 });
  const dryerVent = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), dryerVentMat);
  dryerVent.rotation.x = Math.PI / 2;
  dryerVent.position.set(1.1, 0.8, -4.68);
  group.add(dryerVent);

  // 2. Downspout — vertical box on the right edge of the house wall
  const downspoutMat = new THREE.MeshStandardMaterial({ color: 0xa8a8a8, roughness: 0.7 });
  const downspout = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.4, 0.06), downspoutMat);
  downspout.position.set(3.4, 1.2, -4.68);
  group.add(downspout);

  // 3. Concrete pad under bed area — just above ground
  const concretePadMat = new THREE.MeshStandardMaterial({ color: 0xb5b0a2, roughness: 0.95 });
  const concretePad = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.0), concretePadMat);
  concretePad.rotation.x = -Math.PI / 2;
  concretePad.position.set(0, 0.003, 0);
  concretePad.receiveShadow = true;
  group.add(concretePad);

  // 4. Wall-mounted light fixture above the back door
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.7 });
  const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), fixtureMat);
  fixture.position.set(-2.55, 2.0, -4.7);
  group.add(fixture);
  const porchLight = new THREE.PointLight(0xfff0d4, 0.3, 3);
  porchLight.position.set(-2.55, 1.88, -4.6);
  group.add(porchLight);

  // 5. Stack of terracotta pots
  const terraMat = new THREE.MeshStandardMaterial({ color: 0xc4703c, roughness: 0.85 });
  const potSizes = [
    { rTop: 0.1,  rBot: 0.1,  h: 0.08, yOff: 0.04 },
    { rTop: 0.08, rBot: 0.08, h: 0.07, yOff: 0.08 + 0.035 },
    { rTop: 0.06, rBot: 0.06, h: 0.06, yOff: 0.08 + 0.07 + 0.03 },
  ];
  for (const ps of potSizes) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(ps.rTop, ps.rBot, ps.h, 10), terraMat);
    pot.position.set(1.8, ps.yOff, 2.6);
    group.add(pot);
  }
  // One pot tipped on its side nearby
  const tippedPot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.07, 10), terraMat);
  tippedPot.rotation.z = Math.PI / 2;
  tippedPot.position.set(2.05, 0.035, 2.75);
  group.add(tippedPot);

  // 6. Seed packet box with tiny seed packets sticking up
  const cardboardMat = new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 0.9 });
  const seedBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.14), cardboardMat);
  seedBox.position.set(-1.5, 0.03, 2.5);
  group.add(seedBox);

  const packetColors = [0xe05a2b, 0xeacc2b, 0x4a9a40, 0x5a7abf];
  for (let i = 0; i < 4; i++) {
    const packetMat = new THREE.MeshStandardMaterial({ color: packetColors[i], roughness: 0.7 });
    const packet = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.02), packetMat);
    packet.position.set(-1.5 + (i - 1.5) * 0.045, 0.09, 2.5);
    group.add(packet);
  }

  // 7. Kneeling pad — flat foam rectangle with slight rotation
  const kneelMat = new THREE.MeshStandardMaterial({ color: 0x5a8a4a, roughness: 0.95 });
  const kneelingPad = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.16), kneelMat);
  kneelingPad.position.set(0.5, 0.01, 2.8);
  kneelingPad.rotation.y = 0.22;
  group.add(kneelingPad);

  return {
    group,
    updateSeason(season) {
      const colors = SEASON_TREE_COLORS[season] || SEASON_TREE_COLORS.spring;
      for (const canopyGroup of treeCanopies) {
        canopyGroup.children.forEach((mesh, i) => {
          mesh.material.color.set(colors[i] || colors[0]);
        });
      }
    },
  };
}
