import { createPlayerPlot } from './player-plot.js';
import { createNeighborhood } from './neighborhood.js';
import { createMarketSquare } from './market-square.js';
import { createMeadow } from './meadow.js';
import { createForestEdge } from './forest-edge.js';
import { createRiverside } from './riverside.js';
import { createGreenhouse } from './greenhouse.js';
import { createFestivalGrounds } from './festival-grounds.js';
import { WORLD_MAP, getZoneExitPoints } from './world-zone-contract.js';

const ZONE_FACTORIES = {
  player_plot: createPlayerPlot,
  neighborhood: createNeighborhood,
  market_square: createMarketSquare,
  meadow: createMeadow,
  forest_edge: createForestEdge,
  riverside: createRiverside,
  greenhouse: createGreenhouse,
  festival_grounds: createFestivalGrounds,
};

export function registerAllZones(zoneManager, store, tracker) {
  const zones = WORLD_MAP.zones;

  Object.keys(zones).forEach((zoneId) => {
    const factory = ZONE_FACTORIES[zoneId];
    if (!factory) return;

    zoneManager.registerZone(zoneId, () => factory(store, tracker));

    getZoneExitPoints(zoneId, WORLD_MAP).forEach((exit) => {
      zoneManager.addZoneExit(
        zoneId,
        exit.triggerBounds,
        exit.destination,
        exit.spawnPoint ?? null,
      );
    });
  });
}

export { WORLD_MAP, ZONE_FACTORIES };
