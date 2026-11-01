import * as THREE from 'three';
import { SEASON_PALETTE, applyBase } from './season-palette.js';
import { WORLD_MAP, getZoneExitPoints } from './world-zone-contract.js';

import { getNPCsPresentInZone } from '../npc-presence.js';
import { getQuestSitesForZone } from '../../data/quest-sites.js';
import { makeQuestSiteMesh } from './zone-interactables.js';
import { animateNpcFigures, figureStandPosition, upgradeNpcMarker } from '../npc-figures.js';
import { applyNeighborhoodSet, loadNeighborhoodSet } from '../neighborhood-set.js';

function makeLabelTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(18, 20, 18, 0.82)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#e8c84a';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  ctx.fillStyle = '#f7f0da';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return new THREE.CanvasTexture(canvas);
}

function makeBox(tracker, size, color, position) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z),
    new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }),
  );
  mesh.position.set(position.x, position.y, position.z);
  tracker.track(mesh);
  return mesh;
}

function makeTree(tracker, x, z, season) {
  const group = new THREE.Group();
  const foliageColors = {
    spring: 0x7ebc63,
    summer: 0x4d8d43,
    fall: 0xc46f2b,
    winter: 0x7b7f88,
  };

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x5d3b22, roughness: 1 }),
  );
  trunk.position.y = 0.6;
  group.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 1.5, 7),
    new THREE.MeshStandardMaterial({ color: foliageColors[season] ?? foliageColors.spring, roughness: 1 }),
  );
  crown.position.y = 1.65;
  group.add(crown);

  group.position.set(x, 0, z);
  tracker.track(group);
  return group;
}

function makeNpcMarker(tracker, npc) {
  const group = new THREE.Group();
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.26, 1.1, 12),
    new THREE.MeshStandardMaterial({ color: 0xe8c84a, roughness: 0.95 }),
  );
  marker.position.y = 0.55;
  group.add(marker);

  const labelTexture = makeLabelTexture(npc.name);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.5),
    // Name tags are UI: no fog or tone mapping washing them out.
    new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, fog: false, toneMapped: false }),
  );
  label.name = 'npc-name-tag';
  label.position.set(0, 1.55, 0);
  group.add(label);

  // Draw the NPC just outside a house footprint if their slot falls inside one;
  // the interactable keeps the slot position, so talking works exactly as before.
  const stand = figureStandPosition(npc.activeSchedule.position, WORLD_MAP.zones?.neighborhood?.blockers ?? []);
  group.position.set(stand.x, 0, stand.z);
  marker.name = 'npc-marker-primitive';
  group.userData.npcPrimitives = [marker];
  group.userData.interactable = {
    id: `npc_${npc.id}`,
    npcId: npc.id,
    label: npc.name,
    position: { ...npc.activeSchedule.position },
    radius: 1.2,
  };
  tracker.track(group);
  return group;
}

export function createNeighborhood(store, tracker, npcRegistry = null) {
  const state = store.getState();
  const season = state.season?.season ?? state.campaign?.currentSeason ?? 'spring';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc7d2b0);
  scene.fog = new THREE.FogExp2(0xc7d2b0, 0.025);

  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);
  camera.position.set(0, 9, 11);
  camera.lookAt(0, 0.8, 0);

  const hemi = new THREE.HemisphereLight(0xf5f1da, 0x546244, 1.1);
  const sun = new THREE.DirectionalLight(0xfff3d6, 0.9);
  sun.position.set(5, 8, 3);
  scene.add(hemi, sun);

  const root = new THREE.Group();
  scene.add(root);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshStandardMaterial({ color: 0x79986d, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xb39163, roughness: 1 });
  const verticalPath = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 12), pathMaterial);
  verticalPath.rotation.x = -Math.PI / 2;
  verticalPath.position.y = 0.01;
  root.add(verticalPath);
  const horizontalPath = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.8), pathMaterial);
  horizontalPath.rotation.x = -Math.PI / 2;
  horizontalPath.position.set(0, 0.01, 1.4);
  root.add(horizontalPath);

  // Blockout boxes (footprints match the WORLD_MAP blockers). They are the
  // fallback: neighborhood-set.js swaps them for the low-poly houses once the
  // set GLB has loaded.
  const blockout = {
    house_west: [makeBox(tracker, { x: 2.4, y: 1.4, z: 1.8 }, 0x7d5a39, { x: -4.7, y: 0.7, z: 4.8 })],
    house_east: [makeBox(tracker, { x: 2, y: 1.8, z: 1.6 }, 0x6c7f93, { x: 4.6, y: 0.9, z: 2.2 })],
    cottage_south: [makeBox(tracker, { x: 2.4, y: 1.1, z: 1.4 }, 0x8b6a4d, { x: -1.4, y: 0.55, z: -3.5 })],
    community_bed: [makeBox(tracker, { x: 2.8, y: 0.5, z: 2.4 }, 0x6a4a28, { x: 2.8, y: 0.25, z: 4.8 })],
    arbor: [
      makeBox(tracker, { x: 0.18, y: 1.8, z: 0.18 }, 0x5d3b22, { x: 0.7, y: 0.9, z: 7.1 }),
      makeBox(tracker, { x: 0.18, y: 1.8, z: 0.18 }, 0x5d3b22, { x: -0.7, y: 0.9, z: 7.1 }),
      makeBox(tracker, { x: 1.6, y: 0.18, z: 0.18 }, 0x5d3b22, { x: 0, y: 1.75, z: 7.1 }),
    ],
  };
  Object.values(blockout).flat().forEach((mesh) => root.add(mesh));

  [
    [-7, -7], [-7, 7], [7, -7], [7, 7], [-1, 7], [6, -2], [-6, 1],
  ].forEach(([x, z]) => root.add(makeTree(tracker, x, z, season)));

  getQuestSitesForZone('neighborhood').forEach((site) => root.add(makeQuestSiteMesh(site)));

  const interactables = [];
  // NPCs whose scheduled zone is still locked (or empty) wait here; see npc-presence.js.
  const npcs = npcRegistry
    ? npcRegistry.getNPCsInZone('neighborhood', season)
    : getNPCsPresentInZone('neighborhood', state);
  let disposed = false;
  npcs.forEach((npc) => {
    const marker = makeNpcMarker(tracker, npc);
    root.add(marker);
    interactables.push(marker.userData.interactable);
    // Low-poly neighbour figure (npc-figures.js); the capsule stays if it fails.
    upgradeNpcMarker(marker, npc, { primitives: marker.userData.npcPrimitives });
  });
  loadNeighborhoodSet().then((art) => {
    if (art && !disposed) applyNeighborhoodSet(root, blockout, art);
  });

  getZoneExitPoints('neighborhood').forEach((exit) => {
    interactables.push({
      id: exit.id,
      type: 'exit',
      label: exit.destination,
      position: { ...exit.position },
      radius: 1.4,
      destination: exit.destination,
    });
  });

  // Collect tree crowns for seasonal recoloring
  const crowns = root.children.filter(c => c.isGroup && c.children.length === 2)
    .map(g => g.children.find(m => m.geometry?.type === 'ConeGeometry')).filter(Boolean);

  tracker.track(root);

  let time = 0;
  let spawnPoint = { x: 0, z: 0 };
  let playerPosition = { ...spawnPoint };
  return {
    scene,
    camera,
    interactables,
    spawnPoints: { ...spawnPoint },
    setSpawnPoint(point) {
      if (point) {
        spawnPoint = { ...point };
        playerPosition = { ...point };
      }
    },
    getPlayerPosition() {
      return { ...playerPosition };
    },
    setPlayerPosition(position) {
      if (position) {
        playerPosition = { ...position };
      }
    },
    setSeason(s) {
      const season = s || 'spring';
      applyBase(this, season, ground, hemi, scene.fog);
      crowns.forEach(c => {
        c.material.color.setHex(SEASON_PALETTE.foliage[season]);
        c.visible = season !== 'winter';
      });
    },
    update(dt) {
      time += dt;
      root.children.forEach((child) => {
        if (!child.userData?.interactable?.npcId) return;
        const label = child.getObjectByName('npc-name-tag');
        if (label) {
          label.position.y = 1.55 + Math.sin(time * 2.2) * 0.04;
        }
      });
      animateNpcFigures(root, dt, time, playerPosition);
    },
    registerInteractables(register) {
      if (typeof register !== 'function') return;
      interactables.forEach((entry) => register(entry));
    },
    dispose() {
      disposed = true;
      tracker.disposeObject(root);
    },
  };
}
