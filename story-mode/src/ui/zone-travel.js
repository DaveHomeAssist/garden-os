import WORLD_MAP from 'specs/WORLD_MAP.json';

import { Actions } from '../game/store.js';
import { getZoneExitPoints } from '../scene/zones/world-zone-contract.js';

function clonePosition(position) {
  if (!position) return null;
  return {
    x: position.x ?? 0,
    y: position.y ?? 0,
    z: position.z ?? 0,
  };
}

function toWorldPosition(position) {
  return {
    x: position?.x ?? 0,
    y: position?.y ?? 0,
    z: position?.z ?? 0,
  };
}

function buildZoneNames(worldMap = WORLD_MAP) {
  return Object.fromEntries(
    Object.entries(worldMap.zones ?? {}).map(([zoneId, zone]) => [zoneId, zone.name ?? zoneId]),
  );
}

function buildDefaultZoneSpawnPoints(worldMap = WORLD_MAP) {
  return Object.fromEntries(
    Object.entries(worldMap.zones ?? {}).map(([zoneId, zone]) => [zoneId, toWorldPosition(zone.spawnPoint)]),
  );
}

function getZoneExitInteractables(zoneId, worldMap = WORLD_MAP) {
  return getZoneExitPoints(zoneId, worldMap).map((exit) => ({
    id: exit.id,
    zoneId: exit.destination,
    label: `${ZONE_NAMES[exit.destination] ?? exit.destination} Path`,
    position: toWorldPosition(exit.position),
    radius: 1.1,
    spawnPoint: clonePosition(exit.spawnPoint),
  }));
}

function buildWorldZoneInteractables(worldMap = WORLD_MAP) {
  return Object.fromEntries(
    Object.keys(worldMap.zones ?? {}).map((zoneId) => [zoneId, getZoneExitInteractables(zoneId, worldMap)]),
  );
}

const ZONE_NAMES = buildZoneNames(WORLD_MAP);
const DEFAULT_ZONE_SPAWN_POINTS = buildDefaultZoneSpawnPoints(WORLD_MAP);
const WORLD_ZONE_INTERACTABLES = buildWorldZoneInteractables(WORLD_MAP);

function resolveZoneSpawnPoint(fromZone, toZone) {
  if (!toZone) return null;

  const reverseExit = (WORLD_ZONE_INTERACTABLES[toZone] ?? []).find((entry) => entry.zoneId === fromZone);
  if (reverseExit?.position) {
    return clonePosition(reverseExit.position);
  }

  const forwardExit = (WORLD_ZONE_INTERACTABLES[fromZone] ?? []).find((entry) => entry.zoneId === toZone);
  if (forwardExit?.spawnPoint) {
    return clonePosition(forwardExit.spawnPoint);
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
  buildDefaultZoneSpawnPoints,
  buildWorldZoneInteractables,
  buildZoneNames,
  getZoneExitInteractables,
  resolveZoneSpawnPoint,
};
