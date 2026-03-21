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

  // --- Fence behind the bed (Row 0 / wall side) ---
  const fenceY = 0;
  const fenceZ = -1.3;
  const fenceWidth = 5.5;
  const fenceHeight = 0.6;
  const slatCount = 14;
  const slatWidth = fenceWidth / slatCount - 0.02;
  const fenceMat = new THREE.MeshStandardMaterial({ color: WOOD_COLOR, roughness: 0.88 });
  const fenceDarkMat = new THREE.MeshStandardMaterial({ color: WOOD_DARK, roughness: 0.9 });

  for (let i = 0; i < slatCount; i++) {
    const x = (i - (slatCount - 1) / 2) * (fenceWidth / slatCount);
    const slatH = fenceHeight + (Math.sin(i * 2.3) * 0.04);
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(slatWidth, slatH, 0.02),
      i % 3 === 0 ? fenceDarkMat : fenceMat
    );
    slat.position.set(x, fenceY + slatH / 2, fenceZ);
    slat.castShadow = true;
    slat.receiveShadow = true;
    group.add(slat);
  }

  // Fence horizontal rails
  for (const railY of [0.15, 0.45]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(fenceWidth + 0.1, 0.035, 0.025),
      fenceDarkMat
    );
    rail.position.set(0, railY, fenceZ + 0.015);
    group.add(rail);
  }

  // --- House wall backdrop (closer to the real bed reference) ---
  const sidingMat = new THREE.MeshStandardMaterial({ color: 0xb9c3c9, roughness: 0.9, side: THREE.DoubleSide });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d1, roughness: 0.78 });

  const houseWall = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.8), sidingMat);
  houseWall.position.set(0.2, 1.45, 4.9);
  houseWall.receiveShadow = true;
  group.add(houseWall);

  for (let i = 0; i < 10; i++) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.04, 0.02), trimMat);
    board.position.set(0.2, 0.18 + i * 0.28, 4.88);
    group.add(board);
  }

  const backWindow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.08), trimMat);
  backWindow.position.set(0.3, 1.8, 4.85);
  group.add(backWindow);

  const backGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.78, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xc7d8df, roughness: 0.2, metalness: 0.05 })
  );
  backGlass.position.set(0.3, 1.8, 4.89);
  group.add(backGlass);

  // --- Gravel work area in front (instead of a clean path) ---
  const gravel = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 2.2),
    new THREE.MeshStandardMaterial({ color: PATH_COLOR, roughness: 1.0 })
  );
  gravel.rotation.x = -Math.PI / 2;
  gravel.position.set(0, 0.006, 1.95);
  gravel.receiveShadow = true;
  group.add(gravel);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb29c7c, roughness: 0.92 });
  for (let i = 0; i < 26; i++) {
    const pebble = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03 + (i % 3) * 0.01, 0.03 + (i % 3) * 0.01, 0.018, 6),
      stoneMat
    );
    pebble.position.set(-2.4 + (i % 13) * 0.38, 0.014, 1.25 + Math.floor(i / 13) * 0.46 + ((i % 2) * 0.08));
    pebble.rotation.y = i * 0.37;
    group.add(pebble);
  }

  // --- Trees (3 low-poly deciduous) ---
  const treePositions = [
    { x: -4, z: -2.5, scale: 1.0 },
    { x: 4.5, z: -1.5, scale: 0.8 },
    { x: -3, z: 3.5, scale: 0.7 },
  ];

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });

  for (const tp of treePositions) {
    const treeGroup = new THREE.Group();

    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06 * tp.scale, 0.1 * tp.scale, 1.2 * tp.scale, 6),
      trunkMat
    );
    trunk.position.y = 0.6 * tp.scale;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Canopy (3 stacked spheres)
    const canopyGroup = new THREE.Group();
    const sizes = [0.5, 0.4, 0.3];
    const heights = [1.0, 1.35, 1.6];

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

  // --- Grass tufts ---
  const grassMat = new THREE.MeshStandardMaterial({
    color: GRASS_DARK,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 2 + Math.random() * 6;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    // Skip if too close to bed
    if (Math.abs(x) < 2.5 && Math.abs(z) < 1.5) continue;

    const tuft = new THREE.Group();
    const bladeCount = 3 + Math.floor(Math.random() * 3);

    for (let b = 0; b < bladeCount; b++) {
      const blade = new THREE.Mesh(
        new THREE.PlaneGeometry(0.03, 0.08 + Math.random() * 0.06),
        grassMat
      );
      blade.position.set(
        (Math.random() - 0.5) * 0.05,
        0.03 + Math.random() * 0.02,
        (Math.random() - 0.5) * 0.05
      );
      blade.rotation.y = Math.random() * Math.PI;
      blade.rotation.z = (Math.random() - 0.5) * 0.4;
      tuft.add(blade);
    }

    tuft.position.set(x, 0, z);
    group.add(tuft);
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

  // --- Simple rowhouse backdrop ---
  const houseGroup = new THREE.Group();
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x7a4336, roughness: 0.9 });
  const rowhouseTrimMat = new THREE.MeshStandardMaterial({ color: 0xd8c8ac, roughness: 0.75 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3c2e2c, roughness: 0.88 });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xf4d38c,
    emissive: 0xe7b45a,
    emissiveIntensity: 0.25,
    roughness: 0.2,
    metalness: 0.1,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 1.6), brickMat);
  body.position.set(0, 0.95, -5.4);
  body.castShadow = true;
  body.receiveShadow = true;
  houseGroup.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.18, 1.82), roofMat);
  roof.position.set(0, 1.92, -5.4);
  roof.castShadow = true;
  houseGroup.add(roof);

  const stoop = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.56), rowhouseTrimMat);
  stoop.position.set(-0.42, 0.09, -4.34);
  houseGroup.add(stoop);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.05), rowhouseTrimMat);
  door.position.set(-0.42, 0.47, -4.58);
  houseGroup.add(door);

  const windowOffsets = [
    [-0.7, 0.62], [0.42, 0.62],
    [-0.7, 1.3], [0.42, 1.3],
  ];
  for (const [x, y] of windowOffsets) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.06), rowhouseTrimMat);
    frame.position.set(x, y, -4.58);
    houseGroup.add(frame);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.04), windowMat);
    glass.position.set(x, y, -4.54);
    houseGroup.add(glass);
  }

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), brickMat);
  chimney.position.set(0.74, 2.18, -5.72);
  chimney.castShadow = true;
  houseGroup.add(chimney);

  group.add(houseGroup);

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
