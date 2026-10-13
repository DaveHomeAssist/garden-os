import { Actions } from './store.js';
import { getCropById, getRecipes } from '../data/crops.js';
import WORLD_MAP from 'specs/WORLD_MAP.json';
import FORAGE_TABLES from 'specs/FORAGE_TABLES.json';

const STARTER_BIOME_CROPS = new Set(['lettuce', 'basil', 'compact_tomato', 'pepper', 'nasturtium']);
const BIOME_CROP_MAP = Object.fromEntries(
  Object.entries(WORLD_MAP.zones ?? {}).flatMap(([zoneId, zone]) => (
    (zone.biomeCrops ?? []).map((cropId) => [cropId, zoneId])
  )),
);

const LOOT_TIERS = ['common', 'uncommon', 'rare'];

/**
 * Biome crops a zone's forage spots can turn up in a season, derived from
 * specs/WORLD_MAP.json spots and specs/FORAGE_TABLES.json loot (seasonal
 * entries respected) and the crop's own season fit.
 */
function forageableBiomeCrops(zoneId, season) {
  const spots = WORLD_MAP.zones?.[zoneId]?.foraging?.spots ?? [];
  const found = new Set();
  spots.forEach((spot) => {
    const table = FORAGE_TABLES.spotTypes?.[spot.type] ?? {};
    LOOT_TIERS.forEach((tier) => (table[tier] ?? []).forEach((entry) => {
      if (!entry.biomeCrop) return;
      if (Array.isArray(entry.seasons) && !entry.seasons.includes(season)) return;
      if (BIOME_CROP_MAP[entry.biomeCrop] !== zoneId) return;
      if ((getCropById(entry.biomeCrop)?.seasonalMultipliers?.[season] ?? 0) <= 0) return;
      found.add(entry.biomeCrop);
    }));
  });
  return [...found];
}

/** How many of a zone's exclusive crops this campaign has discovered. */
export function getZoneBiomeCropProgress(state, zoneId) {
  const exclusive = Object.entries(BIOME_CROP_MAP)
    .filter(([cropId, zone]) => zone === zoneId && !STARTER_BIOME_CROPS.has(cropId))
    .map(([cropId]) => cropId);
  const unlocked = new Set(state?.campaign?.biomeCropsUnlocked ?? []);
  return {
    total: exclusive.length,
    found: exclusive.filter((cropId) => unlocked.has(cropId)).length,
  };
}

export class BiomeCropBridge {
  constructor(store, foragingSystem) {
    this.store = store;
    this.foragingSystem = foragingSystem;
  }

  getBiomeCropsForZone(zoneId) {
    return Object.entries(BIOME_CROP_MAP)
      .filter(([, zone]) => zone === zoneId)
      .map(([cropId]) => cropId);
  }

  getZoneForCrop(cropId) {
    return BIOME_CROP_MAP[cropId] ?? null;
  }

  unlockBiomeCrop(cropId) {
    if (!BIOME_CROP_MAP[cropId]) return false;

    const state = this.store.getState();
    const unlocked = state.campaign.biomeCropsUnlocked ?? [];
    if (unlocked.includes(cropId)) return false;

    this.store.dispatch({
      type: Actions.UNLOCK_BIOME_CROP ?? 'UNLOCK_BIOME_CROP',
      payload: { cropId },
    });

    return true;
  }

  isCropBiomeExclusive(cropId) {
    return cropId in BIOME_CROP_MAP && !STARTER_BIOME_CROPS.has(cropId);
  }

  isCropUnlocked(cropId) {
    const state = this.store.getState();
    const biomeCrops = state.campaign.biomeCropsUnlocked ?? [];
    const standardCrops = state.campaign.cropsUnlocked ?? [];
    return biomeCrops.includes(cropId) || standardCrops.includes(cropId);
  }

  getBiomeCropRecipes() {
    const allRecipes = getRecipes();
    const biomeCropIds = new Set(Object.keys(BIOME_CROP_MAP));
    const result = {};

    for (const [recipeId, recipe] of Object.entries(allRecipes)) {
      const usesBiomeCrop = recipe.crops.some((id) => biomeCropIds.has(id));
      if (usesBiomeCrop) {
        result[recipeId] = recipe;
      }
    }

    return result;
  }

  getForageableBiomeCrops(zoneId, season) {
    return forageableBiomeCrops(zoneId, season);
  }

  dispose() {
    this.store = null;
    this.foragingSystem = null;
  }
}
