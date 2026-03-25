import * as THREE from 'three';

const ZONE_DEF = {
  id: 'greenhouse',
  name: 'Greenhouse',
  biome: 'greenhouse',
  spawnPoint: { x: 0, z: 7 },
  exitPoints: [
    {
      id: 'greenhouse_to_market',
      destination: 'market_square',
      position: { x: 0, z: 7.5 },
      triggerBounds: { minX: -1.5, maxX: 1.5, minZ: 7, maxZ: 8 },
      spawnPoint: { x: 0, z: -8 },
    },
  ],
};

export function createGreenhouse(store, tracker) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ab888);
  scene.fog = new THREE.FogExp2(0x8ab888, 0.025);

  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);
  camera.position.set(0, 9, 11);
  camera.lookAt(0, 0.8, 0);

  const hemi = new THREE.HemisphereLight(0xe8f0d8, 0x4a7048, 1.2);
  const sun = new THREE.DirectionalLight(0xf0f8e0, 0.7);
  sun.position.set(0, 10, 0);
  scene.add(hemi, sun);

  const root = new THREE.Group();
  scene.add(root);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshStandardMaterial({ color: 0x6a9058, roughness: 1 }),
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
