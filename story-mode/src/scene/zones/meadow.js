import * as THREE from 'three';

const ZONE_DEF = {
  id: 'meadow',
  name: 'Meadow',
  biome: 'grassland',
  spawnPoint: { x: -8, z: 0 },
  exitPoints: [
    {
      id: 'meadow_to_neighborhood',
      destination: 'neighborhood',
      position: { x: -8.5, z: 0 },
      triggerBounds: { minX: -12, maxX: -11, minZ: -1.5, maxZ: 1.5 },
      spawnPoint: { x: 8, z: 0 },
    },
    {
      id: 'meadow_to_forest',
      destination: 'forest_edge',
      position: { x: 8.5, z: -4 },
      triggerBounds: { minX: 11, maxX: 12, minZ: -5.5, maxZ: -2.5 },
      spawnPoint: { x: -8, z: 0 },
    },
    {
      id: 'meadow_to_riverside',
      destination: 'riverside',
      position: { x: 0, z: -12 },
      triggerBounds: { minX: -1.5, maxX: 1.5, minZ: -12, maxZ: -11 },
      spawnPoint: { x: 0, z: 8 },
    },
  ],
};

export function createMeadow(store, tracker) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa8c97e);
  scene.fog = new THREE.FogExp2(0xa8c97e, 0.018);

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
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshStandardMaterial({ color: 0x88a85c, roughness: 1 }),
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
