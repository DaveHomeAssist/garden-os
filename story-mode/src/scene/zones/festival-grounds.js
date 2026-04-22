import * as THREE from 'three';
import { SEASON_PALETTE, applyBase } from './season-palette.js';
import { getZoneExitPoints } from './world-zone-contract.js';

const ZONE_DEF = {
  id: 'festival_grounds', name: 'Festival Grounds', biome: 'festival',
  spawnPoint: { x: -8, z: 0 },
};

function box(sx, sy, sz, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  m.position.set(x, y, z); return m;
}

export function createFestivalGrounds(store, tracker) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd4a86a);
  scene.fog = new THREE.FogExp2(0xd4a86a, 0.018);
  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);
  camera.position.set(0, 9, 11); camera.lookAt(0, 0.8, 0);
  scene.add(new THREE.HemisphereLight(0xfff0d0, 0x6a5838, 1.5)); // extra bright ambient
  const sun = new THREE.DirectionalLight(0xffe8a0, 1.1);
  sun.position.set(5, 8, 3); scene.add(sun);
  const root = new THREE.Group(); scene.add(root);

  // Festival ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0xa08050, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; root.add(ground);

  // Colored ground patches
  const pc = [0xcc4444, 0x44aa66, 0x4466cc, 0xddaa22];
  [[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach(([x, z], i) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ color: pc[i], roughness: 1 }));
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.01, z); root.add(p);
  });

  // Stage platform + backdrop
  root.add(box(5, 0.5, 3, 0x7d5a39, 0, 0.25, -6));
  root.add(box(5, 2, 0.1, 0x993333, 0, 1.5, -7.4));

  // Banner poles with flags
  const pm = new THREE.MeshStandardMaterial({ color: 0x5d3b22, roughness: 1 });
  [[-6, 0], [6, 0], [-3, -6], [3, -6]].forEach(([x, z]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3, 6), pm);
    pole.position.set(x, 1.5, z); root.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xe8c84a, roughness: 0.9, side: THREE.DoubleSide }));
    flag.position.set(x + 0.35, 2.5, z); root.add(flag);
  });

  // String lights (emissive spheres in a catenary)
  const bc = [0xff6644, 0x44cc66, 0x4488ff, 0xffaa22, 0xff44aa, 0x44dddd];
  const bulbs = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 7, x = -6 + t * 12, y = 2.8 - Math.sin(t * Math.PI) * 0.4;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6),
      new THREE.MeshStandardMaterial({ color: bc[i % 6], emissive: bc[i % 6], emissiveIntensity: 0.7 }));
    bulb.position.set(x, y, 0); root.add(bulb); bulbs.push(bulb);
  }

  // Hay bale seating
  [[-2, 2], [2, 2], [0, 3.5]].forEach(([x, z]) => root.add(box(1.2, 0.6, 0.8, 0xccaa55, x, 0.3, z)));

  const interactables = [];
  getZoneExitPoints(ZONE_DEF.id).forEach((exit) => {
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
      const intensity = s === 'winter' ? 1.4 : s === 'fall' ? 0.9 : 0.7;
      bulbs.forEach(b => { b.material.emissiveIntensity = intensity; });
    },
    update() {},
    registerInteractables(r) { if (typeof r === 'function') interactables.forEach((e) => r(e)); },
    dispose() { tracker.disposeObject(root); },
  };
}
