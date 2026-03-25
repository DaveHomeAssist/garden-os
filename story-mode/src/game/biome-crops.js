import { Actions } from './store.js';
import { getCropById, getRecipes } from '../data/crops.js';

const BIOME_CROP_MAP = {
  wild_garlic: 'forest_edge',
  shiitake_mushroom: 'forest_edge',
  watercress: 'riverside',
  prairie_onion: 'meadow',
};

const BIOME_CROP_SEASONS = {
  wild_garlic: { spring: 1.0, summer: 0.5, fall: 0.8 },
  shiitake_mushroom: { spring: 0.8, summer: 0.7, fall: 0.9 },
  watercress: { spring: 1.0, summer: 0.4, fall: 0.9 },
  prairie_onion: { spring: 0.6, summer: 0.5, fall: 1.0 },
};

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
    return cropId in BIOME_CROP_MAP;
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
    const zoneCrops = this.getBiomeCropsForZone(zoneId);
    return zoneCrops.filter((cropId) => {
      const multipliers = BIOME_CROP_SEASONS[cropId];
      if (!multipliers) return false;
      return (multipliers[season] ?? 0) > 0;
    });
  }

  dispose() {
    this.store = null;
    this.foragingSystem = null;
  }
}
