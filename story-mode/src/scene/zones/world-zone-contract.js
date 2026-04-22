import WORLD_MAP from 'specs/WORLD_MAP.json';

const EXIT_HALF_WIDTH = 1.5;
const EXIT_HALF_DEPTH = 0.5;

function buildExitId(zoneId, destination, index) {
  return `${zoneId}_to_${destination}${index > 0 ? `_${index + 1}` : ''}`;
}

function deriveTriggerBounds(edge, position) {
  if (!edge || !position) return null;

  if (edge === 'north' || edge === 'south') {
    return {
      minX: position.x - EXIT_HALF_WIDTH,
      maxX: position.x + EXIT_HALF_WIDTH,
      minZ: position.z - EXIT_HALF_DEPTH,
      maxZ: position.z + EXIT_HALF_DEPTH,
    };
  }

  if (edge === 'east' || edge === 'west') {
    return {
      minX: position.x - EXIT_HALF_DEPTH,
      maxX: position.x + EXIT_HALF_DEPTH,
      minZ: position.z - EXIT_HALF_WIDTH,
      maxZ: position.z + EXIT_HALF_WIDTH,
    };
  }

  return null;
}

function getZoneExitPoints(zoneId, worldMap = WORLD_MAP) {
  const exits = worldMap?.zones?.[zoneId]?.exitPoints ?? [];
  return exits.map((exit, index) => ({
    ...exit,
    id: exit.id ?? buildExitId(zoneId, exit.destination, index),
    triggerBounds: exit.triggerBounds ?? deriveTriggerBounds(exit.edge, exit.position),
    spawnPoint: exit.spawnPoint ?? null,
  }));
}

export {
  WORLD_MAP,
  deriveTriggerBounds,
  getZoneExitPoints,
};
