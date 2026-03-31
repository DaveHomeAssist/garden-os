import * as THREE from 'three';
import { SEASON_PALETTE, applyBase } from './season-palette.js';

const ZONE_DEF = {
  id: 'player_plot', name: "Player's Plot", biome: 'garden',
  spawnPoint: { x: 0, z: 3 },
  exitPoints: [{
    id: 'plot_to_neighborhood', destination: 'neighborhood',
    position: { x: 0, z: -8.5 },
    triggerBounds: { minX: -1.5, maxX: 1.5, minZ: -9, maxZ: -8 },
    spawnPoint: { x: 0, z: 7 },
  }],
};

function box(sx, sy, sz, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  m.position.set(x, y, z);
  return m;
}

export function createPlayerPlot(store, tracker) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9bb886);
  scene.fog = new THREE.FogExp2(0x9bb886, 0.02);
  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);
  camera.position.set(0, 9, 11);
  camera.lookAt(0, 0.8, 0);
  scene.add(new THREE.HemisphereLight(0xf5f1da, 0x546244, 1.1));
  const sun = new THREE.DirectionalLight(0xfff3d6, 0.9);
  sun.position.set(5, 8, 3);
  scene.add(sun);
  const root = new THREE.Group();
  scene.add(root);

  // Brown soil ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshStandardMaterial({ color: 0x8b6b4a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  // Grass border patches
  const gm = new THREE.MeshStandardMaterial({ color: 0x6d8e55, roughness: 1 });
  [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), gm);
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.005, z); root.add(p);
  });

  // Wooden fence perimeter
  root.add(box(18, 0.6, 0.12, 0x6b4226, 0, 0.3, -9));
  root.add(box(18, 0.6, 0.12, 0x6b4226, 0, 0.3, 9));
  root.add(box(0.12, 0.6, 18, 0x6b4226, -9, 0.3, 0));
  root.add(box(0.12, 0.6, 18, 0x6b4226, 9, 0.3, 0));
  // Fence posts
  [[-9, -9], [-9, 9], [9, -9], [9, 9], [-9, 0], [9, 0], [0, -9]].forEach(([x, z]) => {
    root.add(box(0.18, 0.9, 0.18, 0x5d3b22, x, 0.45, z));
  });

  // Shed + roof
  root.add(box(2.4, 1.8, 2, 0x7d5a39, -6, 0.9, -5));
  root.add(box(2.6, 0.15, 2.4, 0x5d3b22, -6, 1.85, -5));
  // Potting bench + pot
  root.add(box(1.6, 0.8, 0.7, 0x8b6a4d, -3, 0.4, -5));
  root.add(box(0.4, 0.25, 0.3, 0xcc6633, -3.2, 0.95, -5));

  // Stone path to exit
  const sm = new THREE.MeshStandardMaterial({ color: 0x9a9a8a, roughness: 1 });
  for (let z = -8; z <= 3; z += 1.5) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.08, 8), sm);
    s.position.set(0, 0.04, z); root.add(s);
  }

  // Soil bed rows
  for (let i = 0; i < 3; i++) root.add(box(3, 0.2, 1.2, 0x5b3a1e, 3.5, 0.1, -2 + i * 2.5));

  const interactables = [];
  ZONE_DEF.exitPoints.forEach((exit) => {
    const mk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0xe8c84a, roughness: 0.9 }));
    mk.position.set(exit.position.x, 0.08, exit.position.z); root.add(mk);
    interactables.push({ id: exit.id, type: 'exit', label: exit.destination, position: { ...exit.position }, radius: 1.4, destination: exit.destination });
  });
  const hemi = scene.children.find(c => c.isHemisphereLight);

  tracker.track(root);
  let spawnPoint = { ...ZONE_DEF.spawnPoint }, playerPosition = { ...spawnPoint };
  return {
    scene, camera, interactables, spawnPoints: { ...ZONE_DEF.spawnPoint }, zoneId: ZONE_DEF.id,
    setSpawnPoint(p) { if (p) { spawnPoint = { ...p }; playerPosition = { ...p }; } },
    getPlayerPosition() { return { ...playerPosition }; },
    setPlayerPosition(pos) { if (pos) playerPosition = { ...pos }; },
    setSeason(season) {
      const s = season || 'spring';
      applyBase(this, s, ground, hemi, scene.fog);
      gm.color.setHex(SEASON_PALETTE.foliage[s]);
    },
    update() {},
    registerInteractables(r) { if (typeof r === 'function') interactables.forEach((e) => r(e)); },
    dispose() { tracker.disposeObject(root); },
  };
}
