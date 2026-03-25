import { Actions } from '../game/store.js';

const ZONE_NAMES = {
  player_plot: 'Player Plot',
  neighborhood: 'Neighborhood',
  meadow: 'Meadow',
  riverside: 'Riverside',
  forest_edge: 'Forest Edge',
  greenhouse: 'Greenhouse',
  festival_grounds: 'Festival Grounds',
  market_square: 'Market Square',
};

const WORLD_ZONE_INTERACTABLES = {
  player_plot: [
    { id: 'travel_neighborhood', zoneId: 'neighborhood', label: 'Neighborhood Gate', position: { x: 0, y: 0, z: -3.2 }, radius: 1.1 },
    { id: 'travel_meadow', zoneId: 'meadow', label: 'Meadow Path', position: { x: -4.5, y: 0, z: 1.4 }, radius: 1.1 },
    { id: 'travel_forest_edge', zoneId: 'forest_edge', label: 'Forest Trail', position: { x: 4.8, y: 0, z: 1.6 }, radius: 1.1 },
    { id: 'travel_riverside', zoneId: 'riverside', label: 'Riverside Path', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
  ],
  neighborhood: [
    { id: 'travel_plot', zoneId: 'player_plot', label: 'Backyard Gate', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
    { id: 'travel_market_square', zoneId: 'market_square', label: 'Market Lane', position: { x: 4.7, y: 0, z: 0.8 }, radius: 1.1 },
    { id: 'travel_greenhouse', zoneId: 'greenhouse', label: 'Greenhouse Walk', position: { x: -3.8, y: 0, z: -2.4 }, radius: 1.1 },
    { id: 'travel_festival_grounds', zoneId: 'festival_grounds', label: 'Festival Route', position: { x: -4.5, y: 0, z: 2.4 }, radius: 1.1 },
  ],
  meadow: [
    { id: 'travel_plot', zoneId: 'player_plot', label: 'Back to Plot', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
    { id: 'travel_forest_edge', zoneId: 'forest_edge', label: 'Forest Trail', position: { x: 4.8, y: 0, z: 0.9 }, radius: 1.1 },
  ],
  riverside: [
    { id: 'travel_plot', zoneId: 'player_plot', label: 'Back to Plot', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
    { id: 'travel_meadow', zoneId: 'meadow', label: 'Meadow Path', position: { x: -4.2, y: 0, z: 0.8 }, radius: 1.1 },
  ],
  forest_edge: [
    { id: 'travel_plot', zoneId: 'player_plot', label: 'Back to Plot', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
    { id: 'travel_meadow', zoneId: 'meadow', label: 'Meadow Path', position: { x: -4.2, y: 0, z: 0.8 }, radius: 1.1 },
  ],
  greenhouse: [
    { id: 'travel_neighborhood', zoneId: 'neighborhood', label: 'Back to Neighborhood', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
  ],
  festival_grounds: [
    { id: 'travel_neighborhood', zoneId: 'neighborhood', label: 'Back to Neighborhood', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
  ],
  market_square: [
    { id: 'travel_neighborhood', zoneId: 'neighborhood', label: 'Back to Neighborhood', position: { x: 0.2, y: 0, z: 4.4 }, radius: 1.1 },
  ],
};

const DEFAULT_ZONE_SPAWN_POINTS = {
  player_plot: { x: 0, y: 0, z: 2.55 },
  neighborhood: { x: 0.2, y: 0, z: 4.4 },
  meadow: { x: 0.2, y: 0, z: 4.4 },
  riverside: { x: 0.2, y: 0, z: 4.4 },
  forest_edge: { x: 0.2, y: 0, z: 4.4 },
  greenhouse: { x: 0.2, y: 0, z: 4.4 },
  festival_grounds: { x: 0.2, y: 0, z: 4.4 },
  market_square: { x: 0.2, y: 0, z: 4.4 },
};

function clonePosition(position) {
  if (!position) return null;
  return {
    x: position.x ?? 0,
    y: position.y ?? 0,
    z: position.z ?? 0,
  };
}

function resolveZoneSpawnPoint(fromZone, toZone) {
  if (!toZone) return null;

  const reverseExit = (WORLD_ZONE_INTERACTABLES[toZone] ?? []).find((entry) => entry.zoneId === fromZone);
  if (reverseExit?.position) {
    return clonePosition(reverseExit.position);
  }

  return clonePosition(DEFAULT_ZONE_SPAWN_POINTS[toZone] ?? null);
}

function applyZoneTravelState(action, nextState, controllers = {}) {
  if (action?.type !== Actions.ZONE_CHANGED) {
    return null;
  }

  const spawnPoint = clonePosition(nextState?.campaign?.worldState?.lastSpawnPoint ?? null);
  if (!spawnPoint) {
    return null;
  }

  const playerState = controllers.playerController?.reset?.(spawnPoint) ?? null;
  controllers.scene?.setPlayerState?.(playerState);
  controllers.scene?.clearPointerHover?.();
  controllers.interactionSystem?.update?.(0);
  return playerState;
}

export {
  DEFAULT_ZONE_SPAWN_POINTS,
  WORLD_ZONE_INTERACTABLES,
  ZONE_NAMES,
  applyZoneTravelState,
  resolveZoneSpawnPoint,
};
