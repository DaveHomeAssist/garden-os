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
  'chapter-intro': { position: [0, 4.2, 6.9], target: [0, 0.62, 0.4], fov: 38 },
  overview: { position: [0, 3.15, 5.35], target: [0, 0.5, -0.1], fov: 29 },
  'bed-low-angle': { position: [0, 2.25, 4.2], target: [0, 0.46, -0.18], fov: 34 },
  'row-close': { position: [0.95, 2.15, 3.7], target: [0.45, 0.42, -0.16], fov: 35 },
  'event-push': { position: [0, 2.75, 4.55], target: [0, 0.46, -0.16], fov: 32 },
  'harvest-hero': { position: [0, 3.1, 4.25], target: [0, 0.5, -0.08], fov: 30 },
  'front-access': { position: [0, 3.0, 5.95], target: [0, 0.48, -0.2], fov: 34 },
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
  // Start from the front/access side looking back toward the house wall.
  camera.position.set(0, 3.15, 5.35);
  camera.lookAt(0, 0.5, -0.1);
  const cameraLookTarget = new THREE.Vector3(0, 0.5, -0.1);
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

  // ── Creature meshes ──────────────────────────────────────────────────────
  // Cat silhouette on fence
  const catGroup = new THREE.Group();
  const catDarkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85 });

  const catBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), catDarkMat);
  catBody.position.set(0, 0, 0);
  catGroup.add(catBody);

  const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), catDarkMat);
  catHead.position.set(0.07, 0.04, 0);
  catGroup.add(catHead);

  // Ears — two small cones
  for (const ex of [-0.012, 0.012]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.025, 4), catDarkMat);
    ear.position.set(0.07 + ex, 0.075, 0);
    catGroup.add(ear);
  }

  // Tail — thin cylinder angled upward
  const catTail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.1, 5), catDarkMat);
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

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), skinMat);
  arm.rotation.z = Math.PI / 4; // angled, reaching over the fence
  arm.position.set(0, 0, 0);
  neighborGroup.add(arm);

  // Hand / compost bag at the end of the arm
  const handBag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), bagMat);
  handBag.position.set(0.2, -0.2, 0);
  neighborGroup.add(handBag);

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

  const dogBody = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.24, 0.2), dogFurLight);
  dogBody.castShadow = true;
  dogTorso.add(dogBody);

  const dogSaddle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.19, 0.16), dogFurDark);
  dogSaddle.position.set(-0.03, 0.03, 0);
  dogSaddle.castShadow = true;
  dogTorso.add(dogSaddle);

  const dogRump = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), dogFurDark);
  dogRump.position.set(-0.22, -0.01, 0);
  dogRump.scale.set(1.1, 1.0, 0.95);
  dogRump.castShadow = true;
  dogTorso.add(dogRump);

  const dogChest = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), dogFurLight);
  dogChest.position.set(0.21, -0.02, 0);
  dogChest.scale.set(0.95, 1.05, 0.95);
  dogChest.castShadow = true;
  dogTorso.add(dogChest);

  for (const [x, y, z, sx, sy, sz, mat] of [
    [-0.04, 0.12, -0.09, 0.12, 0.1, 0.1, dogFurDark],
    [0.06, 0.13, 0.09, 0.13, 0.11, 0.1, dogFurDark],
    [0.18, 0.12, -0.08, 0.1, 0.09, 0.08, dogFurLight],
  ]) {
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 5), mat);
    tuft.position.set(x, y, z);
    tuft.scale.set(sx, sy, sz);
    tuft.castShadow = true;
    dogTorso.add(tuft);
  }

  const dogHeadPivot = new THREE.Group();
  dogHeadPivot.position.set(0.3, 0.08, 0);
  dogTorso.add(dogHeadPivot);

  const dogNeck = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.12), dogFurLight);
  dogNeck.position.set(-0.02, -0.02, 0);
  dogNeck.rotation.z = -0.35;
  dogNeck.castShadow = true;
  dogHeadPivot.add(dogNeck);

  const dogHead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.15), dogFurLight);
  dogHead.position.set(0.12, 0.02, 0);
  dogHead.castShadow = true;
  dogHeadPivot.add(dogHead);

  const dogFacePatch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.13), dogFurDark);
  dogFacePatch.position.set(0.18, 0.01, 0);
  dogFacePatch.castShadow = true;
  dogHeadPivot.add(dogFacePatch);

  const dogMuzzle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.09), dogFurLight);
  dogMuzzle.position.set(0.23, -0.03, 0);
  dogMuzzle.castShadow = true;
  dogHeadPivot.add(dogMuzzle);

  const dogNose = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.035), dogNoseMat);
  dogNose.position.set(0.29, -0.02, 0);
  dogHeadPivot.add(dogNose);

  // Tongue — pink, hangs from muzzle during run
  const dogTongueMat = new THREE.MeshStandardMaterial({ color: 0xe88a9a, roughness: 0.65 });
  const dogTongue = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.018), dogTongueMat);
  dogTongue.position.set(0.25, -0.065, 0.012);
  dogTongue.rotation.z = 0.15;
  dogTongue.visible = false;
  dogHeadPivot.add(dogTongue);

  for (const eyeZ of [-0.035, 0.035]) {
    const dogEye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), dogEyeMat);
    dogEye.position.set(0.2, 0.035, eyeZ);
    dogHeadPivot.add(dogEye);
  }

  const dogEars = [];
  for (const [ez, rz] of [[-0.05, 0.22], [0.05, -0.22]]) {
    const earPivot = new THREE.Group();
    earPivot.position.set(0.1, 0.1, ez);
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.04), dogFurDark);
    ear.position.set(-0.005, -0.06, 0);
    ear.rotation.z = rz;
    ear.castShadow = true;
    earPivot.add(ear);
    dogHeadPivot.add(earPivot);
    dogEars.push(earPivot);
  }

  const dogTailPivot = new THREE.Group();
  dogTailPivot.position.set(-0.31, 0.04, 0);
  dogTorso.add(dogTailPivot);

  const dogTail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.04), dogFurLight);
  dogTail.position.set(-0.09, 0.02, 0);
  dogTail.rotation.z = 0.58;
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

    const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.05), dogFurLight);
    upperLeg.position.set(0, -0.08, 0);
    upperLeg.castShadow = true;
    hipPivot.add(upperLeg);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.16, 0);
    hipPivot.add(kneePivot);

    const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.045), dogFurDark);
    lowerLeg.position.set(0, -0.07, 0);
    lowerLeg.castShadow = true;
    kneePivot.add(lowerLeg);

    const paw = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.065), dogFurLight);
    paw.position.set(0.015, -0.15, 0);
    paw.castShadow = true;
    kneePivot.add(paw);

    dogLegRigs.push({ hipPivot, kneePivot, phase });
  }

  // Dust puff pool
  const dustPuffs = [];
  const dustMat = new THREE.MeshBasicMaterial({ color: 0xc8b898, transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), dustMat.clone());
    puff.visible = false;
    puff.userData = { age: 0, maxAge: 400, active: false };
    sheepdogGroup.add(puff);
    dustPuffs.push(puff);
  }

  // Rotate dog model 90° so it faces along its travel direction (+Z in world = forward)
  // The mesh is built with head at +X, so rotate -90° on Y to face +Z
  const dogModelPivot = new THREE.Group();
  dogModelPivot.rotation.y = -Math.PI / 2;
  // Re-parent everything from sheepdogGroup into the pivot
  const dogChildren = [...sheepdogGroup.children];
  dogChildren.forEach(child => {
    if (child !== dogModelPivot) {
      sheepdogGroup.remove(child);
      dogModelPivot.add(child);
    }
  });
  sheepdogGroup.add(dogModelPivot);

  sheepdogGroup.scale.setScalar(1.02);
  sheepdogGroup.position.set(-3.9, 0, 1.62);
  root.add(sheepdogGroup);

  const sheepdogRunState = {
    active: false,
    elapsedMs: 0,
    duration: 2600,
    fadeOutMs: 0,
    start: new THREE.Vector3(-3.9, 0, 1.62),
    end: new THREE.Vector3(4.5, 0, 1.1),
    arcHeight: 0.1,
    sway: 0.14,
  };

  // Collect trellis wire refs after bed group is already added to root
  const trellisWires = [];
  bed.group.traverse((child) => {
    if (child.isMesh && child.name === 'trellis-wire') {
      trellisWires.push({ mesh: child, baseX: child.position.x });
    }
  });
  // ── End creature meshes ──────────────────────────────────────────────────

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
      color: 0x6699aa,
      roughness: 0.1,
      metalness: 0.3,
      opacity: 0.5,
      transparent: true,
    });
    const puddleData = [
      { r: 0.13, x: -0.9, z: 2.4 },
      { r: 0.09, x:  1.3, z: 1.6 },
      { r: 0.15, x:  0.3, z: 3.0 },
      { r: 0.10, x: -2.0, z: 0.7 },
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

    const birdBody = new THREE.Mesh(new THREE.SphereGeometry(0.025, 7, 5), birdBodyMat);
    birdBody.scale.set(1.4, 0.8, 1.1);
    birdGroup.add(birdBody);

    const birdHead = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 5), birdBodyMat);
    birdHead.position.set(0.028, 0.018, 0);
    birdGroup.add(birdHead);

    const birdBeak = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.022, 4), birdBeakMat);
    birdBeak.rotation.z = -Math.PI / 2;
    birdBeak.position.set(0.048, 0.016, 0);
    birdGroup.add(birdBeak);

    const birdTail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.006, 0.01), birdBodyMat);
    birdTail.position.set(-0.034, 0.004, 0);
    birdTail.rotation.z = 0.25;
    birdGroup.add(birdTail);
  }
  // Trellis top rail: y=1.08, trellisZ = -(ROWS*0.5/2 + 0.06*0.15) ≈ -1.009
  birdGroup.position.set(0.6, 1.095, -(4 * 0.5 / 2 + 0.06 * 0.15));
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
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), lightBulbMat.clone());
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
    if (targetableCellIndices.has(index)) {
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
  const supportMeshes = new Map();

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

  function buildMulchProp() {
    const group = new THREE.Group();
    const chipMat = new THREE.MeshStandardMaterial({ color: 0x8b6b3e, roughness: 0.95 });
    const chipPositions = [
      [-0.1, 0.02], [-0.04, -0.09], [0.08, -0.06], [0.1, 0.05], [0, 0.11], [0.04, 0.01],
    ];
    chipPositions.forEach(([x, z], index) => {
      const chip = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.01, 0.03),
        chipMat
      );
      chip.position.set(x, 0.006 + (index % 2) * 0.002, z);
      chip.rotation.y = index * 0.55;
      group.add(chip);
    });
    return group;
  }

  function buildStakeProp() {
    const group = new THREE.Group();
    const stakeMat = new THREE.MeshStandardMaterial({ color: 0x6e5130, roughness: 0.86 });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0xb8a87a, roughness: 0.8 });

    for (const [x, z, rot] of [[-0.08, -0.02, 0.1], [0.08, 0.02, -0.1]]) {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.62, 5), stakeMat);
      stake.position.set(x, 0.31, z);
      stake.rotation.z = rot;
      stake.castShadow = true;
      group.add(stake);
    }

    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.014, 0.014), tieMat);
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
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.rotation.x = Math.PI;
    dome.position.y = 0.17;
    return dome;
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
    mesh.rotation.z = damageVisual ? -damageVisual.tilt : (dormant ? -0.04 : 0);
    mesh.rotation.x = 0;
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
          applyCropDamageState(existing, cell.damageState, season);
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
      applyCropDamageState(mesh, cell.damageState, season);
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
      });
      const propMesh = buildCellSupportProps(cell);

      if (!propMesh) {
        if (supportMeshes.has(key)) {
          root.remove(supportMeshes.get(key));
          supportMeshes.delete(key);
        }
        continue;
      }

      activeIds.add(key);

      if (supportMeshes.has(key) && supportMeshes.get(key).userData.signature === signature) {
        continue;
      }

      if (supportMeshes.has(key)) {
        root.remove(supportMeshes.get(key));
        supportMeshes.delete(key);
      }

      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const x = (col - (COLS - 1) / 2) * bed.cellSize;
      const z = (row - (ROWS - 1) / 2) * bed.cellSize;
      propMesh.position.set(x, bed.soilY, z);
      propMesh.userData.signature = signature;
      root.add(propMesh);
      supportMeshes.set(key, propMesh);
    }

    for (const [key, mesh] of supportMeshes) {
      if (!activeIds.has(key)) {
        root.remove(mesh);
        supportMeshes.delete(key);
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
    if (name !== 'sheepdog-run') return;
    sheepdogRunState.active = true;
    sheepdogRunState.elapsedMs = 0;
    sheepdogRunState.duration = opts.cueDuration ?? 2600;
    sheepdogRunState.arcHeight = opts.cueArcHeight ?? 0.1;
    sheepdogRunState.sway = opts.cueSway ?? 0.18;
    sheepdogRunState.start.set(
      opts.cueFromX ?? -3.9,
      0,
      opts.cueFromZ ?? 1.62,
    );
    sheepdogRunState.end.set(
      opts.cueToX ?? 4.5,
      0,
      opts.cueToZ ?? 1.1,
    );
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
      lastSyncedState = state;
      currentGridState = state.season.grid;
      currentSeasonId = state.season.season;
      for (let i = 0; i < bed.cellMeshes.length; i++) {
        applyCellVisualState(i);
      }
      syncCrops(state.season.grid, state.season.phase, state.season.season);
      syncSupportProps(state.season.grid);
      applySeason(state.season.season);

      // Trigger ambient weather on season change
      if (state.season.season !== lastSeason) {
        lastSeason = state.season.season;
        weather.triggerForEvent(null, state.season.season);
      }

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
        dogModelPivot.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = fadeT;
          }
        });
        if (sheepdogRunState.fadeOutMs <= 0) {
          sheepdogGroup.visible = false;
          dogModelPivot.traverse(child => {
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
        sheepdogGroup.visible = false;
      }
      // ── End atmosphere animations ──────────────────────────────────────

      // ── Scenery per-frame animations ─────────────────────────────────
      scenery.updateClouds(dt);
      if (lastSyncedState?.season?.season === 'winter') {
        scenery.updateSmoke(dt);
      }
      // Fireflies during night mood
      scenery.updateFireflies(dt);
      // ── End scenery per-frame animations ─────────────────────────────

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
    playSceneCue,
    weather,
    dispose() {
      renderer.dispose();
    },
  };
}
