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

  // --- Walkway / path in front (access side) ---
  const pathGeo = new THREE.PlaneGeometry(4.5, 1.2);
  const pathMat = new THREE.MeshStandardMaterial({
    color: PATH_COLOR,
    roughness: 0.92,
  });
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.005, 1.8);
  path.receiveShadow = true;
  group.add(path);

  // Path stepping stones
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 0.85 });
  for (let i = 0; i < 5; i++) {
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.02, 7),
      stoneMat
    );
    stone.position.set(-1.5 + i * 0.75, 0.015, 1.8 + (Math.sin(i * 1.5) * 0.15));
    stone.receiveShadow = true;
    group.add(stone);
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
