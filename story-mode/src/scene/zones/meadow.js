import * as THREE from 'three';
import { SEASON_PALETTE, applyBase } from './season-palette.js';
import { getNPCsInZone } from '../../data/npcs.js';
import { makeNpcMesh, makeForageSpotMesh } from './zone-interactables.js';

const ZONE_DEF = {
  id: 'meadow', name: 'Meadow', biome: 'grassland',
  spawnPoint: { x: -8, z: 0 },
  exitPoints: [
    { id: 'meadow_to_neighborhood', destination: 'neighborhood', position: { x: -8.5, z: 0 },
      triggerBounds: { minX: -12, maxX: -11, minZ: -1.5, maxZ: 1.5 }, spawnPoint: { x: 8, z: 0 } },
    { id: 'meadow_to_forest', destination: 'forest_edge', position: { x: 8.5, z: -4 },
      triggerBounds: { minX: 11, maxX: 12, minZ: -5.5, maxZ: -2.5 }, spawnPoint: { x: -8, z: 0 } },
    { id: 'meadow_to_riverside', destination: 'riverside', position: { x: 0, z: -12 },
      triggerBounds: { minX: -1.5, maxX: 1.5, minZ: -12, maxZ: -11 }, spawnPoint: { x: 0, z: 8 } },
  ],
};

const FORAGE_SPOTS = [
  { id: 'meadow_herbs', position: { x: -2.2, z: 1.1 }, type: 'herb_patch' },
  { id: 'meadow_rocks', position: { x: 1.8, z: -1.2 }, type: 'rock_pile' },
  { id: 'meadow_flowers', position: { x: 2.7, z: 2.4 }, type: 'wildflower_field' },
];

export function createMeadow(store, tracker) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa8c97e);
  scene.fog = new THREE.FogExp2(0xa8c97e, 0.018);
  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);
  camera.position.set(0, 9, 11); camera.lookAt(0, 0.8, 0);
  scene.add(new THREE.HemisphereLight(0xf5f1da, 0x546244, 1.1));
  const sun = new THREE.DirectionalLight(0xfff3d6, 0.9);
  sun.position.set(5, 8, 3); scene.add(sun);
  const root = new THREE.Group(); scene.add(root);

  // Bright green ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x6daa45, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; root.add(ground);

  // Wildflower color patches
  const fc = [0xe84488, 0xdd66aa, 0xeecc44, 0xaa66dd, 0xff8844];
  [[-3, -4], [5, 2], [-6, 5], [2, -7], [7, -5]].forEach(([x, z], i) => {
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), new THREE.MeshStandardMaterial({ color: fc[i], roughness: 1 }));
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.02, z); root.add(p);
  });

  // Tall grass tufts
  const gm = new THREE.MeshStandardMaterial({ color: 0x5a9a30, roughness: 1 });
  [[-2, 1], [4, -2], [-5, -6], [6, 5], [1, 6], [-7, -1], [3, -9]].forEach(([x, z]) => {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.7, 5), gm);
    t.position.set(x, 0.35, z); root.add(t);
  });

  // Scattered boulders
  const rm = new THREE.MeshStandardMaterial({ color: 0x8a8a7a, roughness: 1 });
  [[7, 8, 0.5], [-8, -3, 0.6], [2, 5, 0.4]].forEach(([x, z, r]) => {
    const rock = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 6), rm);
    rock.position.set(x, r * 0.4, z); rock.scale.set(1, 0.6, 1); root.add(rock);
  });

  // Butterfly area (ring of small spheres)
  const bm = new THREE.MeshStandardMaterial({ color: 0xff99cc, roughness: 1 });
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2;
    const bf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), bm);
    bf.position.set(Math.cos(ang) * 1.5, 0.6, -3 + Math.sin(ang) * 1.5); root.add(bf);
  }

  const state = store.getState();
  const season = state.season?.season ?? state.campaign?.currentSeason ?? 'spring';

  const interactables = [];
  ZONE_DEF.exitPoints.forEach((exit) => {
    const mk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0xe8c84a, roughness: 0.9 }));
    mk.position.set(exit.position.x, 0.08, exit.position.z); root.add(mk);
    interactables.push({ id: exit.id, type: 'exit', label: exit.destination, position: { ...exit.position }, radius: 1.4, destination: exit.destination });
  });

  // NPCs scheduled for this zone
  getNPCsInZone('meadow', season).forEach((npc) => {
    const mesh = makeNpcMesh(npc); root.add(mesh);
    interactables.push(mesh.userData.interactable);
  });

  // Forage spots
  FORAGE_SPOTS.forEach((spot) => {
    const mesh = makeForageSpotMesh(spot); root.add(mesh);
    interactables.push(mesh.userData.interactable);
  });

  // Collect wildflower patches for seasonal toggling
  const wildflowers = root.children.filter(c => c.geometry?.type === 'CircleGeometry');
  const hemi = scene.children.find(c => c.isHemisphereLight);

  tracker.track(root);
  let spawnPoint = { ...ZONE_DEF.spawnPoint }, playerPosition = { ...spawnPoint };
  return {
    scene, camera, interactables, spawnPoints: { ...ZONE_DEF.spawnPoint }, zoneId: ZONE_DEF.id,
    setSpawnPoint(p) { if (p) { spawnPoint = { ...p }; playerPosition = { ...p }; } },
    getPlayerPosition() { return { ...playerPosition }; },
    setPlayerPosition(pos) { if (pos) playerPosition = { ...pos }; },
    setSeason(season) {
      applyBase(this, season, ground, hemi, scene.fog);
      const s = season || 'spring';
      gm.color.setHex(SEASON_PALETTE.foliage[s]);
      wildflowers.forEach(w => { w.visible = s !== 'winter'; });
      const wfColors = { spring: [0xe84488,0xeecc44], summer: [0xdd66aa,0xff8844], fall: [0xcc6622,0xaa4411] };
      if (wfColors[s]) wildflowers.forEach((w, i) => w.material.color.setHex(wfColors[s][i % wfColors[s].length]));
    },
    update() {},
    registerInteractables(r) { if (typeof r === 'function') interactables.forEach((e) => r(e)); },
    dispose() { tracker.disposeObject(root); },
  };
}
