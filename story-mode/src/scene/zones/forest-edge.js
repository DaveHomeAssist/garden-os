import * as THREE from 'three';
import { SEASON_PALETTE, applyBase } from './season-palette.js';
import { getNPCsInZone } from '../../data/npcs.js';
import { makeNpcMesh, makeForageSpotMesh } from './zone-interactables.js';
import { getZoneExitPoints } from './world-zone-contract.js';

const ZONE_DEF = {
  id: 'forest_edge', name: 'Forest Edge', biome: 'forest',
  spawnPoint: { x: -8, z: 0 },
};

function makeTree(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x5d3b22, roughness: 1 }));
  trunk.position.y = 0.7; g.add(trunk);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.8, 7), new THREE.MeshStandardMaterial({ color: 0x2d6a28, roughness: 1 }));
  crown.position.y = 1.9; g.add(crown);
  g.position.set(x, 0, z); return g;
}

const FORAGE_SPOTS = [
  { id: 'forest_herbs', position: { x: -2.8, z: 0.9 }, type: 'herb_patch' },
  { id: 'forest_berries', position: { x: 1.9, z: 1.7 }, type: 'berry_bush' },
  { id: 'forest_mushrooms', position: { x: 0.4, z: -2.1 }, type: 'mushroom_log' },
];

export function createForestEdge(store, tracker) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5c7a48);
  scene.fog = new THREE.FogExp2(0x5c7a48, 0.03);
  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);
  camera.position.set(0, 9, 11); camera.lookAt(0, 0.8, 0);
  scene.add(new THREE.HemisphereLight(0xc5d4b0, 0x3a5228, 1.0));
  const sun = new THREE.DirectionalLight(0xd4e0b0, 0.45); // dappled light
  sun.position.set(3, 6, 4); scene.add(sun);
  const root = new THREE.Group(); scene.add(root);

  // Dark green ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x3a5a28, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; root.add(ground);

  // Dense trees (8)
  [[-6, -6], [-3, -4], [0, -7], [3, -5], [6, -6], [-5, 4], [2, 6], [7, 3]].forEach(([x, z]) => root.add(makeTree(x, z)));

  // Mushroom log (fallen cylinder + mushroom caps)
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 1 }));
  log.rotation.z = Math.PI / 2; log.position.set(3, 0.25, 0); root.add(log);
  const mm = new THREE.MeshStandardMaterial({ color: 0xcc4422, roughness: 0.9 });
  [[2.5, 0.45, 0.15], [3.2, 0.48, -0.2], [3.7, 0.42, 0.1]].forEach(([x, y, z]) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mm);
    c.scale.set(1, 0.5, 1); c.position.set(x, y, z); root.add(c);
  });

  // Fern clusters
  const fm = new THREE.MeshStandardMaterial({ color: 0x3d8a30, roughness: 1 });
  [[-2, 2], [5, -1], [-4, -2], [1, 3], [-6, 0]].forEach(([x, z]) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.3, 6), fm);
    f.position.set(x, 0.15, z); root.add(f);
  });

  // Mossy rocks
  const rm = new THREE.MeshStandardMaterial({ color: 0x556648, roughness: 1 });
  [[0, -2, 0.35], [-3, 5, 0.3]].forEach(([x, z, r]) => {
    const rock = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), rm);
    rock.position.set(x, r * 0.35, z); rock.scale.set(1, 0.6, 1); root.add(rock);
  });

  const state = store.getState();
  const season = state.season?.season ?? state.campaign?.currentSeason ?? 'spring';

  const interactables = [];
  getZoneExitPoints(ZONE_DEF.id).forEach((exit) => {
    const mk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0xe8c84a, roughness: 0.9 }));
    mk.position.set(exit.position.x, 0.08, exit.position.z); root.add(mk);
    interactables.push({ id: exit.id, type: 'exit', label: exit.destination, position: { ...exit.position }, radius: 1.4, destination: exit.destination });
  });

  // NPCs scheduled for this zone
  getNPCsInZone('forest_edge', season).forEach((npc) => {
    const mesh = makeNpcMesh(npc); root.add(mesh);
    interactables.push(mesh.userData.interactable);
  });

  // Forage spots
  FORAGE_SPOTS.forEach((spot) => {
    const mesh = makeForageSpotMesh(spot); root.add(mesh);
    interactables.push(mesh.userData.interactable);
  });

  // Collect tree crowns (cone meshes inside tree groups) for seasonal coloring
  const crowns = root.children.filter(c => c.isGroup).map(g => g.children.find(m => m.geometry?.type === 'ConeGeometry')).filter(Boolean);
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
      fm.color.setHex(SEASON_PALETTE.foliage[s]);
      crowns.forEach(c => {
        c.material.color.setHex(SEASON_PALETTE.foliage[s]);
        c.visible = s !== 'winter';
      });
    },
    update() {},
    registerInteractables(r) { if (typeof r === 'function') interactables.forEach((e) => r(e)); },
    dispose() { tracker.disposeObject(root); },
  };
}
