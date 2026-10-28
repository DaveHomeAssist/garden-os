/**
 * Opening-yard art pass ("A on B": clean low-poly shapes, painted texture,
 * warm light). Purely visual: it never touches collision, walk areas,
 * interactables or saves. It
 *   - swaps the legacy ground/sky materials (the meshes, raycasts and debug
 *     contracts stay as they were),
 *   - hides the legacy scenery meshes it replaces (place cues stay registered),
 *   - adds hills, treeline, fence, cottage, props, grass and flowers in their
 *     own group directly under the scene (outside the legacy style targets),
 *   - and, for each frame only, swaps in its lighting rig and grade, then
 *     restores the legacy light values so game logic and tests read them as
 *     before.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  resolveArtQuality, storeArtQualityChoice, getArtQualityPreset, ART_QUALITY_PRESETS,
} from './art-quality.js';
import { YARD_PALETTE, YARD_LIGHT, MOOD_ART_WEIGHT, STYLE_ART_NUDGE } from './yard-palette.js';
import {
  COTTAGE, YARD_TREES, YARD_BUSHES, PROP_PLACEMENTS, PROP_SET1_PLACEMENTS, buildTreeline, buildGroundScatter, makeRng,
} from './yard-layout.js';
import { createSkyMaterial, paintSkyGradient } from './yard-sky.js';
import { buildGroundMaskTexture, createGroundMaterial } from './yard-ground.js';
import {
  TREE_VARIANTS, buildTreeGeometry, buildGrassClumpGeometry, buildFlowerGeometry, applyWind, instancePlacements,
} from './yard-foliage.js';
import { buildHillsGeometry, buildFarTreePlacements, buildFenceGeometry } from './yard-backdrop.js';
import { createGradePass } from './yard-post.js';
import { toFloatGeometry, propKitGeometriesFromGltf, mergePropPlacements } from './prop-kit.js';

const ASSET_URLS = {
  cottage: new URL('../../../assets/art/yard/cottage.glb', import.meta.url).href,
  props: new URL('../../../assets/art/yard/props.glb', import.meta.url).href,
  cottageAtlas: new URL('../../../assets/art/yard/cottage_atlas.webp', import.meta.url).href,
  propsAtlas: new URL('../../../assets/art/yard/props_atlas.webp', import.meta.url).href,
  propsSet1: new URL('../../../assets/art/yard/props_set1.glb', import.meta.url).href,
  propsSet1Atlas: new URL('../../../assets/art/yard/props_set1_atlas.webp', import.meta.url).href,
  grass: new URL('../../../assets/art/yard/grass.webp', import.meta.url).href,
  dirt: new URL('../../../assets/art/yard/dirt.webp', import.meta.url).href,
  path: new URL('../../../assets/art/yard/path.webp', import.meta.url).href,
  wood: new URL('../../../assets/art/yard/wood.webp', import.meta.url).href,
  soil: new URL('../../../assets/art/yard/soil.webp', import.meta.url).href,
};
export { ASSET_URLS as YARD_ART_ASSET_URLS };

const SEASON_SUN = { spring: 1.0, summer: 1.06, fall: 0.94, winter: 0.78 };
const CALM_HEMI = 0.6; // MOOD_PRESETS.calm.ambientIntensity in garden-scene.js

/** Legacy ground displacement (garden-scene.js), flattened inside the yard. */
export function flattenYardGround(geometry) {
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i); const z = -pos.getY(i);
    const d = Math.hypot(x, z);
    const k = THREE.MathUtils.smoothstep(d, 11, 17);
    pos.setZ(i, pos.getZ(i) * k);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

/** Same displacement as the legacy ground generator, after flattening. */
export function groundHeightAt(x, z) {
  const d = Math.hypot(x, z);
  const ly = -z;
  const swell = Math.sin(x * 0.52) * Math.cos(ly * 0.58) * 0.04;
  const ripple = Math.sin((x + ly) * 0.34) * 0.025;
  const roll = Math.cos(x * 0.28 + 1.2) * Math.sin(ly * 0.22) * 0.02;
  const centerFade = Math.min(d / 5.5, 1);
  return (swell + ripple + roll) * (0.15 + centerFade * 0.85) * THREE.MathUtils.smoothstep(d, 11, 17) - 0.01;
}

export { toFloatGeometry };

function snapshotRig(r) {
  return {
    exposure: r.renderer.toneMappingExposure,
    toneMapping: r.renderer.toneMapping,
    shadows: r.renderer.shadowMap.enabled,
    fogColor: r.scene.fog?.color.clone(),
    fogDensity: r.scene.fog?.density,
    hemiColor: r.hemi.color.clone(), hemiGround: r.hemi.groundColor.clone(), hemiIntensity: r.hemi.intensity,
    ambColor: r.ambient.color.clone(), ambIntensity: r.ambient.intensity,
    sunColor: r.sun.color.clone(), sunIntensity: r.sun.intensity, sunPos: r.sun.position.clone(), sunCast: r.sun.castShadow,
    fillColor: r.fill.color.clone(), fillIntensity: r.fill.intensity, fillPos: r.fill.position.clone(),
    rimColor: r.rim.color.clone(), rimIntensity: r.rim.intensity, rimPos: r.rim.position.clone(),
  };
}

function restoreRig(r, s) {
  r.renderer.toneMappingExposure = s.exposure;
  r.renderer.toneMapping = s.toneMapping;
  r.renderer.shadowMap.enabled = s.shadows;
  if (r.scene.fog) { r.scene.fog.color.copy(s.fogColor); r.scene.fog.density = s.fogDensity; }
  r.hemi.color.copy(s.hemiColor); r.hemi.groundColor.copy(s.hemiGround); r.hemi.intensity = s.hemiIntensity;
  r.ambient.color.copy(s.ambColor); r.ambient.intensity = s.ambIntensity;
  r.sun.color.copy(s.sunColor); r.sun.intensity = s.sunIntensity; r.sun.position.copy(s.sunPos); r.sun.castShadow = s.sunCast;
  r.fill.color.copy(s.fillColor); r.fill.intensity = s.fillIntensity; r.fill.position.copy(s.fillPos);
  r.rim.color.copy(s.rimColor); r.rim.intensity = s.rimIntensity; r.rim.position.copy(s.rimPos);
}

function loadTexture(loader, url, { srgb = true, repeat = true, anisotropy = 4 } = {}) {
  const tex = loader.load(url);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; }
  tex.anisotropy = anisotropy;
  return tex;
}

/** Far-hill tree dots: tiny faceted blob or cone, vertex painted. */
function farTreeGeometry(kind, pal, seed) {
  const rng = makeRng(seed);
  const leaf = new THREE.Color(kind === 'cone' ? pal.pine : pal.leafMid);
  const parts = [];
  const g = kind === 'cone' ? new THREE.ConeGeometry(0.42, 1.5, 5, 1) : new THREE.IcosahedronGeometry(0.55, 0);
  g.translate(0, kind === 'cone' ? 1.05 : 0.95, 0);
  if (kind !== 'cone') g.scale(1, 0.9, 1);
  const trunk = new THREE.CylinderGeometry(0.06, 0.08, 0.5, 4, 1);
  trunk.translate(0, 0.25, 0);
  const paint = (geo, color, spread) => {
    const q = geo.index ? geo.toNonIndexed() : geo;
    q.deleteAttribute('uv');
    const pos = q.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i += 3) {
      const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      c.copy(color).multiplyScalar(0.78 + y * 0.12 + rng() * spread);
      for (let k = 0; k < 3; k += 1) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b; }
    }
    q.setAttribute('color', new THREE.BufferAttribute(col, 3));
    q.computeVertexNormals();
    parts.push(q);
  };
  paint(g, leaf, 0.18);
  paint(trunk, new THREE.Color(pal.bark), 0.1);
  return mergeGeometries(parts, false);
}

export function createYardArt(refs) {
  const {
    scene, renderer, camera, ground, skyMesh, grassGroup, scenery, bed, hemi, ambient, sun, fill, rim,
    getStyleName = () => 'story', tracker = null,
  } = refs;
  const rigRefs = { renderer, scene, hemi, ambient, sun, fill, rim };
  let quality = resolveArtQuality();
  let preset = getArtQualityPreset(quality.tier);
  let season = 'spring';
  let pal = YARD_PALETTE.spring;
  let moodName = 'calm';
  let moodWeight = 0;
  let lastFrame = performance.now();
  let loaded = false;
  const windUniforms = { uWindTime: { value: 0 }, uWindStrength: { value: 1 } };

  const group = new THREE.Group();
  group.name = 'yard-art';
  scene.add(group);

  const texLoader = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities?.getMaxAnisotropy?.() ?? 1);
  const tex = {
    grass: loadTexture(texLoader, ASSET_URLS.grass, { anisotropy: aniso }),
    dirt: loadTexture(texLoader, ASSET_URLS.dirt, { anisotropy: aniso }),
    path: loadTexture(texLoader, ASSET_URLS.path, { anisotropy: aniso }),
    wood: loadTexture(texLoader, ASSET_URLS.wood, { anisotropy: aniso }),
    soil: loadTexture(texLoader, ASSET_URLS.soil, { anisotropy: aniso }),
    cottageAtlas: loadTexture(texLoader, ASSET_URLS.cottageAtlas, { repeat: false, anisotropy: aniso }),
    propsAtlas: loadTexture(texLoader, ASSET_URLS.propsAtlas, { repeat: false, anisotropy: aniso }),
    propsSet1Atlas: loadTexture(texLoader, ASSET_URLS.propsSet1Atlas, { repeat: false, anisotropy: aniso }),
  };
  // glTF UVs are top-left origin
  tex.cottageAtlas.flipY = false;
  tex.propsAtlas.flipY = false;
  tex.propsSet1Atlas.flipY = false;

  // ---- ground: swap the material on the legacy mesh (raycast/receive unchanged)
  const legacy = { groundMaterial: ground.material, skyMaterial: skyMesh.material };
  flattenYardGround(ground.geometry);
  const groundMat = createGroundMaterial({ grass: tex.grass, dirt: tex.dirt, path: tex.path, mask: buildGroundMaskTexture(256) });
  ground.material = groundMat;
  ground.receiveShadow = true;

  // ---- sky: same dome mesh, painted gradient + cloud shader
  const skyMat = createSkyMaterial({ octaves: preset.skyOctaves });
  skyMesh.material = skyMat;
  skyMesh.renderOrder = -1;
  const skyRadius = skyMesh.geometry.parameters?.radius ?? 260;

  // ---- hills + far trees
  const hillMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  hillMat.name = 'yard-art-hills';
  const hills = new THREE.Mesh(buildHillsGeometry(pal), hillMat);
  hills.name = 'yard-art-hills';
  group.add(hills);

  const foliageMat = applyWind(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 }), windUniforms, { strength: 0.022, key: 'tree-wind' });
  foliageMat.name = 'yard-art-foliage';
  const farMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
  farMat.name = 'yard-art-far-trees';

  const farPlacements = buildFarTreePlacements(ART_QUALITY_PRESETS.high.farTrees);
  const farSets = { round: farPlacements.filter((_, i) => i % 3 !== 0), cone: farPlacements.filter((_, i) => i % 3 === 0) };
  const farMeshes = {};
  for (const kind of ['round', 'cone']) {
    const m = instancePlacements(farTreeGeometry(kind, pal, kind === 'cone' ? 5 : 9), farMat, farSets[kind]);
    m.name = `yard-art-far-${kind}`;
    m.userData.capacity = farSets[kind].length;
    farMeshes[kind] = m;
    group.add(m);
  }

  // ---- tree family: one InstancedMesh per variant (yard trees + treeline + bushes)
  const treeline = buildTreeline(ART_QUALITY_PRESETS.high.treeline);
  const treeSets = Object.fromEntries(TREE_VARIANTS.map((v) => [v, []]));
  YARD_TREES.forEach((t) => treeSets[t.variant].push({ ...t, y: -0.01, keep: true }));
  YARD_BUSHES.forEach((b) => treeSets.bush.push({ ...b, y: -0.01, keep: true }));
  // keep yard instances first so the low tier trims only the treeline
  treeline.forEach((t) => treeSets[t.variant].push({ ...t, y: groundHeightAt(t.x, t.z) - 0.02 }));
  const treeMeshes = {};
  for (const variant of TREE_VARIANTS) {
    const placements = treeSets[variant];
    const m = instancePlacements(buildTreeGeometry(variant, pal, 11 + variant.length), foliageMat, placements, {
      color: (p, i) => new THREE.Color(1, 1, 1).multiplyScalar(0.9 + makeRng(i * 7 + 3)() * 0.2),
    });
    m.name = `yard-art-${variant}`;
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.capacity = placements.length;
    m.userData.keepCount = placements.filter((p) => p.keep).length;
    treeMeshes[variant] = m;
    group.add(m);
  }

  // ---- grass clumps + flowers (instanced, wind in the vertex shader)
  const grassMat = applyWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }), windUniforms, { strength: 0.9, key: 'grass-wind' });
  grassMat.name = 'yard-art-grass';
  const grassPlacements = buildGroundScatter(ART_QUALITY_PRESETS.high.grassClumps, { seed: 99 })
    .map((p) => ({ ...p, y: groundHeightAt(p.x, p.z), scale: p.scale * (0.75 + p.edge * 1.1) }));
  const grassBaseGeo = buildGrassClumpGeometry(YARD_PALETTE.spring);
  const grassMesh = instancePlacements(grassBaseGeo, grassMat, grassPlacements);
  grassMesh.name = 'yard-art-grass';
  grassMesh.receiveShadow = true;
  grassMesh.userData.capacity = grassPlacements.length;
  group.add(grassMesh);

  const flowerMat = applyWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 }), windUniforms, { strength: 1.4, key: 'flower-wind' });
  flowerMat.name = 'yard-art-flowers';
  const flowerPlacements = buildGroundScatter(ART_QUALITY_PRESETS.high.flowers, { seed: 313, flowers: true })
    .map((p) => ({ ...p, y: groundHeightAt(p.x, p.z), scale: 1.0 + p.tint * 0.6 }));
  const flowerMesh = instancePlacements(buildFlowerGeometry(), flowerMat, flowerPlacements, { color: () => new THREE.Color(1, 1, 1) });
  flowerMesh.name = 'yard-art-flowers';
  flowerMesh.userData.capacity = flowerPlacements.length;
  group.add(flowerMesh);

  // ---- fence (merged, wood texture)
  const woodMat = new THREE.MeshStandardMaterial({ map: tex.wood, color: 0xd6c2a8, vertexColors: true, roughness: 0.9, metalness: 0 });
  woodMat.name = 'yard-art-wood';
  const fence = new THREE.Mesh(buildFenceGeometry(), woodMat);
  fence.name = 'yard-art-fence';
  fence.castShadow = true;
  fence.receiveShadow = true;
  group.add(fence);

  // ---- baked glTF assets
  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  const loadGlb = (url) => new Promise((resolve, reject) => gltfLoader.load(url, resolve, undefined, reject));
  // Atlases load as separate WebP files (the CSP blocks GLTFLoader's blob: image path).
  const bakedMaterial = (atlas) => new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.88, metalness: 0 });
  let cottage = null;
  let props = null;
  let propsSet1 = null;
  const assetErrors = [];
  /** One prop-kit GLB (one named node per prop) -> one merged, shadowed mesh at its placements. */
  const loadPropKit = (url, atlas, placements, name) => loadGlb(url).then((gltf) => {
    const merged = mergePropPlacements(propKitGeometriesFromGltf(gltf), placements, name, assetErrors);
    const pm = bakedMaterial(atlas);
    pm.name = name;
    const mesh = new THREE.Mesh(merged, pm);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  });
  const ready = Promise.allSettled([
    loadGlb(ASSET_URLS.cottage).then((gltf) => {
      let src = null;
      gltf.scene.traverse((o) => { if (o.isMesh && !src) src = o; });
      if (!src) throw new Error('cottage.glb has no mesh');
      src.updateWorldMatrix(true, false);
      const geo = toFloatGeometry(src.geometry).applyMatrix4(src.matrixWorld);
      const mat = bakedMaterial(tex.cottageAtlas);
      mat.name = 'yard-art-cottage';
      const spots = [{ x: COTTAGE.position.x, z: COTTAGE.position.z, rotationY: COTTAGE.rotationY, y: 0 }, ...COTTAGE.neighbours.map((n) => ({ ...n, y: groundHeightAt(n.x, n.z) - 0.05 }))];
      cottage = instancePlacements(geo, mat, spots);
      cottage.name = 'yard-art-cottage';
      cottage.castShadow = true;
      cottage.receiveShadow = true;
      group.add(cottage);
    }),
    loadPropKit(ASSET_URLS.props, tex.propsAtlas, PROP_PLACEMENTS, 'yard-art-props').then((m) => { props = m; }),
    // prop set 1 (wheelbarrow, rain barrel, bench, birdhouse): own GLB + atlas, one more draw call
    loadPropKit(ASSET_URLS.propsSet1, tex.propsSet1Atlas, PROP_SET1_PLACEMENTS, 'yard-art-props-set1').then((m) => { propsSet1 = m; }),
  ]).then((results) => {
    results.forEach((r) => { if (r.status === 'rejected') assetErrors.push(String(r.reason?.message ?? r.reason)); });
    loaded = true;
    if (assetErrors.length) console.warn('[yard-art] asset problems:', assetErrors);
    applyTier();
    return { errors: assetErrors };
  });

  // ---- legacy scenery: hide what the art replaces, move narrative bits to the new doorstep
  scenery?.setArtOverlay?.(true, {
    // chimney pot top (see build_yard_assets.py: CX0 + 0.18, y 0.28, HW + RISE + 0.66)
    smoke: { x: COTTAGE.position.x + COTTAGE.halfWidth + 0.18, y: 3.75, z: COTTAGE.position.z - 0.28 },
    porchLight: { x: COTTAGE.doorX + 0.62, y: 1.22, z: COTTAGE.frontZ + 0.22 },
    pennant: { x: COTTAGE.doorX + 0.5, y: 0.68, z: COTTAGE.frontZ + 0.02, rotationY: 0 },
    // notebook + cover + jar on the top door step (top at y 0.14)
    narrative: [
      { x: COTTAGE.doorX - 0.3, y: 0.145, z: COTTAGE.frontZ + 0.2 },
      { x: COTTAGE.doorX - 0.3, y: 0.15, z: COTTAGE.frontZ + 0.2 },
      { x: COTTAGE.doorX + 0.34, y: 0.17, z: COTTAGE.frontZ + 0.22 },
    ],
  });
  if (grassGroup) grassGroup.visible = false;
  bed?.setArtMaterials?.({ wood: tex.wood, soil: tex.soil });

  // ---- lights (static parts of the rig)
  sun.shadow.camera.left = -11; sun.shadow.camera.right = 11;
  sun.shadow.camera.top = 11; sun.shadow.camera.bottom = -11;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  if ('intensity' in sun.shadow) sun.shadow.intensity = 0.82;
  sun.shadow.camera.updateProjectionMatrix();
  const sunDir = new THREE.Vector3(...YARD_LIGHT.sunDirection).normalize();
  const fillDir = new THREE.Vector3(...YARD_LIGHT.fillDirection).normalize();
  const rimDir = new THREE.Vector3(...YARD_LIGHT.rimDirection).normalize();

  let grade = null;
  function applyTier() {
    preset = getArtQualityPreset(quality.tier);
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, preset.maxPixelRatio));
    const size = new THREE.Vector2();
    renderer.getSize(size);
    if (size.x > 0 && size.y > 0) renderer.setSize(size.x, size.y, false);
    if (sun.shadow.mapSize.x !== preset.shadowMapSize) {
      sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
      sun.shadow.map?.dispose?.();
      sun.shadow.map = null;
    }
    grassMesh.count = Math.min(grassMesh.userData.capacity, preset.grassClumps);
    flowerMesh.count = season === 'winter' ? 0 : Math.min(flowerMesh.userData.capacity, Math.round(preset.flowers * (season === 'fall' ? 0.35 : 1)));
    const farShare = preset.farTrees / ART_QUALITY_PRESETS.high.farTrees;
    for (const m of Object.values(farMeshes)) m.count = Math.round(m.userData.capacity * farShare);
    const lineShare = preset.treeline / ART_QUALITY_PRESETS.high.treeline;
    for (const m of Object.values(treeMeshes)) {
      const extra = m.userData.capacity - m.userData.keepCount;
      m.count = m.userData.keepCount + Math.round(extra * lineShare);
    }
    if (skyMat.defines.SKY_OCTAVES !== preset.skyOctaves) { skyMat.defines.SKY_OCTAVES = preset.skyOctaves; skyMat.needsUpdate = true; }
    if (preset.post && !grade) grade = createGradePass({ samples: preset.msaa });
    if (!preset.post && grade) { grade.dispose(); grade = null; }
    if (typeof document !== 'undefined' && document.body) {
      document.body.dataset.artQuality = quality.tier;
      document.body.dataset.artQualityChoice = quality.choice;
    }
  }

  function tintGrass() {
    const ratio = new THREE.Color(pal.grassMid);
    const base = new THREE.Color(YARD_PALETTE.spring.grassMid);
    ratio.r /= base.r; ratio.g /= base.g; ratio.b /= base.b;
    const c = new THREE.Color();
    grassPlacements.forEach((p, i) => {
      const v = 0.82 + p.tint * 0.34;
      c.setRGB(ratio.r * v, ratio.g * v, ratio.b * v);
      grassMesh.setColorAt(i, c);
    });
    grassMesh.instanceColor.needsUpdate = true;
    const flowers = pal.flowers.map((f) => new THREE.Color(f));
    flowerPlacements.forEach((p, i) => flowerMesh.setColorAt(i, flowers[Math.floor(p.tint * flowers.length) % flowers.length]));
    flowerMesh.instanceColor.needsUpdate = true;
  }

  function applySeason(nextSeason) {
    season = YARD_PALETTE[nextSeason] ? nextSeason : 'spring';
    pal = YARD_PALETTE[season];
    paintSkyGradient(skyMesh.geometry, pal, skyRadius);
    skyMat.uniforms.uSunGlow.value.set(pal.sunGlow);
    skyMat.uniforms.uCloudLit.value.set(pal.cloudLit);
    skyMat.uniforms.uCloudShade.value.set(pal.cloudShade);
    skyMat.uniforms.uCloudCover.value = season === 'winter' ? 0.62 : season === 'summer' ? 0.32 : 0.44;
    const oldHills = hills.geometry; hills.geometry = buildHillsGeometry(pal); oldHills.dispose();
    for (const variant of TREE_VARIANTS) {
      const m = treeMeshes[variant];
      const old = m.geometry; m.geometry = buildTreeGeometry(variant, pal, 11 + variant.length); old.dispose();
    }
    for (const kind of ['round', 'cone']) {
      const m = farMeshes[kind];
      const old = m.geometry; m.geometry = farTreeGeometry(kind, pal, kind === 'cone' ? 5 : 9); old.dispose();
    }
    const gu = groundMat.userData.yardUniforms;
    const tint = new THREE.Color(pal.grassMid);
    const base = new THREE.Color(YARD_PALETTE.spring.grassMid);
    gu.uGrassTint.value.setRGB(tint.r / base.r, tint.g / base.g, tint.b / base.b);
    gu.uFarGrass.value.set(pal.hillNear);
    tintGrass();
    if (grassGroup) grassGroup.visible = false;
    applyTier();
  }

  function setMood(name) { moodName = name || 'calm'; }

  function setQualityChoice(choice) {
    storeArtQualityChoice(choice);
    quality = resolveArtQuality({ search: '' });
    applyTier();
    return quality;
  }

  const tmpColor = new THREE.Color();
  function applyArtRig(legacyState) {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    windUniforms.uWindTime.value += dt;
    skyMat.uniforms.uTime.value += dt;
    const target = MOOD_ART_WEIGHT[moodName] ?? 0.3;
    moodWeight += (target - moodWeight) * Math.min(1, dt * 1.6);
    const w = moodWeight;
    const nudge = STYLE_ART_NUDGE[getStyleName()] ?? STYLE_ART_NUDGE.story;
    const hemiMood = THREE.MathUtils.lerp(1, THREE.MathUtils.clamp(legacyState.hemiIntensity / CALM_HEMI, 0.2, 1.8), w);
    const seasonSun = SEASON_SUN[season] ?? 1;

    // Khronos PBR Neutral keeps the painted hues (ACES greys warm colour out)
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = YARD_LIGHT.exposure * nudge.exposure;
    renderer.shadowMap.enabled = preset.shadows;
    sun.castShadow = preset.shadows;
    if (scene.fog) {
      scene.fog.color.set(pal.horizon).lerp(legacyState.fogColor, w);
      scene.fog.density = YARD_LIGHT.fogDensity * THREE.MathUtils.lerp(1, THREE.MathUtils.clamp(legacyState.fogDensity / 0.02, 0.5, 2.6), w);
    }
    hemi.color.set(pal.hemiSky).lerp(legacyState.hemiColor, w * 0.7);
    hemi.groundColor.set(pal.hemiGround);
    hemi.intensity = YARD_LIGHT.hemiIntensity * nudge.hemi * hemiMood;
    ambient.color.set(pal.hemiSky);
    ambient.intensity = YARD_LIGHT.ambientIntensity * hemiMood;
    sun.color.set(pal.sun).lerp(tmpColor.copy(legacyState.fogColor), w * 0.35);
    sun.intensity = YARD_LIGHT.sunIntensity * nudge.sun * seasonSun * THREE.MathUtils.lerp(1, hemiMood, 0.8);
    sun.position.copy(sunDir).multiplyScalar(16);
    fill.color.set(pal.fill);
    fill.intensity = YARD_LIGHT.fillIntensity * hemiMood;
    fill.position.copy(fillDir).multiplyScalar(10);
    rim.color.set(pal.rim);
    rim.intensity = YARD_LIGHT.rimIntensity * seasonSun;
    rim.position.copy(rimDir).multiplyScalar(10);
    skyMat.uniforms.uSunDir.value.copy(sunDir);
    skyMat.uniforms.uTint.value.copy(legacyState.skyTint);
    skyMat.uniforms.uTintAmount.value = w * 0.75;
    if (grade) grade.material.uniforms.uSaturation.value = 1.06 * nudge.saturation;
  }

  tintGrass();
  applyTier();

  return {
    group,
    ready,
    get quality() { return { ...quality }; },
    applySeason,
    setMood,
    setQualityChoice,
    groundHeightAt,
    /** Render one frame with the art rig, then restore the legacy light values. */
    /** Re-dress a bed rebuilt by setBedSize() (new group, legacy frame) with the art frame + soil. */
    setBed(nextBed) {
      nextBed?.setArtMaterials?.({ wood: tex.wood, soil: tex.soil });
    },
    render(skyTint) {
      const legacyState = snapshotRig(rigRefs);
      legacyState.skyTint = skyTint ?? new THREE.Color(1, 1, 1);
      applyArtRig(legacyState);
      if (grade) grade.render(renderer, scene, camera);
      else renderer.render(scene, camera);
      restoreRig(rigRefs, legacyState);
    },
    getDebugState() {
      const meshes = [];
      group.traverse((o) => {
        if (!o.isMesh) return;
        const box = new THREE.Box3().setFromObject(o);
        const r = (v) => Math.round(v * 100) / 100;
        meshes.push({
          name: o.name, count: o.isInstancedMesh ? o.count : 1, visible: o.visible,
          tris: Math.round((o.geometry.index ? o.geometry.index.count : o.geometry.getAttribute('position').count) / 3),
          box: box.isEmpty() ? null : [r(box.min.x), r(box.min.y), r(box.min.z), r(box.max.x), r(box.max.y), r(box.max.z)],
        });
      });
      return {
        loaded, tier: quality.tier, choice: quality.choice, source: quality.source, season, mood: moodName,
        post: Boolean(grade), shadows: preset.shadows, errors: [...assetErrors], meshes,
      };
    },
    dispose() {
      grade?.dispose();
      Object.values(tex).forEach((t) => t.dispose());
      legacy.groundMaterial?.dispose?.();
      legacy.skyMaterial?.dispose?.();
      group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
      groundMat.userData.yardUniforms?.uMask?.value?.dispose?.();
      groundMat.dispose();
      skyMat.dispose();
      scene.remove(group);
    },
  };
}
