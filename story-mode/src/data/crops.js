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
