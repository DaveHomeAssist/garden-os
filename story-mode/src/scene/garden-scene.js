/**
 * Garden Scene — Three.js setup following curling sim renderer3d.js pattern.
 * Returns { resize, sync, render, dispose, raycastCell }
 */
import * as THREE from 'three';
import { buildBed } from './bed-model.js';
import { buildScenery } from './scenery.js';
import { applySceneStyle, getStyleForPhase } from './scene-style.js';
import { createWeatherFX, DayNightCycle } from './weather-fx.js';
import { createCameraController } from './camera-controller.js';
import { createPlayerCharacter } from './player-character.js';
import { ResourceTracker } from './resource-tracker.js';
import { loadSprites, getMissingAssets, getGrowthTexture, GROWTH_STAGE } from './sprite-loader.js';
import { COLS, ROWS } from '../game/state.js';
import { getCropById } from '../data/crops.js';

const SEASON_LIGHTING = {
  spring: { sky: 0xc8d9e4, ground: 0x56462d, sunAngle: 52, sunInt: 1.45, ambInt: 0.7, fillInt: 0.48, fogDensity: 0.021, sunX: -2.7, sunZ: 4.8, fillX: 3.8, fillZ: -2.1 },
  summer: { sky: 0xf0e6cf, ground: 0x6a5233, sunAngle: 68, sunInt: 1.72, ambInt: 0.82, fillInt: 0.52, fogDensity: 0.018, sunX: -1.8, sunZ: 4.4, fillX: 4.2, fillZ: -2.4 },
  fall:   { sky: 0xd8b17a, ground: 0x4a3116, sunAngle: 38, sunInt: 1.16, ambInt: 0.56, fillInt: 0.4, fogDensity: 0.024, sunX: -3.4, sunZ: 4.6, fillX: 3.6, fillZ: -1.8 },
  winter: { sky: 0x7e8ea0, ground: 0x231f26, sunAngle: 28, sunInt: 0.78, ambInt: 0.42, fillInt: 0.3, fogDensity: 0.028, sunX: -4.0, sunZ: 3.3, fillX: 2.8, fillZ: -1.6 },
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
  'chapter-intro': { position: [0, 3.55, 5.95], target: [0, 0.54, -0.06], fov: 35 },
  overview: { position: [0, 2.95, 4.9], target: [0, 0.46, -0.12], fov: 31 },
  'bed-low-angle': { position: [0, 2.0, 3.65], target: [0, 0.4, -0.18], fov: 36 },
  'row-close': { position: [0.9, 1.92, 3.28], target: [0.45, 0.37, -0.17], fov: 36 },
  'event-push': { position: [0, 2.4, 4.0], target: [0, 0.42, -0.16], fov: 34 },
  'harvest-hero': { position: [0, 2.72, 3.88], target: [0, 0.46, -0.05], fov: 32 },
  'front-access': { position: [0, 2.72, 5.2], target: [0, 0.44, -0.18], fov: 35 },
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
const DAMAGE_VISUALS = {
  storm: { soil: 0x7a6a4f, emissive: 0x3d4c58, emissiveIntensity: 0.18, tilt: 0.16, tint: 0x6a7f8f },
  flood: { soil: 0x5b4f35, emissive: 0x2f5670, emissiveIntensity: 0.22, tilt: 0.08, tint: 0x5b87a4 },
  frost: { soil: 0x7b7567, emissive: 0xbad4e8, emissiveIntensity: 0.18, tilt: 0.05, tint: 0xb9d4df },
  heat: { soil: 0x6a4a26, emissive: 0x8b4f22, emissiveIntensity: 0.14, tilt: 0.12, tint: 0xa97845 },
  pest: { soil: 0x5d4d2a, emissive: 0x6a7a33, emissiveIntensity: 0.16, tilt: 0.2, tint: 0x72823a },
  blight: { soil: 0x564739, emissive: 0x5d4735, emissiveIntensity: 0.2, tilt: 0.22, tint: 0x6d553a },
  impact: { soil: 0x674d35, emissive: 0x5d4735, emissiveIntensity: 0.14, tilt: 0.14, tint: 0x8a6a48 },
};
const DORMANT_SOIL_TINT = new THREE.Color(0xc0c6cf);
const DORMANT_CROP_TINT = new THREE.Color(0xb8c1ca);
const DORMANT_CROP_EMISSIVE = 0x8798aa;

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

function createGrassTexture(repeatX = 1, repeatY = 1) {
  return makeCanvasTexture(192, (ctx, size) => {
    ctx.fillStyle = '#496b34';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1500; i++) {
      const x = (i * 37) % size;
      const y = (i * 73) % size;
      const h = 4 + (i % 5);
      ctx.strokeStyle = i % 7 === 0 ? 'rgba(190, 170, 96, 0.16)' : 'rgba(92, 140, 72, 0.22)';
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + ((i % 3) - 1) * 2, y);
      ctx.stroke();
    }
    for (let i = 0; i < 320; i++) {
      const x = (i * 53) % size;
      const y = (i * 97) % size;
      ctx.fillStyle = 'rgba(58, 92, 43, 0.16)';
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }, repeatX, repeatY);
}

function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function varyColor(colorHex, hueShift = 0, saturationShift = 0, lightnessShift = 0) {
  return new THREE.Color(colorHex).offsetHSL(hueShift, saturationShift, lightnessShift);
}

function createLeafGeometry(width, height, {
  segmentsX = 6,
  segmentsY = 10,
  bend = 0.04,
  cup = 0.02,
  taper = 0.58,
} = {}) {
  const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
  const position = geometry.getAttribute('position');
  const halfWidth = width / 2 || 1;

  for (let i = 0; i < position.count; i++) {
    const originalX = position.getX(i);
    const originalY = position.getY(i);
    const xNorm = originalX / halfWidth;
    const yNorm = (originalY + height / 2) / height;
    const edge = Math.abs(xNorm);
    const taperedX = originalX * Math.max(0.12, 1 - yNorm * taper);
    const midrib = Math.max(0, 1 - edge * 0.9);
    const curl = Math.sin(yNorm * Math.PI) * bend * midrib;
    const cupping = Math.sin(edge * Math.PI * 0.5) * cup * (0.2 + yNorm * 0.8);
    const twist = Math.sin((xNorm * 1.3 + yNorm * 1.1) * Math.PI) * bend * 0.14;
    position.setX(i, taperedX);
    position.setZ(i, curl + cupping + twist);
  }

  geometry.translate(0, height / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function registerBreezeNode(mesh, {
  rotX = 0,
  rotY = 0,
  rotZ = 0.08,
  lift = 0,
  speed = 1.3,
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
  return mesh;
}

function createLeafMesh(colorHex, options = {}) {
  const leaf = new THREE.Mesh(
    createLeafGeometry(options.width ?? 0.08, options.height ?? 0.14, options),
    new THREE.MeshStandardMaterial({
      color: options.color ?? colorHex,
      roughness: options.roughness ?? 0.72,
      side: THREE.DoubleSide,
    }),
  );
  leaf.castShadow = true;
  return leaf;
}

function setCropSway(group, {
  tilt = 0.03,
  yaw = 0.02,
  lift = 0.006,
  speed = 1.2,
  phase = 0,
} = {}) {
  group.userData.sway = { tilt, yaw, lift, speed, phase };
  return group;
}

function addGroundShadow(group, {
  radiusX = 0.11,
  radiusZ = 0.09,
  opacity = 0.14,
  y = 0.005,
} = {}) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 18),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = y;
  shadow.scale.set(radiusX / 0.12, radiusZ / 0.12, 1);
  shadow.renderOrder = 2;
  group.add(shadow);
  return shadow;
}

function getCellAnchor(cellIndex, role = 'crop') {
  const roleSeed = role === 'crop' ? 1.7 : 4.3;
  return {
    xOffset: (seededRandom(cellIndex * 17.3 + roleSeed) - 0.5) * (role === 'crop' ? 0.085 : 0.04),
    zOffset: (seededRandom(cellIndex * 23.9 + roleSeed) - 0.5) * (role === 'crop' ? 0.09 : 0.04),
    rotationY: (seededRandom(cellIndex * 31.7 + roleSeed) - 0.5) * (role === 'crop' ? 0.7 : 0.35),
    scale: role === 'crop' ? 0.92 + seededRandom(cellIndex * 11.1 + roleSeed) * 0.16 : 1,
  };
}

function addLeafRosette(group, {
  count = 6,
  radiusX = 0.08,
  radiusZ = 0.08,
  height = 0.02,
  leafWidth = 0.08,
  leafHeight = 0.16,
  color,
  roughness = 0.72,
  tilt = -0.95,
  bend = 0.04,
  cup = 0.02,
  yawOffset = 0,
  liftJitter = 0.015,
  phaseOffset = 0,
} = {}) {
  for (let i = 0; i < count; i++) {
    const angle = yawOffset + (i / count) * Math.PI * 2;
    const leaf = createLeafMesh(color, {
      width: leafWidth * (0.92 + (i % 3) * 0.06),
      height: leafHeight * (0.92 + ((i + 1) % 2) * 0.08),
      roughness,
      bend,
      cup,
    });
    leaf.position.set(
      Math.cos(angle) * radiusX,
      height + Math.sin(i * 1.7) * liftJitter,
      Math.sin(angle) * radiusZ,
    );
    leaf.rotation.x = tilt;
    leaf.rotation.y = angle + Math.PI / 2;
    leaf.rotation.z = Math.sin(i * 2.1) * 0.18;
    registerBreezeNode(leaf, {
      rotX: 0.03,
      rotY: 0.04,
      rotZ: 0.13,
      lift: 0.004,
      speed: 1.3 + (i % 3) * 0.14,
      phase: phaseOffset + i * 0.72,
    });
    group.add(leaf);
  }
}

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

export function disposeGardenScene({ container, renderer, scene, weather, dayNight, cameraController, resourceTracker, cropMeshes, supportMeshes, accentMeshes }) {
  resourceTracker?.trackObject(scene);
  weather?.dispose?.();
  dayNight?.dispose?.();
  cameraController?.dispose?.();
  cropMeshes?.clear();
  supportMeshes?.clear();
  accentMeshes?.clear();
  scene?.clear?.();
  resourceTracker?.disposeAll();
  renderer?.dispose();
  renderer?.domElement?.remove?.();
}

export function createGardenScene(container) {
  // WebGL check
  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
  if (!gl) throw new Error('WebGL not available');

  const scene = new THREE.Scene();
  const resourceTracker = new ResourceTracker();
  scene.background = new THREE.Color(0x87CEEB);

  // Ground-level fog — neutral until mood lighting overrides on first sync
  scene.fog = new THREE.FogExp2(0xb0c8d0, 0.022);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  // Start from the front/access side looking back toward the house wall.
  camera.position.set(0, 2.95, 4.9);
  camera.lookAt(0, 0.46, -0.12);
  const cameraLookTarget = new THREE.Vector3(0, 0.46, -0.12);
  let cameraTransition = null;
  let moodTransition = null;
  let currentScenePhase = 'PLANNING';
  let currentSceneStyle = getStyleForPhase(currentScenePhase);
  let lightingState = null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  // Root group
  const root = new THREE.Group();
  scene.add(root);

  // Sky gradient — large background sphere with gradient texture
  const skyGeo = new THREE.SphereGeometry(50, 64, 32);
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 8;
  skyCanvas.height = 256;
  const skyCtx = skyCanvas.getContext('2d');
  const grad = skyCtx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#6a9fd4');   // zenith — soft blue
  grad.addColorStop(0.35, '#a8d8f0'); // upper sky
  grad.addColorStop(0.6, '#d4e8f2');  // mid sky — light
  grad.addColorStop(0.8, '#e8eeef');  // near horizon — bright haze
  grad.addColorStop(1.0, '#f2e8d4');  // horizon — warm glow
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, 8, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.minFilter = THREE.LinearFilter;
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  // Build the garden bed
  const bed = buildBed(resourceTracker);
  root.add(bed.group);
  for (const mesh of bed.cellMeshes) {
    mesh.userData._baseColor = mesh.material.color.clone();
  }

  // Ground plane — grass-like, slightly darker near the bed via vertex colors
  const groundGeo = new THREE.PlaneGeometry(40, 40, 64, 64);
  const groundColors = [];
  const posAttr = groundGeo.getAttribute('position');
  const grassTexture = createGrassTexture(5.5, 5.5);
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getY(i); // in the geometry, Y becomes Z after rotation
    const dist = Math.sqrt(x * x + z * z);
    const centerFade = Math.min(dist / 5.5, 1);
    const swell = Math.sin(x * 0.52) * Math.cos(z * 0.58) * 0.04;
    const ripple = Math.sin((x + z) * 0.34) * 0.025;
    const roll = Math.cos(x * 0.28 + 1.2) * Math.sin(z * 0.22) * 0.02;
    posAttr.setZ(i, (swell + ripple + roll) * (0.15 + centerFade * 0.85));
    // Darken near center (bed area)
    const t = Math.min(dist / 6, 1);
    const r = 0.22 + t * 0.10;
    const g = 0.36 + t * 0.08;
    const b = 0.16 + t * 0.06;
    groundColors.push(r, g, b);
  }
  posAttr.needsUpdate = true;
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(groundColors, 3));
  groundGeo.computeVertexNormals();

  const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshStandardMaterial({ color: 0x4a6b3a, roughness: 0.95, vertexColors: true, map: grassTexture, bumpMap: grassTexture, bumpScale: 0.012 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  root.add(ground);

  // ── Grass blade sprites ──────────────────────────────────────────────
  const grassGroup = new THREE.Group();
  grassGroup.name = 'grass-sprites';
  {
    // Procedural grass tuft texture (canvas-generated)
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 32;
    grassCanvas.height = 64;
    const gCtx = grassCanvas.getContext('2d');
    gCtx.clearRect(0, 0, 32, 64);
    const bladeColors = ['#4a7a3a', '#3d6a2e', '#5a8a48', '#3a5e28', '#6a9a52'];
    for (let b = 0; b < 5; b++) {
      const bx = 8 + b * 3.2 + (b % 2) * 1.5;
      const lean = (b - 2) * 2.5;
      gCtx.strokeStyle = bladeColors[b];
      gCtx.lineWidth = 1.8 + (b % 2) * 0.6;
      gCtx.lineCap = 'round';
      gCtx.beginPath();
      gCtx.moveTo(bx, 62);
      gCtx.quadraticCurveTo(bx + lean * 0.4, 36, bx + lean, 4 + b * 3);
      gCtx.stroke();
    }
    const grassTuftTex = new THREE.CanvasTexture(grassCanvas);
    grassTuftTex.magFilter = THREE.LinearFilter;
    grassTuftTex.minFilter = THREE.LinearMipmapLinearFilter;
    grassTuftTex.generateMipmaps = true;
    grassTuftTex.colorSpace = THREE.SRGBColorSpace;

    const tuftGeo = new THREE.PlaneGeometry(0.12, 0.18);
    const tuftMat = new THREE.MeshStandardMaterial({
      map: grassTuftTex,
      alphaTest: 0.3,
      transparent: false,
      side: THREE.DoubleSide,
      roughness: 0.9,
      depthWrite: true,
    });

    // Deterministic scatter — avoid bed area and path
    const GRASS_COUNT = 220;
    const SEED = 7919;
    for (let i = 0; i < GRASS_COUNT; i++) {
      const hash = ((i + 1) * SEED) % 10007;
      const nx = ((hash % 997) / 997) * 2 - 1;
      const nz = ((hash % 991) / 991) * 2 - 1;
      const gx = nx * 8;
      const gz = nz * 6 + 1.5;

      // Skip the raised bed area
      if (Math.abs(gx) < 2.2 && gz > -1.2 && gz < 1.4) continue;
      // Skip path area (front of bed)
      if (gz > 2.5 && Math.abs(gx) < 1.8) continue;
      // Skip house wall area
      if (gz < -2.5) continue;

      const dist = Math.sqrt(gx * gx + (gz - 1) * (gz - 1));
      if (dist > 9) continue;

      const scale = 0.7 + ((hash % 13) / 13) * 0.6;
      const rotY = ((hash % 31) / 31) * Math.PI;
      const tint = 0.85 + ((hash % 17) / 17) * 0.3;

      const tuft = new THREE.Mesh(tuftGeo, tuftMat.clone());
      tuft.material.color = new THREE.Color(tint * 0.3, tint * 0.45, tint * 0.22);
      tuft.scale.set(scale, scale, scale);
      tuft.position.set(gx, 0.07 * scale, gz);
      tuft.rotation.y = rotY;
      grassGroup.add(tuft);

      // Cross-plane for volume (second plane at 90 degrees)
      if (i % 2 === 0) {
        const cross = new THREE.Mesh(tuftGeo, tuft.material);
        cross.scale.copy(tuft.scale);
        cross.position.copy(tuft.position);
        cross.rotation.y = rotY + Math.PI / 2;
        grassGroup.add(cross);
      }
    }

    resourceTracker.trackObject(grassGroup);
  }
  root.add(grassGroup);

  // Background scenery (fence, trees, path, props)
  const scenery = buildScenery(resourceTracker);
  root.add(scenery.group);

  // Load sprite textures (async, non-blocking — accents appear once loaded)
  loadSprites().then(() => {
    const missing = getMissingAssets();
    if (missing.length > 0) {
      const toast = document.getElementById('toast-container');
      if (toast) {
        const el = document.createElement('div');
        el.className = 'toast-notification toast--info';
        el.textContent = `${missing.length} sprite${missing.length === 1 ? '' : 's'} unavailable \u2014 some visuals may be simplified`;
        toast.appendChild(el);
        requestAnimationFrame(() => el.classList.add('is-visible'));
        setTimeout(() => { el.classList.remove('is-visible'); setTimeout(() => el.remove(), 300); }, 4000);
      }
    }
  }).catch(() => {});

  // ── Creature meshes ──────────────────────────────────────────────────────
  // Cat silhouette on fence
  const catGroup = new THREE.Group();
  const catDarkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85 });

  const catBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.08, 5, 10), catDarkMat);
  catBody.rotation.z = Math.PI / 2;
  catBody.scale.set(1, 0.9, 0.82);
  catBody.position.set(0, 0, 0);
  catGroup.add(catBody);

  const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), catDarkMat);
  catHead.position.set(0.07, 0.028, 0);
  catGroup.add(catHead);

  // Ears — two small cones
  for (const ex of [-0.012, 0.012]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.026, 6), catDarkMat);
    ear.position.set(0.07 + ex, 0.075, 0);
    catGroup.add(ear);
  }

  // Tail — thin cylinder angled upward
  const catTail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.1, 8), catDarkMat);
  catTail.rotation.z = -0.7;
  catTail.position.set(-0.09, 0.04, 0);
  catGroup.add(catTail);

  catGroup.position.set(5.0, 0.5, 0.5);
  catGroup.visible = false;
  root.add(catGroup);

  // Neighbor arm reaching over fence
  const neighborGroup = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.8 });
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 }); // compost-brown bag

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 10), skinMat);
  arm.rotation.z = Math.PI / 4; // angled, reaching over the fence
  arm.position.set(0, 0, 0);
  neighborGroup.add(arm);

  // Hand / compost bag at the end of the arm
  const handBag = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), bagMat);
  handBag.scale.set(1.12, 0.84, 0.92);
  handBag.position.set(0.2, -0.2, 0);
  neighborGroup.add(handBag);
  const handBagNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.024, 0.035, 8), bagMat);
  handBagNeck.rotation.z = -0.5;
  handBagNeck.position.set(0.17, -0.17, 0);
  neighborGroup.add(handBagNeck);

  neighborGroup.position.set(4.8, 0.8, -0.2);
  neighborGroup.visible = false;
  root.add(neighborGroup);

  // Sheepdog opening-scene runner
  const sheepdogGroup = new THREE.Group();
  sheepdogGroup.visible = false;

  const dogFurDark = new THREE.MeshStandardMaterial({ color: 0x3c3129, roughness: 0.95 });
  const dogFurLight = new THREE.MeshStandardMaterial({ color: 0xe6dfd4, roughness: 0.96 });
  const dogNoseMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.72 });
  const dogEyeMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.6 });
  const dogShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });

  const dogShadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 18), dogShadowMat);
  dogShadow.rotation.x = -Math.PI / 2;
  dogShadow.position.y = 0.012;
  sheepdogGroup.add(dogShadow);

  const dogTorso = new THREE.Group();
  dogTorso.position.y = 0.34;
  sheepdogGroup.add(dogTorso);

  const dogBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.28, 8, 16), dogFurLight);
  dogBody.rotation.z = Math.PI / 2;
  dogBody.scale.set(1, 0.9, 0.78);
  dogBody.castShadow = true;
  dogTorso.add(dogBody);

  const dogSaddle = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.14, 6, 12), dogFurDark);
  dogSaddle.rotation.z = Math.PI / 2;
  dogSaddle.scale.set(1.02, 0.88, 0.8);
  dogSaddle.position.set(-0.04, 0.05, 0);
  dogSaddle.castShadow = true;
  dogTorso.add(dogSaddle);

  const dogRump = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), dogFurDark);
  dogRump.position.set(-0.22, -0.01, 0);
  dogRump.scale.set(1.1, 1.0, 0.95);
  dogRump.castShadow = true;
  dogTorso.add(dogRump);

  const dogChest = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), dogFurLight);
  dogChest.position.set(0.21, -0.02, 0);
  dogChest.scale.set(0.95, 1.05, 0.95);
  dogChest.castShadow = true;
  dogTorso.add(dogChest);

  for (const [x, y, z, sx, sy, sz, mat] of [
    [-0.04, 0.12, -0.09, 0.12, 0.1, 0.1, dogFurDark],
    [0.06, 0.13, 0.09, 0.13, 0.11, 0.1, dogFurDark],
    [0.18, 0.12, -0.08, 0.1, 0.09, 0.08, dogFurLight],
  ]) {
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat);
    tuft.position.set(x, y, z);
    tuft.scale.set(sx, sy, sz);
    tuft.castShadow = true;
    dogTorso.add(tuft);
  }

  const dogHeadPivot = new THREE.Group();
  dogHeadPivot.position.set(0.3, 0.08, 0);
  dogTorso.add(dogHeadPivot);

  const dogNeck = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.08, 5, 10), dogFurLight);
  dogNeck.position.set(-0.005, -0.01, 0);
  dogNeck.rotation.z = -0.35;
  dogNeck.scale.set(0.9, 1, 1.15);
  dogNeck.castShadow = true;
  dogHeadPivot.add(dogNeck);

  const dogHead = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.11, 8, 12), dogFurLight);
  dogHead.rotation.z = Math.PI / 2;
  dogHead.scale.set(1.02, 0.9, 0.84);
  dogHead.position.set(0.12, 0.02, 0);
  dogHead.castShadow = true;
  dogHeadPivot.add(dogHead);

  const dogFacePatch = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), dogFurDark);
  dogFacePatch.position.set(0.175, 0.015, 0);
  dogFacePatch.scale.set(0.62, 1.0, 0.92);
  dogFacePatch.castShadow = true;
  dogHeadPivot.add(dogFacePatch);

  const dogMuzzle = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.07, 6, 10), dogFurLight);
  dogMuzzle.rotation.z = Math.PI / 2;
  dogMuzzle.scale.set(1, 0.82, 0.85);
  dogMuzzle.position.set(0.23, -0.03, 0);
  dogMuzzle.castShadow = true;
  dogHeadPivot.add(dogMuzzle);

  const dogNose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), dogNoseMat);
  dogNose.position.set(0.285, -0.02, 0);
  dogNose.scale.set(1, 0.9, 1.2);
  dogHeadPivot.add(dogNose);

  // Tongue — pink, hangs from muzzle during run
  const dogTongueMat = new THREE.MeshStandardMaterial({ color: 0xe88a9a, roughness: 0.65 });
  const dogTongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.022, 4, 8), dogTongueMat);
  dogTongue.position.set(0.25, -0.065, 0.012);
  dogTongue.rotation.z = 0.22;
  dogTongue.rotation.x = Math.PI / 2;
  dogTongue.scale.set(1, 1.25, 0.9);
  dogTongue.visible = false;
  dogHeadPivot.add(dogTongue);

  const dogThoughtBubble = new THREE.Group();
  const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xf3eee5, roughness: 0.92 });
  const bubbleDotMat = new THREE.MeshStandardMaterial({ color: 0x4a4035, roughness: 0.8 });
  for (const [x, y, r] of [[-0.1, 0.08, 0.03], [-0.04, 0.18, 0.045], [0.06, 0.33, 0.11]]) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), bubbleMat);
    puff.position.set(x, y, 0);
    dogThoughtBubble.add(puff);
  }
  for (const dotX of [-0.03, 0.02, 0.07]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), bubbleDotMat);
    dot.position.set(dotX, 0.34, 0.08);
    dogThoughtBubble.add(dot);
  }
  dogThoughtBubble.position.set(0.1, 0.62, 0);
  dogThoughtBubble.visible = false;
  sheepdogGroup.add(dogThoughtBubble);

  for (const eyeZ of [-0.035, 0.035]) {
    const dogEye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), dogEyeMat);
    dogEye.position.set(0.2, 0.035, eyeZ);
    dogHeadPivot.add(dogEye);
  }

  const dogEars = [];
  for (const [ez, rz] of [[-0.05, 0.22], [0.05, -0.22]]) {
    const earPivot = new THREE.Group();
    earPivot.position.set(0.1, 0.1, ez);
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.028, 0.12, 8), dogFurDark);
    ear.position.set(-0.005, -0.06, 0);
    ear.rotation.z = rz;
    ear.scale.set(1, 1, 0.85);
    ear.castShadow = true;
    earPivot.add(ear);
    dogHeadPivot.add(earPivot);
    dogEars.push(earPivot);
  }

  const dogTailPivot = new THREE.Group();
  dogTailPivot.position.set(-0.31, 0.04, 0);
  dogTorso.add(dogTailPivot);

  const dogTail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.008, 0.18, 10), dogFurLight);
  dogTail.position.set(-0.09, 0.02, 0);
  dogTail.rotation.z = -0.99;
  dogTail.castShadow = true;
  dogTailPivot.add(dogTail);

  const dogLegRigs = [];
  for (const { x, z, phase } of [
    { x: 0.18, z: -0.07, phase: 0 },
    { x: -0.12, z: -0.07, phase: Math.PI },
    { x: 0.18, z: 0.07, phase: Math.PI },
    { x: -0.12, z: 0.07, phase: 0 },
  ]) {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(x, -0.08, z);
    dogTorso.add(hipPivot);

    const upperLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.08, 5, 10), dogFurLight);
    upperLeg.position.set(0, -0.08, 0);
    upperLeg.scale.set(1, 1.02, 0.9);
    upperLeg.castShadow = true;
    hipPivot.add(upperLeg);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.16, 0);
    hipPivot.add(kneePivot);

    const lowerLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.075, 5, 10), dogFurDark);
    lowerLeg.position.set(0, -0.07, 0);
    lowerLeg.scale.set(1, 1, 0.88);
    lowerLeg.castShadow = true;
    kneePivot.add(lowerLeg);

    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), dogFurLight);
    paw.position.set(0.015, -0.15, 0);
    paw.scale.set(1.25, 0.55, 1.05);
    paw.castShadow = true;
    kneePivot.add(paw);

    dogLegRigs.push({ hipPivot, kneePivot, phase });
  }

  // Dust puff pool
  const dustPuffs = [];
  const dustMat = new THREE.MeshBasicMaterial({ color: 0xc8b898, transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), dustMat.clone());
    puff.visible = false;
    puff.userData = { age: 0, maxAge: 400, active: false };
    sheepdogGroup.add(puff);
    dustPuffs.push(puff);
  }

  // Dog model faces +X by construction; rotation handled in animation via sheepdogGroup.rotation.y

  sheepdogGroup.scale.setScalar(1.12);
  sheepdogGroup.position.set(-4.15, 0, 2.1);
  root.add(sheepdogGroup);

  const sheepdogRunState = {
    active: false,
    elapsedMs: 0,
    duration: 2600,
    fadeOutMs: 0,
    start: new THREE.Vector3(-4.15, 0, 2.1),
    end: new THREE.Vector3(4.7, 0, 1.88),
    arcHeight: 0.1,
    sway: 0.14,
  };
  const sheepdogHoldState = {
    active: false,
    remainingMs: 0,
    position: new THREE.Vector3(0.15, 0, 0.34),
  };

  function resetSheepdogVisuals() {
    dogTongue.visible = false;
    dogThoughtBubble.visible = false;
    dogShadow.scale.setScalar(1);
    dogShadow.material.opacity = 0.22;
    dustPuffs.forEach((puff) => {
      puff.userData.active = false;
      puff.visible = false;
      puff.userData.age = 0;
    });
    sheepdogGroup.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      child.material.transparent = false;
      child.material.opacity = 1;
    });
  }

  // Collect trellis wire refs after bed group is already added to root
  const trellisWires = [];
  bed.group.traverse((child) => {
    if (child.isMesh && child.name === 'trellis-wire') {
      trellisWires.push({ mesh: child, baseX: child.position.x });
    }
  });
  // ── End creature meshes ──────────────────────────────────────────────────

  // Weather effects (rain, frost, sun rays)
  const weather = createWeatherFX(scene, resourceTracker);

  // Lighting
  const hemi = new THREE.HemisphereLight(0xc7d8df, 0x56462d, 0.7);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4de, 1.45);
  sun.position.set(-2.7, 8, 4.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 30;
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x8ea8bc, 0.48);
  fill.position.set(3.8, 4.4, -2.1);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xd7e6f5, 0.18);
  rim.position.set(-4.4, 3.1, -4.7);
  scene.add(rim);
  scene.userData.lightingRig = { hemi, sun, fill, rim, skyMat };
  scene.userData.weatherFx = weather;
  scene.userData.scenery = scenery;
  const dayNight = new DayNightCycle(scene, { enabled: false });

  function applyCurrentSceneStyle(opts = {}) {
    if (!lightingState && !opts.force) return;
    applySceneStyle(currentSceneStyle, {
      renderer,
      scene,
      skyMat,
      hemi,
      sun,
      fill,
      rim,
      lightingState,
      materialTargets: [root],
    });
    applyBedPresentation(currentSceneStyle);
  }

  function setSceneStyle(styleName, opts = {}) {
    if (!opts.force && styleName === currentSceneStyle) return;
    currentSceneStyle = styleName;
    applyCurrentSceneStyle({ force: true });
  }

  function setScenePhase(phase, opts = {}) {
    currentScenePhase = phase;
    setSceneStyle(getStyleForPhase(phase), opts);
  }


  // ── Seasonal atmosphere elements ─────────────────────────────────────────

  // 1. Fallen leaves (fall) — scattered on front gravel area
  const fallLeaves = new THREE.Group();
  {
    const leafColors = [0xc96b2a, 0x8b4513, 0xa0522d];
    const leafPositions = [
      [-1.8, 2.6], [-0.6, 1.5], [0.4, 2.8], [1.2, 1.8], [-0.2, 3.1],
      [0.9, 2.2], [-1.2, 3.3], [1.8, 1.4], [-0.8, 2.0], [0.2, 1.6],
      [-1.5, 1.9], [0.7, 3.0], [-0.4, 1.3], [1.4, 2.7], [-1.0, 2.4],
      [0.5, 1.1], [-1.9, 3.0], [1.1, 3.2],
    ];
    leafPositions.forEach(([x, z], i) => {
      const r = 0.02 + (i % 3) * 0.007;
      const geo = new THREE.CircleGeometry(r, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: leafColors[i % leafColors.length],
        roughness: 0.9,
        side: THREE.DoubleSide,
      });
      const leaf = new THREE.Mesh(geo, mat);
      leaf.rotation.x = -Math.PI / 2;
      leaf.rotation.z = i * 0.71;
      leaf.position.set(x, 0.008, z);
      fallLeaves.add(leaf);
    });
  }
  fallLeaves.visible = false;
  root.add(fallLeaves);

  // 2. Snow dusting (winter) — thin white patches on frame edges and trellis rails
  const snowDusting = new THREE.Group();
  {
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf0f4ff, roughness: 0.85 });
    const bedWidthSnow = 8 * 0.5;
    const bedDepthSnow = 4 * 0.5;
    const frameHSnow = 0.15;
    const frZSnow  =  bedDepthSnow / 2 + 0.03;
    const bkZSnow  = -(bedDepthSnow / 2 + 0.03);
    const trellisZSnow = -(bedDepthSnow / 2 + 0.06 * 0.15);
    const trellisTopY  = 1.08;

    const snowPatches = [
      { w: bedWidthSnow + 0.12, d: 0.06, x: 0,                         y: frameHSnow + 0.003, z: frZSnow },
      { w: bedWidthSnow + 0.12, d: 0.06, x: 0,                         y: frameHSnow + 0.003, z: bkZSnow },
      { w: 0.06, d: bedDepthSnow,        x: -(bedWidthSnow / 2 + 0.03), y: frameHSnow + 0.003, z: 0      },
      { w: 0.06, d: bedDepthSnow,        x:  (bedWidthSnow / 2 + 0.03), y: frameHSnow + 0.003, z: 0      },
    ];
    snowPatches.forEach(({ w, d, x, y, z }) => {
      for (let k = 0; k < 8; k++) {
        const patch = new THREE.Mesh(
          new THREE.BoxGeometry(w / 8 * (0.6 + (k % 3) * 0.2), 0.005, d * (0.5 + (k % 2) * 0.3)),
          snowMat
        );
        patch.position.set(x + (k - 3.5) * (w / 8), y, z);
        snowDusting.add(patch);
      }
    });
    for (let k = 0; k < 10; k++) {
      const patch = new THREE.Mesh(
        new THREE.BoxGeometry(0.35 + (k % 3) * 0.1, 0.005, 0.03),
        snowMat
      );
      patch.position.set(-1.7 + k * 0.38, trellisTopY + 0.028, trellisZSnow);
      snowDusting.add(patch);
    }
    for (const px of [-1.94, 1.94]) {
      for (let k = 0; k < 6; k++) {
        const patch = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.005, 0.03 + (k % 2) * 0.01),
          snowMat
        );
        patch.position.set(px, 0.15 + k * 0.18, trellisZSnow);
        snowDusting.add(patch);
      }
    }
  }
  snowDusting.visible = false;
  root.add(snowDusting);

  // 3. Puddles (spring) — flat reflective circles on gravel
  const springPuddles = new THREE.Group();
  {
    const puddleBaseMat = new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      roughness: 0.15,
      metalness: 0.25,
      opacity: 0.2,
      transparent: true,
    });
    const puddleData = [
      { r: 0.08, x: -0.9, z: 2.4 },
      { r: 0.06, x:  1.3, z: 1.6 },
      { r: 0.1,  x:  0.3, z: 3.0 },
      { r: 0.07, x: -2.0, z: 0.7 },
    ];
    puddleData.forEach(({ r, x, z }) => {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(r, 16), puddleBaseMat.clone());
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(x, 0.009, z);
      springPuddles.add(puddle);
    });
  }
  springPuddles.visible = false;
  root.add(springPuddles);

  // 4. Bird on trellis — body + head + beak + tail
  const birdGroup = new THREE.Group();
  {
    const birdBodyMat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.85 });
    const birdBeakMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.7 });

    const birdBody = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), birdBodyMat);
    birdBody.scale.set(1.4, 0.8, 1.1);
    birdGroup.add(birdBody);

    const birdHead = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 7), birdBodyMat);
    birdHead.position.set(0.028, 0.018, 0);
    birdGroup.add(birdHead);

    const birdBeak = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.022, 6), birdBeakMat);
    birdBeak.rotation.z = -Math.PI / 2;
    birdBeak.position.set(0.048, 0.016, 0);
    birdGroup.add(birdBeak);

    const birdTail = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.01, 0.028, 6), birdBodyMat);
    birdTail.position.set(-0.034, 0.004, 0);
    birdTail.rotation.z = 1.22;
    birdGroup.add(birdTail);
  }
  // Trellis top rail: y=1.08, trellisZ = -(ROWS*0.5/2 + 0.06*0.15) ≈ -1.009
  birdGroup.position.set(1.24, 1.105, -(4 * 0.5 / 2 + 0.06 * 0.15));
  birdGroup.visible = true;
  root.add(birdGroup);
  let birdVisible = true;
  let birdFlipTimer = 0;

  // 5. String lights — 8 emissive bulbs between porch posts
  const stringLights = new THREE.Group();
  {
    const lightBulbMat = new THREE.MeshStandardMaterial({
      color: 0xffdd88,
      emissive: 0xffdd88,
      emissiveIntensity: 0.6,
      roughness: 0.5,
    });
    // Porch posts: x=-3.38 and x=-1.72, z=-4.1 (from scenery.js)
    const xA = -3.38;
    const xB = -1.72;
    const yLine = 2.5;
    const zLine = -4.08;
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const x = xA + (xB - xA) * t;
      const sag = -0.06 * Math.sin(t * Math.PI);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), lightBulbMat.clone());
      bulb.position.set(x, yLine + sag, zLine);
      stringLights.add(bulb);
    }
  }
  stringLights.visible = false;
  root.add(stringLights);

  // 6. Butterfly particles (summer) — 3 small billboard planes, animated in render loop
  const butterflies = new THREE.Group();
  const butterflyData = [];
  {
    const bfBaseMat = new THREE.MeshStandardMaterial({
      color: 0xf4a460,
      roughness: 0.5,
      side: THREE.DoubleSide,
      emissive: 0xf4a460,
      emissiveIntensity: 0.15,
    });
    const bfConfigs = [
      { x: -0.4, y: 0.55, z:  0.8, phase: 0.0, speed: 1.1 },
      { x:  0.8, y: 0.65, z: -0.3, phase: 1.8, speed: 0.9 },
      { x: -1.0, y: 0.72, z: -0.9, phase: 3.5, speed: 1.3 },
    ];
    bfConfigs.forEach((cfg) => {
      const bf = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.03), bfBaseMat.clone());
      bf.position.set(cfg.x, cfg.y, cfg.z);
      butterflies.add(bf);
      butterflyData.push({ mesh: bf, baseX: cfg.x, baseY: cfg.y, baseZ: cfg.z, phase: cfg.phase, speed: cfg.speed });
    });
  }
  butterflies.visible = false;
  root.add(butterflies);
  resourceTracker.trackObject(root);
  resourceTracker.trackObject(skyMesh);

  const playerCharacter = createPlayerCharacter(resourceTracker);
  root.add(playerCharacter.group);
  const playerFollowHome = new THREE.Vector3(0, 0.46, -0.12);
  const playerFollowScratch = new THREE.Vector3();
  const playerFocusTarget = new THREE.Vector3();
  let playerState = null;

  // Accumulated time for atmosphere animations
  let atmosphereTime = 0;
  let atmosphereLastNow = performance.now();

  // ── End atmosphere elements ───────────────────────────────────────────────

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
  let currentGridState = [];
  let currentSeasonId = 'spring';
  let lastSyncedState = null; // used by render() for event-reactive effects

  let interactionHighlightedCellIndex = -1;
  let interactionHighlightIntensity = 0.3;
  const projectedPositionScratch = new THREE.Vector3();
  const cellWorldPositionScratch = new THREE.Vector3();

  function getCellDisplayColor(index) {
    const mesh = bed.cellMeshes[index];
    if (!mesh) return new THREE.Color(0x3a2a1a);
    const baseColor = mesh.userData._baseColor?.clone() ?? mesh.material.color.clone();
    const cellState = currentGridState[index];
    if (currentSeasonId === 'winter' && cellState?.cropId) {
      baseColor.lerp(DORMANT_SOIL_TINT, 0.72);
    }
    const damageState = cellState?.damageState;
    if (!damageState || !DAMAGE_VISUALS[damageState]) {
      return baseColor;
    }
    return baseColor.lerp(new THREE.Color(DAMAGE_VISUALS[damageState].soil), 0.55);
  }

  function applyCellVisualState(index) {
    const mesh = bed.cellMeshes[index];
    if (!mesh) return;

    if (hoveredCellIndex === index) {
      mesh.material.color.copy(HOVER_COLOR);
      mesh.material.emissive?.setHex(0x000000);
      mesh.material.emissiveIntensity = 0;
      return;
    }

    const cellState = currentGridState[index];
    const damageState = cellState?.damageState;
    const damageVisual = damageState ? DAMAGE_VISUALS[damageState] : null;

    mesh.material.color.copy(getCellDisplayColor(index));
    if (interactionHighlightedCellIndex === index) {
      mesh.material.emissive?.setHex(0xe8c84a);
      mesh.material.emissiveIntensity = interactionHighlightIntensity;
    } else if (targetableCellIndices.has(index)) {
      mesh.material.emissive?.copy(TARGET_COLOR);
      mesh.material.emissiveIntensity = 0.35;
    } else if (damageVisual) {
      mesh.material.emissive?.setHex(damageVisual.emissive);
      mesh.material.emissiveIntensity = damageVisual.emissiveIntensity;
    } else {
      mesh.material.emissive?.setHex(0x000000);
      mesh.material.emissiveIntensity = 0;
    }
  }

  function setHoveredCell(newIndex) {
    if (newIndex === hoveredCellIndex) return;
    if (hoveredCellIndex >= 0 && hoveredCellIndex < bed.cellMeshes.length) {
      applyCellVisualState(hoveredCellIndex);
    }
    hoveredCellIndex = newIndex;
    if (newIndex >= 0 && newIndex < bed.cellMeshes.length) {
      applyCellVisualState(newIndex);
    }
  }

  function updatePointer(pointerPosition) {
    if (!pointerPosition?.inside) {
      setHoveredCell(-1);
      return;
    }

    pointer.x = pointerPosition.x;
    pointer.y = pointerPosition.y;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(bed.cellMeshes);

    const rawIndex = hits.length > 0 ? hits[0].object.userData.cellIndex : -1;
    const newIndex = targetableCellIndices.size > 0 && !targetableCellIndices.has(rawIndex) ? -1 : rawIndex;
    setHoveredCell(newIndex);
  }

  function clearPointerHover() {
    setHoveredCell(-1);
  }

  function setInteractionHighlight(cellIndex, intensity = 0.3) {
    const nextIndex = Number.isInteger(cellIndex) ? cellIndex : -1;
    const previousIndex = interactionHighlightedCellIndex;
    const intensityChanged = Math.abs(interactionHighlightIntensity - intensity) > 0.0001;
    if (previousIndex === nextIndex && !intensityChanged) {
      return;
    }

    interactionHighlightedCellIndex = nextIndex;
    interactionHighlightIntensity = intensity;

    if (previousIndex >= 0 && previousIndex < bed.cellMeshes.length) {
      applyCellVisualState(previousIndex);
    }
    if (nextIndex >= 0 && nextIndex < bed.cellMeshes.length) {
      applyCellVisualState(nextIndex);
    }
  }

  function clearInteractionHighlight() {
    setInteractionHighlight(-1, 0);
  }

  function setPlayerState(nextPlayerState) {
    if (!nextPlayerState) return;
    playerState = nextPlayerState;
    playerCharacter.update(nextPlayerState);
    playerFollowScratch.copy(playerFollowHome).lerp(
      playerCharacter.getFocusTarget(playerFocusTarget),
      0.28,
    );
    camCtrl.setFollowTarget(playerFollowScratch, {
      strength: nextPlayerState.moving ? 0.16 : 0.1,
      enabled: true,
    });
  }

  function setPlayerTool(toolId) {
    playerCharacter.setEquippedTool?.(toolId);
  }

  // Crop mesh cache
  const cropMeshes = new Map();
  const supportMeshes = new Map();
  const accentMeshes = new Map();   // sprite accent billboards per cell

  // ── Sprite accent layer ─────────────────────────────────────────────────────
  // Maps game phase to sprite growth stage index.
  // Planner phases return -1 (no accent).
  function phaseToGrowthStage(phase, season) {
    if (season === 'winter') return GROWTH_STAGE.SEED;
    switch (phase) {
      case 'EARLY_SEASON': case 'TRANSITION': return GROWTH_STAGE.SPROUT;
      case 'MID_SEASON': return GROWTH_STAGE.GROWING;
      case 'LATE_SEASON': return GROWTH_STAGE.GROWING;
      case 'HARVEST': case 'GRADE': case 'CELEBRATION': return GROWTH_STAGE.HARVEST;
      default: return -1; // PLANNING, INSPECT, CUTSCENE — no accent
    }
  }

  // Accent tuning — now alpha-ready growth sheets are available.
  // Full opacity and meaningful scale per stage so sprites read as world objects.
  const ACCENT_OPACITY = [0.22, 0.34, 0.22, 0.12];
  const ACCENT_SCALE = [0.14, 0.18, 0.2, 0.18];
  const ACCENT_LIFT = [0.055, 0.08, 0.105, 0.12];
  const ACCENT_BASE_TINT = new THREE.Color(0xf2ede2);
  const ACCENT_DORMANT_TINT = new THREE.Color(0xb7c3d0);
  const ACCENT_DAMAGED_TINT = new THREE.Color(0xc8b198);

  function applyCropAccentState(sprite, stage, damageState, season) {
    const opacity = ACCENT_OPACITY[stage] ?? 0.7;
    const scale = ACCENT_SCALE[stage] ?? 0.25;
    const lift = ACCENT_LIFT[stage] ?? 0.18;

    sprite.material.opacity = opacity;
    sprite.material.color.copy(ACCENT_BASE_TINT);
    sprite.material.alphaTest = 0.16;
    if (season === 'winter') {
      sprite.material.color.lerp(ACCENT_DORMANT_TINT, 0.5);
      sprite.material.opacity *= 0.82;
    } else if (damageState && DAMAGE_VISUALS[damageState]) {
      const damageBlend = damageState === 'critical' ? 0.6 : 0.35;
      sprite.material.color.lerp(ACCENT_DAMAGED_TINT, damageBlend);
      sprite.material.opacity *= damageState === 'critical' ? 0.72 : 0.86;
    }

    sprite.scale.set(scale, scale, 1);
    sprite.position.y = bed.soilY + lift;
    sprite.renderOrder = 12;
  }

  function syncCropAccents(grid, phase, season) {
    const style = getStyleForPhase(phase);
    const isPlanner = style === 'planner';
    const stage = phaseToGrowthStage(phase, season);
    const activeIds = new Set();

    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i];
      const key = `accent-${i}`;

      // No accent if: planner mode, no crop, or stage is hidden
      if (isPlanner || !cell.cropId || stage < 0) {
        if (accentMeshes.has(key)) {
          resourceTracker.disposeObject(accentMeshes.get(key));
          accentMeshes.delete(key);
        }
        continue;
      }

      const tex = getGrowthTexture(cell.cropId, stage);
      if (!tex) {
        // No sprite for this crop — procedural fallback, skip silently
        if (accentMeshes.has(key)) {
          resourceTracker.disposeObject(accentMeshes.get(key));
          accentMeshes.delete(key);
        }
        continue;
      }

      activeIds.add(key);
      const sig = `${cell.cropId}:${stage}:${cell.damageState ?? 'none'}:${season}`;

      if (accentMeshes.has(key) && accentMeshes.get(key).userData.sig === sig) {
        const spr = accentMeshes.get(key);
        applyCropAccentState(spr, stage, cell.damageState, season);
        continue;
      }

      // Remove stale accent
      if (accentMeshes.has(key)) {
        resourceTracker.disposeObject(accentMeshes.get(key));
        accentMeshes.delete(key);
      }

      // Create billboard sprite
      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: ACCENT_OPACITY[stage] ?? 0.7,
        depthWrite: false,
        depthTest: true,
        sizeAttenuation: true,
        alphaTest: 0.16,
      });
      const sprite = new THREE.Sprite(spriteMat);

      // Position above the procedural crop mesh
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const cellSize = bed.cellSize;
      const x = (col - (COLS - 1) / 2) * cellSize;
      const z = (row - (ROWS - 1) / 2) * cellSize;
      sprite.position.set(x, bed.soilY, z);
      sprite.userData.sig = sig;
      sprite.userData.cellIndex = i;
      applyCropAccentState(sprite, stage, cell.damageState, season);

      resourceTracker.trackObject(sprite);
      root.add(sprite);
      accentMeshes.set(key, sprite);
    }

    // Remove stale accents
    for (const [key, spr] of accentMeshes) {
      if (!activeIds.has(key)) {
        resourceTracker.disposeObject(spr);
        accentMeshes.delete(key);
      }
    }
  }

  // ── Harvest FX particle pool ────────────────────────────────────────────────
  const HARVEST_FX_POOL_SIZE = 48;  // 4 particles × 12 max simultaneous harvests
  const HARVEST_FX_LIFETIME = 1.5;  // seconds
  const harvestParticles = [];
  const harvestFXColors = [0xe8c84a, 0x5aab6b, 0xd44a2a, 0x87CEEB, 0xff9944, 0xcc55aa];
  {
    const particleGeo = new THREE.SphereGeometry(0.012, 8, 6);
    for (let i = 0; i < HARVEST_FX_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: harvestFXColors[i % harvestFXColors.length],
        transparent: true,
        opacity: 1,
      });
      const p = new THREE.Mesh(particleGeo, mat);
      p.visible = false;
      p.userData.active = false;
      p.userData.age = 0;
      p.userData.vx = 0;
      p.userData.vy = 0;
      p.userData.vz = 0;
      root.add(p);
      harvestParticles.push(p);
    }
  }

  function triggerHarvestFX(cellIndex) {
    const row = Math.floor(cellIndex / COLS);
    const col = cellIndex % COLS;
    const cx = (col - (COLS - 1) / 2) * bed.cellSize;
    const cz = (row - (ROWS - 1) / 2) * bed.cellSize;
    const cy = bed.soilY + 0.3;

    // Burst 8 particles from this cell
    let spawned = 0;
    for (const p of harvestParticles) {
      if (spawned >= 8) break;
      if (p.userData.active) continue;
      p.userData.active = true;
      p.userData.age = 0;
      p.position.set(cx, cy, cz);
      // Radial burst with upward bias
      const angle = (spawned / 8) * Math.PI * 2 + Math.sin(cellIndex) * 0.5;
      const speed = 0.6 + (spawned % 3) * 0.2;
      p.userData.vx = Math.cos(angle) * speed * 0.3;
      p.userData.vy = 1.2 + (spawned % 4) * 0.3;
      p.userData.vz = Math.sin(angle) * speed * 0.3;
      p.visible = true;
      p.material.opacity = 1;
      p.scale.setScalar(0.8 + (spawned % 3) * 0.4);
      spawned++;
    }
  }

  function updateHarvestFX(dt) {
    for (const p of harvestParticles) {
      if (!p.userData.active) continue;
      p.userData.age += dt;
      const t = p.userData.age / HARVEST_FX_LIFETIME;
      if (t >= 1) {
        p.userData.active = false;
        p.visible = false;
        continue;
      }
      // Gravity
      p.userData.vy -= 3.2 * dt;
      p.position.x += p.userData.vx * dt;
      p.position.y += p.userData.vy * dt;
      p.position.z += p.userData.vz * dt;
      // Fade out
      p.material.opacity = Math.max(0, 1 - t * t);
      // Spin
      p.rotation.x += dt * 4;
      p.rotation.z += dt * 3;
    }
  }

  // Track which cells have already triggered harvest FX this phase
  let harvestFXTriggered = new Set();
  let lastHarvestPhase = null;

  // -- Distinct crop mesh builders per faction --

  function buildClimberMesh(crop, cropColor) {
    // Tall cylinder stems reaching up with leaf planes
    const group = new THREE.Group();
    setCropSway(group, { tilt: 0.05, yaw: 0.032, lift: 0.012, speed: 1.18, phase: 0.5 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a3a20, roughness: 0.9 });
    const leafColor = varyColor(cropColor, -0.02, 0.06, 0.04);

    // Main stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.55, 8), stemMat);
    stem.position.y = 0.275;
    stem.castShadow = true;
    group.add(stem);

    // Leaf planes at different heights
    for (let i = 0; i < 4; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const leaf = createLeafMesh(leafColor, {
        width: 0.09 + i * 0.008,
        height: 0.15 - i * 0.01,
        roughness: 0.68,
        bend: 0.045,
        cup: 0.024,
      });
      leaf.position.set(0.05 * side, 0.14 + i * 0.1, 0.015 * side);
      leaf.rotation.y = side * 0.55 + i * 0.18;
      leaf.rotation.z = side * (0.28 + i * 0.06);
      registerBreezeNode(leaf, {
        rotX: 0.04,
        rotY: 0.05,
        rotZ: 0.16,
        lift: 0.005,
        speed: 1.55 + i * 0.08,
        phase: i * 0.7,
      });
      group.add(leaf);
    }

    // Top cluster
    addLeafRosette(group, {
      count: 3,
      radiusX: 0.028,
      radiusZ: 0.028,
      height: 0.46,
      leafWidth: 0.07,
      leafHeight: 0.11,
      color: varyColor(cropColor, 0.02, 0.04, 0.08),
      roughness: 0.66,
      tilt: -0.25,
      bend: 0.05,
      cup: 0.022,
      liftJitter: 0.01,
      phaseOffset: 1.2,
    });

    return group;
  }

  function buildFastCycleMesh(crop, cropColor) {
    // Low leafy rosette
    const group = new THREE.Group();
    setCropSway(group, { tilt: 0.035, yaw: 0.03, lift: 0.007, speed: 1.45, phase: 0.2 });
    addLeafRosette(group, {
      count: 7,
      radiusX: 0.075,
      radiusZ: 0.075,
      height: 0.015,
      leafWidth: 0.085,
      leafHeight: 0.14,
      color: varyColor(cropColor, -0.02, 0.03, 0.04),
      tilt: -1.05,
      bend: 0.035,
      cup: 0.018,
      liftJitter: 0.008,
    });
    addLeafRosette(group, {
      count: 4,
      radiusX: 0.04,
      radiusZ: 0.04,
      height: 0.045,
      leafWidth: 0.06,
      leafHeight: 0.11,
      color: varyColor(cropColor, 0.01, 0.04, 0.09),
      tilt: -0.72,
      bend: 0.05,
      cup: 0.018,
      yawOffset: 0.35,
      liftJitter: 0.006,
      phaseOffset: 0.8,
    });
    const bud = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 10, 8),
      new THREE.MeshStandardMaterial({ color: varyColor(cropColor, 0, 0.02, 0.12), roughness: 0.68 }),
    );
    bud.position.y = 0.04;
    bud.scale.set(1, 0.75, 1);
    bud.castShadow = true;
    group.add(bud);

    return group;
  }

  function buildGreensMesh(crop, cropColor) {
    // Broad, layered greens
    const group = new THREE.Group();
    setCropSway(group, { tilt: 0.04, yaw: 0.026, lift: 0.008, speed: 1.34, phase: 1.1 });
    addLeafRosette(group, {
      count: 6,
      radiusX: 0.085,
      radiusZ: 0.085,
      height: 0.018,
      leafWidth: 0.1,
      leafHeight: 0.17,
      color: varyColor(cropColor, -0.03, 0.05, 0.03),
      tilt: -1.08,
      bend: 0.05,
      cup: 0.028,
      liftJitter: 0.012,
    });
    addLeafRosette(group, {
      count: 4,
      radiusX: 0.045,
      radiusZ: 0.045,
      height: 0.05,
      leafWidth: 0.07,
      leafHeight: 0.12,
      color: varyColor(cropColor, 0, 0.03, 0.08),
      tilt: -0.62,
      bend: 0.06,
      cup: 0.022,
      yawOffset: 0.28,
      liftJitter: 0.006,
      phaseOffset: 0.7,
    });
    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 10, 8),
      new THREE.MeshStandardMaterial({ color: varyColor(cropColor, 0.01, 0.02, 0.1), roughness: 0.7 }),
    );
    center.position.y = 0.055;
    center.scale.set(1, 0.75, 1);
    center.castShadow = true;
    group.add(center);

    return group;
  }

  function buildRootsMesh(crop, cropColor) {
    // Small leaf fan poking up (carrot tops)
    const group = new THREE.Group();
    setCropSway(group, { tilt: 0.048, yaw: 0.02, lift: 0.007, speed: 1.52, phase: 0.9 });
    const rootLeafColor = 0x4a8a3e;

    // Several thin leaf blades fanning out
    for (let i = 0; i < 6; i++) {
      const leaf = createLeafMesh(rootLeafColor, {
        width: 0.04,
        height: 0.16,
        roughness: 0.7,
        bend: 0.055,
        cup: 0.01,
      });
      const angle = ((i - 2) * Math.PI) / 8;
      leaf.position.set(Math.sin(angle) * 0.02, 0.08, Math.cos(angle) * 0.02);
      leaf.rotation.x = -0.22;
      leaf.rotation.z = angle * 0.78;
      leaf.rotation.y = angle;
      registerBreezeNode(leaf, {
        rotX: 0.05,
        rotY: 0.02,
        rotZ: 0.18,
        lift: 0.005,
        speed: 1.7 + i * 0.06,
        phase: i * 0.5,
      });
      group.add(leaf);
    }

    // Tiny colored root crown at soil level
    const crownMat = new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.8 });
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), crownMat);
    crown.position.y = 0.01;
    crown.scale.set(1, 0.5, 1);
    group.add(crown);

    return group;
  }

  function buildHerbsMesh(crop, cropColor) {
    // Thin stems with small clustered spheres on top
    const group = new THREE.Group();
    setCropSway(group, { tilt: 0.03, yaw: 0.022, lift: 0.008, speed: 1.6, phase: 0.3 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5a7a3e, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: varyColor(cropColor, -0.01, 0.04, 0.06), roughness: 0.7 });

    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const x = Math.cos(angle) * 0.03;
      const z = Math.sin(angle) * 0.03;
      const height = 0.15 + i * 0.04;

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, height, 8), stemMat);
      stem.position.set(x, height / 2, z);
      stem.castShadow = true;
      group.add(stem);

      for (const side of [-1, 1]) {
        const leaf = createLeafMesh(cropColor, {
          width: 0.05,
          height: 0.08,
          roughness: 0.68,
          bend: 0.04,
          cup: 0.014,
        });
        leaf.position.set(x + side * 0.016, height * 0.55, z);
        leaf.rotation.y = angle + side * 0.72;
        leaf.rotation.z = side * 0.42;
        registerBreezeNode(leaf, {
          rotY: 0.05,
          rotZ: 0.12,
          lift: 0.003,
          speed: 1.7 + i * 0.1,
          phase: i * 0.8 + side,
        });
        group.add(leaf);
      }

      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), leafMat);
      ball.position.set(x, height + 0.02, z);
      ball.castShadow = true;
      group.add(ball);
    }

    return group;
  }

  function buildFruitingMesh(crop, cropColor) {
    // Wider bush with small colored fruit spheres
    const group = new THREE.Group();
    setCropSway(group, { tilt: 0.028, yaw: 0.025, lift: 0.006, speed: 1.16, phase: 0.65 });

    // Bush body
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x3a7a3a, roughness: 0.75 });
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), bushMat);
    bush.position.y = 0.1;
    bush.scale.set(1.2, 0.8, 1.2);
    bush.castShadow = true;
    group.add(bush);
    addLeafRosette(group, {
      count: 5,
      radiusX: 0.08,
      radiusZ: 0.08,
      height: 0.06,
      leafWidth: 0.085,
      leafHeight: 0.13,
      color: varyColor(0x3a7a3a, -0.01, 0.02, 0.08),
      tilt: -0.7,
      bend: 0.04,
      cup: 0.02,
      liftJitter: 0.01,
      phaseOffset: 0.4,
    });

    // Fruit spheres — use emoji color for the fruit
    const fruitColor = cropColor;
    const fruitMat = new THREE.MeshStandardMaterial({ color: fruitColor, roughness: 0.5, metalness: 0.1 });
    const fruitPositions = [
      [0.06, 0.14, 0.05],
      [-0.05, 0.12, -0.06],
      [0.02, 0.16, -0.04],
    ];
    for (const pos of fruitPositions) {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), fruitMat);
      fruit.position.set(...pos);
      fruit.castShadow = true;
      group.add(fruit);
    }

    return group;
  }

  function buildBrassicaMesh(crop, cropColor) {
    // Dense head on short stem
    const group = new THREE.Group();
    setCropSway(group, { tilt: 0.033, yaw: 0.024, lift: 0.007, speed: 1.24, phase: 1.4 });

    // Short thick stem
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5a8a5a, roughness: 0.85 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.06, 8), stemMat);
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
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const leaf = createLeafMesh(leafMat.color, {
        width: 0.08,
        height: 0.14,
        roughness: 0.7,
        bend: 0.05,
        cup: 0.024,
      });
      leaf.position.set(Math.cos(angle) * 0.075, 0.03, Math.sin(angle) * 0.075);
      leaf.rotation.x = -0.92;
      leaf.rotation.y = angle + Math.PI / 2;
      leaf.rotation.z = Math.sin(i * 1.8) * 0.2;
      registerBreezeNode(leaf, {
        rotX: 0.03,
        rotY: 0.05,
        rotZ: 0.14,
        lift: 0.004,
        speed: 1.35 + i * 0.06,
        phase: i * 0.6,
      });
      group.add(leaf);
    }

    return group;
  }

  function buildCompanionMesh(crop, cropColor) {
    // Short stem with colored flower petals
    const group = new THREE.Group();
    setCropSway(group, { tilt: 0.038, yaw: 0.028, lift: 0.008, speed: 1.5, phase: 0.75 });

    // Stem
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.85 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.1, 8), stemMat);
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
      const petal = createLeafMesh(cropColor, {
        width: 0.03,
        height: 0.07,
        roughness: 0.5,
        bend: 0.045,
        cup: 0.016,
      });
      petal.material = petalMat.clone();
      petal.position.set(Math.cos(angle) * 0.035, 0.12, Math.sin(angle) * 0.035);
      petal.rotation.x = -0.32;
      petal.rotation.y = angle + Math.PI / 2;
      petal.rotation.z = Math.sin(i * 1.3) * 0.12;
      registerBreezeNode(petal, {
        rotX: 0.04,
        rotY: 0.05,
        rotZ: 0.12,
        lift: 0.003,
        speed: 1.8 + i * 0.04,
        phase: i * 0.5,
      });
      group.add(petal);
    }

    // Center
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xaa7722, roughness: 0.6 });
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), centerMat);
    center.position.y = 0.12;
    center.castShadow = true;
    group.add(center);

    // Low leaves
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a8a3e, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + 0.3;
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.04, 10), leafMat);
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
    let mesh = null;

    switch (crop.faction) {
      case 'climbers':   mesh = buildClimberMesh(crop, cropColor); break;
      case 'fast_cycles': mesh = buildFastCycleMesh(crop, cropColor); break;
      case 'greens':     mesh = buildGreensMesh(crop, cropColor); break;
      case 'roots':      mesh = buildRootsMesh(crop, cropColor); break;
      case 'herbs':      mesh = buildHerbsMesh(crop, cropColor); break;
      case 'fruiting':   mesh = buildFruitingMesh(crop, cropColor); break;
      case 'brassicas':  mesh = buildBrassicaMesh(crop, cropColor); break;
      case 'companions': mesh = buildCompanionMesh(crop, cropColor); break;
      default: {
        // Fallback: simple sphere
        const g = new THREE.Group();
        const s = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 12, 10),
          new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.75 })
        );
        s.position.y = 0.08;
        s.castShadow = true;
        g.add(s);
        mesh = g;
        break;
      }
    }

    const shadowProfiles = {
      climbers: { radiusX: 0.085, radiusZ: 0.07, opacity: 0.12 },
      fast_cycles: { radiusX: 0.1, radiusZ: 0.095, opacity: 0.13 },
      greens: { radiusX: 0.12, radiusZ: 0.11, opacity: 0.14 },
      roots: { radiusX: 0.08, radiusZ: 0.075, opacity: 0.11 },
      herbs: { radiusX: 0.09, radiusZ: 0.08, opacity: 0.11 },
      fruiting: { radiusX: 0.115, radiusZ: 0.105, opacity: 0.14 },
      brassicas: { radiusX: 0.12, radiusZ: 0.115, opacity: 0.15 },
      companions: { radiusX: 0.085, radiusZ: 0.08, opacity: 0.12 },
      default: { radiusX: 0.1, radiusZ: 0.09, opacity: 0.13 },
    };
    addGroundShadow(mesh, shadowProfiles[crop.faction] || shadowProfiles.default);
    return mesh;
  }

  function buildMulchProp() {
    const group = new THREE.Group();
    const chipMat = new THREE.MeshStandardMaterial({ color: 0x8b6b3e, roughness: 0.95 });
    const chipPositions = [
      [-0.1, 0.02], [-0.04, -0.09], [0.08, -0.06], [0.1, 0.05], [0, 0.11], [0.04, 0.01],
    ];
    chipPositions.forEach(([x, z], index) => {
      const chip = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 8, 6),
        chipMat
      );
      chip.position.set(x, 0.006 + (index % 2) * 0.002, z);
      chip.rotation.y = index * 0.55;
      chip.scale.set(1, 0.22, 0.58);
      group.add(chip);
    });
    return group;
  }

  function buildStakeProp() {
    const group = new THREE.Group();
    const stakeMat = new THREE.MeshStandardMaterial({ color: 0x6e5130, roughness: 0.86 });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0xb8a87a, roughness: 0.8 });

    for (const [x, z, rot] of [[-0.08, -0.02, 0.1], [0.08, 0.02, -0.1]]) {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.62, 8), stakeMat);
      stake.position.set(x, 0.31, z);
      stake.rotation.z = rot;
      stake.castShadow = true;
      group.add(stake);
    }

    const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.18, 6), tieMat);
    tie.rotation.z = Math.PI / 2;
    tie.position.set(0, 0.38, 0);
    group.add(tie);

    return group;
  }

  function buildProtectionProp() {
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xbfd4d9,
      transparent: true,
      opacity: 0.22,
      roughness: 0.25,
      metalness: 0.15,
      wireframe: true,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.rotation.x = Math.PI;
    dome.position.y = 0.17;
    return dome;
  }

  function buildCompanionPatchProp() {
    // Green ring glow on the cell — adjacency boost visual
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x5aab6b,
      transparent: true,
      opacity: 0.35,
      emissive: 0x3d7a4f,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.17, 16), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    return ring;
  }

  function buildEventDamageProp() {
    // Red crack marks on soil — event penalty visual
    const group = new THREE.Group();
    const crackMat = new THREE.MeshStandardMaterial({ color: 0x8b3a2a, roughness: 0.9 });
    for (const [x, z, rot, len] of [
      [-0.05, -0.04, 0.3, 0.12],
      [0.06, 0.03, -0.5, 0.1],
      [0.02, -0.08, 0.8, 0.08],
    ]) {
      const crack = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, len, 8), crackMat);
      crack.position.set(x, 0.004, z);
      crack.rotation.z = Math.PI / 2;
      crack.rotation.y = rot;
      group.add(crack);
    }
    return group;
  }

  function buildPrunedProp() {
    // Small cut stump left after pruning
    const stumpMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.92 });
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 6), stumpMat);
    stump.position.y = 0.015;
    stump.castShadow = true;
    return stump;
  }

  function buildEnrichedProp() {
    // Golden soil shimmer — enriched carry-forward
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xe8c84a,
      transparent: true,
      opacity: 0.15,
      emissive: 0xe8c84a,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), glowMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.005;
    return disc;
  }

  function buildCompactedProp() {
    // Dark cracked patches — compacted soil
    const group = new THREE.Group();
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.98 });
    for (const [x, z, s] of [[-0.06, -0.05, 0.07], [0.05, 0.04, 0.06], [0.0, -0.02, 0.05]]) {
      const patch = new THREE.Mesh(new THREE.CircleGeometry(s, 5), darkMat);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(x, 0.003, z);
      group.add(patch);
    }
    return group;
  }

  function buildFatigueProp() {
    // Grey soil tint — depleted from consecutive heavy feeders
    const greyMat = new THREE.MeshStandardMaterial({
      color: 0x7a7a7a,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.14, 10), greyMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.004;
    return disc;
  }

  function buildCellSupportProps(cell) {
    const group = new THREE.Group();
    const crop = cell.cropId ? getCropById(cell.cropId) : null;
    let hasProp = false;

    if (cell.mulched || cell.carryForwardType === 'mulched') {
      group.add(buildMulchProp());
      hasProp = true;
    }

    if (crop?.support) {
      group.add(buildStakeProp());
      hasProp = true;
    }

    if (cell.protected) {
      group.add(buildProtectionProp());
      hasProp = true;
    }

    if (cell.companionPatched) {
      group.add(buildCompanionPatchProp());
      hasProp = true;
    }

    if (cell.pruned && !cell.cropId) {
      group.add(buildPrunedProp());
      hasProp = true;
    }

    if (cell.eventDamaged) {
      group.add(buildEventDamageProp());
      hasProp = true;
    }

    if (cell.carryForwardType === 'enriched') {
      group.add(buildEnrichedProp());
      hasProp = true;
    }

    if (cell.carryForwardType === 'compacted') {
      group.add(buildCompactedProp());
      hasProp = true;
    }

    if ((cell.soilFatigue ?? 0) > 0.1) {
      group.add(buildFatigueProp());
      hasProp = true;
    }

    return hasProp ? group : null;
  }

function getGrowthScale(phase, season) {
  if (season === 'winter') return 0.52;
  if (phase === 'MID_SEASON') return 0.7;
  if (phase === 'LATE_SEASON' || phase === 'HARVEST' || phase === 'TRANSITION') {
    return 1.0;
  }
  return 0.4;
}

  function applyCropDamageState(mesh, damageState, season) {
    const damageVisual = damageState ? DAMAGE_VISUALS[damageState] : null;
    const dormant = season === 'winter';
    mesh.userData.restRotationZ = damageVisual ? -damageVisual.tilt : (dormant ? -0.04 : 0);
    mesh.userData.restRotationX = 0;
    mesh.userData.restRotationY = mesh.userData.basePlacementRotationY ?? 0;
    mesh.rotation.z = mesh.userData.restRotationZ;
    mesh.rotation.x = mesh.userData.restRotationX;
    mesh.rotation.y = mesh.userData.restRotationY;
    mesh.position.y = bed.soilY;

    mesh.traverse((child) => {
      if (!child.isMesh || !child.material?.color) return;
      if (!child.material.userData._baseColor) {
        child.material.userData._baseColor = child.material.color.clone();
      }
      child.material.color.copy(child.material.userData._baseColor);
      child.material.emissive?.setHex(0x000000);
      child.material.emissiveIntensity = 0;

      if (dormant) {
        child.material.color.lerp(DORMANT_CROP_TINT, 0.7);
        if (child.material.emissive) {
          child.material.emissive.setHex(DORMANT_CROP_EMISSIVE);
          child.material.emissiveIntensity = 0.04;
        }
      }

      if (!damageVisual) return;

      child.material.color.lerp(new THREE.Color(damageVisual.tint), 0.42);
      if (child.material.emissive) {
        child.material.emissive.setHex(damageVisual.emissive);
        child.material.emissiveIntensity = Math.max(0.08, damageVisual.emissiveIntensity * 0.45);
      }
    });
  }

  function syncCrops(grid, phase, season) {
    const activeIds = new Set();
    const growthScale = getGrowthScale(phase, season);

    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i];
      const key = `cell-${i}`;

      if (!cell.cropId) {
        if (cropMeshes.has(key)) {
          resourceTracker.disposeObject(cropMeshes.get(key));
          cropMeshes.delete(key);
        }
        continue;
      }

      activeIds.add(key);

      if (cropMeshes.has(key)) {
        const existing = cropMeshes.get(key);
        if (existing.userData.cropId === cell.cropId) {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const cellSize = bed.cellSize;
          const x = (col - (COLS - 1) / 2) * cellSize;
          const z = (row - (ROWS - 1) / 2) * cellSize;
          const anchor = existing.userData.anchor ?? getCellAnchor(i, 'crop');
          existing.userData.anchor = anchor;
          existing.userData.basePlacementRotationY = anchor.rotationY;
          existing.position.x = x + anchor.xOffset;
          existing.position.z = z + anchor.zOffset;
          existing.scale.setScalar(growthScale * anchor.scale);
          applyCropDamageState(existing, cell.damageState, season);
          continue;
        }
        resourceTracker.disposeObject(existing);
        cropMeshes.delete(key);
      }

      const mesh = buildCropMesh(cell.cropId);
      if (!mesh) continue;
      resourceTracker.trackObject(mesh);

      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const cellSize = bed.cellSize;
      const x = (col - (COLS - 1) / 2) * cellSize;
      const z = (row - (ROWS - 1) / 2) * cellSize;
      const anchor = getCellAnchor(i, 'crop');
      mesh.userData.anchor = anchor;
      mesh.userData.basePlacementRotationY = anchor.rotationY;
      mesh.position.set(x + anchor.xOffset, bed.soilY, z + anchor.zOffset);
      mesh.scale.setScalar(growthScale * anchor.scale);
      mesh.userData.cropId = cell.cropId;
      mesh.userData.cellIndex = i;
      applyCropDamageState(mesh, cell.damageState, season);
      root.add(mesh);
      cropMeshes.set(key, mesh);
    }

    // Remove stale meshes
    for (const [key, mesh] of cropMeshes) {
      if (!activeIds.has(key) && key.startsWith('cell-')) {
        resourceTracker.disposeObject(mesh);
        cropMeshes.delete(key);
      }
    }

    // ── Harvest FX: trigger confetti burst on HARVEST/CELEBRATION entry ──
    const isCelebration = getStyleForPhase(phase) === 'celebration';
    if (phase !== lastHarvestPhase) {
      // Phase changed — reset triggered set
      harvestFXTriggered.clear();
      lastHarvestPhase = phase;
    }
    if (isCelebration) {
      for (let i = 0; i < grid.length; i++) {
        if (grid[i].cropId && !harvestFXTriggered.has(i)) {
          harvestFXTriggered.add(i);
          triggerHarvestFX(i);
        }
      }
    }
  }

  function updateCropBreeze(time, breezeStrength) {
    for (const mesh of cropMeshes.values()) {
      const sway = mesh.userData.sway;
      if (!sway) continue;

      const phaseSeed = sway.phase + (mesh.userData.cellIndex ?? 0) * 0.67;
      const primary = Math.sin(time * sway.speed + phaseSeed);
      const secondary = Math.sin(time * sway.speed * 0.55 + phaseSeed * 1.4);
      const tertiary = Math.cos(time * sway.speed * 0.34 + phaseSeed);

      mesh.rotation.x = (mesh.userData.restRotationX ?? 0) + tertiary * sway.tilt * 0.12 * breezeStrength;
      mesh.rotation.y = (mesh.userData.restRotationY ?? 0) + secondary * sway.yaw * breezeStrength;
      mesh.rotation.z = (mesh.userData.restRotationZ ?? 0) + primary * sway.tilt * breezeStrength;
      mesh.position.y = bed.soilY + Math.max(0, primary) * sway.lift * breezeStrength;

      mesh.traverse((child) => {
        const breeze = child.userData?.breeze;
        if (!breeze) return;

        const wave = Math.sin(time * breeze.speed + phaseSeed + breeze.phase);
        const ripple = Math.cos(time * breeze.speed * 0.58 + phaseSeed * 0.7 + breeze.phase);
        child.rotation.x = breeze.baseRotationX + ripple * breeze.rotX * breezeStrength;
        child.rotation.y = breeze.baseRotationY + ripple * breeze.rotY * breezeStrength;
        child.rotation.z = breeze.baseRotationZ + wave * breeze.rotZ * breezeStrength;
        child.position.y = breeze.basePositionY + Math.max(0, wave) * breeze.lift * breezeStrength;
      });
    }
  }

  function syncSupportProps(grid) {
    const activeIds = new Set();

    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i];
      const key = `support-${i}`;
      const signature = JSON.stringify({
        cropId: cell.cropId,
        support: Boolean(cell.cropId && getCropById(cell.cropId)?.support),
        mulched: Boolean(cell.mulched || cell.carryForwardType === 'mulched'),
        protected: Boolean(cell.protected),
        companionPatched: Boolean(cell.companionPatched),
        pruned: Boolean(cell.pruned),
        eventDamaged: Boolean(cell.eventDamaged),
        carryForwardType: cell.carryForwardType || null,
        soilFatigue: Math.round((cell.soilFatigue ?? 0) * 10),
      });

      if (supportMeshes.has(key) && supportMeshes.get(key).userData.signature === signature) {
        activeIds.add(key);
        continue;
      }

      const propMesh = buildCellSupportProps(cell);

      if (!propMesh) {
        if (supportMeshes.has(key)) {
          resourceTracker.disposeObject(supportMeshes.get(key));
          supportMeshes.delete(key);
        }
        continue;
      }

      activeIds.add(key);

      if (supportMeshes.has(key)) {
        resourceTracker.disposeObject(supportMeshes.get(key));
        supportMeshes.delete(key);
      }

      resourceTracker.trackObject(propMesh);
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const x = (col - (COLS - 1) / 2) * bed.cellSize;
      const z = (row - (ROWS - 1) / 2) * bed.cellSize;
      const anchor = getCellAnchor(i, 'support');
      propMesh.position.set(x + anchor.xOffset, bed.soilY, z + anchor.zOffset);
      propMesh.rotation.y = anchor.rotationY;
      propMesh.userData.signature = signature;
      root.add(propMesh);
      supportMeshes.set(key, propMesh);
    }

    for (const [key, mesh] of supportMeshes) {
      if (!activeIds.has(key)) {
        resourceTracker.disposeObject(mesh);
        supportMeshes.delete(key);
      }
    }
  }

  function applySeason(season) {
    const config = SEASON_LIGHTING[season] || SEASON_LIGHTING.spring;
    const angle = (config.sunAngle * Math.PI) / 180;
    lightingState = {
      background: new THREE.Color(config.sky),
      fogColor: new THREE.Color(config.sky),
      fogDensity: config.fogDensity,
      hemiSky: new THREE.Color(config.sky),
      hemiGround: new THREE.Color(config.ground),
      hemiIntensity: config.ambInt,
      sunColor: new THREE.Color(0xfff4de),
      sunIntensity: config.sunInt,
      sunPosition: new THREE.Vector3(config.sunX, 8 * Math.sin(angle), config.sunZ),
      fillColor: new THREE.Color(0x8ea8bc),
      fillIntensity: config.fillInt,
      fillPosition: new THREE.Vector3(config.fillX, 4.4 + Math.sin(angle) * 0.5, config.fillZ),
      rimColor: new THREE.Color(0xd7e6f5),
      rimIntensity: 0.18,
      rimPosition: new THREE.Vector3(-4.4, 3.1, -4.7),
    };
    applyCurrentSceneStyle({ force: true });

    // Update tree foliage colors
    scenery.updateSeason(season);

    // Tint grass sprites by season
    const grassTints = {
      spring: { r: 0.3, g: 0.46, b: 0.22 },
      summer: { r: 0.24, g: 0.4, b: 0.18 },
      fall:   { r: 0.44, g: 0.38, b: 0.2 },
      winter: { r: 0.32, g: 0.32, b: 0.28 },
    };
    const gTint = grassTints[season] || grassTints.spring;
    grassGroup.traverse((child) => {
      if (child.isMesh && child.material?.color) {
        const v = 0.85 + Math.random() * 0.3;
        child.material.color.setRGB(gTint.r * v, gTint.g * v, gTint.b * v);
      }
    });
    grassGroup.visible = season !== 'winter';

    // ── Atmosphere element visibility by season ────────────────────────────
    fallLeaves.visible   = season === 'fall';
    snowDusting.visible  = season === 'winter';
    springPuddles.visible = season === 'spring';
    butterflies.visible  = season === 'summer';
    // Bird: always potentially visible (toggled in render loop) except winter
    if (season === 'winter') {
      birdGroup.visible = false;
    }
    // Scenery fireflies: show during night mood in winter
    scenery.showFireflies(season === 'winter');
    // Scenery puddles: show in spring
    scenery.showPuddles(season === 'spring');
    // ── End season visibility ──────────────────────────────────────────────
  }

  function applyBedPresentation(styleName = currentSceneStyle) {
    const presentation = {
      planner: {
        gridOpacity: 0.16,
        guardOpacity: 0.15,
        trellisOpacity: 0.5,
        labelsVisible: true,
        labelOpacity: 0.92,
        markerOpacity: 1,
      },
      story: {
        gridOpacity: 0.05,
        guardOpacity: 0.06,
        trellisOpacity: 0.34,
        labelsVisible: false,
        labelOpacity: 0,
        markerOpacity: 0.34,
      },
      celebration: {
        gridOpacity: 0.035,
        guardOpacity: 0.04,
        trellisOpacity: 0.28,
        labelsVisible: false,
        labelOpacity: 0,
        markerOpacity: 0.24,
      },
    }[styleName] || {
      gridOpacity: 0.08,
      guardOpacity: 0.08,
      trellisOpacity: 0.38,
      labelsVisible: false,
      labelOpacity: 0,
      markerOpacity: 0.3,
    };

    bed.gridLineMeshes?.forEach((line) => {
      line.visible = presentation.gridOpacity > 0.01;
      if (line.material) {
        line.material.transparent = true;
        line.material.opacity = presentation.gridOpacity;
      }
    });
    bed.guardMeshes?.forEach((mesh) => {
      mesh.visible = presentation.guardOpacity > 0.01;
      if (mesh.material) {
        mesh.material.transparent = true;
        mesh.material.opacity = presentation.guardOpacity;
      }
    });
    bed.trellisWireMeshes?.forEach((wire) => {
      if (wire.material) {
        wire.material.transparent = true;
        wire.material.opacity = presentation.trellisOpacity;
      }
    });
    bed.labelSprites?.forEach((sprite) => {
      sprite.visible = presentation.labelsVisible;
      if (sprite.material) {
        sprite.material.opacity = presentation.labelOpacity;
      }
    });
    bed.labelMarkers?.forEach((marker) => {
      if (marker.material) {
        marker.material.transparent = true;
        marker.material.opacity = presentation.markerOpacity;
        marker.material.emissiveIntensity = 0.08 + presentation.markerOpacity * 0.18;
      }
    });
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

    // String lights: show during night mood
    stringLights.visible = (name === 'night');
    // Fireflies: show during night mood
    scenery.showFireflies(name === 'night');
  }

  function resetMood() {
    applyMood('calm', { duration: 600 });
  }

  function pulseEventFocus(cellIndex) {
    flashCell(cellIndex, 0xe8c84a, 650);
  }

  function playSceneCue(name, opts = {}) {
    if (name === 'sheepdog-bed') {
      sheepdogRunState.active = false;
      sheepdogRunState.fadeOutMs = 0;
      sheepdogHoldState.active = true;
      sheepdogHoldState.remainingMs = opts.cueDuration ?? 1600;
      sheepdogHoldState.position.set(
        opts.cueFromX ?? 0.15,
        0,
        opts.cueFromZ ?? 0.34,
      );
      resetSheepdogVisuals();
      dogThoughtBubble.visible = true;
      sheepdogGroup.position.copy(sheepdogHoldState.position);
      sheepdogGroup.rotation.y = -0.55;
      sheepdogGroup.visible = true;
      return;
    }
    if (name !== 'sheepdog-run') return;
    sheepdogHoldState.active = false;
    sheepdogRunState.active = true;
    sheepdogRunState.elapsedMs = 0;
    sheepdogRunState.fadeOutMs = 0;
    sheepdogRunState.duration = opts.cueDuration ?? 2600;
    sheepdogRunState.arcHeight = opts.cueArcHeight ?? 0.1;
    sheepdogRunState.sway = opts.cueSway ?? 0.18;
    sheepdogRunState.start.set(
      opts.cueFromX ?? -4.15,
      0,
      opts.cueFromZ ?? 2.1,
    );
    sheepdogRunState.end.set(
      opts.cueToX ?? 4.7,
      0,
      opts.cueToZ ?? 1.88,
    );
    resetSheepdogVisuals();
    sheepdogGroup.position.copy(sheepdogRunState.start);
    sheepdogGroup.visible = true;
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

  function getGridLayout() {
    return bed.cellMeshes.map((mesh, index) => {
      mesh.updateWorldMatrix(true, false);
      mesh.getWorldPosition(cellWorldPositionScratch);
      if (mesh.geometry && !mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
      }

      const width = mesh.geometry?.boundingBox
        ? (mesh.geometry.boundingBox.max.x - mesh.geometry.boundingBox.min.x) * mesh.scale.x
        : 0.25;
      const depth = mesh.geometry?.boundingBox
        ? (mesh.geometry.boundingBox.max.z - mesh.geometry.boundingBox.min.z) * mesh.scale.z
        : 0.25;

      return {
        index,
        x: cellWorldPositionScratch.x,
        y: cellWorldPositionScratch.y,
        z: cellWorldPositionScratch.z,
        width,
        depth,
      };
    });
  }

  function projectWorldPosition(worldPosition) {
    if (!worldPosition) {
      return null;
    }

    projectedPositionScratch.set(
      worldPosition.x ?? 0,
      worldPosition.y ?? 0,
      worldPosition.z ?? 0,
    );
    projectedPositionScratch.project(camera);

    return {
      x: (projectedPositionScratch.x * 0.5 + 0.5) * renderer.domElement.clientWidth,
      y: (-projectedPositionScratch.y * 0.5 + 0.5) * renderer.domElement.clientHeight,
      visible: projectedPositionScratch.z >= -1
        && projectedPositionScratch.z <= 1
        && projectedPositionScratch.x >= -1.05
        && projectedPositionScratch.x <= 1.05
        && projectedPositionScratch.y >= -1.05
        && projectedPositionScratch.y <= 1.05,
    };
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

  // Apply spring lighting immediately so the first frame isn't dark
  applySeason('spring');

  return {
    canvas: renderer.domElement,
    resize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    sync(state) {
      lastSyncedState = state;
      currentGridState = state.season.grid;
      const seasonChanged = state.season.season !== currentSeasonId || !lightingState;
      currentSeasonId = state.season.season;
      for (let i = 0; i < bed.cellMeshes.length; i++) {
        applyCellVisualState(i);
      }
      syncCrops(state.season.grid, state.season.phase, state.season.season);
      syncSupportProps(state.season.grid);
      syncCropAccents(state.season.grid, state.season.phase, state.season.season);
      if (seasonChanged) {
        applySeason(state.season.season);
      }

      // Trigger ambient weather on season change
      if (state.season.season !== lastSeason) {
        lastSeason = state.season.season;
        weather.triggerForEvent(null, state.season.season);
        dayNight.setSeason?.(state.season.season);
      }
      dayNight.setEnabled(Boolean(state.settings?.dayNightEnabled));

      // ── Scenery state-driven updates ───────────────────────────────────
      scenery.showPlanningProps(state.season.phase === 'PLANNING');
      scenery.showNarrativeProps(state.season.chapter ?? 1, state.campaign ?? []);
      // ── End scenery state-driven updates ──────────────────────────────

      weather.update(0.016);
      camCtrl.update();
      updateTransitions(performance.now());

      // ── Creature visibility ────────────────────────────────────────────
      const ev = state.season?.currentEvent ?? null;
      const evTitle = ev?.title ?? '';
      const evCategory = ev?.category ?? '';
      const evValence = ev?.valence ?? '';

      // Cat: show for critter events with 'cat' or 'alley' in the title
      catGroup.visible = (
        evCategory === 'critter' &&
        (evTitle.toLowerCase().includes('cat') || evTitle.toLowerCase().includes('alley'))
      );

      // Neighbor arm: show for positive neighbor events
      neighborGroup.visible = (evCategory === 'neighbor' && evValence === 'positive');
      // ── End creature visibility ────────────────────────────────────────
    },
    render() {
      dayNight.update(1 / 60);
      const time = performance.now() * 0.001; // seconds

      // ── Trellis wire wind oscillation ──────────────────────────────────
      const ev = lastSyncedState?.season?.currentEvent ?? null;
      const isWindEvent = (ev?.category === 'weather') &&
        (ev?.title?.toLowerCase().includes('wind') || ev?.title?.toLowerCase().includes('storm'));
      if (isWindEvent && trellisWires.length > 0) {
        for (const { mesh, baseX } of trellisWires) {
          mesh.position.x = baseX + Math.sin(time * 8) * 0.003;
        }
      } else {
        for (const { mesh, baseX } of trellisWires) {
          mesh.position.x = baseX;
        }
      }
      // ── End wire oscillation ───────────────────────────────────────────

      // ── Atmosphere animations ──────────────────────────────────────────
      const now = performance.now();
      const dt = 1 / 60;
      atmosphereLastNow = now;
      atmosphereTime += dt;

      // Butterfly sine-wave drift (only when visible)
      if (butterflies.visible) {
        butterflyData.forEach(({ mesh, baseX, baseY, baseZ, phase, speed }) => {
          mesh.position.x = baseX + Math.sin(atmosphereTime * speed + phase) * 0.08;
          mesh.position.y = baseY + Math.sin(atmosphereTime * speed * 1.3 + phase + 1.0) * 0.04;
          mesh.position.z = baseZ + Math.cos(atmosphereTime * speed * 0.7 + phase) * 0.06;
          // Always face camera (billboard)
          mesh.quaternion.copy(camera.quaternion);
        });
      }

      // Bird random perch: flip every ~4-8 seconds, 50% chance visible
      birdFlipTimer += dt;
      if (birdFlipTimer > 4 + Math.sin(atmosphereTime * 0.17) * 2) {
        birdFlipTimer = 0;
        birdVisible = Math.sin(atmosphereTime * 137.5) > 0;
        const season = lastSyncedState?.season?.season ?? 'spring';
        birdGroup.visible = birdVisible && season !== 'winter';
      }
      if (birdGroup.visible) {
        birdGroup.position.y = 1.105 + Math.sin(atmosphereTime * 1.7) * 0.008;
        birdGroup.rotation.z = Math.sin(atmosphereTime * 1.5) * 0.08;
      }

      const season = lastSyncedState?.season?.season ?? 'spring';
      const seasonalBreeze = { spring: 0.95, summer: 0.72, fall: 1.08, winter: 0.45 }[season] ?? 0.85;
      const breezeStrength = seasonalBreeze * (isWindEvent ? 1.9 : 1);
      updateCropBreeze(atmosphereTime, breezeStrength);

      if (sheepdogHoldState.active) {
        sheepdogHoldState.remainingMs -= dt * 1000;
        sheepdogGroup.visible = true;
        sheepdogGroup.position.copy(sheepdogHoldState.position);
        dogTorso.position.y = 0.34 + Math.sin(time * 3.4) * 0.012;
        dogHeadPivot.rotation.z = Math.sin(time * 2.1) * 0.03;
        dogTailPivot.rotation.y = Math.sin(time * 4.1) * 0.22;
        dogTailPivot.rotation.z = 0.34 + Math.cos(time * 4.1) * 0.06;
        dogThoughtBubble.position.y = 0.62 + Math.sin(time * 2.8) * 0.015;
        if (sheepdogHoldState.remainingMs <= 0) {
          sheepdogHoldState.active = false;
        }
      }

      if (sheepdogRunState.active) {
        sheepdogRunState.elapsedMs += dt * 1000;
        const progress = Math.min(sheepdogRunState.elapsedMs / sheepdogRunState.duration, 1);
        const eased = easeInOutCubic(progress);

        // Stride frequency decelerates with easeInOutCubic derivative
        const speed = 1 - Math.abs(progress - 0.5) * 1.2; // faster in middle, slower at ends
        const strideFreq = 8 + speed * 6; // 8-14 cycles, faster when running fast
        const stridePhase = eased * Math.PI * strideFreq;

        const pathPos = new THREE.Vector3().lerpVectors(sheepdogRunState.start, sheepdogRunState.end, eased);
        const bob = Math.abs(Math.sin(stridePhase)) * sheepdogRunState.arcHeight * speed;
        const zArc = Math.sin(progress * Math.PI) * sheepdogRunState.sway;
        sheepdogGroup.visible = true;
        sheepdogGroup.position.set(pathPos.x, 0, pathPos.z + zArc);

        // Facing: atan2 for travel direction along XZ plane
        const runDirection = sheepdogRunState.end.clone().sub(sheepdogRunState.start).normalize();
        sheepdogGroup.rotation.y = Math.atan2(runDirection.x, runDirection.z);

        // Tongue visible during run
        dogTongue.visible = true;
        dogTongue.rotation.x = Math.sin(stridePhase * 1.3) * 0.12;

        // Shadow responds to bob
        dogShadow.scale.setScalar(1 - bob * 1.9);
        dogShadow.material.opacity = 0.24 - bob * 0.7;

        // Body motion
        dogTorso.position.y = 0.34 + bob;
        dogTorso.rotation.z = Math.sin(stridePhase) * 0.06 * speed;
        dogTorso.rotation.x = Math.cos(stridePhase * 0.5) * 0.04 * speed;

        // Head
        dogHeadPivot.rotation.z = Math.sin(stridePhase + 0.35) * 0.08 * speed;
        dogHeadPivot.rotation.x = -0.05 + Math.cos(stridePhase + 0.4) * 0.04;

        // Tail — wags faster at start (excited), slower mid-run (focused)
        const tailExcitement = progress < 0.3 ? 1.4 : progress > 0.8 ? 0.6 : 1.0;
        dogTailPivot.rotation.y = Math.sin(stridePhase * 0.92) * 0.5 * tailExcitement;
        dogTailPivot.rotation.z = 0.28 + Math.cos(stridePhase * 0.92) * 0.14 * tailExcitement;

        // Ears flop with individual timing
        dogEars.forEach((earPivot, index) => {
          earPivot.rotation.z = (index === 0 ? 1 : -1) * 0.08 + Math.sin(stridePhase + index) * 0.05 * speed;
          earPivot.rotation.x = -0.08 + Math.cos(stridePhase + index) * 0.04;
        });

        // Legs — amplitude scales with speed
        dogLegRigs.forEach(({ hipPivot, kneePivot, phase }) => {
          const gaitPhase = stridePhase + phase;
          hipPivot.rotation.z = Math.sin(gaitPhase) * 0.85 * speed;
          kneePivot.rotation.z = -0.28 + Math.max(0, Math.sin(gaitPhase + 0.6)) * 0.95 * speed;
        });

        // Dust puffs at paw contact
        if (Math.sin(stridePhase) > 0.9 && speed > 0.5) {
          const freePuff = dustPuffs.find(p => !p.userData.active);
          if (freePuff) {
            freePuff.userData.active = true;
            freePuff.userData.age = 0;
            freePuff.position.set(
              (Math.random() - 0.5) * 0.15,
              0.02,
              (Math.random() - 0.5) * 0.1
            );
            freePuff.visible = true;
            freePuff.scale.setScalar(0.6);
          }
        }
        dustPuffs.forEach(p => {
          if (!p.userData.active) return;
          p.userData.age += dt * 1000;
          const t = p.userData.age / p.userData.maxAge;
          p.material.opacity = Math.max(0, 0.35 * (1 - t));
          p.scale.setScalar(0.6 + t * 1.2);
          p.position.y += dt * 0.15;
          if (t >= 1) { p.userData.active = false; p.visible = false; }
        });

        // Fade out at end instead of popping invisible
        if (progress >= 1) {
          sheepdogRunState.active = false;
          sheepdogRunState.fadeOutMs = 400;
          dogTongue.visible = false;
          dustPuffs.forEach(p => { p.userData.active = false; p.visible = false; });
        }
      }

      // Fade-out after run completes
      if (sheepdogRunState.fadeOutMs > 0) {
        sheepdogRunState.fadeOutMs -= dt * 1000;
        const fadeT = Math.max(0, sheepdogRunState.fadeOutMs / 400);
        sheepdogGroup.visible = true;
        sheepdogGroup.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = fadeT;
          }
        });
        if (sheepdogRunState.fadeOutMs <= 0) {
          sheepdogGroup.visible = false;
          sheepdogGroup.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.transparent = false;
              child.material.opacity = 1;
            }
          });
          dogShadow.scale.setScalar(1);
          dogShadow.material.opacity = 0.22;
          dogTorso.position.y = 0.34;
          dogTorso.rotation.z = 0;
          dogTorso.rotation.x = 0;
          dogHeadPivot.rotation.z = 0;
          dogHeadPivot.rotation.x = 0;
          dogTailPivot.rotation.y = 0;
          dogTailPivot.rotation.z = 0.28;
          dogEars.forEach((earPivot) => {
            earPivot.rotation.z = 0;
            earPivot.rotation.x = 0;
          });
          dogLegRigs.forEach(({ hipPivot, kneePivot }) => {
            hipPivot.rotation.z = 0;
            kneePivot.rotation.z = -0.28;
          });
        }
      } else {
        if (!sheepdogHoldState.active) sheepdogGroup.visible = false;
      }
      // ── End atmosphere animations ──────────────────────────────────────

      // ── Scenery per-frame animations ─────────────────────────────────
      scenery.updateClouds(dt);
      scenery.updateBreeze(atmosphereTime, breezeStrength);
      if (lastSyncedState?.season?.season === 'winter') {
        scenery.updateSmoke(dt);
      }
      // Fireflies during night mood
      scenery.updateFireflies(dt);
      // ── End scenery per-frame animations ─────────────────────────────

      // ── Harvest FX particle update ──────────────────────────────────
      updateHarvestFX(dt);
      // ── End harvest FX ──────────────────────────────────────────────

      renderer.render(scene, camera);
    },
    applySeason,
    raycastCell,
    getGridLayout,
    projectWorldPosition,
    updatePointer,
    clearPointerHover,
    setInteractionHighlight,
    clearInteractionHighlight,
    flashCell,
    setTargetableCells,
    clearTargeting,
    setPlayerState,
    setPlayerTool,
    setScenePhase,
    setSceneStyle,
    setDayNightEnabled(enabled) {
      dayNight.setEnabled(Boolean(enabled));
    },
    setCameraPreset,
    applyCameraOrbitDelta(dTheta, dPhi) {
      camCtrl.applyOrbitDelta(dTheta, dPhi);
    },
    applyMood,
    resetMood,
    pulseEventFocus,
    playSceneCue,
    weather,
    dayNight,
    getRenderer() { return renderer; },
    getResourceTracker() { return resourceTracker; },
    dispose() {
      disposeGardenScene({
        container,
        renderer,
        scene,
        weather,
        dayNight,
        cameraController: camCtrl,
        resourceTracker,
        cropMeshes,
        supportMeshes,
        accentMeshes,
      });
    },
  };
}
