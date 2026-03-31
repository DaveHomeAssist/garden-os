import * as THREE from 'three';
import { SEASON_PALETTE, applyBase } from './season-palette.js';
import { getNPCsInZone } from '../../data/npcs.js';
import { makeNpcMesh } from './zone-interactables.js';
import { createShopPanel } from '../../ui/shop-panel.js';

const ZONE_DEF = {
  id: 'market_square', name: 'Market Square', biome: 'town',
  spawnPoint: { x: 8, z: 0 },
  exitPoints: [
    { id: 'market_to_neighborhood', destination: 'neighborhood', position: { x: 8.5, z: 0 },
      triggerBounds: { minX: 8, maxX: 9, minZ: -1.5, maxZ: 1.5 }, spawnPoint: { x: -8, z: 0 } },
    { id: 'market_to_greenhouse', destination: 'greenhouse', position: { x: 0, z: -8.5 },
      triggerBounds: { minX: -1.5, maxX: 1.5, minZ: -9, maxZ: -8 }, spawnPoint: { x: 0, z: 7 } },
  ],
};

function box(sx, sy, sz, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  m.position.set(x, y, z); return m;
}

export function createMarketSquare(store, tracker) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc4b28a);
  scene.fog = new THREE.FogExp2(0xc4b28a, 0.02);
  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);
  camera.position.set(0, 9, 11); camera.lookAt(0, 0.8, 0);
  scene.add(new THREE.HemisphereLight(0xf5f1da, 0x546244, 1.1));
  const sun = new THREE.DirectionalLight(0xfff3d6, 0.9);
  sun.position.set(5, 8, 3); scene.add(sun);
  const root = new THREE.Group(); scene.add(root);

  // Grey cobblestone ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; root.add(ground);

  // Market stalls: counter + canopy + poles
  const STALLS = [
    { x: -4, z: -3, c: 0xcc3333, id: 'stall_seeds', name: 'Seed Stall' },
    { x: 4, z: -3, c: 0x3366cc, id: 'stall_tools', name: 'Tool Stall' },
    { x: -4, z: 3, c: 0x33aa55, id: 'stall_recipes', name: 'Recipe Stall' },
    { x: 4, z: 3, c: 0xddaa22, id: 'stall_general', name: 'General Store' },
  ];
  STALLS.forEach(({ x, z, c }) => {
      root.add(box(2, 0.9, 1.2, 0x7d5a39, x, 0.45, z));
      root.add(box(2.4, 0.08, 1.6, c, x, 1.7, z));
      root.add(box(0.08, 1.7, 0.08, 0x5d3b22, x - 0.9, 0.85, z - 0.6));
      root.add(box(0.08, 1.7, 0.08, 0x5d3b22, x + 0.9, 0.85, z - 0.6));
    });

  // Central fountain: base + pillar + water ring
  const fb = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.8 }));
  fb.position.set(0, 0.3, 0); root.add(fb);
  const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.8 }));
  fp.position.set(0, 1.0, 0); root.add(fp);
  const wr = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.15, 8, 24), new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.3 }));
  wr.rotation.x = -Math.PI / 2; wr.position.set(0, 0.55, 0); root.add(wr);

  // Lantern posts
  [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach(([x, z]) => {
    root.add(box(0.12, 2.2, 0.12, 0x3a3a3a, x, 1.1, z));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffdd66, emissive: 0xffcc44, emissiveIntensity: 0.6 }));
    lamp.position.set(x, 2.3, z); root.add(lamp);
  });

  const state = store.getState();
  const season = state.season?.season ?? state.campaign?.currentSeason ?? 'spring';

  const interactables = [];
  ZONE_DEF.exitPoints.forEach((exit) => {
    const mk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0xe8c84a, roughness: 0.9 }));
    mk.position.set(exit.position.x, 0.08, exit.position.z); root.add(mk);
    interactables.push({ id: exit.id, type: 'exit', label: exit.destination, position: { ...exit.position }, radius: 1.4, destination: exit.destination });
  });

  // NPCs scheduled for this zone
  getNPCsInZone('market_square', season).forEach((npc) => {
    const mesh = makeNpcMesh(npc); root.add(mesh);
    interactables.push(mesh.userData.interactable);
  });

  // Shop panel for stall interactions
  const shopContainer = typeof document !== 'undefined' ? document.body : null;
  const shopPanel = shopContainer ? createShopPanel(shopContainer) : null;

  // Register each market stall as an interactable that opens the shop
  STALLS.forEach((stall) => {
    interactables.push({
      id: stall.id,
      type: 'custom',
      label: stall.name,
      position: { x: stall.x, y: 0.5, z: stall.z },
      radius: 1.8,
      onInteract: ({ store: interactStore }) => {
        if (shopPanel && !shopPanel.isOpen()) {
          const currentState = (interactStore ?? store).getState();
          const chapter = currentState?.campaign?.currentChapter ?? 1;
          shopPanel.open(
            { name: stall.name, chapter },
            interactStore ?? store,
          );
        }
      },
    });
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
    },
    update() {},
    registerInteractables(r) { if (typeof r === 'function') interactables.forEach((e) => r(e)); },
    dispose() { shopPanel?.dispose(); tracker.disposeObject(root); },
  };
}
