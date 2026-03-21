/**
 * Garden Scene — Three.js setup following curling sim renderer3d.js pattern.
 * Returns { resize, sync, render, dispose, raycastCell, onHover }
 */
import * as THREE from 'three';
import { buildBed } from './bed-model.js';
import { buildScenery } from './scenery.js';
import { createWeatherFX } from './weather-fx.js';
import { createCameraController } from './camera-controller.js';
import { COLS, ROWS } from '../game/state.js';
import { getCropById } from '../data/crops.js';

const SEASON_LIGHTING = {
  spring: { sky: 0xb8c8d8, ground: 0x4a3820, sunAngle: 45, sunInt: 1.2, ambInt: 0.5 },
  summer: { sky: 0xf0e8d8, ground: 0x6a5030, sunAngle: 72, sunInt: 1.8, ambInt: 0.7 },
  fall:   { sky: 0xd4a060, ground: 0x3a2810, sunAngle: 30, sunInt: 1.0, ambInt: 0.4 },
  winter: { sky: 0x606878, ground: 0x181218, sunAngle: 20, sunInt: 0.5, ambInt: 0.3 },
};

const CROP_COLORS = {
  climbers: 0x2d8a4e,
  fast_cycles: 0x6dbf6d,
  greens: 0x3a7a4f,
  roots: 0xc47a3a,
  herbs: 0x7ab85e,
  fruiting: 0xd44a2a,
  brassicas: 0x4a8a6a,
  companions: 0xe8c84a,
};

const CAMERA_PRESETS = {
  overview: { position: [0.5, 7, -5.5], target: [0, 0, 0.5], fov: 45 },
  'bed-low-angle': { position: [0, 2.8, -3.6], target: [0, 0.15, 0.5], fov: 58 },
  'row-close': { position: [2.2, 3.2, -1.6], target: [1.5, 0.1, 0.6], fov: 54 },
  'event-push': { position: [0, 4.6, -3.9], target: [0, 0.12, 0.5], fov: 42 },
  'harvest-hero': { position: [0, 5.7, -2.9], target: [0, 0.1, 0.4], fov: 38 },
  'front-access': { position: [0, 4.8, -6.8], target: [0, 0.1, 0.9], fov: 48 },
};

const MOOD_PRESETS = {
  dawn: { fogColor: 0xffd59e, fogDensity: 0.018, ambientIntensity: 0.62, ambientColor: 0xffe8c0, fillIntensity: 0.34, skyTint: 0xffe4b3 },
  calm: { fogColor: 0x9db3a6, fogDensity: 0.02, ambientIntensity: 0.6, ambientColor: 0xd9efe0, fillIntensity: 0.4, skyTint: 0x9cd0e8 },
  storm: { fogColor: 0x61707a, fogDensity: 0.04, ambientIntensity: 0.32, ambientColor: 0xa3b0ba, fillIntensity: 0.22, skyTint: 0x748ca1 },
  heat: { fogColor: 0xffd68c, fogDensity: 0.024, ambientIntensity: 0.9, ambientColor: 0xffefba, fillIntensity: 0.46, skyTint: 0xf2c67c },
  'harvest-gold': { fogColor: 0xf0c060, fogDensity: 0.018, ambientIntensity: 0.98, ambientColor: 0xffd060, fillIntensity: 0.44, skyTint: 0xf2c96a },
  night: { fogColor: 0x1a2030, fogDensity: 0.05, ambientIntensity: 0.18, ambientColor: 0x6f8ac0, fillIntensity: 0.14, skyTint: 0x384a7a },
  celebration: { fogColor: 0xffefc4, fogDensity: 0.012, ambientIntensity: 1.12, ambientColor: 0xfff2bf, fillIntensity: 0.5, skyTint: 0xffe2a6 },
  loss: { fogColor: 0x606870, fogDensity: 0.03, ambientIntensity: 0.28, ambientColor: 0x8a98a4, fillIntensity: 0.18, skyTint: 0x6c7a84 },
};

const NEUTRAL_MOOD = MOOD_PRESETS.calm;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

// Map emoji to approximate hex color for per-crop tinting
const EMOJI_COLORS = {
  '\u{1F952}': 0x4a9a3e,  // cucumber
  '\u{1F96C}': 0x5aaa55,  // leafy green
  '\u{1F33F}': 0x3d8a4e,  // herb
  '\u{1F331}': 0x5aaa55,  // seedling
  '\u{1F343}': 0x3d8a3d,  // leaf fluttering
  '\u{1FADB}': 0x228833,  // beans
  '\u{1FADB}': 0x228833,  // peas
  '\u{1F330}': 0xcc6644,  // chestnut/radish
  '\u{1F955}': 0xee8833,  // carrot
  '\u{1F9C5}': 0xdda855,  // onion
  '\u{1F9C4}': 0xeeddcc,  // garlic
  '\u{1FAD1}': 0x448844,  // pepper (green)
  '\u{1F345}': 0xdd3322,  // tomato
  '\u{1F346}': 0x663388,  // eggplant
  '\u{1FAB7}': 0x3388aa,  // blueberry/beet
  '\u{1F954}': 0xddbb88,  // potato/turnip
  '\u{1F966}': 0x338844,  // broccoli/kale
  '\u{1F33B}': 0xeecc33,  // sunflower/marigold
  '\u{1F33C}': 0xee9933,  // blossom
  '\u{1F338}': 0xff6688,  // cherry blossom / nasturtium
  '\u{1F490}': 0xcc55aa,  // bouquet / borage
};

function getEmojiColor(emoji, factionColor) {
  // Look up emoji color, fall back to faction color
  for (const [key, color] of Object.entries(EMOJI_COLORS)) {
    if (emoji && emoji.includes(key)) return color;
  }
  return factionColor;
}

export function createGardenScene(container) {
  // WebGL check
  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
  if (!gl) throw new Error('WebGL not available');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);

  // Ground-level fog for ambient occlusion feel
  scene.fog = new THREE.FogExp2(0x7aaa88, 0.035);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  // Better default: slightly more elevated, angled for a pleasant overview
  camera.position.set(0.5, 7, -5.5);
  camera.lookAt(0, 0, 0.5);
  const cameraLookTarget = new THREE.Vector3(0, 0, 0.5);
  let cameraTransition = null;
  let moodTransition = null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  // Root group
  const root = new THREE.Group();
  scene.add(root);

  // Sky gradient — large background sphere with gradient texture
  const skyGeo = new THREE.SphereGeometry(50, 32, 16);
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2;
  skyCanvas.height = 256;
  const skyCtx = skyCanvas.getContext('2d');
  const grad = skyCtx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#4a7aaa');   // zenith — deeper blue
  grad.addColorStop(0.4, '#87CEEB'); // mid sky
  grad.addColorStop(0.7, '#c8dde8'); // near horizon — pale
  grad.addColorStop(1.0, '#e8ddc8'); // horizon — warm haze
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, 2, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.minFilter = THREE.LinearFilter;
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  // Build the garden bed
  const bed = buildBed();
  root.add(bed.group);
  for (const mesh of bed.cellMeshes) {
    mesh.userData._baseColor = mesh.material.color.clone();
  }

  // Ground plane — grass-like, slightly darker near the bed via vertex colors
  const groundGeo = new THREE.PlaneGeometry(40, 40, 40, 40);
  const groundColors = [];
  const posAttr = groundGeo.getAttribute('position');
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getY(i); // in the geometry, Y becomes Z after rotation
    const dist = Math.sqrt(x * x + z * z);
    // Darken near center (bed area)
    const t = Math.min(dist / 6, 1);
    const r = 0.22 + t * 0.10;
    const g = 0.36 + t * 0.08;
    const b = 0.16 + t * 0.06;
    groundColors.push(r, g, b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(groundColors, 3));

  const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshStandardMaterial({ color: 0x4a6b3a, roughness: 0.95, vertexColors: true })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  root.add(ground);

  // Background scenery (fence, trees, path, props)
  const scenery = buildScenery();
  root.add(scenery.group);

  // Weather effects (rain, frost, sun rays)
  const weather = createWeatherFX(scene);

  // Lighting
  const hemi = new THREE.HemisphereLight(0xb8c8d8, 0x4a3820, 0.5);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
  sun.position.set(3, 8, -2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 30;
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x8899bb, 0.4);
  fill.position.set(-4, 5, 4);
  scene.add(fill);

  // Camera controller
  const camCtrl = createCameraController(camera, renderer.domElement);

  // Raycaster for cell picking + hover
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // Hover state
  let hoveredCellIndex = -1;
  const HOVER_COLOR = new THREE.Color(0x6a5a30);
  const TARGET_COLOR = new THREE.Color(0x3d6e8f);
  let targetableCellIndices = new Set();

  function applyCellVisualState(index) {
    const mesh = bed.cellMeshes[index];
    if (!mesh) return;

    if (hoveredCellIndex === index) {
      mesh.material.color.copy(HOVER_COLOR);
      mesh.material.emissive?.setHex(0x000000);
      mesh.material.emissiveIntensity = 0;
      return;
    }

    mesh.material.color.copy(mesh.userData._baseColor);
    if (targetableCellIndices.has(index)) {
      mesh.material.emissive?.copy(TARGET_COLOR);
      mesh.material.emissiveIntensity = 0.35;
    } else {
      mesh.material.emissive?.setHex(0x000000);
      mesh.material.emissiveIntensity = 0;
    }
  }

  // Cell highlight on hover
  renderer.domElement.addEventListener('pointermove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(bed.cellMeshes);

    const rawIndex = hits.length > 0 ? hits[0].object.userData.cellIndex : -1;
    const newIndex = targetableCellIndices.size > 0 && !targetableCellIndices.has(rawIndex) ? -1 : rawIndex;
    if (newIndex !== hoveredCellIndex) {
      if (hoveredCellIndex >= 0 && hoveredCellIndex < bed.cellMeshes.length) {
        applyCellVisualState(hoveredCellIndex);
      }
      hoveredCellIndex = newIndex;
      if (newIndex >= 0 && newIndex < bed.cellMeshes.length) {
        applyCellVisualState(newIndex);
      }
    }
  });

  renderer.domElement.addEventListener('pointerleave', () => {
    if (hoveredCellIndex >= 0 && hoveredCellIndex < bed.cellMeshes.length) {
      const lastHovered = hoveredCellIndex;
      hoveredCellIndex = -1;
      applyCellVisualState(lastHovered);
    }
  });

  // Crop mesh cache
  const cropMeshes = new Map();

  // -- Distinct crop mesh builders per faction --

  function buildClimberMesh(crop, cropColor) {
    // Tall cylinder stems reaching up with leaf planes
    const group = new THREE.Group();
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a3a20, roughness: 0.9 });

    // Main stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.55, 6), stemMat);
    stem.position.y = 0.275;
    stem.castShadow = true;
    group.add(stem);

    // Leaf planes at different heights
    const leafMat = new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const leafGeo = new THREE.PlaneGeometry(0.12, 0.08);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(0.04 * (i % 2 === 0 ? 1 : -1), 0.2 + i * 0.12, 0.02);
      leaf.rotation.y = (i * Math.PI) / 3;
      leaf.rotation.z = 0.3 * (i % 2 === 0 ? 1 : -1);
      leaf.castShadow = true;
      group.add(leaf);
    }

    // Top cluster
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 4),
      new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.75 })
    );
    top.position.y = 0.52;
    top.castShadow = true;
    group.add(top);

    return group;
  }

  function buildFastCycleMesh(crop, cropColor) {
    // Flat rosettes — multiple overlapping discs
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.7, side: THREE.DoubleSide });

    for (let i = 0; i < 4; i++) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.08 - i * 0.01, 8), mat);
      disc.rotation.x = -Math.PI / 2 + (i * 0.15 - 0.2);
      disc.rotation.z = (i * Math.PI) / 2;
      disc.position.set(
        Math.cos(i * 1.6) * 0.03,
        0.03 + i * 0.012,
        Math.sin(i * 1.6) * 0.03
      );
      disc.castShadow = true;
      group.add(disc);
    }

    return group;
  }

  function buildGreensMesh(crop, cropColor) {
    // Bushy sphere clusters low to ground
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.75 });

    // Central bush
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat);
    center.position.y = 0.07;
    center.scale.set(1, 0.6, 1);
    center.castShadow = true;
    group.add(center);

    // Side clusters
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const cluster = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), mat);
      cluster.position.set(Math.cos(angle) * 0.06, 0.05, Math.sin(angle) * 0.06);
      cluster.scale.set(1, 0.55, 1);
      cluster.castShadow = true;
      group.add(cluster);
    }

    return group;
  }

  function buildRootsMesh(crop, cropColor) {
    // Small leaf fan poking up (carrot tops)
    const group = new THREE.Group();
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3e, roughness: 0.7, side: THREE.DoubleSide });

    // Several thin leaf blades fanning out
    for (let i = 0; i < 5; i++) {
      const leafGeo = new THREE.PlaneGeometry(0.03, 0.14);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      const angle = ((i - 2) * Math.PI) / 8;
      leaf.position.set(Math.sin(angle) * 0.02, 0.08, Math.cos(angle) * 0.02);
      leaf.rotation.z = angle * 0.6;
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      group.add(leaf);
    }

    // Tiny colored root crown at soil level
    const crownMat = new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.8 });
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), crownMat);
    crown.position.y = 0.01;
    crown.scale.set(1, 0.5, 1);
    group.add(crown);

    return group;
  }

  function buildHerbsMesh(crop, cropColor) {
    // Thin stems with small clustered spheres on top
    const group = new THREE.Group();
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5a7a3e, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.7 });

    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const x = Math.cos(angle) * 0.03;
      const z = Math.sin(angle) * 0.03;
      const height = 0.15 + i * 0.04;

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, height, 5), stemMat);
      stem.position.set(x, height / 2, z);
      stem.castShadow = true;
      group.add(stem);

      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 4), leafMat);
      ball.position.set(x, height + 0.02, z);
      ball.castShadow = true;
      group.add(ball);
    }

    return group;
  }

  function buildFruitingMesh(crop, cropColor) {
    // Wider bush with small colored fruit spheres
    const group = new THREE.Group();

    // Bush body
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x3a7a3a, roughness: 0.75 });
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), bushMat);
    bush.position.y = 0.1;
    bush.scale.set(1.2, 0.8, 1.2);
    bush.castShadow = true;
    group.add(bush);

    // Fruit spheres — use emoji color for the fruit
    const fruitColor = cropColor;
    const fruitMat = new THREE.MeshStandardMaterial({ color: fruitColor, roughness: 0.5, metalness: 0.1 });
    const fruitPositions = [
      [0.06, 0.14, 0.05],
      [-0.05, 0.12, -0.06],
      [0.02, 0.16, -0.04],
    ];
    for (const pos of fruitPositions) {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), fruitMat);
      fruit.position.set(...pos);
      fruit.castShadow = true;
      group.add(fruit);
    }

    return group;
  }

  function buildBrassicaMesh(crop, cropColor) {
    // Dense head on short stem
    const group = new THREE.Group();

    // Short thick stem
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5a8a5a, roughness: 0.85 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.06, 6), stemMat);
    stem.position.y = 0.03;
    group.add(stem);

    // Dense head
    const headMat = new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), headMat);
    head.position.y = 0.1;
    head.scale.set(1, 0.75, 1);
    head.castShadow = true;
    group.add(head);

    // Outer leaves
    const leafMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cropColor).offsetHSL(0, -0.1, 0.05),
      roughness: 0.7,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI * 2) / 4;
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.06, 6), leafMat);
      leaf.position.set(Math.cos(angle) * 0.08, 0.05, Math.sin(angle) * 0.08);
      leaf.rotation.x = -0.8;
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      group.add(leaf);
    }

    return group;
  }

  function buildCompanionMesh(crop, cropColor) {
    // Short stem with colored flower petals
    const group = new THREE.Group();

    // Stem
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.85 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.1, 5), stemMat);
    stem.position.y = 0.05;
    stem.castShadow = true;
    group.add(stem);

    // Flower petals
    const petalMat = new THREE.MeshStandardMaterial({
      color: cropColor,
      roughness: 0.5,
      emissive: cropColor,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const petal = new THREE.Mesh(new THREE.CircleGeometry(0.03, 5), petalMat);
      petal.position.set(Math.cos(angle) * 0.035, 0.12, Math.sin(angle) * 0.035);
      petal.rotation.x = -0.5;
      petal.rotation.y = angle;
      petal.castShadow = true;
      group.add(petal);
    }

    // Center
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xaa7722, roughness: 0.6 });
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), centerMat);
    center.position.y = 0.12;
    center.castShadow = true;
    group.add(center);

    // Low leaves
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3e, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + 0.3;
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.04, 5), leafMat);
      leaf.position.set(Math.cos(a) * 0.04, 0.03, Math.sin(a) * 0.04);
      leaf.rotation.x = -Math.PI / 3;
      leaf.rotation.y = a;
      group.add(leaf);
    }

    return group;
  }

  function buildCropMesh(cropId) {
    const crop = getCropById(cropId);
    if (!crop) return null;

    const factionColor = CROP_COLORS[crop.faction] || 0x4a8a4a;
    const cropColor = getEmojiColor(crop.emoji, factionColor);

    switch (crop.faction) {
      case 'climbers':   return buildClimberMesh(crop, cropColor);
      case 'fast_cycles': return buildFastCycleMesh(crop, cropColor);
      case 'greens':     return buildGreensMesh(crop, cropColor);
      case 'roots':      return buildRootsMesh(crop, cropColor);
      case 'herbs':      return buildHerbsMesh(crop, cropColor);
      case 'fruiting':   return buildFruitingMesh(crop, cropColor);
      case 'brassicas':  return buildBrassicaMesh(crop, cropColor);
      case 'companions': return buildCompanionMesh(crop, cropColor);
      default: {
        // Fallback: simple sphere
        const g = new THREE.Group();
        const s = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 8, 6),
          new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.75 })
        );
        s.position.y = 0.08;
        s.castShadow = true;
        g.add(s);
        return g;
      }
    }
  }

  function getGrowthScale(phase) {
    if (phase === 'MID_SEASON') return 0.7;
    if (phase === 'LATE_SEASON' || phase === 'HARVEST' || phase === 'REVIEW' || phase === 'TRANSITION') {
      return 1.0;
    }
    return 0.4;
  }

  function syncCrops(grid, phase) {
    const activeIds = new Set();
    const growthScale = getGrowthScale(phase);

    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i];
      const key = `cell-${i}`;

      if (!cell.cropId) {
        if (cropMeshes.has(key)) {
          root.remove(cropMeshes.get(key));
          cropMeshes.delete(key);
        }
        continue;
      }

      activeIds.add(key);

      if (cropMeshes.has(key)) {
        const existing = cropMeshes.get(key);
        if (existing.userData.cropId === cell.cropId) {
          existing.scale.setScalar(growthScale);
          continue;
        }
        root.remove(existing);
        cropMeshes.delete(key);
      }

      const mesh = buildCropMesh(cell.cropId);
      if (!mesh) continue;

      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const cellSize = bed.cellSize;
      const x = (col - (COLS - 1) / 2) * cellSize;
      const z = (row - (ROWS - 1) / 2) * cellSize;
      mesh.position.set(x, bed.soilY, z);
      mesh.scale.setScalar(growthScale);
      mesh.userData.cropId = cell.cropId;
      mesh.userData.cellIndex = i;
      root.add(mesh);
      cropMeshes.set(key, mesh);
    }

    // Remove stale meshes
    for (const [key, mesh] of cropMeshes) {
      if (!activeIds.has(key) && key.startsWith('cell-')) {
        root.remove(mesh);
        cropMeshes.delete(key);
      }
    }
  }

  function applySeason(season) {
    const config = SEASON_LIGHTING[season] || SEASON_LIGHTING.spring;
    scene.background.set(config.sky);
    hemi.color.set(config.sky);
    hemi.groundColor.set(config.ground);
    hemi.intensity = config.ambInt;
    sun.intensity = config.sunInt;
    const angle = (config.sunAngle * Math.PI) / 180;
    sun.position.set(3 * Math.cos(angle), 8 * Math.sin(angle), -2);

    // Update tree foliage colors
    scenery.updateSeason(season);
  }

  let lastSeason = null;

  function setCameraPreset(name, opts = {}) {
    const preset = CAMERA_PRESETS[name];
    if (!preset) return;

    cameraTransition = {
      startedAt: performance.now(),
      duration: opts.duration ?? 800,
      fromPosition: camera.position.clone(),
      fromTarget: cameraLookTarget.clone(),
      fromFov: camera.fov,
      toPosition: new THREE.Vector3(...preset.position),
      toTarget: new THREE.Vector3(...preset.target),
      toFov: preset.fov,
    };
  }

  function applyMood(name, opts = {}) {
    const preset = MOOD_PRESETS[name];
    if (!preset) return;

    moodTransition = {
      startedAt: performance.now(),
      duration: opts.duration ?? 1200,
      fromFogColor: scene.fog.color.clone(),
      fromFogDensity: scene.fog.density,
      fromAmbientIntensity: hemi.intensity,
      fromAmbientColor: hemi.color.clone(),
      fromFillIntensity: fill.intensity,
      fromSkyTint: skyMat.color.clone(),
      toFogColor: new THREE.Color(preset.fogColor),
      toFogDensity: preset.fogDensity,
      toAmbientIntensity: preset.ambientIntensity,
      toAmbientColor: new THREE.Color(preset.ambientColor),
      toFillIntensity: preset.fillIntensity,
      toSkyTint: new THREE.Color(preset.skyTint),
    };
  }

  function resetMood() {
    applyMood('calm', { duration: 600 });
  }

  function pulseEventFocus(cellIndex) {
    flashCell(cellIndex, 0xe8c84a, 650);
  }

  function updateTransitions(now) {
    if (cameraTransition) {
      const t = Math.min((now - cameraTransition.startedAt) / cameraTransition.duration, 1);
      const eased = easeInOutCubic(t);
      camera.position.lerpVectors(cameraTransition.fromPosition, cameraTransition.toPosition, eased);
      cameraLookTarget.lerpVectors(cameraTransition.fromTarget, cameraTransition.toTarget, eased);
      camera.fov = cameraTransition.fromFov + (cameraTransition.toFov - cameraTransition.fromFov) * eased;
      camera.updateProjectionMatrix();
      camera.lookAt(cameraLookTarget);
      if (t >= 1) {
        cameraTransition = null;
      }
    }

    if (moodTransition) {
      const t = Math.min((now - moodTransition.startedAt) / moodTransition.duration, 1);
      const eased = easeInOutCubic(t);
      scene.fog.color.lerpColors(moodTransition.fromFogColor, moodTransition.toFogColor, eased);
      scene.fog.density = moodTransition.fromFogDensity + (moodTransition.toFogDensity - moodTransition.fromFogDensity) * eased;
      hemi.intensity = moodTransition.fromAmbientIntensity + (moodTransition.toAmbientIntensity - moodTransition.fromAmbientIntensity) * eased;
      hemi.color.lerpColors(moodTransition.fromAmbientColor, moodTransition.toAmbientColor, eased);
      fill.intensity = moodTransition.fromFillIntensity + (moodTransition.toFillIntensity - moodTransition.fromFillIntensity) * eased;
      skyMat.color.lerpColors(moodTransition.fromSkyTint, moodTransition.toSkyTint, eased);
      if (t >= 1) {
        moodTransition = null;
      }
    }
  }

  function raycastCell(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(bed.cellMeshes);
    if (hits.length > 0) return hits[0].object.userData.cellIndex;
    return -1;
  }

  // Temporarily highlight a cell (e.g. after crop placement)
  function flashCell(cellIndex, color, durationMs) {
    if (cellIndex < 0 || cellIndex >= bed.cellMeshes.length) return;
    const mesh = bed.cellMeshes[cellIndex];
    mesh.material.color.set(color);
    setTimeout(() => {
      applyCellVisualState(cellIndex);
    }, durationMs || 400);
  }

  function setTargetableCells(cellIndices = []) {
    targetableCellIndices = new Set(cellIndices);
    for (let i = 0; i < bed.cellMeshes.length; i++) {
      applyCellVisualState(i);
    }
  }

  function clearTargeting() {
    targetableCellIndices.clear();
    hoveredCellIndex = -1;
    for (let i = 0; i < bed.cellMeshes.length; i++) {
      applyCellVisualState(i);
    }
  }

  return {
    resize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    sync(state) {
      syncCrops(state.season.grid, state.season.phase);
      applySeason(state.season.season);

      // Trigger ambient weather on season change
      if (state.season.season !== lastSeason) {
        lastSeason = state.season.season;
        weather.triggerForEvent(null, state.season.season);
      }

      weather.update(0.016);
      camCtrl.update();
      updateTransitions(performance.now());
    },
    render() {
      renderer.render(scene, camera);
    },
    raycastCell,
    flashCell,
    setTargetableCells,
    clearTargeting,
    setCameraPreset,
    applyMood,
    resetMood,
    pulseEventFocus,
    weather,
    dispose() {
      renderer.dispose();
    },
  };
}
