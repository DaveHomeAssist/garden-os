import * as THREE from 'three';

const ZONE_DEF = {
  id: 'festival_grounds',
  name: 'Festival Grounds',
  biome: 'festival',
  spawnPoint: { x: -8, z: 0 },
  exitPoints: [
    {
      id: 'festival_to_riverside',
      destination: 'riverside',
      position: { x: -8.5, z: 0 },
      triggerBounds: { minX: -12, maxX: -11, minZ: -1.5, maxZ: 1.5 },
      spawnPoint: { x: 8, z: 0 },
    },
  ],
};

export function createFestivalGrounds(store, tracker) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd4a86a);
  scene.fog = new THREE.FogExp2(0xd4a86a, 0.018);

  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 100);
  camera.position.set(0, 9, 11);
  camera.lookAt(0, 0.8, 0);

  const hemi = new THREE.HemisphereLight(0xf8e8c0, 0x6a5838, 1.2);
  const sun = new THREE.DirectionalLight(0xffe8a0, 0.9);
  sun.position.set(5, 8, 3);
  scene.add(hemi, sun);

  const root = new THREE.Group();
  scene.add(root);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshStandardMaterial({ color: 0xa08050, roughness: 1 }),
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
