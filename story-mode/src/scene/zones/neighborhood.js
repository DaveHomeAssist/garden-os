import * as THREE from 'three';

import { getNPCsInZone } from '../../data/npcs.js';

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
    new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true }),
  );
  label.position.set(0, 1.55, 0);
  group.add(label);

  group.position.set(npc.activeSchedule.position.x, 0, npc.activeSchedule.position.z);
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

export function createNeighborhood(store, tracker, npcRegistry = { getNPCsInZone }) {
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

  root.add(makeBox(tracker, { x: 2.4, y: 1.4, z: 1.8 }, 0x7d5a39, { x: -4.7, y: 0.7, z: 4.8 }));
  root.add(makeBox(tracker, { x: 2, y: 1.8, z: 1.6 }, 0x6c7f93, { x: 4.6, y: 0.9, z: 2.2 }));
  root.add(makeBox(tracker, { x: 2.4, y: 1.1, z: 1.4 }, 0x8b6a4d, { x: -1.4, y: 0.55, z: -3.5 }));
  root.add(makeBox(tracker, { x: 2.8, y: 0.5, z: 2.4 }, 0x6a4a28, { x: 2.8, y: 0.25, z: 4.8 }));

  const archLeft = makeBox(tracker, { x: 0.18, y: 1.8, z: 0.18 }, 0x5d3b22, { x: 0.7, y: 0.9, z: 7.1 });
  const archRight = makeBox(tracker, { x: 0.18, y: 1.8, z: 0.18 }, 0x5d3b22, { x: -0.7, y: 0.9, z: 7.1 });
  const archTop = makeBox(tracker, { x: 1.6, y: 0.18, z: 0.18 }, 0x5d3b22, { x: 0, y: 1.75, z: 7.1 });
  root.add(archLeft, archRight, archTop);

  [
    [-7, -7], [-7, 7], [7, -7], [7, 7], [-1, 7], [6, -2], [-6, 1],
  ].forEach(([x, z]) => root.add(makeTree(tracker, x, z, season)));

  const interactables = [];
  const npcs = npcRegistry.getNPCsInZone('neighborhood', season);
  npcs.forEach((npc) => {
    const marker = makeNpcMarker(tracker, npc);
    root.add(marker);
    interactables.push(marker.userData.interactable);
  });

  interactables.push({
    id: 'return_to_plot',
    type: 'exit',
    label: 'Back to Plot',
    position: { x: 0, z: 7.1 },
    radius: 1.4,
    destination: 'player_plot',
  });

  tracker.track(root);

  let time = 0;
  return {
    scene,
    camera,
    interactables,
    update(dt) {
      time += dt;
      root.children.forEach((child) => {
        if (!child.userData?.interactable?.npcId) return;
        const label = child.children[1];
        if (label) {
          label.position.y = 1.55 + Math.sin(time * 2.2) * 0.04;
        }
      });
    },
    registerInteractables(register) {
      if (typeof register !== 'function') return;
      interactables.forEach((entry) => register(entry));
    },
    dispose() {
      tracker.disposeObject(root);
    },
  };
}
