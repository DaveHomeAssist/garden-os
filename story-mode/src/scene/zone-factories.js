/**
 * Zone Scene Factories — creates minimal Three.js environments per world zone.
 * Each factory returns { scene, camera, dispose(), update(dt), setSpawnPoint(), getPlayerPosition() }.
 * Registered with ZoneManager via registerZone().
 */
import * as THREE from 'three';

const GROUND_SIZE = 12;

function createBaseZone(zoneId, options = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 4, 8);
  camera.lookAt(0, 0, 0);

  // Sky
  scene.background = new THREE.Color(options.skyColor ?? 0x87ceeb);
  scene.fog = new THREE.FogExp2(options.fogColor ?? 0xc8dde4, options.fogDensity ?? 0.03);

  // Lighting
  const ambient = new THREE.HemisphereLight(options.skyColor ?? 0x87ceeb, options.groundColor ?? 0x5a4a30, 0.7);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
  sun.position.set(-3, 6, 4);
  sun.castShadow = true;
  scene.add(sun);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
  const groundMat = new THREE.MeshStandardMaterial({
    color: options.groundColor ?? 0x5a7a40,
    roughness: 0.9,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Player position tracking
  let playerPos = { x: 0, y: 0, z: 0 };
  let spawnPoint = options.defaultSpawn ?? { x: 0, z: 3 };

  // NPC markers
  const npcMarkers = new THREE.Group();
  npcMarkers.name = 'npc-markers';
  scene.add(npcMarkers);

  // Foraging spot markers
  const forageMarkers = new THREE.Group();
  forageMarkers.name = 'forage-markers';
  scene.add(forageMarkers);

  (options.forageSpots ?? []).forEach((spot) => {
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 0.08, 8),
      new THREE.MeshStandardMaterial({ color: 0x8ba870, emissive: 0x2a4020, emissiveIntensity: 0.3 }),
    );
    marker.position.set(spot.position.x, 0.04, spot.position.z);
    marker.userData = { spotId: spot.id, type: spot.type };
    forageMarkers.add(marker);
  });

  // Props group for zone-specific geometry
  const props = new THREE.Group();
  props.name = 'zone-props';
  scene.add(props);

  return {
    scene,
    camera,
    props,
    npcMarkers,
    forageMarkers,

    setSpawnPoint(point) {
      if (point) {
        spawnPoint = { x: point.x ?? 0, z: point.z ?? 3 };
      }
      playerPos = { x: spawnPoint.x, y: 0, z: spawnPoint.z };
    },

    getPlayerPosition() {
      return { ...playerPos };
    },

    setPlayerPosition(pos) {
      playerPos = { x: pos.x ?? 0, y: pos.y ?? 0, z: pos.z ?? 0 };
    },

    update(dt) {
      // Override in zone-specific factories for animations
    },

    dispose() {
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    },
  };
}

function addTree(group, x, z, canopyColor = 0x3a8a35) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4226 }),
  );
  trunk.position.set(x, 0.4, z);
  trunk.castShadow = true;
  group.add(trunk);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 6),
    new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.8 }),
  );
  canopy.position.set(x, 1.1, z);
  canopy.castShadow = true;
  group.add(canopy);
}

function addRock(group, x, z, scale = 1) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.2 * scale, 0),
    new THREE.MeshStandardMaterial({ color: 0x8a8a7a, roughness: 1 }),
  );
  rock.position.set(x, 0.1 * scale, z);
  rock.castShadow = true;
  group.add(rock);
}

// ── Zone: Neighborhood ──────────────────────────────────────────────────
export function createNeighborhood() {
  const zone = createBaseZone('neighborhood', {
    skyColor: 0xa8c8e0,
    groundColor: 0x6a8a50,
    fogDensity: 0.025,
    defaultSpawn: { x: 0, z: 4 },
  });

  // Sidewalk path
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, GROUND_SIZE),
    new THREE.MeshStandardMaterial({ color: 0xb0a898, roughness: 0.95 }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.005;
  zone.props.add(path);

  // Neighboring houses (simple boxes)
  for (let i = -2; i <= 2; i++) {
    const house = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1, 0.8),
      new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xc8b8a0 : 0xa8b8c8 }),
    );
    house.position.set(3 * (i % 2 === 0 ? 1 : -1), 0.5, i * 2.2);
    house.castShadow = true;
    zone.props.add(house);
  }

  // Street trees
  addTree(zone.props, -2.5, -3);
  addTree(zone.props, 2.5, 1);
  addTree(zone.props, -2.5, 3);

  return zone;
}

// ── Zone: Meadow ────────────────────────────────────────────────────────
export function createMeadow() {
  const zone = createBaseZone('meadow', {
    skyColor: 0xb0d8f0,
    groundColor: 0x6a9a48,
    fogDensity: 0.02,
    defaultSpawn: { x: 0, z: 4 },
    forageSpots: [
      { id: 'meadow_herbs', position: { x: -2.2, z: 1.1 }, type: 'herb_patch' },
      { id: 'meadow_rocks', position: { x: 1.8, z: -1.2 }, type: 'rock_pile' },
      { id: 'meadow_flowers', position: { x: 2.7, z: 2.4 }, type: 'wildflower_field' },
    ],
  });

  // Wildflower patches
  for (let i = 0; i < 40; i++) {
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 4, 3),
      new THREE.MeshStandardMaterial({
        color: [0xe8c84a, 0xd44a6a, 0x9a6ad4, 0xff8844][i % 4],
        emissive: 0x222200,
        emissiveIntensity: 0.1,
      }),
    );
    const angle = i * 2.4;
    const radius = 1.5 + (i % 5) * 0.8;
    flower.position.set(Math.cos(angle) * radius, 0.06, Math.sin(angle) * radius);
    zone.props.add(flower);
  }

  // Scattered rocks
  addRock(zone.props, 1.8, -1.2, 1.2);
  addRock(zone.props, 2.1, -0.8, 0.7);
  addRock(zone.props, -3, 2, 0.9);

  return zone;
}

// ── Zone: Riverside ─────────────────────────────────────────────────────
export function createRiverside() {
  const zone = createBaseZone('riverside', {
    skyColor: 0x90b8d8,
    groundColor: 0x4a6a38,
    fogDensity: 0.022,
    defaultSpawn: { x: 0, z: 4 },
    forageSpots: [
      { id: 'riverside_berries', position: { x: -1.4, z: 2.6 }, type: 'berry_bush' },
      { id: 'riverside_driftwood', position: { x: 2.9, z: -0.7 }, type: 'driftwood' },
    ],
  });

  // River (blue strip)
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(2, GROUND_SIZE + 2),
    new THREE.MeshStandardMaterial({
      color: 0x4488aa,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8,
    }),
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(-3.5, 0.01, 0);
  zone.props.add(river);

  // River bank
  const bank = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, GROUND_SIZE + 2),
    new THREE.MeshStandardMaterial({ color: 0x7a6a4a, roughness: 1 }),
  );
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(-2.2, 0.008, 0);
  zone.props.add(bank);

  // Riverside trees
  addTree(zone.props, -1.5, -3, 0x4a9a45);
  addTree(zone.props, 2, 3, 0x3a8a35);
  addTree(zone.props, 3.5, -1, 0x5aaa55);

  // Driftwood log
  const log = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.06, 1.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x7a6a50 }),
  );
  log.rotation.z = Math.PI / 2;
  log.position.set(2.9, 0.06, -0.7);
  zone.props.add(log);

  let riverOffset = 0;
  const baseUpdate = zone.update;
  zone.update = (dt) => {
    baseUpdate(dt);
    riverOffset += dt * 0.3;
    river.position.z = Math.sin(riverOffset) * 0.05;
  };

  return zone;
}

// ── Zone: Forest Edge ───────────────────────────────────────────────────
export function createForestEdge() {
  const zone = createBaseZone('forest_edge', {
    skyColor: 0x7a9a6a,
    groundColor: 0x3a5428,
    fogColor: 0x5a7a5a,
    fogDensity: 0.04,
    defaultSpawn: { x: 0, z: 4 },
    forageSpots: [
      { id: 'forest_herbs', position: { x: -2.8, z: 0.9 }, type: 'herb_patch' },
      { id: 'forest_berries', position: { x: 1.9, z: 1.7 }, type: 'berry_bush' },
      { id: 'forest_mushrooms', position: { x: 0.4, z: -2.1 }, type: 'mushroom_log' },
    ],
  });

  // Dense tree canopy
  const treePositions = [
    [-4, -4], [-3, -2], [-4.5, 0], [-3.5, 2], [-4, 4],
    [4, -3], [3.5, -1], [4.5, 1], [3, 3], [4, 5],
    [-2, -4.5], [0, -4], [2, -4.5],
  ];
  for (const [x, z] of treePositions) {
    addTree(zone.props, x, z, 0x2d6a22);
  }

  // Mushroom log
  const log = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.1, 1.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x5a4a30 }),
  );
  log.rotation.z = Math.PI / 2;
  log.rotation.y = 0.3;
  log.position.set(0.4, 0.1, -2.1);
  zone.props.add(log);

  // Small mushrooms on the log
  for (let i = 0; i < 5; i++) {
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.06, 6),
      new THREE.MeshStandardMaterial({ color: 0xc8a070, emissive: 0x4a3820, emissiveIntensity: 0.2 }),
    );
    cap.position.set(0.2 + i * 0.2, 0.22, -2.1 + (i % 2) * 0.1);
    zone.props.add(cap);
  }

  // Rocks and undergrowth
  addRock(zone.props, -1.5, 0.5, 0.8);
  addRock(zone.props, 2.5, -2, 1.1);

  return zone;
}

// ── Zone: Greenhouse ────────────────────────────────────────────────────
export function createGreenhouse() {
  const zone = createBaseZone('greenhouse', {
    skyColor: 0xe0e8d0,
    groundColor: 0x6a7a5a,
    fogDensity: 0.015,
    defaultSpawn: { x: 0, z: 3 },
  });

  // Glass walls (transparent boxes)
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xd0e8f0,
    transparent: true,
    opacity: 0.25,
    roughness: 0.1,
    metalness: 0.3,
  });

  // Side walls
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.5, 8), glassMat);
    wall.position.set(side * 3.5, 1.25, 0);
    zone.props.add(wall);
  }

  // Back wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(7, 2.5, 0.05), glassMat);
  backWall.position.set(0, 1.25, -4);
  zone.props.add(backWall);

  // Roof (angled glass)
  const roof = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 8.5),
    glassMat.clone(),
  );
  roof.rotation.x = -Math.PI / 2 + 0.15;
  roof.position.set(0, 2.6, 0);
  zone.props.add(roof);

  // Planting tables
  for (let i = -1; i <= 1; i++) {
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x8a7060 }),
    );
    table.position.set(i * 2.2, 0.3, -0.5);
    table.castShadow = true;
    zone.props.add(table);
  }

  // Potted exotic plants
  for (let i = 0; i < 6; i++) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.18, 8),
      new THREE.MeshStandardMaterial({ color: 0xb06030 }),
    );
    pot.position.set(-2.2 + (i % 3) * 2.2, 0.7, -1 + Math.floor(i / 3) * 1.5);
    zone.props.add(pot);

    const plant = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 6, 4),
      new THREE.MeshStandardMaterial({ color: [0x4aaa55, 0x8acc4a, 0x3a9a6a][i % 3] }),
    );
    plant.position.set(pot.position.x, 0.88, pot.position.z);
    zone.props.add(plant);
  }

  return zone;
}

// ── Zone: Festival Grounds ──────────────────────────────────────────────
export function createFestivalGrounds() {
  const zone = createBaseZone('festival_grounds', {
    skyColor: 0xf0e6cf,
    groundColor: 0x8a7a5a,
    fogDensity: 0.018,
    defaultSpawn: { x: 0, z: 5 },
  });

  // Central gathering area (circular platform)
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: 0xc8b898 }),
  );
  platform.position.set(0, 0.05, 0);
  zone.props.add(platform);

  // Stall frames around the perimeter
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * 4;
    const z = Math.sin(angle) * 4;

    // Stall post
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.8, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x6b4226 }),
    );
    post.position.set(x, 0.9, z);
    zone.props.add(post);

    // Stall canopy
    const canopy = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      new THREE.MeshStandardMaterial({
        color: [0xe8c84a, 0xd44a2a, 0x4a8a6a, 0x9a6ad4, 0xff8844, 0x6dbf6d][i],
        side: THREE.DoubleSide,
      }),
    );
    canopy.rotation.x = -Math.PI / 2;
    canopy.position.set(x, 1.85, z);
    zone.props.add(canopy);
  }

  // String lights (between stalls)
  const lightsGroup = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 4, 3),
      new THREE.MeshStandardMaterial({
        color: 0xfff0c0,
        emissive: 0xffe080,
        emissiveIntensity: 0.6,
      }),
    );
    bulb.position.set(Math.cos(angle) * 3, 1.6, Math.sin(angle) * 3);
    lightsGroup.add(bulb);
  }
  zone.props.add(lightsGroup);

  // Decorative trees
  addTree(zone.props, -5, -3, 0x5aaa55);
  addTree(zone.props, 5, 2, 0x4a9a45);

  return zone;
}

// ── Zone: Market Square ─────────────────────────────────────────────────
export function createMarketSquare() {
  const zone = createBaseZone('market_square', {
    skyColor: 0xc8d8e4,
    groundColor: 0x9a8a6a,
    fogDensity: 0.02,
    defaultSpawn: { x: 0, z: 4 },
  });

  // Cobblestone ground (darker patches)
  const cobbles = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 1 }),
  );
  cobbles.rotation.x = -Math.PI / 2;
  cobbles.position.y = 0.003;
  zone.props.add(cobbles);

  // Market stalls in rows
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const table = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.5, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x8a7060 }),
      );
      table.position.set(-2 + col * 2, 0.25, -2 + row * 3);
      table.castShadow = true;
      zone.props.add(table);

      // Awning
      const awning = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.8),
        new THREE.MeshStandardMaterial({
          color: [0xc84a4a, 0x4a8ac8, 0x4ac84a, 0xc8a04a, 0x8a4ac8, 0xc86a2a][(row * 3 + col) % 6],
          side: THREE.DoubleSide,
        }),
      );
      awning.rotation.x = -Math.PI / 4;
      awning.position.set(table.position.x, 1.1, table.position.z - 0.3);
      zone.props.add(awning);
    }
  }

  // Central fountain
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.7, 0.4, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a9aa0 }),
  );
  fountain.position.set(0, 0.2, 0.5);
  zone.props.add(fountain);

  return zone;
}

/**
 * Register all zone factories with a ZoneManager instance.
 */
export function registerAllZones(zoneManager) {
  zoneManager.registerZone('neighborhood', createNeighborhood);
  zoneManager.registerZone('meadow', createMeadow);
  zoneManager.registerZone('riverside', createRiverside);
  zoneManager.registerZone('forest_edge', createForestEdge);
  zoneManager.registerZone('greenhouse', createGreenhouse);
  zoneManager.registerZone('festival_grounds', createFestivalGrounds);
  zoneManager.registerZone('market_square', createMarketSquare);

  // Zone exits (zone → zone connections)
  const exitWidth = 2;
  const exitDepth = 0.5;
  const edgeZ = GROUND_SIZE / 2;
  const edgeX = GROUND_SIZE / 2;

  // player_plot ↔ neighborhood
  zoneManager.addZoneExit('player_plot',
    { minX: -exitWidth / 2, maxX: exitWidth / 2, minZ: edgeZ - exitDepth, maxZ: edgeZ },
    'neighborhood', { x: 0, z: -edgeZ + 1 },
  );
  zoneManager.addZoneExit('neighborhood',
    { minX: -exitWidth / 2, maxX: exitWidth / 2, minZ: -edgeZ, maxZ: -edgeZ + exitDepth },
    'player_plot', { x: 0, z: edgeZ - 1 },
  );

  // neighborhood ↔ meadow
  zoneManager.addZoneExit('neighborhood',
    { minX: edgeX - exitDepth, maxX: edgeX, minZ: -exitWidth / 2, maxZ: exitWidth / 2 },
    'meadow', { x: -edgeX + 1, z: 0 },
  );
  zoneManager.addZoneExit('meadow',
    { minX: -edgeX, maxX: -edgeX + exitDepth, minZ: -exitWidth / 2, maxZ: exitWidth / 2 },
    'neighborhood', { x: edgeX - 1, z: 0 },
  );

  // neighborhood ↔ riverside
  zoneManager.addZoneExit('neighborhood',
    { minX: -exitWidth / 2, maxX: exitWidth / 2, minZ: edgeZ - exitDepth, maxZ: edgeZ },
    'riverside', { x: 0, z: -edgeZ + 1 },
  );
  zoneManager.addZoneExit('riverside',
    { minX: -exitWidth / 2, maxX: exitWidth / 2, minZ: -edgeZ, maxZ: -edgeZ + exitDepth },
    'neighborhood', { x: 0, z: edgeZ - 1 },
  );

  // meadow ↔ forest_edge
  zoneManager.addZoneExit('meadow',
    { minX: -exitWidth / 2, maxX: exitWidth / 2, minZ: -edgeZ, maxZ: -edgeZ + exitDepth },
    'forest_edge', { x: 0, z: edgeZ - 1 },
  );
  zoneManager.addZoneExit('forest_edge',
    { minX: -exitWidth / 2, maxX: exitWidth / 2, minZ: edgeZ - exitDepth, maxZ: edgeZ },
    'meadow', { x: 0, z: -edgeZ + 1 },
  );

  // neighborhood ↔ festival_grounds
  zoneManager.addZoneExit('neighborhood',
    { minX: -edgeX, maxX: -edgeX + exitDepth, minZ: -exitWidth / 2, maxZ: exitWidth / 2 },
    'festival_grounds', { x: edgeX - 1, z: 0 },
  );
  zoneManager.addZoneExit('festival_grounds',
    { minX: edgeX - exitDepth, maxX: edgeX, minZ: -exitWidth / 2, maxZ: exitWidth / 2 },
    'neighborhood', { x: -edgeX + 1, z: 0 },
  );

  // neighborhood ↔ market_square
  zoneManager.addZoneExit('neighborhood',
    { minX: edgeX - exitDepth, maxX: edgeX, minZ: 1, maxZ: 1 + exitWidth },
    'market_square', { x: -edgeX + 1, z: 0 },
  );
  zoneManager.addZoneExit('market_square',
    { minX: -edgeX, maxX: -edgeX + exitDepth, minZ: -exitWidth / 2, maxZ: exitWidth / 2 },
    'neighborhood', { x: edgeX - 1, z: 0 },
  );
}
