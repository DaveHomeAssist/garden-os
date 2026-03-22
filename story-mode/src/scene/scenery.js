/**
 * Background Scenery — fence, trees, path, props around the garden bed.
 * All procedural geometry, no external models.
 */
import * as THREE from 'three';

const WOOD_COLOR = 0x6B4226;
const WOOD_DARK = 0x4A2E18;
const PATH_COLOR = 0x8a7a5a;
const GRASS_DARK = 0x3a5a2a;
const FOUNDATION_COLOR = 0x6d706d;
const MULCH_COLOR = 0x5b452f;

const SEASON_TREE_COLORS = {
  spring: [0x5aaa55, 0x6dbb68, 0x4a9a45],
  summer: [0x3a8a35, 0x4a9a40, 0x2d7a28],
  fall:   [0xcc7722, 0xdd5533, 0xeeaa22],
  winter: [0x6a6a6a, 0x7a7a7a, 0x5a5a5a],
};

function makeCanvasTexture(size, painter, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  painter(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;
  return texture;
}

function createBoardTexture(baseColor, grainColor, repeatX = 1, repeatY = 1) {
  const base = new THREE.Color(baseColor);
  const grain = new THREE.Color(grainColor);
  return makeCanvasTexture(192, (ctx, size) => {
    ctx.fillStyle = `#${base.getHexString()}`;
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 18) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, 0, 2, size);
    }
    for (let y = 0; y < size; y += 3) {
      const alpha = 0.08 + (Math.sin(y * 0.13) * 0.04 + 0.04);
      ctx.strokeStyle = `rgba(${Math.round(grain.r * 255)}, ${Math.round(grain.g * 255)}, ${Math.round(grain.b * 255)}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y * 0.09) * 4);
      ctx.lineTo(size, y - Math.cos(y * 0.07) * 3);
      ctx.stroke();
    }
  }, repeatX, repeatY);
}

function createPebbleTexture(baseHex, speckHex, repeatX = 1, repeatY = 1) {
  const base = new THREE.Color(baseHex);
  const speck = new THREE.Color(speckHex);
  return makeCanvasTexture(192, (ctx, size) => {
    ctx.fillStyle = `#${base.getHexString()}`;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1200; i++) {
      const x = (i * 47) % size;
      const y = (i * 83) % size;
      const r = 1 + (i % 2);
      const alpha = 0.12 + (i % 4) * 0.03;
      ctx.fillStyle = `rgba(${Math.round(speck.r * 255)}, ${Math.round(speck.g * 255)}, ${Math.round(speck.b * 255)}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, repeatX, repeatY);
}

function createSoftPatchGeometry(width, depth, segmentsX = 12, segmentsY = 12, amplitude = 0.01, phase = 0) {
  const geometry = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsY);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) / width;
    const y = position.getY(i) / depth;
    const edgeFade = Math.max(0, 1 - Math.max(Math.abs(x) * 1.9, Math.abs(y) * 1.9));
    const ripple = Math.sin((x + phase) * 17) * Math.cos((y - phase) * 13) * 0.55;
    const swell = Math.sin((x - y + phase) * 11) * 0.45;
    position.setZ(i, (ripple + swell) * amplitude * edgeFade);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function buildScenery(tracker = null) {
  const group = new THREE.Group();
  const treeCanopies = [];
  const hedgePlants = [];
  const accentFlowers = [];
  const breezeNodes = [];
  const sidingTexture = createBoardTexture(0xb9c3c9, 0x87939a, 5.5, 2.2);
  const trimTexture = createBoardTexture(0xe8e0d1, 0xbba98f, 2.8, 2.8);
  const porchTexture = createBoardTexture(0xd7d0c0, 0xa58e73, 3.4, 2.2);
  const fenceTexture = createBoardTexture(WOOD_COLOR, WOOD_DARK, 2.6, 2.6);
  const gravelTexture = createPebbleTexture(PATH_COLOR, 0xc1b39d, 3.6, 3.6);
  const mulchTexture = createPebbleTexture(MULCH_COLOR, 0x7a5d3a, 3.8, 1.4);
  const concreteTexture = createPebbleTexture(0xb5b0a2, 0xe2ddd2, 2.2, 2.2);

  const sidingMat = new THREE.MeshStandardMaterial({ color: 0xb9c3c9, roughness: 0.9, side: THREE.DoubleSide, map: sidingTexture, bumpMap: sidingTexture, bumpScale: 0.01 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d1, roughness: 0.78, map: trimTexture, bumpMap: trimTexture, bumpScale: 0.008 });
  const porchMat = new THREE.MeshStandardMaterial({ color: 0xd7d0c0, roughness: 0.88, map: porchTexture, bumpMap: porchTexture, bumpScale: 0.008 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a4844, roughness: 0.92 });
  const windowGlassMat = new THREE.MeshStandardMaterial({ color: 0xc7d8df, roughness: 0.2, metalness: 0.05 });
  const fenceMat = new THREE.MeshStandardMaterial({ color: WOOD_COLOR, roughness: 0.88, map: fenceTexture, bumpMap: fenceTexture, bumpScale: 0.01 });
  const fenceDarkMat = new THREE.MeshStandardMaterial({ color: WOOD_DARK, roughness: 0.9, map: fenceTexture, bumpMap: fenceTexture, bumpScale: 0.008 });
  const gravelMat = new THREE.MeshStandardMaterial({ color: PATH_COLOR, roughness: 1.0, map: gravelTexture, bumpMap: gravelTexture, bumpScale: 0.012 });

  function registerBreezeNode(mesh, {
    rotX = 0,
    rotY = 0,
    rotZ = 0.04,
    lift = 0,
    speed = 0.7,
    phase = 0,
  } = {}) {
    mesh.userData.breeze = {
      rotX,
      rotY,
      rotZ,
      lift,
      speed,
      phase,
      basePositionY: mesh.position.y,
      baseRotationX: mesh.rotation.x,
      baseRotationY: mesh.rotation.y,
      baseRotationZ: mesh.rotation.z,
    };
    breezeNodes.push(mesh);
    return mesh;
  }

  // --- Back house wall directly behind the bed ---
  const houseWall = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 3.5), sidingMat);
  houseWall.position.set(0, 1.75, -6.15);
  houseWall.receiveShadow = true;
  group.add(houseWall);

  const foundationStrip = new THREE.Mesh(
    new THREE.BoxGeometry(7.95, 0.38, 0.18),
    new THREE.MeshStandardMaterial({ color: FOUNDATION_COLOR, roughness: 0.94 })
  );
  foundationStrip.position.set(0, 0.19, -6.06);
  group.add(foundationStrip);

  const mulchBed = new THREE.Mesh(
    createSoftPatchGeometry(7.3, 0.95, 32, 8, 0.022, 0.18),
    new THREE.MeshStandardMaterial({ color: MULCH_COLOR, roughness: 0.98, map: mulchTexture, bumpMap: mulchTexture, bumpScale: 0.01 })
  );
  mulchBed.rotation.x = -Math.PI / 2;
  mulchBed.position.set(0.25, 0.005, -4.95);
  mulchBed.receiveShadow = true;
  group.add(mulchBed);

  for (const { x, z, scale, color } of [
    { x: -1.9, z: -4.86, scale: 1.1, color: 0x527d46 },
    { x: -1.15, z: -4.72, scale: 0.92, color: 0x628a4f },
    { x: 0.05, z: -4.8, scale: 1.08, color: 0x4d7442 },
    { x: 0.96, z: -4.69, scale: 0.88, color: 0x5e854d },
    { x: 1.8, z: -4.88, scale: 0.98, color: 0x587949 },
  ]) {
    const shrub = new THREE.Mesh(
      new THREE.SphereGeometry(0.22 * scale, 12, 10),
      new THREE.MeshStandardMaterial({ color, roughness: 0.84 })
    );
    shrub.scale.set(1.2, 0.85, 1);
    shrub.position.set(x, 0.19 * scale, z);
    registerBreezeNode(shrub, { rotY: 0.03, rotZ: 0.018, lift: 0.008, speed: 0.8, phase: x * 0.35 });
    group.add(shrub);
    hedgePlants.push(shrub);
  }

  for (const { x, z, color } of [
    { x: -2.35, z: -4.62, color: 0xbfcfdf },
    { x: -0.72, z: -4.55, color: 0xd6d2b2 },
    { x: 1.35, z: -4.56, color: 0xc7b6d8 },
  ]) {
    const bloom = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
    );
    bloom.scale.set(1.15, 0.8, 1);
    bloom.position.set(x, 0.34, z);
    registerBreezeNode(bloom, { rotZ: 0.05, lift: 0.012, speed: 1.6, phase: x + z });
    group.add(bloom);
    accentFlowers.push(bloom);
  }

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

  for (const x of [-3.38, -2.52, -1.72]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 2.58, 10), trimMat);
    post.position.set(x - 0.4, 1.29, -5.38);
    group.add(post);
  }

  const porchRail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.82, 10), trimMat);
  porchRail.rotation.z = Math.PI / 2;
  porchRail.position.set(-2.95, 0.72, -4.7);
  group.add(porchRail);

  for (const x of [-3.35, -2.55, -1.75]) {
    const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.54, 8), trimMat);
    baluster.position.set(x, 0.39, -4.7);
    group.add(baluster);
  }

  for (const [x, y, z, w, h, d] of [
    [-2.95, 0.12, -4.52, 0.88, 0.08, 0.5],
    [-2.95, 0.08, -4.25, 0.72, 0.06, 0.36],
  ]) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), porchMat);
    step.position.set(x, y, z);
    step.receiveShadow = true;
    group.add(step);
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

  // Side fence line on the right edge of the yard
  for (let i = 0; i < 10; i++) {
    const slatHeight = 0.42 + (i % 2) * 0.04;
    const slat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.032, slatHeight, 8),
      i % 3 === 0 ? fenceDarkMat : fenceMat
    );
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
    const patch = new THREE.Mesh(createSoftPatchGeometry(w, h, 16, 16, 0.008, x * 0.13 + z * 0.07), gravelMat);
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
      new THREE.CylinderGeometry(0.06 * tp.scale, 0.1 * tp.scale, 1.1 * tp.scale, 14),
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
        new THREE.SphereGeometry(sizes[j] * tp.scale, 20, 16),
        canopyMat
      );
      canopy.position.y = heights[j] * tp.scale;
      canopy.castShadow = true;
      canopyGroup.add(canopy);
    }
    treeGroup.add(canopyGroup);
    registerBreezeNode(canopyGroup, {
      rotY: 0.045,
      rotZ: 0.03,
      lift: 0.02,
      speed: 0.45 + tp.scale * 0.08,
      phase: tp.x * 0.4 + tp.z * 0.2,
    });
    treeGroup.position.set(tp.x, 0, tp.z);
    group.add(treeGroup);
    treeCanopies.push(canopyGroup);
  }

  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x3f6f32, roughness: 0.82 });
  for (const [x, z, scale] of [[-4.1, 2.6, 0.9], [4.0, 3.9, 0.72]]) {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.34 * scale, 18, 14), shrubMat);
    shrub.scale.set(1.1, 0.8, 1);
    shrub.position.set(x, 0.22 * scale, z);
    registerBreezeNode(shrub, { rotY: 0.028, rotZ: 0.016, lift: 0.008, speed: 0.72, phase: z * 0.3 });
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
    new THREE.CylinderGeometry(0.01, 0.025, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a8a6a, roughness: 0.6, metalness: 0.2 })
  );
  spout.position.set(0.06, 0.1, 0);
  spout.rotation.z = -0.6;
  canGroup.add(spout);

  canGroup.position.set(2.78, 0, 0.84);
  canGroup.rotation.y = -0.62;
  group.add(canGroup);

  // Garden hose (coiled near left side)
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.7 });
  const hoseGroup = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2.5;
    const r = 0.15 + i * 0.008;
    const segment = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 6, 5),
      hoseMat
    );
    segment.position.set(Math.cos(angle) * r, 0.02, Math.sin(angle) * r);
    hoseGroup.add(segment);
  }
  hoseGroup.position.set(-2.78, 0, 0.95);
  group.add(hoseGroup);

  // Garden gloves near the gravel work area
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0xb7b1a0, roughness: 0.92 });
  const gloveCuffMat = new THREE.MeshStandardMaterial({ color: 0x6a8b8c, roughness: 0.8 });
  for (const [x, z, rot] of [[1.42, 1.72, 0.35], [1.66, 1.6, -0.28]]) {
    const glove = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.11, 5, 10), gloveMat);
    glove.position.set(x, 0.02, z);
    glove.rotation.y = rot;
    glove.rotation.z = Math.PI / 2;
    glove.scale.set(1, 0.48, 0.72);
    group.add(glove);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.06, 10), gloveCuffMat);
    cuff.position.set(x - 0.08, 0.02, z);
    cuff.rotation.y = rot;
    cuff.rotation.z = Math.PI / 2;
    cuff.scale.set(1, 0.85, 0.95);
    group.add(cuff);
  }

  // Harvest basket with produce
  const basketMat = new THREE.MeshStandardMaterial({ color: 0x8a6032, roughness: 0.88 });
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.16, 24), basketMat);
  basket.scale.set(1.28, 1, 0.92);
  basket.position.set(2.54, 0.08, 1.58);
  group.add(basket);

  const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 18), basketMat);
  basketRim.position.set(2.54, 0.16, 1.58);
  basketRim.rotation.x = Math.PI / 2;
  basketRim.scale.set(1.28, 1, 0.92);
  group.add(basketRim);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 5, 18, Math.PI), basketMat);
  handle.position.set(2.54, 0.19, 1.58);
  handle.rotation.z = Math.PI;
  group.add(handle);

  const produceMatA = new THREE.MeshStandardMaterial({ color: 0xd45a33, roughness: 0.55 });
  const produceMatB = new THREE.MeshStandardMaterial({ color: 0x4a8a4a, roughness: 0.7 });
  for (const [x, y, z, mat] of [
    [2.45, 0.16, 1.54, produceMatA],
    [2.56, 0.17, 1.6, produceMatB],
    [2.64, 0.16, 1.5, produceMatA],
  ]) {
    const produce = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat);
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
  const downspout = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 2.4, 10), downspoutMat);
  downspout.scale.set(1, 1, 0.62);
  downspout.position.set(3.4, 1.2, -4.68);
  group.add(downspout);

  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x3c5f46, roughness: 0.76 });
  const rainBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.7, 18), barrelMat);
  rainBarrel.position.set(3.03, 0.35, -4.78);
  rainBarrel.castShadow = true;
  group.add(rainBarrel);

  const barrelLid = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 18), trimMat);
  barrelLid.position.set(3.03, 0.72, -4.78);
  group.add(barrelLid);

  // 3. Concrete pad under bed area — just above ground
  const concretePadMat = new THREE.MeshStandardMaterial({ color: 0xb5b0a2, roughness: 0.95, map: concreteTexture, bumpMap: concreteTexture, bumpScale: 0.007 });
  const concretePad = new THREE.Mesh(createSoftPatchGeometry(4.2, 3.0, 18, 14, 0.004, 0.34), concretePadMat);
  concretePad.rotation.x = -Math.PI / 2;
  concretePad.position.set(0, 0.003, 0);
  concretePad.receiveShadow = true;
  group.add(concretePad);

  // 4. Wall-mounted light fixture above the back door
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.7 });
  const fixture = new THREE.Group();
  const fixtureBackplate = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.03, 10), fixtureMat);
  fixtureBackplate.rotation.x = Math.PI / 2;
  fixture.add(fixtureBackplate);
  const fixtureShade = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.08, 10, 1, true), fixtureMat);
  fixtureShade.rotation.x = Math.PI / 2;
  fixtureShade.position.z = 0.045;
  fixture.add(fixtureShade);
  const fixtureBulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf8e8c2, emissive: 0xffe1a2, emissiveIntensity: 0.18, roughness: 0.25 }));
  fixtureBulb.position.z = 0.035;
  fixture.add(fixtureBulb);
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
    pot.position.set(2.86, ps.yOff, 2.12);
    group.add(pot);
  }
  // One pot tipped on its side nearby
  const tippedPot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.07, 10), terraMat);
  tippedPot.rotation.z = Math.PI / 2;
  tippedPot.position.set(2.55, 0.04, 2.26);
  group.add(tippedPot);

  // 6. Seed packet box with tiny seed packets sticking up
  const cardboardMat = new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 0.9 });
  const seedBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.14), cardboardMat);
  seedBox.position.set(-2.35, 0.03, 1.78);
  group.add(seedBox);

  const packetColors = [0xe05a2b, 0xeacc2b, 0x4a9a40, 0x5a7abf];
  for (let i = 0; i < 4; i++) {
    const packetMat = new THREE.MeshStandardMaterial({ color: packetColors[i], roughness: 0.7 });
    const packet = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.02), packetMat);
    packet.position.set(-2.35 + (i - 1.5) * 0.045, 0.09, 1.78);
    group.add(packet);
  }

  // 7. Kneeling pad — flat foam rectangle with slight rotation
  const kneelMat = new THREE.MeshStandardMaterial({ color: 0x5a8a4a, roughness: 0.95 });
  const kneelingPad = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 5, 10), kneelMat);
  kneelingPad.position.set(0.72, 0.01, 2.08);
  kneelingPad.rotation.y = 0.22;
  kneelingPad.rotation.z = Math.PI / 2;
  kneelingPad.scale.set(1, 0.15, 0.72);
  group.add(kneelingPad);

  // ── NEW SCENERY ITEMS ──────────────────────────────────────────────────

  // 1. Screen door on the back porch
  const screenDoorGroup = new THREE.Group();
  const screenDoorMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.85 });
  for (const [w, h, x, y] of [
    [0.06, 1.5, -0.32, 0],
    [0.06, 1.5, 0.32, 0],
    [0.7, 0.06, 0, 0.72],
    [0.7, 0.06, 0, -0.72],
  ]) {
    const isVertical = h > w;
    const part = new THREE.Mesh(
      isVertical
        ? new THREE.CylinderGeometry(0.026, 0.03, h, 8)
        : new THREE.CylinderGeometry(0.026, 0.026, w, 8),
      screenDoorMat
    );
    if (!isVertical) {
      part.rotation.z = Math.PI / 2;
    }
    part.position.set(x, y, 0);
    screenDoorGroup.add(part);
  }
  const kickPlate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.3, 0.028), screenDoorMat);
  kickPlate.position.set(0, -0.58, 0.003);
  screenDoorGroup.add(kickPlate);

  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 1.12),
    new THREE.MeshStandardMaterial({
      color: 0x5a6158,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
    })
  );
  screenMesh.position.set(0, 0.04, 0.018);
  screenDoorGroup.add(screenMesh);
  screenDoorGroup.position.set(-2.55, 0.85, -4.1);
  screenDoorGroup.rotation.y = -0.12;
  group.add(screenDoorGroup);

  // 2. Radio on porch railing
  const radioBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.022, 0.04, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.88 })
  );
  radioBody.rotation.z = Math.PI / 2;
  radioBody.scale.set(1, 0.86, 0.82);
  radioBody.position.set(-2.0, 0.22, -3.5);
  group.add(radioBody);

  const radioAntenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.1, 6),
    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.4 })
  );
  radioAntenna.position.set(-2.0, 0.3, -3.5);
  group.add(radioAntenna);

  // 3. Clothesline removed entirely.
  // Even the remaining poles were still reading as a phantom guide lane in the current framing.

  // 4. Bird on the fence
  const seasonalProps = new THREE.Group();
  {
    const birdOnFence = new THREE.Group();
    const birdBodyMat = new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.8 });
    const birdBeakMat = new THREE.MeshStandardMaterial({ color: 0xd9ad54, roughness: 0.65 });
    const birdBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.034, 5, 10), birdBodyMat);
    birdBody.rotation.z = Math.PI / 2;
    birdBody.scale.set(1.15, 0.95, 0.9);
    birdOnFence.add(birdBody);
    const birdHeadSphere = new THREE.Mesh(new THREE.SphereGeometry(0.019, 8, 7), birdBodyMat);
    birdHeadSphere.position.set(0.03, 0.018, 0);
    birdOnFence.add(birdHeadSphere);
    const birdBeak = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.02, 6), birdBeakMat);
    birdBeak.rotation.z = -Math.PI / 2;
    birdBeak.position.set(0.052, 0.016, 0);
    birdOnFence.add(birdBeak);
    const birdTail = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.01, 0.026, 6), birdBodyMat);
    birdTail.rotation.z = 1.18;
    birdTail.position.set(-0.03, 0.004, 0);
    birdOnFence.add(birdTail);
    birdOnFence.position.set(4.98, 0.5, 0.18);
    seasonalProps.add(birdOnFence);
  }
  group.add(seasonalProps);

  // 5. Fallen leaves (fall only)
  const fallLeaves = new THREE.Group();
  {
    const leafColors = [0xcc7722, 0xdd4422, 0x8b5a2a];
    for (let i = 0; i < 15; i++) {
      const r = 0.02 + Math.abs(Math.sin(i * 2.7)) * 0.02;
      const mat = new THREE.MeshStandardMaterial({
        color: leafColors[i % 3], roughness: 0.9, side: THREE.DoubleSide,
      });
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(r, 10), mat);
      leaf.rotation.x = -Math.PI / 2;
      leaf.position.set(
        -1.5 + Math.sin(i * 1.7) * 2.0,
        0.008,
        -0.5 + Math.cos(i * 2.3) * 2.0
      );
      leaf.rotation.z = i * 0.8;
      fallLeaves.add(leaf);
    }
  }
  fallLeaves.visible = false;
  group.add(fallLeaves);

  // 6. Snow patches (winter only)
  const winterSnow = new THREE.Group();
  {
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf0f4ff, roughness: 0.85 });
    const patchSizes = [0.5, 0.3, 0.7, 0.4, 0.6, 0.35, 0.8, 0.45];
    const patchPositions = [
      [-1.2, 1.8], [0.6, 2.4], [-2.0, 0.5], [1.5, 1.2],
      [-0.4, 3.0], [2.2, 0.8], [-1.8, 2.8], [0.2, 0.3],
    ];
    patchPositions.forEach(([x, z], i) => {
      const size = patchSizes[i];
      const patch = new THREE.Mesh(new THREE.PlaneGeometry(size, size), snowMat);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(x, 0.01, z);
      winterSnow.add(patch);
    });
    // White emissive strips on cedar frame top edges
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xf0f4ff, emissive: 0xddeeff, emissiveIntensity: 0.2, roughness: 0.85,
    });
    const halfW = 4 * 0.5 / 2;
    const halfD = 4 * 0.5 / 2;
    const frameY = 0.16;
    for (const [w, d, x, z] of [
      [halfW * 2 + 0.1, 0.04, 0, halfD + 0.03],
      [halfW * 2 + 0.1, 0.04, 0, -(halfD + 0.03)],
      [0.04, halfD * 2, -(halfW + 0.03), 0],
      [0.04, halfD * 2, halfW + 0.03, 0],
    ]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, d), frameMat);
      strip.position.set(x, frameY, z);
      winterSnow.add(strip);
    }
  }
  winterSnow.visible = false;
  group.add(winterSnow);

  // 7. Spring flowers in grass
  const springFlowers = new THREE.Group();
  {
    const flowerColors = [0xffee44, 0xaa55cc, 0xffffff, 0xff88bb, 0xffcc22];
    for (let i = 0; i < 20; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: flowerColors[i % flowerColors.length], roughness: 0.6,
      });
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), mat);
      flower.position.set(
        -3.5 + Math.sin(i * 3.1) * 3.5,
        0.01,
        2.5 + Math.cos(i * 2.1) * 2.0
      );
      registerBreezeNode(flower, { rotZ: 0.08, lift: 0.01, speed: 1.9 + (i % 4) * 0.07, phase: i * 0.42 });
      springFlowers.add(flower);
      accentFlowers.push(flower);
    }
  }
  springFlowers.visible = false;
  group.add(springFlowers);

  // 8. Mom's notebook on porch
  const narrativeProps = new THREE.Group();
  {
    const notebookMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 });
    const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.08), notebookMat);
    notebook.position.set(-2.3, 0.2, -3.4);
    narrativeProps.add(notebook);

    const coverMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.85 });
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.003, 0.08), coverMat);
    cover.position.set(-2.3, 0.205, -3.4);
    narrativeProps.add(cover);
  }

  // 9. Sauce jar on porch step
  {
    const jarMat = new THREE.MeshStandardMaterial({
      color: 0x88aa88, transparent: true, opacity: 0.45,
      roughness: 0.2, metalness: 0.05,
    });
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8), jarMat);
    jar.position.set(-2.2, 0.15, -3.35);
    narrativeProps.add(jar);
  }
  narrativeProps.visible = true;
  group.add(narrativeProps);

  // 10. Phillies pennant on fence
  {
    const pennantShape = new THREE.Shape();
    pennantShape.moveTo(0, 0);
    pennantShape.lineTo(0.15, 0.04);
    pennantShape.lineTo(0, 0.08);
    pennantShape.closePath();
    const pennantGeo = new THREE.ShapeGeometry(pennantShape);
    const pennantMat = new THREE.MeshStandardMaterial({
      color: 0xE81828, roughness: 0.7, side: THREE.DoubleSide,
    });
    const pennant = new THREE.Mesh(pennantGeo, pennantMat);
    pennant.position.set(4.98, 0.56, 1.18);
    pennant.rotation.y = -Math.PI / 2;
    group.add(pennant);
  }

  // 11. Seed packets near bed (planning only)
  const planningProps = new THREE.Group();
  {
    const pColors = [0xe05a2b, 0xeacc2b, 0x4a9a40, 0x5a7abf];
    for (let i = 0; i < 4; i++) {
      const pMat = new THREE.MeshStandardMaterial({ color: pColors[i], roughness: 0.7 });
      const pkt = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.06), pMat);
      pkt.rotation.x = -Math.PI / 2;
      pkt.position.set(-0.8 + i * 0.12, 0.008, 2.2 + (i % 2) * 0.08);
      pkt.rotation.z = (i - 1.5) * 0.15;
      planningProps.add(pkt);
    }
  }
  planningProps.visible = false;
  group.add(planningProps);

  // 12. Telephone pole
  {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.92 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.0, 8), poleMat);
    pole.position.set(7.8, 1.5, -5.4);
    group.add(pole);

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.6, 8), poleMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(7.8, 3.0, -5.4);
    group.add(crossbar);

    const wireMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 2.4, 6), wireMat);
    wire.rotation.z = Math.PI / 2;
    wire.position.set(9.0, 2.98, -5.4);
    group.add(wire);
  }

  // 13. Distant rooftops
  {
    const silMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.95 });
    const rooftops = [
      { w: 2.0, h: 1.2, d: 1.5, x: 8.8, y: 0.6, z: -8.3 },
      { w: 1.5, h: 1.8, d: 1.2, x: 10.9, y: 0.9, z: -7.9 },
      { w: 1.8, h: 1.0, d: 1.4, x: 12.4, y: 0.5, z: -9.1 },
    ];
    rooftops.forEach(({ w, h, d, x, y, z }) => {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), silMat);
      roof.position.set(x, y, z);
      group.add(roof);
    });
  }

  // 14. Drifting clouds
  const clouds = [];
  {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, transparent: true, opacity: 0.55, roughness: 1.0,
    });
    const cloudData = [
      { x: -4, y: 12, z: -6, sx: 2.5, sy: 0.6, sz: 1.2 },
      { x: 3, y: 14, z: -8, sx: 3.0, sy: 0.5, sz: 1.5 },
      { x: -1, y: 13, z: -10, sx: 2.0, sy: 0.4, sz: 1.0 },
      { x: 6, y: 15, z: -5, sx: 2.2, sy: 0.55, sz: 1.3 },
    ];
    cloudData.forEach(({ x, y, z, sx, sy, sz }) => {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 16), cloudMat.clone());
      cloud.scale.set(sx, sy, sz);
      cloud.position.set(x, y, z);
      group.add(cloud);
      clouds.push({ mesh: cloud, baseX: x, speed: 0.08 + Math.abs(Math.sin(x)) * 0.04 });
    });
  }

  // 15. Fireflies (night/winter mood)
  const fireflies = new THREE.Group();
  let fireflyPositions;
  {
    const count = 30;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = -3 + Math.sin(i * 2.1) * 4;
      positions[i * 3 + 1] = 0.3 + Math.abs(Math.sin(i * 1.3)) * 1.5;
      positions[i * 3 + 2] = -2 + Math.cos(i * 1.7) * 4;
    }
    fireflyPositions = positions;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffee66,
      size: 0.015,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    fireflies.add(points);
  }
  fireflies.visible = false;
  group.add(fireflies);

  // 16. Puddles after rain
  const puddles = new THREE.Group();
  {
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x8899aa, metalness: 0.25, roughness: 0.15,
      transparent: true, opacity: 0.22,
    });
    const puddleData = [
      { r: 0.12, x: -1.0, z: 1.8 },
      { r: 0.08, x: 1.2, z: 2.2 },
      { r: 0.18, x: 0.0, z: 3.2 },
      { r: 0.10, x: -2.0, z: 0.6 },
    ];
    puddleData.forEach(({ r, x, z }) => {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(r, 16), puddleMat.clone());
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(x, 0.009, z);
      puddles.add(puddle);
    });
  }
  puddles.visible = false;
  group.add(puddles);

  // 17. Cat silhouette on fence
  {
    const catMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85 });
    const catSilhouette = new THREE.Group();
    const catBody2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.05, 5, 10), catMat);
    catBody2.rotation.z = Math.PI / 2;
    catBody2.scale.set(1, 0.9, 0.78);
    catSilhouette.add(catBody2);
    const catHead2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 7), catMat);
    catHead2.position.set(0.05, 0.022, 0);
    catSilhouette.add(catHead2);
    for (const ex of [-0.01, 0.01]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.02, 6), catMat);
      ear.position.set(0.05 + ex, 0.055, 0);
      catSilhouette.add(ear);
    }
    const catTail2 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.1, 8), catMat);
    catTail2.rotation.z = -0.8;
    catTail2.position.set(-0.07, 0.03, 0);
    catSilhouette.add(catTail2);
    catSilhouette.position.set(5.02, 0.55, 2.0);
    seasonalProps.add(catSilhouette);
  }

  // 18. Chimney smoke (winter)
  const winterSmoke = new THREE.Group();
  let smokePositions;
  {
    const count = 20;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 4.7 + (Math.sin(i * 1.5) * 0.1);
      positions[i * 3 + 1] = 2.5 + i * 0.08;
      positions[i * 3 + 2] = -2.1 + (Math.cos(i * 1.3) * 0.1);
    }
    smokePositions = positions;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.015,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    winterSmoke.add(points);
  }
  winterSmoke.visible = false;
  group.add(winterSmoke);

  // 19. Wind indicator on fence
  const windIndicator = new THREE.Group();
  {
    const windPoleMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.3 });
    const windPole = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), windPoleMat);
    windPole.position.y = 0.15;
    windIndicator.add(windPole);

    const flagShape = new THREE.Shape();
    flagShape.moveTo(0, 0);
    flagShape.lineTo(0.06, 0.02);
    flagShape.lineTo(0, 0.04);
    flagShape.closePath();
    const flagGeo = new THREE.ShapeGeometry(flagShape);
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xee6633, roughness: 0.7, side: THREE.DoubleSide,
    });
    const windFlag = new THREE.Mesh(flagGeo, flagMat);
    windFlag.position.set(0.01, 0.25, 0);
    registerBreezeNode(windFlag, { rotZ: 0.22, speed: 2.5, phase: 1.1 });
    windIndicator.add(windFlag);
    windIndicator._flag = windFlag;
  }
  windIndicator.position.set(4.95, 0.5, 1.0);
  group.add(windIndicator);

  // ── EXPANDED SCENERY — full house, fences, neighbors ─────────────────

  // === FULL HOUSE — second floor, roof, chimney, more windows ===

  // Second floor wall (extends above existing first-floor wall)
  const secondFloorWall = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 2.8), sidingMat);
  secondFloorWall.position.set(0, 3.5 + 1.4, -6.15);
  secondFloorWall.receiveShadow = true;
  group.add(secondFloorWall);

  // Horizontal siding lines for second floor
  for (let i = 0; i < 9; i++) {
    const board2 = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.045, 0.02), trimMat);
    board2.position.set(0, 3.65 + i * 0.29, -6.12);
    group.add(board2);
  }

  // Floor separator trim between stories
  const storyTrim = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.08, 0.06), trimMat);
  storyTrim.position.set(0, 3.46, -6.1);
  group.add(storyTrim);

  // Second floor windows (2 windows)
  for (const wx of [-1.2, 1.6]) {
    const win2Frame = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.0, 0.08), trimMat);
    win2Frame.position.set(wx, 4.5, -6.18);
    group.add(win2Frame);
    const win2Glass = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.04), windowGlassMat);
    win2Glass.position.set(wx, 4.5, -6.22);
    group.add(win2Glass);
    // Window sill
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.1), trimMat);
    sill.position.set(wx, 3.98, -6.12);
    group.add(sill);
  }

  // First floor — additional window right of center
  const firstWin2Frame = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.0, 0.08), trimMat);
  firstWin2Frame.position.set(1.85, 1.85, -6.18);
  group.add(firstWin2Frame);
  const firstWin2Glass = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.04), windowGlassMat);
  firstWin2Glass.position.set(1.85, 1.85, -6.22);
  group.add(firstWin2Glass);
  const firstWin2Sill = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.1), trimMat);
  firstWin2Sill.position.set(1.85, 1.33, -6.12);
  group.add(firstWin2Sill);

  // Main roof — pitched (two angled planes)
  const roofOverhang = 0.35;
  const roofWidth = 7.8 + roofOverhang * 2;
  const roofDepth = 2.2;
  const roofPeakY = 7.4;
  const roofBaseY = 6.3;
  const roofZ = -6.15;

  const roofLeftGeo = new THREE.PlaneGeometry(roofWidth / 2 + 0.1, roofDepth);
  const roofLeftMesh = new THREE.Mesh(roofLeftGeo, roofMat);
  roofLeftMesh.position.set(-roofWidth / 4, (roofPeakY + roofBaseY) / 2, roofZ);
  roofLeftMesh.rotation.z = -0.48;
  roofLeftMesh.rotation.x = -0.15;
  group.add(roofLeftMesh);

  const roofRightGeo = new THREE.PlaneGeometry(roofWidth / 2 + 0.1, roofDepth);
  const roofRightMesh = new THREE.Mesh(roofRightGeo, roofMat);
  roofRightMesh.position.set(roofWidth / 4, (roofPeakY + roofBaseY) / 2, roofZ);
  roofRightMesh.rotation.z = 0.48;
  roofRightMesh.rotation.x = -0.15;
  group.add(roofRightMesh);

  // Roof ridge cap
  const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(roofWidth, 0.06, 0.12), roofMat);
  ridgeCap.position.set(0, roofPeakY, roofZ);
  group.add(ridgeCap);

  // Gable fill (triangular)
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-roofWidth / 2 + roofOverhang, 0);
  gableShape.lineTo(0, roofPeakY - roofBaseY);
  gableShape.lineTo(roofWidth / 2 - roofOverhang, 0);
  gableShape.closePath();
  const gableGeo = new THREE.ShapeGeometry(gableShape);
  const gable = new THREE.Mesh(gableGeo, sidingMat);
  gable.position.set(0, roofBaseY, -6.14);
  group.add(gable);

  // Chimney
  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.92 });
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.4), chimneyMat);
  chimney.position.set(2.6, roofPeakY + 0.1, -6.3);
  chimney.castShadow = true;
  group.add(chimney);
  // Chimney cap
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 }));
  chimneyCap.position.set(2.6, roofPeakY + 0.83, -6.3);
  group.add(chimneyCap);

  // Gutters along roofline
  const gutterMat = new THREE.MeshStandardMaterial({ color: 0xa0a0a0, roughness: 0.7, metalness: 0.2 });
  const gutterLeft = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.05, 0.06), gutterMat);
  gutterLeft.position.set(-1.8, roofBaseY - 0.02, -5.2);
  group.add(gutterLeft);
  const gutterRight = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.05, 0.06), gutterMat);
  gutterRight.position.set(1.8, roofBaseY - 0.02, -5.2);
  group.add(gutterRight);

  // House side walls (partially visible)
  const houseSideLeft = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 6.3), sidingMat);
  houseSideLeft.position.set(-3.9, 3.15, -4.65);
  houseSideLeft.rotation.y = Math.PI / 2;
  group.add(houseSideLeft);

  const houseSideRight = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 6.3), sidingMat);
  houseSideRight.position.set(3.9, 3.15, -4.65);
  houseSideRight.rotation.y = -Math.PI / 2;
  group.add(houseSideRight);

  // === LEFT-SIDE FENCE (mirrors right fence, encloses yard) ===
  for (let i = 0; i < 14; i++) {
    const slatMat = i % 3 === 0 ? fenceDarkMat : fenceMat;
    const slatHeight = 0.42 + (i % 2) * 0.04;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.12, slatHeight, 0.03), slatMat);
    slat.position.set(-4.95, slatHeight / 2, -0.2 + i * 0.36);
    slat.rotation.y = 0.08;
    group.add(slat);
  }
  // Left fence posts (thicker support posts every 4 slats)
  for (let i = 0; i < 14; i += 4) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.58, 0.08), fenceDarkMat);
    post.position.set(-4.95, 0.29, -0.2 + i * 0.36);
    group.add(post);
  }
  // Left fence horizontal rails
  for (const ry of [0.1, 0.38]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 14 * 0.36), fenceMat);
    rail.position.set(-4.95, ry, -0.2 + 6.5 * 0.36);
    rail.rotation.y = 0.08;
    group.add(rail);
  }

  // Right fence — extend and add posts/rails to match
  for (let i = 10; i < 14; i++) {
    const slatMat = i % 3 === 0 ? fenceDarkMat : fenceMat;
    const slatHeight = 0.42 + (i % 2) * 0.04;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.12, slatHeight, 0.03), slatMat);
    slat.position.set(4.95, slatHeight / 2, -0.2 + i * 0.36);
    slat.rotation.y = -0.08;
    group.add(slat);
  }
  for (let i = 0; i < 14; i += 4) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.58, 0.08), fenceDarkMat);
    post.position.set(4.95, 0.29, -0.2 + i * 0.36);
    group.add(post);
  }
  for (const ry of [0.1, 0.38]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 14 * 0.36), fenceMat);
    rail.position.set(4.95, ry, -0.2 + 6.5 * 0.36);
    rail.rotation.y = -0.08;
    group.add(rail);
  }

  // Back fence connecting left and right fences
  const backFenceZ = -0.2;
  for (let i = 0; i < 20; i++) {
    const slatMat = i % 3 === 0 ? fenceDarkMat : fenceMat;
    const slatHeight = 0.42 + (i % 2) * 0.04;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.03, slatHeight, 0.12), slatMat);
    slat.position.set(-4.5 + i * 0.48, slatHeight / 2, backFenceZ);
    group.add(slat);
  }

  // Front fence with gate opening (skip center slats for gate)
  const frontFenceZ = 4.8;
  for (let i = 0; i < 20; i++) {
    // Leave gap for gate (slats 8-11)
    if (i >= 8 && i <= 11) continue;
    const slatMat = i % 3 === 0 ? fenceDarkMat : fenceMat;
    const slatHeight = 0.42 + (i % 2) * 0.04;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.03, slatHeight, 0.12), slatMat);
    slat.position.set(-4.5 + i * 0.48, slatHeight / 2, frontFenceZ);
    group.add(slat);
  }
  // Gate posts (taller)
  for (const gx of [-4.5 + 8 * 0.48 - 0.12, -4.5 + 11 * 0.48 + 0.12]) {
    const gatePost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.1), fenceDarkMat);
    gatePost.position.set(gx, 0.325, frontFenceZ);
    group.add(gatePost);
  }
  // Gate (slightly ajar)
  const gateGroup = new THREE.Group();
  const gateWidth = 4 * 0.48;
  for (let i = 0; i < 4; i++) {
    const gSlat = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.4, 0.1),
      i % 2 === 0 ? fenceMat : fenceDarkMat
    );
    gSlat.position.set(i * 0.48 - gateWidth / 2 + 0.24, 0.2, 0);
    gateGroup.add(gSlat);
  }
  // Gate cross brace
  const gateBrace = new THREE.Mesh(new THREE.BoxGeometry(gateWidth - 0.1, 0.03, 0.03), fenceMat);
  gateBrace.position.set(0, 0.35, 0);
  gateGroup.add(gateBrace);
  gateGroup.position.set(-4.5 + 9.5 * 0.48, 0, frontFenceZ);
  gateGroup.rotation.y = 0.25; // slightly ajar
  group.add(gateGroup);

  // === NEIGHBOR HOUSE — LEFT SIDE ===
  const neighborSidingLeft = new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.88, side: THREE.DoubleSide });
  const neighborRoofLeft = new THREE.MeshStandardMaterial({ color: 0x3a3832, roughness: 0.94 });

  const nLeftWall = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 4.5), neighborSidingLeft);
  nLeftWall.position.set(-6.5, 2.25, -4.8);
  nLeftWall.rotation.y = -Math.PI / 2.7;
  group.add(nLeftWall);

  // Left neighbor second wall (front-facing)
  const nLeftWall2 = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 4.5), neighborSidingLeft);
  nLeftWall2.position.set(-7.2, 2.25, -3.4);
  nLeftWall2.rotation.y = 0.15;
  group.add(nLeftWall2);

  const nLeftRoof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 2.0), neighborRoofLeft);
  nLeftRoof.position.set(-6.8, 4.4, -4.1);
  nLeftRoof.rotation.y = -Math.PI / 2.7;
  group.add(nLeftRoof);

  // Left neighbor window
  const nLeftWin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.55), trimMat);
  nLeftWin.position.set(-6.45, 2.0, -4.75);
  nLeftWin.rotation.y = -Math.PI / 2.7;
  group.add(nLeftWin);

  // Left neighbor foundation
  const nLeftFound = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.35, 0.18),
    new THREE.MeshStandardMaterial({ color: FOUNDATION_COLOR, roughness: 0.94 })
  );
  nLeftFound.position.set(-6.6, 0.18, -4.4);
  nLeftFound.rotation.y = -Math.PI / 2.7;
  group.add(nLeftFound);

  // === NEIGHBOR HOUSE — RIGHT SIDE (enhance existing) ===
  // Additional right neighbor wall area (front facing portion)
  const nRightWall2 = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.5), sidingMat);
  nRightWall2.position.set(7.1, 1.75, -3.8);
  nRightWall2.rotation.y = Math.PI - 0.15;
  group.add(nRightWall2);

  // Right neighbor second floor extension
  const nRightUpper = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.8), sidingMat);
  nRightUpper.position.set(6.35, 3.08, -5.55);
  nRightUpper.rotation.y = Math.PI / 2.7;
  group.add(nRightUpper);

  // Right neighbor enhanced roof
  const nRightRoof2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.8), roofMat);
  nRightRoof2.position.set(6.55, 3.9, -5.05);
  nRightRoof2.rotation.y = Math.PI / 2.7;
  group.add(nRightRoof2);

  // Right neighbor window
  const nRightWin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.55), trimMat);
  nRightWin.position.set(6.4, 1.6, -5.5);
  nRightWin.rotation.y = Math.PI / 2.7;
  group.add(nRightWin);

  // Right neighbor foundation
  const nRightFound = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.35, 0.18),
    new THREE.MeshStandardMaterial({ color: FOUNDATION_COLOR, roughness: 0.94 })
  );
  nRightFound.position.set(6.5, 0.18, -5.2);
  nRightFound.rotation.y = Math.PI / 2.7;
  group.add(nRightFound);

  // === ALLEY / BACK FENCE ===
  // Back alley fence behind house (visible through gaps)
  const alleyFenceMat = new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.92 });
  for (let i = 0; i < 16; i++) {
    const afSlat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.025), alleyFenceMat);
    afSlat.position.set(-3.5 + i * 0.48, 0.28, -7.5);
    group.add(afSlat);
  }

  // Alley ground strip
  const alleyMat = new THREE.MeshStandardMaterial({ color: 0x5a5850, roughness: 0.96 });
  const alleyGround = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.5), alleyMat);
  alleyGround.rotation.x = -Math.PI / 2;
  alleyGround.position.set(0, 0.002, -7.0);
  group.add(alleyGround);

  // === ADDITIONAL DISTANT ROOFTOPS (more depth) ===
  {
    const distMat = new THREE.MeshStandardMaterial({ color: 0x4a4a58, roughness: 0.95 });
    const distMat2 = new THREE.MeshStandardMaterial({ color: 0x5a5250, roughness: 0.95 });
    const moreRooftops = [
      { w: 2.5, h: 2.0, d: 1.8, x: -8.5, y: 1.0, z: -9.0, mat: distMat },
      { w: 1.8, h: 2.5, d: 1.5, x: -10.2, y: 1.25, z: -8.5, mat: distMat2 },
      { w: 3.0, h: 1.5, d: 2.0, x: -6.5, y: 0.75, z: -10.0, mat: distMat },
      { w: 2.2, h: 1.8, d: 1.6, x: 14.0, y: 0.9, z: -8.8, mat: distMat2 },
      { w: 1.5, h: 2.2, d: 1.3, x: 9.5, y: 1.1, z: -10.2, mat: distMat },
    ];
    moreRooftops.forEach(({ w, h, d, x, y, z, mat }) => {
      const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      block.position.set(x, y, z);
      group.add(block);
    });
  }

  // === SIDEWALK / CONCRETE PATH ===
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xb0a898, roughness: 0.94 });
  // Path from gate to porch steps
  const walkway = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.2), sidewalkMat);
  walkway.rotation.x = -Math.PI / 2;
  walkway.position.set(-2.95, 0.004, -2.5);
  walkway.receiveShadow = true;
  group.add(walkway);

  // Sidewalk along front of house
  const frontWalk = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 0.6), sidewalkMat);
  frontWalk.rotation.x = -Math.PI / 2;
  frontWalk.position.set(0, 0.004, 5.1);
  frontWalk.receiveShadow = true;
  group.add(frontWalk);

  // === MISC YARD DETAILS ===

  // AC unit on right side of house
  const acMat = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.7, metalness: 0.15 });
  const acUnit = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.35), acMat);
  acUnit.position.set(3.6, 0.225, -4.5);
  group.add(acUnit);
  // AC fan grille (circle on top)
  const acFan = new THREE.Mesh(
    new THREE.CircleGeometry(0.15, 12),
    new THREE.MeshStandardMaterial({ color: 0x707070, roughness: 0.6, metalness: 0.3 })
  );
  acFan.rotation.x = -Math.PI / 2;
  acFan.position.set(3.6, 0.451, -4.5);
  group.add(acFan);

  // Trash cans near alley
  const trashMat = new THREE.MeshStandardMaterial({ color: 0x2a5a2a, roughness: 0.8 });
  for (const [tx, tz] of [[3.2, -4.0], [3.5, -3.85]]) {
    const trashCan = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.5, 10), trashMat);
    trashCan.position.set(tx, 0.25, tz);
    trashCan.castShadow = true;
    group.add(trashCan);
    const trashLid = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 10), trashMat);
    trashLid.position.set(tx, 0.52, tz);
    group.add(trashLid);
  }

  // Flower box under back window
  const flowerBoxMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.88 });
  const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.14), flowerBoxMat);
  flowerBox.position.set(0.25, 1.3, -6.06);
  group.add(flowerBox);
  // Small flowers in window box
  for (let fb = 0; fb < 5; fb++) {
    const fbColor = [0xff6688, 0xffaa44, 0xff88bb, 0xffcc55, 0xff7799][fb];
    const fbFlower = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 5, 4),
      new THREE.MeshStandardMaterial({ color: fbColor, roughness: 0.55 })
    );
    fbFlower.position.set(0.25 - 0.32 + fb * 0.16, 1.42, -6.02);
    group.add(fbFlower);
    accentFlowers.push(fbFlower);
  }

  // House number on wall near door
  const numberMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.4 });
  const houseNumber = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.02), numberMat);
  houseNumber.position.set(-2.1, 2.15, -6.12);
  group.add(houseNumber);

  // Porch awning bracket details
  for (const bx of [-3.6, -2.3]) {
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.3, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8 })
    );
    bracket.position.set(bx, 2.55, -5.32);
    bracket.rotation.z = 0.4;
    group.add(bracket);
  }

  // ── END EXPANDED SCENERY ──────────────────────────────────────────────

  tracker?.trackObject(group);

  return {
    group,

    updateSeason(season) {
      const colors = SEASON_TREE_COLORS[season] || SEASON_TREE_COLORS.spring;
      for (const canopyGroup of treeCanopies) {
        canopyGroup.children.forEach((mesh, i) => {
          mesh.material.color.set(colors[i] || colors[0]);
        });
      }
      // Seasonal prop visibility
      fallLeaves.visible = season === 'fall';
      winterSnow.visible = season === 'winter';
      winterSmoke.visible = season === 'winter';
      springFlowers.visible = season === 'spring';
      seasonalProps.visible = season !== 'winter';

      const shrubPalettes = {
        spring: [0x5f8d4d, 0x729d63, 0x6ea78a],
        summer: [0x42753b, 0x4d8841, 0x5e8f57],
        fall: [0x7d6a36, 0x8c5a32, 0x9f6f3c],
        winter: [0x7b8288, 0x8f98a2, 0xa7b2bb],
      };
      const flowerPalettes = {
        spring: [0xdce6ef, 0xf3e6b0, 0xd8c8f0],
        summer: [0xffd95e, 0xf4b56e, 0xf2f0d9],
        fall: [0xc98a34, 0x9d5c34, 0xb88e52],
        winter: [0xcdd6df, 0xdce5ef, 0xb6c2cf],
      };
      const shrubColors = shrubPalettes[season] || shrubPalettes.spring;
      hedgePlants.forEach((shrub, index) => {
        shrub.material.color.setHex(shrubColors[index % shrubColors.length]);
      });
      const flowerColors = flowerPalettes[season] || flowerPalettes.spring;
      accentFlowers.forEach((flower, index) => {
        flower.material.color.setHex(flowerColors[index % flowerColors.length]);
      });

      // Wind flag rotation varies by season
      if (windIndicator._flag) {
        const seasonRotations = { spring: 0.3, summer: 0.1, fall: 0.6, winter: 0.8 };
        windIndicator._flag.rotation.y = seasonRotations[season] || 0.2;
        if (windIndicator._flag.userData.breeze) {
          windIndicator._flag.userData.breeze.baseRotationY = windIndicator._flag.rotation.y;
        }
      }
    },

    updateBreeze(time, strength = 1) {
      for (const node of breezeNodes) {
        const breeze = node.userData?.breeze;
        if (!breeze) continue;
        const wave = Math.sin(time * breeze.speed + breeze.phase);
        const flutter = Math.cos(time * breeze.speed * 1.7 + breeze.phase * 0.6);
        node.position.y = breeze.basePositionY + Math.max(0, wave) * breeze.lift * strength;
        node.rotation.x = breeze.baseRotationX + flutter * breeze.rotX * strength;
        node.rotation.y = breeze.baseRotationY + flutter * breeze.rotY * strength;
        node.rotation.z = breeze.baseRotationZ + wave * breeze.rotZ * strength;
      }
    },

    updateClouds(dt) {
      for (const c of clouds) {
        c.mesh.position.x = c.baseX + Math.sin(performance.now() * 0.0001 * c.speed) * 3.0;
      }
    },

    updateSmoke(dt) {
      if (!winterSmoke.visible) return;
      const pts = winterSmoke.children[0];
      if (!pts || !smokePositions) return;
      const posAttr = pts.geometry.getAttribute('position');
      for (let i = 0; i < posAttr.count; i++) {
        // Slowly rise and drift
        smokePositions[i * 3 + 1] += dt * 0.12;
        smokePositions[i * 3] += Math.sin(performance.now() * 0.001 + i) * dt * 0.02;
        // Reset when too high
        if (smokePositions[i * 3 + 1] > 4.5) {
          smokePositions[i * 3] = 4.7 + (Math.sin(i * 1.5) * 0.1);
          smokePositions[i * 3 + 1] = 2.5;
          smokePositions[i * 3 + 2] = -2.1 + (Math.cos(i * 1.3) * 0.1);
        }
      }
      posAttr.needsUpdate = true;
    },

    updateFireflies(dt) {
      if (!fireflies.visible) return;
      const pts = fireflies.children[0];
      if (!pts || !fireflyPositions) return;
      const posAttr = pts.geometry.getAttribute('position');
      const t = performance.now() * 0.001;
      for (let i = 0; i < posAttr.count; i++) {
        fireflyPositions[i * 3] += Math.sin(t * 0.5 + i * 0.7) * dt * 0.15;
        fireflyPositions[i * 3 + 1] += Math.cos(t * 0.3 + i * 1.1) * dt * 0.08;
        fireflyPositions[i * 3 + 2] += Math.sin(t * 0.4 + i * 0.9) * dt * 0.12;
        // Keep in bounds
        if (Math.abs(fireflyPositions[i * 3]) > 5) fireflyPositions[i * 3] *= 0.95;
        if (fireflyPositions[i * 3 + 1] > 2.5 || fireflyPositions[i * 3 + 1] < 0.1) {
          fireflyPositions[i * 3 + 1] = 0.3 + Math.abs(Math.sin(i * 1.3)) * 1.5;
        }
        if (Math.abs(fireflyPositions[i * 3 + 2]) > 5) fireflyPositions[i * 3 + 2] *= 0.95;
      }
      posAttr.needsUpdate = true;
      // Pulse opacity
      pts.material.opacity = 0.5 + Math.sin(t * 2.0) * 0.3;
    },

    showPlanningProps(visible) {
      planningProps.visible = visible;
    },

    showNarrativeProps(chapter, campaign) {
      // Show notebook/sauce jar from chapter 2 onward or when campaign has started
      narrativeProps.visible = (chapter >= 2 || (campaign && campaign.length > 0));
    },

    showFireflies(visible) {
      fireflies.visible = visible;
    },

    showPuddles(visible) {
      puddles.visible = visible;
    },
  };
}
