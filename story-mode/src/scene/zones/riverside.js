import * as THREE from 'three';
import { SEASON_PALETTE, applyBase } from './season-palette.js';
import { makeForageSpotMesh } from './zone-interactables.js';
import { getZoneExitPoints } from './world-zone-contract.js';

const ZONE_DEF = {
  id: 'riverside', name: 'Riverside', biome: 'river',
  spawnPoint: { x: 0, z: 8 },
};

const FORAGE_SPOTS = [
  { id: 'riverside_berries', position: { x: -1.4, z: 2.6 }, type: 'berry_bush' },
  { id: 'riverside_driftwood', position: { x: 2.9, z: -0.7 }, type: 'driftwood' },
];

export function createRiverside(store, tracker) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ea8c0);
  scene.fog = new THREE.FogExp2(0x7ea8c0, 0.02);
  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);
  camera.position.set(0, 9, 11); camera.lookAt(0, 0.8, 0);
  scene.add(new THREE.HemisphereLight(0xd0e0f0, 0x4a6858, 1.1));
  const sun = new THREE.DirectionalLight(0xfff3d6, 0.8);
  sun.position.set(5, 8, 3); scene.add(sun);
  const root = new THREE.Group(); scene.add(root);

  // Sandy bank ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0xc2a878, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; root.add(ground);

  // Water plane (animated Y oscillation)
  const water = new THREE.Mesh(new THREE.PlaneGeometry(20, 6),
    new THREE.MeshStandardMaterial({ color: 0x3388aa, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.75 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.02, -3); root.add(water);

  // River rocks
  const rm = new THREE.MeshStandardMaterial({ color: 0x7a7a72, roughness: 1 });
  [[-3, -1.5, 0.3], [1, -4, 0.25], [4, -2, 0.35], [-5, -3.5, 0.2], [6, -4.5, 0.28]].forEach(([x, z, r]) => {
    const rock = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 6), rm);
    rock.position.set(x, r * 0.3, z); rock.scale.set(1, 0.55, 1); root.add(rock);
  });

  // Driftwood
  const dm = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 });
  [[-2, 1], [5, 0.5]].forEach(([x, z]) => {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2, 6), dm);
    d.rotation.z = Math.PI / 2; d.rotation.y = 0.3; d.position.set(x, 0.1, z); root.add(d);
  });

  // Berry bushes with berries
  const bm = new THREE.MeshStandardMaterial({ color: 0x3a7a3a, roughness: 1 });
  const brm = new THREE.MeshStandardMaterial({ color: 0xaa2255, roughness: 0.8 });
  [[6, 5], [-6, 4], [3, 7]].forEach(([x, z]) => {
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.6, 7, 6), bm);
    bush.position.set(x, 0.4, z); bush.scale.set(1, 0.7, 1); root.add(bush);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 5), brm);
      b.position.set(x + (i - 1) * 0.25, 0.65, z + 0.2); root.add(b);
    }
  });

  // Grass tufts along bank
  const gm = new THREE.MeshStandardMaterial({ color: 0x5a9a40, roughness: 1 });
  [[-4, 2], [0, 1.5], [3, 2.5]].forEach(([x, z]) => {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 5), gm);
    t.position.set(x, 0.25, z); root.add(t);
  });

  const interactables = [];
  getZoneExitPoints(ZONE_DEF.id).forEach((exit) => {
    const mk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0xe8c84a, roughness: 0.9 }));
    mk.position.set(exit.position.x, 0.08, exit.position.z); root.add(mk);
    interactables.push({ id: exit.id, type: 'exit', label: exit.destination, position: { ...exit.position }, radius: 1.4, destination: exit.destination });
  });

  // Forage spots
  FORAGE_SPOTS.forEach((spot) => {
    const mesh = makeForageSpotMesh(spot); root.add(mesh);
    interactables.push(mesh.userData.interactable);
  });

  const hemi = scene.children.find(c => c.isHemisphereLight);

  tracker.track(root);
  let spawnPoint = { ...ZONE_DEF.spawnPoint }, playerPosition = { ...spawnPoint }, time = 0;
  return {
    scene, camera, interactables, spawnPoints: { ...ZONE_DEF.spawnPoint }, zoneId: ZONE_DEF.id,
    setSpawnPoint(p) { if (p) { spawnPoint = { ...p }; playerPosition = { ...p }; } },
    getPlayerPosition() { return { ...playerPosition }; },
    setPlayerPosition(pos) { if (pos) playerPosition = { ...pos }; },
    setSeason(season) {
      const s = season || 'spring';
      applyBase(this, s, ground, hemi, scene.fog);
      water.material.color.setHex(SEASON_PALETTE.water[s]);
      bm.color.setHex(SEASON_PALETTE.foliage[s]);
      gm.color.setHex(SEASON_PALETTE.foliage[s]);
    },
    update(dt) { time += dt; water.position.y = 0.02 + Math.sin(time * 1.5) * 0.04; },
    registerInteractables(r) { if (typeof r === 'function') interactables.forEach((e) => r(e)); },
    dispose() { tracker.disposeObject(root); },
  };
}
