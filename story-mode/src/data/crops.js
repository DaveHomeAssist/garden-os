/**
 * Crop Registry — typed accessors over CROP_SCORING_DATA.json
 */
import { cropData } from './loader.js';
import { getPackCrop, listPackCrops } from '../content/content-registry.js';

const ALL_CROPS = Object.values(cropData.crops);
const CROP_MAP = cropData.crops;
const RECIPES = cropData.recipes;

// Official crops come from the spec; content-pack crops are appended from the
// runtime registry and can never shadow an official id.
export function getCropById(id) {
  return CROP_MAP[id] ?? getPackCrop(id) ?? null;
}

export function getAllCrops() {
  const packCrops = listPackCrops();
  return packCrops.length ? [...ALL_CROPS, ...packCrops] : ALL_CROPS;
}

export function getCropsForChapter(chapter) {
  return getAllCrops().filter(c => c.chapterUnlock <= chapter);
}

export function getAvailableCrops(chapter, biomeCropsUnlocked = []) {
  const byChapter = new Set(getCropsForChapter(chapter).map(c => c.id));
  const byBiome = new Set(biomeCropsUnlocked);
  return getAllCrops().filter(c => byChapter.has(c.id) || byBiome.has(c.id));
}

export function getCropsByFaction(faction) {
  return getAllCrops().filter(c => c.faction === faction);
}

export function getFactions() {
  const factions = new Set(getAllCrops().map(c => c.faction));
  return [...factions].sort();
}

export function getRecipes() {
  return RECIPES;
}

export function getRecipeById(id) {
  return RECIPES[id] ?? null;
}

export function getYieldListForGrid(grid) {
  return [...new Set(
    grid
      .filter((cell) => cell.cropId !== null)
      .map((cell) => cell.cropId)
  )];
}

/**
 * Per-crop cell counts for a harvested grid: three basil cells yield three
 * basil. getYieldListForGrid stays de-duplicated for recipe matching and the
 * "N things for the pantry" summary.
 */
export function getYieldCountsForGrid(grid) {
  const counts = {};
  for (const cell of grid ?? []) {
    if (cell?.cropId) counts[cell.cropId] = (counts[cell.cropId] ?? 0) + 1;
  }
  return counts;
}

/**
 * Add a season's harvest to the pantry, one per planted cell. Older harvest
 * results (saved before yieldCounts existed) fall back to one per crop type.
 */
export function addHarvestToPantry(pantry, harvestResult) {
  const next = { ...(pantry ?? {}) };
  const counts = harvestResult?.yieldCounts
    ?? Object.fromEntries((harvestResult?.yieldList ?? []).map((cropId) => [cropId, 1]));
  for (const [cropId, count] of Object.entries(counts)) {
    next[cropId] = (next[cropId] ?? 0) + count;
  }
  return next;
}

export function getRecipeMatchesForGrid(grid) {
  const yieldList = new Set(getYieldListForGrid(grid));
  return Object.entries(RECIPES)
    .filter(([, recipe]) => recipe.crops.every((cropId) => yieldList.has(cropId)))
    .map(([recipeId]) => recipeId);
}

export function checkRecipeComplete(recipeId, pantry) {
  const recipe = RECIPES[recipeId];
  if (!recipe) return false;
  return recipe.crops.every(cropId => (pantry[cropId] ?? 0) > 0);
}
