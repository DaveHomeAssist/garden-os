/**
 * Garden Scene — Three.js setup following curling sim renderer3d.js pattern.
 * Returns { resize, sync, render, dispose, raycaster }
 */
import * as THREE from 'three';
import { buildBed } from './bed-model.js';
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

export function createGardenScene(container) {
  // WebGL check
  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
  if (!gl) throw new Error('WebGL not available');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.FogExp2(0x87CEEB, 0.02);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 6, -5);
  camera.lookAt(0, 0, 1);

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

  // Build the garden bed
  const bed = buildBed();
  root.add(bed.group);

  // Ground plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x4a6b3a, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  root.add(ground);

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

  // Raycaster for cell picking
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // Crop mesh cache
  const cropMeshes = new Map();

  function buildCropMesh(cropId) {
    const crop = getCropById(cropId);
    if (!crop) return null;

    const color = CROP_COLORS[crop.faction] || 0x4a8a4a;
    const group = new THREE.Group();

    if (crop.tall) {
      // Tall crop: stem + canopy
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.03, 0.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9 })
      );
      stem.position.y = 0.2;
      stem.castShadow = true;
      group.add(stem);

      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 6),
        new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
      );
      canopy.position.y = 0.42;
      canopy.castShadow = true;
      group.add(canopy);
    } else {
      // Low crop: rosette
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 6),
        new THREE.MeshStandardMaterial({ color, roughness: 0.75 })
      );
      leaf.scale.set(1, 0.5, 1);
      leaf.position.y = 0.06;
      leaf.castShadow = true;
      group.add(leaf);
    }

    return group;
  }

  function syncCrops(grid) {
    const activeIds = new Set();

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
        if (existing.userData.cropId === cell.cropId) continue;
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
    if (scene.fog) scene.fog.color.set(config.sky);
    hemi.color.set(config.sky);
    hemi.groundColor.set(config.ground);
    hemi.intensity = config.ambInt;
    sun.intensity = config.sunInt;
    const angle = (config.sunAngle * Math.PI) / 180;
    sun.position.set(3 * Math.cos(angle), 8 * Math.sin(angle), -2);
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

  return {
    resize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    sync(state) {
      syncCrops(state.season.grid);
      applySeason(state.season.season);
      camCtrl.update();
    },
    render() {
      renderer.render(scene, camera);
    },
    raycastCell,
    dispose() {
      renderer.dispose();
    },
  };
}
