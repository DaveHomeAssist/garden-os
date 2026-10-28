/**
 * Village V0: one walkable graybox village built from village-placements.json.
 *
 * Zone contract (ZoneManager): { scene, camera, update, render, setSpawnPoint,
 * setSeason, setPlayerPosition/setPlayerState, getPlayerPosition,
 * registerInteractables, dispose } plus village extras: pickGround, planPathTo,
 * getMovementVector (tap-to-move), getCameraAzimuth.
 *
 * Game-layer interface (matches garden-os #77's village-trigger-adapter.js):
 *   onTrigger(listener) -> unsubscribe()   listener(phase, { id, type, prompt?, target?, exit? })
 *   registerInteractables([{ id, type, prompt }])
 *   getPlayerPose() -> { x, z, facingY }
 *   setPlayerPose({ x, z, facingY })        snaps player + camera, no fade, no stale trigger events
 *
 * Draw-call shape: one InstancedMesh per graybox asset part, one road mesh,
 * one sidewalk mesh, one ground, one sky, one merged props_set1 mesh, the
 * treeline variants and the player rig. Nothing here opens UI.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getVillageLayout } from './village-layout.js';
import { createTriggerTracker } from './village-triggers.js';
import { createFollowRig, dampFactor, segmentHitsOrientedBox } from './follow-camera.js';
import { buildWalkGrid, findPath, createPathWalker, hasLineOfSight } from '../../game/village-path.js';
import { resolveArtQuality, getArtQualityPreset } from '../yard-art/art-quality.js';
import { YARD_PALETTE, YARD_LIGHT } from '../yard-art/yard-palette.js';
import { createSkyMaterial, paintSkyGradient } from '../yard-art/yard-sky.js';
import { TREE_VARIANTS, buildTreeGeometry, instancePlacements } from '../yard-art/yard-foliage.js';
import { makeRng } from '../yard-art/yard-layout.js';
import { propKitGeometriesFromGltf, mergePropPlacements, propKitBounds } from '../yard-art/prop-kit.js';
import { createPlayerCharacter } from '../player-character.js';

const BASE_VFOV = 45;
const MAX_VFOV = 68;
const BASE_HFOV = 44; // horizontal FOV kept on portrait screens

const PROPS_SET1_URL = new URL('../../../assets/art/yard/props_set1.glb', import.meta.url).href;
const PROPS_SET1_ATLAS_URL = new URL('../../../assets/art/yard/props_set1_atlas.webp', import.meta.url).href;

/** Graybox palette (sRGB hex), warm and desaturated so the painted art pass can replace it piece by piece. */
const GRAY = {
  wall: [0xe9dcc4, 0xdfd0b4, 0xe6d6c6, 0xd8cdb8],
  roof: [0x9a5b45, 0x7d6a5c, 0x8a5040, 0x6e6458],
  shopWall: 0xd9c6a0,
  shopRoof: 0x5f7a6a,
  shed: 0x98653a,
  stand: 0xb98a55,
  canopy: 0xd6a648,
  compost: 0x6b4b30,
  seedBox: 0xa9794a,
  sign: 0xc8b48c,
  pole: 0x5a5148,
  hedge: 0x3f6b35,
  edging: 0x98653a,
  soil: 0x6b4b30,
  road: 0x7c7a76,
  sidewalk: 0xc3b8a4,
};

/** Unit graybox parts per asset. Each part becomes one InstancedMesh; scale comes from the footprint. */
function unitBox() {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return g;
}
function unitGable() {
  // triangular prism, ridge along local x, base 1x1 at y 0, apex at y 1
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0); shape.lineTo(0.5, 0); shape.lineTo(0, 1); shape.lineTo(-0.5, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  g.rotateY(Math.PI / 2); // ridge along x
  return g.toNonIndexed();
}
function signGeometry(w = 0.5) {
  const post = new THREE.BoxGeometry(0.08, 0.9, 0.08); post.translate(0, 0.45, 0);
  const board = new THREE.BoxGeometry(w, 0.32, 0.04); board.translate(0, 0.86, 0.05);
  return mergeGeometries([post.toNonIndexed(), board.toNonIndexed()]);
}
function streetSignGeometry() {
  const pole = new THREE.CylinderGeometry(0.04, 0.05, 2.5, 6); pole.translate(0, 1.25, 0);
  const a = new THREE.BoxGeometry(0.9, 0.18, 0.03); a.translate(0.35, 2.32, 0);
  const b = new THREE.BoxGeometry(0.03, 0.18, 0.9); b.translate(0, 2.1, 0.35);
  return mergeGeometries([pole.toNonIndexed(), a.toNonIndexed(), b.toNonIndexed()]);
}
function edgingGeometry(w, d, t = 0.14, h = 0.16) {
  const parts = [];
  const add = (sx, sz, x, z) => { const g = new THREE.BoxGeometry(sx, h, sz); g.translate(x, h / 2, z); parts.push(g.toNonIndexed()); };
  add(w, t, 0, -d / 2 + t / 2); add(w, t, 0, d / 2 - t / 2);
  add(t, d - 2 * t, -w / 2 + t / 2, 0); add(t, d - 2 * t, w / 2 - t / 2, 0);
  return mergeGeometries(parts);
}

/**
 * Per-asset parts: geometry factory + how to scale/colour each instance.
 * `size(e)` returns [sx, sy, sz] in metres for unit geometry (null = authored size).
 */
const ASSET_PARTS = {
  house_graybox: [
    { part: 'walls', geo: unitBox, size: (e) => [e.footprint.w, 3.0, e.footprint.d], color: (e, i) => GRAY.wall[i % GRAY.wall.length], cut: true },
    { part: 'roof', geo: unitGable, size: (e) => [e.footprint.w + 0.5, 1.7, e.footprint.d + 0.5], y: 3.0, color: (e, i) => GRAY.roof[(i * 3 + 1) % GRAY.roof.length], cut: true, roof: true },
  ],
  shop_graybox: [
    { part: 'walls', geo: unitBox, size: (e) => [e.footprint.w, 3.4, e.footprint.d], color: () => GRAY.shopWall, cut: true },
    { part: 'roof', geo: unitBox, size: (e) => [e.footprint.w + 0.4, 0.35, e.footprint.d + 0.4], y: 3.4, color: () => GRAY.shopRoof, cut: true, roof: true },
  ],
  shed_graybox: [
    { part: 'walls', geo: unitBox, size: (e) => [e.footprint.w, 2.0, e.footprint.d], color: () => GRAY.shed, cut: true },
    { part: 'roof', geo: unitGable, size: (e) => [e.footprint.w + 0.3, 0.8, e.footprint.d + 0.3], y: 2.0, color: () => GRAY.roof[1], cut: true, roof: true },
  ],
  market_stand_graybox: [
    { part: 'counter', geo: unitBox, size: (e) => [e.footprint.w, 0.95, e.footprint.d * 0.6], color: () => GRAY.stand },
    { part: 'canopy', geo: unitBox, size: (e) => [e.footprint.w + 0.3, 0.12, e.footprint.d + 0.2], y: 2.2, color: () => GRAY.canopy },
  ],
  compost_bin_graybox: [{ part: 'bin', geo: unitBox, size: (e) => [e.footprint.w, 1.0, e.footprint.d], color: () => GRAY.compost }],
  seed_box_graybox: [{ part: 'box', geo: unitBox, size: (e) => [e.footprint.w, 0.7, e.footprint.d], color: () => GRAY.seedBox }],
  hedge_graybox: [{ part: 'hedge', geo: unitBox, size: (e) => [e.footprint.w, 1.0, e.footprint.d], color: () => GRAY.hedge }],
  plot_sign_blank: [{ part: 'sign', geo: () => signGeometry(), size: () => null, color: () => GRAY.sign }],
  street_sign: [{ part: 'sign', geo: streetSignGeometry, size: () => null, color: () => GRAY.pole }],
  lot_graybox: [
    { part: 'edging', geo: null, size: () => null, color: () => GRAY.edging, edging: true },
    { part: 'soil', geo: unitBox, size: () => [8, 0.05, 8], color: () => GRAY.soil },
  ],
};

/** Ribbon mesh for polylines: one quad per segment plus a disc per vertex (fills joints). */
export function buildRibbonGeometry(paths, widthOf, y) {
  const parts = [];
  for (const path of paths) {
    const w = widthOf(path);
    if (!(w > 0)) continue;
    const pts = path.points;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 1e-6) continue;
      const g = new THREE.PlaneGeometry(len, w);
      g.rotateX(-Math.PI / 2);
      g.rotateY(-Math.atan2(bz - az, bx - ax));
      g.translate((ax + bx) / 2, y, (az + bz) / 2);
      parts.push(g.toNonIndexed());
    }
    for (const [x, z] of pts) {
      const disc = new THREE.CircleGeometry(w / 2, 16);
      disc.rotateX(-Math.PI / 2);
      disc.translate(x, y, z);
      parts.push(disc.toNonIndexed());
    }
  }
  const merged = mergeGeometries(parts);
  merged.computeVertexNormals();
  return merged;
}

function colorHex(hex) { return new THREE.Color(hex); }

export function createVillageScene({
  renderer = null,
  layout = getVillageLayout(),
  quality = resolveArtQuality(),
  profile = null,
  season = 'spring',
  overlayParent = typeof document !== 'undefined' ? document.body : null,
  loadProps = true,
  inputElement = renderer?.domElement ?? null,
} = {}) {
  const preset = getArtQualityPreset(quality.tier);
  let pal = YARD_PALETTE[season] ?? YARD_PALETTE.spring;
  const scene = new THREE.Scene();
  scene.name = 'village';
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.3, 400);
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };
  const assetErrors = [];

  // ---- lights + fog (yard palette and light rig; low tier = no shadows)
  scene.fog = new THREE.FogExp2(pal.horizon, YARD_LIGHT.fogDensity * 0.55);
  const hemi = new THREE.HemisphereLight(pal.hemiSky, pal.hemiGround, YARD_LIGHT.hemiIntensity);
  const ambient = new THREE.AmbientLight(pal.hemiSky, YARD_LIGHT.ambientIntensity);
  const sun = new THREE.DirectionalLight(pal.sun, YARD_LIGHT.sunIntensity);
  const fill = new THREE.DirectionalLight(pal.fill, YARD_LIGHT.fillIntensity);
  const rim = new THREE.DirectionalLight(pal.rim, YARD_LIGHT.rimIntensity);
  const sunDir = new THREE.Vector3(...YARD_LIGHT.sunDirection).normalize();
  const fillDir = new THREE.Vector3(...YARD_LIGHT.fillDirection).normalize();
  const rimDir = new THREE.Vector3(...YARD_LIGHT.rimDirection).normalize();
  sun.castShadow = preset.shadows;
  if (preset.shadows) {
    sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    if ('intensity' in sun.shadow) sun.shadow.intensity = 0.82;
    sun.shadow.camera.updateProjectionMatrix();
  }
  scene.add(hemi, ambient, sun, sun.target, fill, fill.target, rim, rim.target);

  // ---- sky dome (painted gradient + cloud shader), one draw
  const skyRadius = 260;
  const skyGeo = track(new THREE.SphereGeometry(skyRadius, 48, 24));
  const skyMat = track(createSkyMaterial({ octaves: preset.skyOctaves }));
  paintSkyGradient(skyGeo, pal, skyRadius);
  skyMat.uniforms.uSunDir.value.copy(sunDir);
  skyMat.uniforms.uSunGlow.value.set(pal.sunGlow);
  skyMat.uniforms.uCloudLit.value.set(pal.cloudLit);
  skyMat.uniforms.uCloudShade.value.set(pal.cloudShade);
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'village-sky';
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  scene.add(sky);

  // ---- ground: one plane (flat palette colour on the low tier)
  const b = layout.bounds;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const groundSize = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) + 120;
  const groundGeo = track(new THREE.PlaneGeometry(groundSize, groundSize, 1, 1));
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = track(new THREE.MeshStandardMaterial({ color: pal.grassMid, roughness: 1, metalness: 0 }));
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.name = 'village-ground';
  ground.position.set(cx, 0, cz);
  ground.receiveShadow = preset.shadows;
  scene.add(ground);

  // ---- roads + sidewalks: one merged mesh each
  const roadGeo = track(buildRibbonGeometry(layout.paths, (p) => p.width, 0.03));
  const walkGeo = track(buildRibbonGeometry(layout.paths, (p) => p.width + 2 * (p.sidewalkWidth ?? 0), 0.015));
  const roadMat = track(new THREE.MeshStandardMaterial({ color: GRAY.road, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const walkMat = track(new THREE.MeshStandardMaterial({ color: GRAY.sidewalk, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  const road = new THREE.Mesh(roadGeo, roadMat); road.name = 'village-road'; road.receiveShadow = preset.shadows;
  const sidewalk = new THREE.Mesh(walkGeo, walkMat); sidewalk.name = 'village-sidewalk'; sidewalk.receiveShadow = preset.shadows;
  scene.add(sidewalk, road);

  // ---- graybox: one InstancedMesh per asset part
  const grayMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, flatShading: true }));
  const byAsset = {};
  layout.entries.forEach((e) => { if (ASSET_PARTS[e.asset]) (byAsset[e.asset] ??= []).push(e); });
  const instanced = [];
  const cutaways = []; // { mesh, index, base matrix parts, box, cut }
  const dummy = new THREE.Object3D();
  for (const [asset, entries] of Object.entries(byAsset)) {
    for (const spec of ASSET_PARTS[asset]) {
      const geo = track(spec.edging ? edgingGeometry(entries[0].footprint.w, entries[0].footprint.d) : spec.geo());
      const mesh = new THREE.InstancedMesh(geo, grayMat, entries.length);
      mesh.name = `village-${asset}-${spec.part}`;
      mesh.userData.villageEntries = entries; // instanceId -> layout entry (tap picking)
      mesh.castShadow = preset.shadows;
      mesh.receiveShadow = preset.shadows;
      entries.forEach((e, i) => {
        const size = spec.size(e);
        dummy.position.set(e.x, (spec.y ?? 0) + (spec.part === 'soil' ? 0.0 : 0), e.z);
        dummy.rotation.set(0, e.rotation ?? 0, 0);
        if (size) dummy.scale.set(size[0], size[1], size[2]); else dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, colorHex(spec.color(e, i)));
        if (spec.cut) {
          cutaways.push({
            mesh, index: i, roof: Boolean(spec.roof), cut: 0,
            pos: dummy.position.clone(), rotY: e.rotation ?? 0, scale: dummy.scale.clone(),
            box: { x: e.x, z: e.z, w: e.footprint.w + 0.4, d: e.footprint.d + 0.4, h: (spec.y ?? 0) + (size?.[1] ?? 1), rotationY: e.rotation ?? 0 },
          });
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
      instanced.push(mesh);
    }
  }

  // ---- treeline just outside the walk bounds (instanced per variant)
  const rng = makeRng(layout.seed ?? 1);
  const treeSets = Object.fromEntries(TREE_VARIANTS.map((v) => [v, []]));
  const perim = [];
  const step = 4.2;
  for (let x = b.minX; x <= b.maxX; x += step) perim.push([x, b.minZ - 1.5], [x, b.maxZ + 1.5]);
  for (let z = b.minZ; z <= b.maxZ; z += step) perim.push([b.minX - 1.5, z], [b.maxX + 1.5, z]);
  perim.forEach(([x, z], i) => {
    const variant = TREE_VARIANTS[Math.floor(rng() * 3)];
    const jx = (rng() - 0.5) * 2.2;
    const jz = (rng() - 0.5) * 2.2;
    const outward = 1 + rng() * 2.5;
    const ox = x < b.minX ? -outward : x > b.maxX ? outward : 0;
    const oz = z < b.minZ ? -outward : z > b.maxZ ? outward : 0;
    treeSets[variant].push({ x: x + jx + ox, z: z + jz + oz, scale: 2.1 + rng() * 0.9, rotationY: rng() * Math.PI * 2 });
    if (i % 2 === 0) treeSets.bush.push({ x: x + jx * 0.5, z: z + jz * 0.5, scale: 1.6 + rng() * 0.6, rotationY: rng() * Math.PI * 2 });
  });
  const shareTrees = quality.tier === 'low' ? 0.7 : 1;
  const foliageMat = track(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 }));
  const treeMeshes = [];
  for (const variant of TREE_VARIANTS) {
    const placements = treeSets[variant].filter((_, i) => (i % 10) < shareTrees * 10);
    if (!placements.length) continue;
    const geo = track(buildTreeGeometry(variant, pal, 11 + variant.length));
    const m = instancePlacements(geo, foliageMat, placements, { color: (p, i) => new THREE.Color(1, 1, 1).multiplyScalar(0.9 + makeRng(i * 7 + 3)() * 0.2) });
    m.name = `village-tree-${variant}`;
    m.castShadow = preset.shadows;
    scene.add(m);
    treeMeshes.push(m);
  }

  // ---- props_set1 (wheelbarrow, rain barrel, bench, birdhouse): one merged mesh
  const propEntries = layout.entries.filter((e) => typeof e.asset === 'string' && e.asset.startsWith('props_set1.glb#'));
  let propsMesh = null;
  let propsBounds = null;
  const ready = (!loadProps || !propEntries.length) ? Promise.resolve({ errors: assetErrors }) : new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const atlas = new THREE.TextureLoader().load(PROPS_SET1_ATLAS_URL);
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.flipY = false;
    track(atlas);
    loader.load(PROPS_SET1_URL, (gltf) => {
      try {
        const byName = propKitGeometriesFromGltf(gltf);
        propsBounds = propKitBounds(byName);
        // collision boxes in the placements come from these bounding boxes; flag drift
        for (const e of propEntries) {
          const name = e.asset.split('#')[1];
          const bb = propsBounds[name];
          if (!bb || !e.footprint) continue;
          const dw = Math.abs((bb.maxX - bb.minX) - e.footprint.w);
          const dd = Math.abs((bb.maxZ - bb.minZ) - e.footprint.d);
          if (dw > 0.05 || dd > 0.05) assetErrors.push(`footprint drift ${e.id}: ${dw.toFixed(2)} x ${dd.toFixed(2)} m`);
        }
        const placements = propEntries.map((e) => ({ prop: e.asset.split('#')[1], x: e.x, z: e.z, rotationY: e.rotation ?? 0 }));
        const merged = track(mergePropPlacements(byName, placements, 'village-props', assetErrors));
        const mat = track(new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.88, metalness: 0 }));
        propsMesh = new THREE.Mesh(merged, mat);
        propsMesh.name = 'village-props';
        propsMesh.castShadow = preset.shadows;
        propsMesh.receiveShadow = preset.shadows;
        scene.add(propsMesh);
        Object.values(byName).forEach((g) => g.dispose());
      } catch (err) {
        assetErrors.push(String(err?.message ?? err));
      }
      resolve({ errors: assetErrors });
    }, undefined, (err) => { assetErrors.push(`props_set1: ${err?.message ?? err}`); resolve({ errors: assetErrors }); });
  });

  // ---- player (own instance)
  const player = createPlayerCharacter(null, profile);
  scene.add(player.group);
  player.group.traverse((o) => { if (o.isMesh) o.castShadow = preset.shadows; });
  let playerState = {
    position: { x: layout.spawn.x, y: 0, z: layout.spawn.z }, facing: layout.spawn.facing, moving: false, speed: 0, time: 0,
  };
  let spawnPoint = { ...layout.spawn };

  // ---- camera rig + triggers + path
  const rig = createFollowRig();
  rig.snap(playerState.position);
  rig.apply(camera);
  const triggers = createTriggerTracker(layout.interactables);
  const grid = buildWalkGrid({ bounds: layout.bounds, blockers: layout.blockers });
  const walker = createPathWalker({
    getPosition: () => playerState.position,
    lineOfSight: (a, b) => hasLineOfSight(grid, a, b),
    replan: (pos, goal) => findPath(grid, pos, goal),
  });

  // ---- credits line (attribution only; the layout file carries the text)
  let creditsEl = null;
  if (overlayParent && typeof document !== 'undefined') {
    creditsEl = document.createElement('div');
    creditsEl.className = 'village-credits';
    creditsEl.dataset.villageCredits = 'true';
    creditsEl.textContent = `Street layout: ${layout.credits.join(' · ')}`;
    Object.assign(creditsEl.style, {
      position: 'fixed', right: '8px', bottom: 'calc(4px + env(safe-area-inset-bottom, 0px))', zIndex: '4',
      font: '10px/1.3 "DM Mono", monospace', color: 'rgba(247,242,234,0.78)', background: 'rgba(30,17,10,0.45)',
      padding: '2px 6px', borderRadius: '4px', pointerEvents: 'none', maxWidth: '70vw',
    });
    overlayParent.appendChild(creditsEl);
  }

  // ---- tap-to-move (pointer taps on the canvas; the touch stick has its own element)
  let tapEnabled = true;
  let pointerDown = null;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  function pickGround(clientX, clientY, element = inputElement) {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    // Solid objects first: a tap on the shop stand, a bin or a house must not
    // fall through to the ground behind it. An object with a trigger walks to
    // its trigger anchor (so its prompt opens); any other object walks to the
    // hit point, which findPath snaps to the nearest walkable cell.
    // Walk-through surfaces (plots: soil + edging, collides: false) are ground,
    // not objects: a tap on them walks to the tapped spot. Redirecting them to
    // the plot's trigger anchor pinned every tap inside a plot to its centre
    // and pulled taps near a plot metres off target.
    const objHit = raycaster.intersectObjects(instanced, false)
      .find((h) => h.instanceId != null && !isCutAway(h.object, h.instanceId)
        && h.object.userData.villageEntries?.[h.instanceId]?.collides !== false);
    if (objHit) {
      const entry = objHit.object.userData.villageEntries?.[objHit.instanceId];
      const item = entry && interactableById.get(entry.id);
      if (item) return { x: item.position.x, z: item.position.z, interactableId: item.id };
      return { x: objHit.point.x, z: objHit.point.z, objectId: entry?.id ?? null };
    }
    if (!raycaster.ray.intersectPlane(groundPlane, hit)) return null;
    return { x: hit.x, z: hit.z };
  }
  const interactableById = new Map(layout.interactables.map((i) => [i.id, i]));
  function isCutAway(mesh, index) {
    return cutaways.some((c) => c.mesh === mesh && c.index === index && c.cut > 0.5);
  }
  function planPathTo(target, from = playerState.position) {
    return findPath(grid, from, target);
  }
  function walkTo(target) {
    const path = planPathTo(target);
    if (!path || !path.length) { walker.clear(); return null; }
    walker.setPath(path);
    return path;
  }
  const onPointerDown = (ev) => { if (ev.isPrimary !== false) pointerDown = { x: ev.clientX, y: ev.clientY, t: performance.now() }; };
  const onPointerUp = (ev) => {
    const start = pointerDown;
    pointerDown = null;
    if (!tapEnabled || !start || ev.button > 0) return;
    if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 10 || performance.now() - start.t > 450) return;
    const p = pickGround(ev.clientX, ev.clientY);
    if (p) walkTo(p);
  };
  inputElement?.addEventListener?.('pointerdown', onPointerDown);
  inputElement?.addEventListener?.('pointerup', onPointerUp);

  // ---- per-frame
  const tmpA = { x: 0, y: 0, z: 0 };
  const tmpB = { x: 0, y: 0, z: 0 };
  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpScale = new THREE.Vector3();
  const tmpMat = new THREE.Matrix4();
  const yAxis = new THREE.Vector3(0, 1, 0);
  let skyTime = 0;

  function updateCutaways(dt) {
    const camPos = camera.position;
    Object.assign(tmpA, { x: camPos.x, y: camPos.y, z: camPos.z });
    Object.assign(tmpB, { x: playerState.position.x, y: 1.0, z: playerState.position.z });
    const k = dampFactor(10, dt);
    const dirty = new Set();
    for (const c of cutaways) {
      const want = segmentHitsOrientedBox(tmpA, tmpB, c.box) ? 1 : 0;
      const next = c.cut + (want - c.cut) * k;
      const settled = Math.abs(next - want) < 0.002 ? want : next;
      if (settled === c.cut) continue;
      c.cut = settled;
      // walls drop to a 0.9 m stub, roofs sink and shrink away
      if (c.roof) {
        tmpPos.copy(c.pos); tmpPos.y = THREE.MathUtils.lerp(c.pos.y, 0.9, c.cut);
        tmpScale.copy(c.scale); tmpScale.y = THREE.MathUtils.lerp(c.scale.y, 0.001, c.cut);
      } else {
        tmpPos.copy(c.pos);
        tmpScale.copy(c.scale); tmpScale.y = THREE.MathUtils.lerp(c.scale.y, 0.9, c.cut);
      }
      tmpQuat.setFromAxisAngle(yAxis, c.rotY);
      tmpMat.compose(tmpPos, tmpQuat, tmpScale);
      c.mesh.setMatrixAt(c.index, tmpMat);
      dirty.add(c.mesh);
    }
    dirty.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  }

  /** Portrait phones get a wider vertical FOV so the horizontal view stays usable (45 deg landscape, up to 68 deg). */
  function syncFov() {
    const aspect = camera.aspect || 1;
    const halfH = Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_HFOV / 2)) / aspect);
    const fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(halfH * 2), BASE_VFOV, MAX_VFOV);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  function update(dt = 1 / 60) {
    const clamped = Math.min(0.1, Math.max(0, dt));
    syncFov();
    player.update(playerState);
    rig.update(playerState.position, clamped);
    rig.apply(camera);
    sun.target.position.copy(rig.getTarget());
    sun.position.copy(sunDir).multiplyScalar(30).add(sun.target.position);
    fill.target.position.copy(sun.target.position);
    fill.position.copy(fillDir).multiplyScalar(10).add(sun.target.position);
    rim.target.position.copy(sun.target.position);
    rim.position.copy(rimDir).multiplyScalar(10).add(sun.target.position);
    sky.position.set(camera.position.x, 0, camera.position.z);
    skyTime += clamped;
    skyMat.uniforms.uTime.value = skyTime;
    updateCutaways(clamped);
    triggers.update(playerState.position);
  }

  function render(target = renderer) {
    if (!target) return false;
    const saved = { tm: target.toneMapping, ex: target.toneMappingExposure, sh: target.shadowMap.enabled };
    target.toneMapping = THREE.NeutralToneMapping;
    target.toneMappingExposure = YARD_LIGHT.exposure;
    target.shadowMap.enabled = preset.shadows;
    target.render(scene, camera);
    target.toneMapping = saved.tm;
    target.toneMappingExposure = saved.ex;
    target.shadowMap.enabled = saved.sh;
    return true;
  }

  function setSeason(next) {
    pal = YARD_PALETTE[next] ?? YARD_PALETTE.spring;
    scene.fog.color.set(pal.horizon);
    hemi.color.set(pal.hemiSky); hemi.groundColor.set(pal.hemiGround);
    ambient.color.set(pal.hemiSky);
    sun.color.set(pal.sun); fill.color.set(pal.fill); rim.color.set(pal.rim);
    groundMat.color.set(pal.grassMid);
    paintSkyGradient(skyGeo, pal, skyRadius);
    skyMat.uniforms.uSunGlow.value.set(pal.sunGlow);
  }
  setSeason(season);

  function setPlayerState(snapshot) {
    if (!snapshot?.position) return;
    playerState = {
      position: { x: snapshot.position.x, y: snapshot.position.y ?? 0, z: snapshot.position.z },
      facing: snapshot.facing ?? playerState.facing,
      moving: Boolean(snapshot.moving),
      speed: snapshot.speed ?? 0,
      time: snapshot.time ?? playerState.time,
    };
  }

  let poseHandler = null;
  let handled = [];
  function getPlayerPose() {
    return { x: playerState.position.x, z: playerState.position.z, facingY: playerState.facing };
  }
  /** Snap player + camera to a pose (no fade, no easing) and re-seed triggers so nothing stale fires. */
  function setPlayerPose(pose) {
    if (!pose || !Number.isFinite(pose.x) || !Number.isFinite(pose.z)) return;
    const facingY = Number.isFinite(pose.facingY) ? pose.facingY : playerState.facing;
    walker.clear();
    playerState = { ...playerState, position: { x: pose.x, y: 0, z: pose.z }, facing: facingY, moving: false, speed: 0 };
    rig.snap(playerState.position);
    rig.apply(camera);
    player.update(playerState);
    triggers.reseed(playerState.position);
    poseHandler?.({ x: pose.x, z: pose.z, facingY });
  }

  return {
    id: 'village',
    scene,
    camera,
    layout,
    ready,
    update,
    render,
    setSeason,
    setPlayerState,
    setPlayerPosition(pos) {
      if (!pos) return;
      const prev = playerState.position;
      const dx = pos.x - prev.x;
      const dz = pos.z - prev.z;
      const moving = Math.hypot(dx, dz) > 1e-4;
      playerState = { ...playerState, position: { x: pos.x, y: pos.y ?? 0, z: pos.z }, facing: moving ? Math.atan2(dx, dz) : playerState.facing, moving };
    },
    getPlayerPosition: () => ({ ...playerState.position }),
    setSpawnPoint(point) {
      spawnPoint = point ? { ...layout.spawn, ...point } : { ...layout.spawn };
      setPlayerPose({ x: spawnPoint.x, z: spawnPoint.z, facingY: spawnPoint.facing ?? layout.spawn.facing });
    },
    getPlayerPose,
    setPlayerPose,
    /** Owner of the walk sim (ui-binder / lab) moves its own state when the pose is set. */
    setPoseHandler(fn) { poseHandler = typeof fn === 'function' ? fn : null; },
    /** Ids the game layer handles (from registerInteractables([...])). */
    getRegisteredInteractables: () => handled.map((h) => ({ ...h })),
    getSpawnPoint: () => ({ ...spawnPoint }),
    getMovementBounds: () => ({ ...layout.bounds }),
    getMovementBlockers: () => layout.blockers.map((bl) => ({ ...bl })),
    getCameraAzimuth: () => rig.getAzimuth(),
    /** Emit-only: listener(phase: 'enter'|'leave', trigger: { id, type, prompt, target?, exit?, radius, position }). Returns unsubscribe. */
    onTrigger: (listener) => triggers.onTrigger(listener),
    /**
     * Game layer form: registerInteractables([{ id, type, prompt }]) records which
     * trigger ids it handles (events still fire for every trigger).
     * ZoneManager form: registerInteractables(registerFn) registers nothing, so
     * the legacy InteractionSystem never shows a second prompt for village
     * triggers; the game layer owns prompts.
     */
    registerInteractables(listOrRegister) {
      if (Array.isArray(listOrRegister)) {
        handled = listOrRegister.filter((h) => h && typeof h.id === 'string').map(({ id, type, prompt }) => ({ id, type, prompt }));
      }
    },
    pickGround,
    planPathTo,
    walkTo,
    clearWalk: () => walker.clear(),
    hasWalkTarget: () => walker.hasPath(),
    /** Tap-to-move vector for the walk sim (zero when there is no path). */
    getMovementVector: (dt) => walker.getVector(dt),
    setTapToMoveEnabled(on) { tapEnabled = Boolean(on); if (!on) walker.clear(); },
    getDebugState() {
      let meshes = 0;
      scene.traverse((o) => { if (o.isMesh) meshes += 1; });
      return {
        tier: quality.tier, shadows: preset.shadows, meshes, instancedKinds: instanced.map((m) => m.name),
        trees: treeMeshes.map((m) => [m.name, m.count]), props: Boolean(propsMesh), propsBounds,
        errors: [...assetErrors], cutaway: cutaways.filter((c) => c.cut > 0.5).length,
        player: { ...playerState.position }, inside: triggers.getInside(),
      };
    },
    dispose() {
      inputElement?.removeEventListener?.('pointerdown', onPointerDown);
      inputElement?.removeEventListener?.('pointerup', onPointerUp);
      triggers.dispose();
      creditsEl?.remove();
      scene.traverse((o) => {
        if (o.isInstancedMesh) o.dispose();
        if (o.isMesh && o.geometry && !disposables.includes(o.geometry)) o.geometry.dispose();
        if (o.isMesh && o.material && !disposables.includes(o.material)) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      disposables.forEach((d) => d.dispose?.());
      sun.shadow.map?.dispose?.();
      scene.clear();
    },
  };
}
