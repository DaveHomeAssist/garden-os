import * as THREE from 'three';

const ZONE_DEF = {
  id: 'riverside',
  name: 'Riverside',
  biome: 'river',
  spawnPoint: { x: 0, z: 8 },
  exitPoints: [
    {
      id: 'riverside_to_meadow',
      destination: 'meadow',
      position: { x: 0, z: 8.5 },
      triggerBounds: { minX: -1.5, maxX: 1.5, minZ: 9, maxZ: 10 },
      spawnPoint: { x: 0, z: -11 },
    },
    {
      id: 'riverside_to_festival',
      destination: 'festival_grounds',
      position: { x: 8.5, z: 0 },
      triggerBounds: { minX: 9, maxX: 10, minZ: -1.5, maxZ: 1.5 },
      spawnPoint: { x: -8, z: 0 },
    },
  ],
};

export function createRiverside(store, tracker) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ea8c0);
  scene.fog = new THREE.FogExp2(0x7ea8c0, 0.02);

  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);
  camera.position.set(0, 9, 11);
  camera.lookAt(0, 0.8, 0);

  const hemi = new THREE.HemisphereLight(0xd0e0f0, 0x4a6858, 1.1);
  const sun = new THREE.DirectionalLight(0xfff3d6, 0.8);
  sun.position.set(5, 8, 3);
  scene.add(hemi, sun);

  const root = new THREE.Group();
  scene.add(root);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x5a8a5c, roughness: 1 }),
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
