import { createPlayerPlot } from './player-plot.js';
import { createNeighborhood } from './neighborhood.js';
import { createMarketSquare } from './market-square.js';
import { createMeadow } from './meadow.js';
import { createForestEdge } from './forest-edge.js';
import { createRiverside } from './riverside.js';
import { createGreenhouse } from './greenhouse.js';
import { createFestivalGrounds } from './festival-grounds.js';
import { WORLD_MAP, getZoneExitPoints } from './world-zone-contract.js';
import { createVillageScene } from '../village/village-scene.js';
import { VILLAGE_ZONE_ID } from '../village/village-layout.js';
import { FREEPLAY_SAVE_TARGET } from '../../game/save-target.js';

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

/**
 * Village V0 (one connected walkable village). Registered only for the Free
 * Play save target; Story Mode never sees the zone. No exits point at it yet:
 * travel in and out (enter_plot, back to village) is the game layer's hook.
 * Returns true when registered.
 */
export function registerVillageZone(zoneManager, { slot, store = null, options = {} } = {}) {
  if (slot !== FREEPLAY_SAVE_TARGET || !zoneManager) return false;
  zoneManager.registerZone(VILLAGE_ZONE_ID, () => createVillageScene({
    renderer: zoneManager.renderer,
    profile: store?.getState?.()?.campaign?.playerProfile ?? null,
    ...options,
  }));
  return true;
}

export { WORLD_MAP, ZONE_FACTORIES };
