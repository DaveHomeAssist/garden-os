/**
 * Crop Registry — typed accessors over CROP_SCORING_DATA.json
 */
import { cropData } from './loader.js';

const ALL_CROPS = Object.values(cropData.crops);
const CROP_MAP = cropData.crops;
const RECIPES = cropData.recipes;

export function getCropById(id) {
  return CROP_MAP[id] ?? null;
}

export function getAllCrops() {
  return ALL_CROPS;
}

export function getCropsForChapter(chapter) {
  return ALL_CROPS.filter(c => c.chapterUnlock <= chapter);
}

export function getCropsByFaction(faction) {
  return ALL_CROPS.filter(c => c.faction === faction);
}

export function getFactions() {
  const factions = new Set(ALL_CROPS.map(c => c.faction));
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
