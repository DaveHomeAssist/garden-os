import * as THREE from 'three';
import { getNPCsInZone } from '../../data/npcs.js';
import { makeNpcMesh } from './zone-interactables.js';
// Greenhouse intentionally ignores external season — always warm and green inside.

const ZONE_DEF = {
  id: 'greenhouse', name: 'Greenhouse', biome: 'greenhouse',
  spawnPoint: { x: 0, z: 7 },
  exitPoints: [{
    id: 'greenhouse_to_market', destination: 'market_square', position: { x: 0, z: 7.5 },
    triggerBounds: { minX: -1.5, maxX: 1.5, minZ: 7, maxZ: 8 }, spawnPoint: { x: 0, z: -8 },
  }],
};

function box(sx, sy, sz, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  m.position.set(x, y, z); return m;
}

export function createGreenhouse(store, tracker) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ab888);
  scene.fog = new THREE.FogExp2(0x8ab888, 0.025);
  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);
  camera.position.set(0, 9, 11); camera.lookAt(0, 0.8, 0);
  scene.add(new THREE.HemisphereLight(0xe8f0d8, 0x4a7048, 1.2));
  const sun = new THREE.DirectionalLight(0xf0f8e0, 0.7);
  sun.position.set(0, 10, 0); scene.add(sun);
  const warmFill = new THREE.PointLight(0xffddaa, 0.6, 15);
  warmFill.position.set(0, 4, 0); scene.add(warmFill);
  const root = new THREE.Group(); scene.add(root);

  // Concrete floor
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ color: 0x8a9a80, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; root.add(ground);

  // Glass walls (transparent green-tinted)
  const gm = new THREE.MeshStandardMaterial({ color: 0x88ccaa, roughness: 0.1, transparent: true, opacity: 0.25 });
  [[10, 4, 0.1, 0, 2, -5], [10, 4, 0.1, 0, 2, 5], [0.1, 4, 10, -5, 2, 0], [0.1, 4, 10, 5, 2, 0]].forEach(([sx, sy, sz, x, y, z]) => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), gm);
    w.position.set(x, y, z); root.add(w);
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 10), gm);
  roof.position.set(0, 4, 0); root.add(roof);

  // Metal frame posts
  const pm = new THREE.MeshStandardMaterial({ color: 0x7a8a7a, roughness: 0.7 });
  [[-5, -5], [-5, 5], [5, -5], [5, 5]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), pm);
    p.position.set(x, 2, z); root.add(p);
  });

  // Plant tables with potted plants
  [[-2.5, 0], [2.5, 0]].forEach(([tx, tz]) => {
    root.add(box(3.5, 0.8, 1.4, 0x7d5a39, tx, 0.4, tz));
    for (let i = 0; i < 3; i++) root.add(box(0.4, 0.35, 0.4, 0x44aa44, tx - 1 + i, 0.97, tz));
  });

  // Grow lights (emissive rectangles)
  const glm = new THREE.MeshStandardMaterial({ color: 0xeeddff, emissive: 0xccaaff, emissiveIntensity: 0.8, roughness: 0.2 });
  [[-2.5, 0], [2.5, 0]].forEach(([x, z]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 0.5), glm);
    l.position.set(x, 3.5, z); root.add(l);
  });

  // Water barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.9, 10), new THREE.MeshStandardMaterial({ color: 0x4466aa, roughness: 0.8 }));
  barrel.position.set(-4, 0.45, -3.5); root.add(barrel);

  const state = store.getState();
  const season = state.season?.season ?? state.campaign?.currentSeason ?? 'spring';

  const interactables = [];
  ZONE_DEF.exitPoints.forEach((exit) => {
    const mk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0xe8c84a, roughness: 0.9 }));
    mk.position.set(exit.position.x, 0.08, exit.position.z); root.add(mk);
    interactables.push({ id: exit.id, type: 'exit', label: exit.destination, position: { ...exit.position }, radius: 1.4, destination: exit.destination });
  });

  // NPCs scheduled for this zone (Lila in winter)
  getNPCsInZone('greenhouse', season).forEach((npc) => {
    const mesh = makeNpcMesh(npc); root.add(mesh);
    interactables.push(mesh.userData.interactable);
  });

  tracker.track(root);
  let spawnPoint = { ...ZONE_DEF.spawnPoint }, playerPosition = { ...spawnPoint };
  return {
    scene, camera, interactables, spawnPoints: { ...ZONE_DEF.spawnPoint }, zoneId: ZONE_DEF.id,
    setSpawnPoint(p) { if (p) { spawnPoint = { ...p }; playerPosition = { ...p }; } },
    getPlayerPosition() { return { ...playerPosition }; },
    setPlayerPosition(pos) { if (pos) playerPosition = { ...pos }; },
    setSeason(/* season */) {
      // Greenhouse interior stays warm and green regardless of outdoor season.
      // Only subtle fog change to hint at exterior conditions.
    },
    update() {},
    registerInteractables(r) { if (typeof r === 'function') interactables.forEach((e) => r(e)); },
    dispose() { tracker.disposeObject(root); },
  };
}
