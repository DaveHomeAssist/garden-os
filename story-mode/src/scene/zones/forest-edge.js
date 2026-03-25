import * as THREE from 'three';

const ZONE_DEF = {
  id: 'forest_edge',
  name: 'Forest Edge',
  biome: 'forest',
  spawnPoint: { x: -8, z: 0 },
  exitPoints: [
    {
      id: 'forest_to_meadow',
      destination: 'meadow',
      position: { x: -8.5, z: 0 },
      triggerBounds: { minX: -10, maxX: -9, minZ: -1.5, maxZ: 1.5 },
      spawnPoint: { x: 8, z: -4 },
    },
  ],
};

export function createForestEdge(store, tracker) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5c7a48);
  scene.fog = new THREE.FogExp2(0x5c7a48, 0.03);

  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);
  camera.position.set(0, 9, 11);
  camera.lookAt(0, 0.8, 0);

  const hemi = new THREE.HemisphereLight(0xc5d4b0, 0x3a5228, 1.0);
  const sun = new THREE.DirectionalLight(0xd4e0b0, 0.6);
  sun.position.set(3, 6, 4);
  scene.add(hemi, sun);

  const root = new THREE.Group();
  scene.add(root);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x4a6b38, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  const interactables = [];

  ZONE_DEF.exitPoints.forEach((exit) => {
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16),
      new THREE.MeshStandardMaterial({ color: 0xe8c84a, roughness: 0.9 }),
    );
    marker.position.set(exit.position.x, 0.08, exit.position.z);
    root.add(marker);
    interactables.push({
      id: exit.id,
      type: 'exit',
      label: exit.destination,
      position: { ...exit.position },
      radius: 1.4,
      destination: exit.destination,
    });
  });

  tracker.track(root);

  let spawnPoint = { ...ZONE_DEF.spawnPoint };
  let playerPosition = { ...spawnPoint };

  return {
    scene,
    camera,
    interactables,
    spawnPoints: { ...ZONE_DEF.spawnPoint },
    zoneId: ZONE_DEF.id,
    setSpawnPoint(point) {
      if (point) {
        spawnPoint = { ...point };
        playerPosition = { ...point };
      }
    },
    getPlayerPosition() {
      return { ...playerPosition };
    },
    setPlayerPosition(pos) {
      if (pos) playerPosition = { ...pos };
    },
    update() {},
    registerInteractables(register) {
      if (typeof register !== 'function') return;
      interactables.forEach((entry) => register(entry));
    },
    dispose() {
      tracker.disposeObject(root);
    },
  };
}
