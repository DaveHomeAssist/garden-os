/**
 * Background Scenery — trees, house, and props around the garden bed.
 * All procedural geometry, no external models.
 */
import * as THREE from 'three';

const GRASS_DARK = 0x3a5a2a;
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
  const placeCueIds = new Set();
  let currentSeason = 'spring';

  function markPlaceCue(target, cueId) {
    if (target?.userData && cueId) {
      target.userData.placeCueId = cueId;
      placeCueIds.add(cueId);
    }
    return target;
  }

  function getLayerState(target) {
    return {
      visible: Boolean(target?.visible),
      count: target?.children?.length ?? 0,
    };
  }

  const trimTexture = createBoardTexture(0xe8e0d1, 0xbba98f, 2.8, 2.8);
  const porchTexture = createBoardTexture(0xd7d0c0, 0xa58e73, 3.4, 2.2);
  const sidingMat = new THREE.MeshStandardMaterial({ color: 0xb9c3c9, roughness: 0.9, side: THREE.DoubleSide });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d1, roughness: 0.78, map: trimTexture, bumpMap: trimTexture, bumpScale: 0.008 });
  const porchMat = new THREE.MeshStandardMaterial({ color: 0xd7d0c0, roughness: 0.88, map: porchTexture, bumpMap: porchTexture, bumpScale: 0.008 });
  const windowGlassMat = new THREE.MeshStandardMaterial({ color: 0xc7d8df, roughness: 0.2, metalness: 0.05 });

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

  // --- Rowhouse mass behind the bed ---
  // A real volume instead of the old floating PlaneGeometry billboard: the box
  // gives the house sides and edges that catch light, topped with a cornice
  // and flat roof cap (South Philly rowhouses are flat-roofed), plus a party-
  // wall stub and chimney so the silhouette reads at a glance.
  const houseWall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, 0.5), sidingMat);
  houseWall.position.set(-2.1, 1.6, -6.4); // front face stays at z=-6.15
  houseWall.receiveShadow = true;
  houseWall.castShadow = true;
  markPlaceCue(houseWall, 'rowhouse-siding');
  group.add(houseWall);

  const cornice = new THREE.Mesh(new THREE.BoxGeometry(3.78, 0.16, 0.62), trimMat);
  cornice.position.set(-2.1, 3.22, -6.4);
  cornice.castShadow = true;
  group.add(cornice);

  const roofCap = new THREE.Mesh(
    new THREE.BoxGeometry(3.66, 0.08, 0.54),
    new THREE.MeshStandardMaterial({ color: 0x4a423a, roughness: 0.95 }),
  );
  roofCap.position.set(-2.1, 3.34, -6.4);
  group.add(roofCap);

  // Party wall stub on the left — rowhouses share walls; a hint of the
  // neighbor's house anchors this one in a block instead of open space.
  const partyWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.5), sidingMat);
  partyWall.position.set(-4.15, 1.3, -6.4);
  partyWall.receiveShadow = true;
  group.add(partyWall);

  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.55, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x8a5a44, roughness: 0.92 }),
  );
  chimney.position.set(-3.3, 3.55, -6.45);
  chimney.castShadow = true;
  group.add(chimney);

  for (const { x, z, scale, color } of [
    { x: -2.0, z: -4.86, scale: 1.08, color: 0x527d46 },
    { x: -1.32, z: -4.72, scale: 0.88, color: 0x628a4f },
    { x: -0.72, z: -4.92, scale: 0.96, color: 0x4d7442 },
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
    { x: -0.82, z: -4.55, color: 0xd6d2b2 },
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

  // Porch left
  const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.1, 0.72), porchMat);
  porchFloor.position.set(-2.95, 0.05, -5.72);
  porchFloor.receiveShadow = true;
  group.add(porchFloor);

  for (const [x, y, z, w, h, d] of [
    [-2.95, 0.09, -5.2, 0.82, 0.07, 0.34],
    [-2.95, 0.055, -4.98, 0.64, 0.05, 0.26],
  ]) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), porchMat);
    step.position.set(x, y, z);
    step.receiveShadow = true;
    group.add(step);
  }

  const backDoor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.62, 0.08), trimMat);
  backDoor.position.set(-2.95, 0.95, -6.18);
  group.add(backDoor);

  // --- Perimeter fence — frames the yard at the movement bounds (±9) ------
  // Cheap slatted cedar: posts + two rails per run, one shared material, no
  // shadow casting. A gap is left at the back for the neighborhood exit
  // (x -1.8..1.8 at z -8.5) and around the porch.
  {
    const fenceTexture = createBoardTexture(0x96683c, 0x6f4a28, 2.6, 1.4);
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x96683c, roughness: 0.92, map: fenceTexture });
    const fenceGroup = new THREE.Group();
    fenceGroup.name = 'yard-fence';

    function fenceRun(x1, z1, x2, z2) {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      if (length < 0.4) return;
      const angle = Math.atan2(dx, dz);
      const run = new THREE.Group();
      run.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
      run.rotation.y = angle;
      for (const railY of [0.34, 0.62]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, length), fenceMat);
        rail.position.y = railY;
        run.add(rail);
      }
      const postCount = Math.max(2, Math.round(length / 1.5) + 1);
      for (let i = 0; i < postCount; i++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.78, 0.09), fenceMat);
        post.position.set(0, 0.39, -length / 2 + (i / (postCount - 1)) * length);
        run.add(post);
      }
      fenceGroup.add(run);
    }

    fenceRun(-9.3, -9.3, -9.3, 9.3);   // left side
    fenceRun(9.3, -9.3, 9.3, 9.3);     // right side
    fenceRun(-9.3, 9.3, 9.3, 9.3);     // front
    fenceRun(-9.3, -9.3, -1.8, -9.3);  // back, left of the exit gate gap
    fenceRun(1.8, -9.3, 9.3, -9.3);    // back, right of the exit gate gap

    group.add(fenceGroup);
  }

  // Back window on the compact house face.
  const backWindow = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.12, 0.08), trimMat);
  backWindow.position.set(-1.35, 1.95, -6.18);
  group.add(backWindow);
  const backGlass = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.88, 0.04), windowGlassMat);
  backGlass.position.set(-1.35, 1.95, -6.22);
  group.add(backGlass);

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
  dryerVent.position.set(-0.72, 0.8, -4.68);
  group.add(dryerVent);

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

  // 2. Radio on the porch step
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

  // 4. Seasonal prop group. Edge-mounted critters are intentionally omitted.
  const seasonalProps = new THREE.Group();
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

  // 8. Gardener notebook on porch
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

  // 10. Phillies pennant on the porch trim
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
    pennant.position.set(-1.95, 0.86, -4.66);
    pennant.rotation.y = -0.05;
    markPlaceCue(pennant, 'phillies-pennant');
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

  // 17. July ground grit: non-linear stains and heat shimmer kept off the house edge.
  const summerGrit = new THREE.Group();
  const summerHeatHaze = new THREE.Group();
  const heatHazePlanes = [];
  {
    const stainMat = new THREE.MeshStandardMaterial({
      color: 0x271d14,
      roughness: 1,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    const stainData = [
      { x: -2.54, z: 2.75, sx: 1.05, sz: 0.5, opacity: 0.12 },
      { x: 2.0, z: 2.64, sx: 0.92, sz: 0.42, opacity: 0.1 },
    ];
    stainData.forEach(({ x, z, sx, sz, opacity }, index) => {
      const stain = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), stainMat.clone());
      stain.material.opacity = opacity;
      stain.rotation.x = -Math.PI / 2;
      stain.rotation.z = index * 0.52;
      stain.position.set(x, 0.012, z);
      stain.scale.set(sx, sz, 1);
      markPlaceCue(stain, index === 0 ? 'july-ground-stain' : null);
      summerGrit.add(stain);
    });

    const heatMat = new THREE.MeshBasicMaterial({
      color: 0xe8c84a,
      transparent: true,
      opacity: 0.018,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    [
      { x: -2.35, z: -5.48, sx: 1.08, sz: 0.28 },
      { x: -1.48, z: -5.58, sx: 0.86, sz: 0.22 },
    ].forEach(({ x, z, sx, sz }, index) => {
      const shimmer = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), heatMat.clone());
      shimmer.rotation.x = -Math.PI / 2;
      shimmer.rotation.z = index * 0.38;
      shimmer.position.set(x, 0.018, z);
      shimmer.scale.set(sx, sz, 1);
      shimmer.renderOrder = 1;
      shimmer.userData.baseOpacity = 0.012 + index * 0.003;
      shimmer.userData.heatHazeStyle = 'ground-shimmer';
      heatHazePlanes.push(shimmer);
      summerHeatHaze.add(shimmer);
    });
  }
  summerGrit.visible = false;
  summerHeatHaze.visible = false;
  group.add(summerGrit);
  group.add(summerHeatHaze);

  // 19. Chimney smoke (winter)
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

  // Flower box under back window
  const flowerBoxMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.88 });
  const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.14), flowerBoxMat);
  flowerBox.position.set(-1.35, 1.3, -6.06);
  group.add(flowerBox);
  // Small flowers in window box
  for (let fb = 0; fb < 5; fb++) {
    const fbColor = [0xff6688, 0xffaa44, 0xff88bb, 0xffcc55, 0xff7799][fb];
    const fbFlower = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 5, 4),
      new THREE.MeshStandardMaterial({ color: fbColor, roughness: 0.55 })
    );
    fbFlower.position.set(-1.35 - 0.32 + fb * 0.16, 1.42, -6.02);
    group.add(fbFlower);
    accentFlowers.push(fbFlower);
  }

  // House number on wall near door
  const numberMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.4 });
  const houseNumber = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.02), numberMat);
  houseNumber.position.set(-2.1, 2.15, -6.12);
  group.add(houseNumber);

  tracker?.trackObject(group);

  return {
    group,

    updateSeason(season) {
      currentSeason = season || 'spring';
      const colors = SEASON_TREE_COLORS[currentSeason] || SEASON_TREE_COLORS.spring;
      for (const canopyGroup of treeCanopies) {
        canopyGroup.children.forEach((mesh, i) => {
          mesh.material.color.set(colors[i] || colors[0]);
        });
      }
      // Seasonal prop visibility
      fallLeaves.visible = currentSeason === 'fall';
      winterSnow.visible = currentSeason === 'winter';
      winterSmoke.visible = currentSeason === 'winter';
      springFlowers.visible = currentSeason === 'spring';
      summerGrit.visible = currentSeason === 'summer';
      summerHeatHaze.visible = currentSeason === 'summer';
      seasonalProps.visible = currentSeason !== 'winter';

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
      const shrubColors = shrubPalettes[currentSeason] || shrubPalettes.spring;
      hedgePlants.forEach((shrub, index) => {
        shrub.material.color.setHex(shrubColors[index % shrubColors.length]);
      });
      const flowerColors = flowerPalettes[currentSeason] || flowerPalettes.spring;
      accentFlowers.forEach((flower, index) => {
        flower.material.color.setHex(flowerColors[index % flowerColors.length]);
      });

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

    updateSummerGrit(time, strength = 1) {
      if (!summerHeatHaze.visible) return;
      heatHazePlanes.forEach((pane, index) => {
        const wave = Math.sin(time * (0.55 + index * 0.12) + index * 1.7);
        pane.material.opacity = Math.max(0.006, pane.userData.baseOpacity + wave * 0.006);
        pane.scale.x = (pane.userData.baseScaleX ??= pane.scale.x) * (1 + wave * 0.035 * strength);
        pane.position.y = 0.018 + Math.sin(time * 0.42 + index) * 0.003;
      });
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

    getDebugState() {
      return {
        season: currentSeason,
        placeCueCount: placeCueIds.size,
        placeCues: [...placeCueIds].sort(),
        layers: {
          springFlowers: getLayerState(springFlowers),
          fallLeaves: getLayerState(fallLeaves),
          winterSnow: getLayerState(winterSnow),
          winterSmoke: getLayerState(winterSmoke),
          seasonalProps: getLayerState(seasonalProps),
          summerGrit: getLayerState(summerGrit),
          summerHeatHaze: {
            ...getLayerState(summerHeatHaze),
            verticalPanelCount: heatHazePlanes.filter((pane) => (
              pane.userData?.heatHazeStyle !== 'ground-shimmer'
              || Math.abs(Math.abs(pane.rotation.x) - Math.PI / 2) > 0.1
            )).length,
          },
          planningProps: getLayerState(planningProps),
          narrativeProps: getLayerState(narrativeProps),
          fireflies: getLayerState(fireflies),
          puddles: getLayerState(puddles),
        },
      };
    },

    showFireflies(visible) {
      fireflies.visible = visible;
    },

    showPuddles(visible) {
      puddles.visible = visible;
    },
  };
}
