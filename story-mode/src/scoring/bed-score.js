/**
 * Bed Scoring — aggregate from cell scores per SCORING_RULES.md.
 */
import { scoreCell } from './cell-score.js';
import { CELL_COUNT } from '../game/state.js';
import { checkRecipeComplete, getRecipes } from '../data/crops.js';

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

export function scoreBed(grid, siteConfig, season, pantry = {}) {
  const cellScores = [];
  let occupiedCount = 0;
  let totalScore = 0;
  const uniqueCrops = new Set();
  let tallCount = 0;
  let supportCount = 0;

  for (let i = 0; i < CELL_COUNT; i++) {
    const result = scoreCell(i, grid, siteConfig, season);
    cellScores.push(result);
    if (result) {
      occupiedCount++;
      totalScore += result.total;
      uniqueCrops.add(result.cropId);
    }
  }

  if (occupiedCount === 0) {
    return { score: 0, grade: 'F', cellScores, occupiedCount, details: {} };
  }

  const cellAvg = totalScore / occupiedCount;
  const fillRatio = occupiedCount / CELL_COUNT;
  const fillPenalty = (1 - Math.sqrt(fillRatio)) * 1.5;

  let diversityBonus = 0;
  if (uniqueCrops.size >= 4) diversityBonus = 0.7;
  else if (uniqueCrops.size >= 3) diversityBonus = 0.5;
  else if (uniqueCrops.size >= 2) diversityBonus = 0.3;

  // Recipe bonus
  const recipes = getRecipes();
  let recipeBonus = 0;
  for (const recipeId of Object.keys(recipes)) {
    if (checkRecipeComplete(recipeId, pantry)) recipeBonus += 0.2;
  }
  recipeBonus = Math.min(recipeBonus, 0.8);

  const bedScore = clamp(cellAvg + diversityBonus - fillPenalty + recipeBonus, 0, 10);
  const finalScore = Math.round(bedScore * 10);

  let grade;
  if (finalScore >= 90) grade = 'A+';
  else if (finalScore >= 80) grade = 'A';
  else if (finalScore >= 70) grade = 'B';
  else if (finalScore >= 60) grade = 'C';
  else if (finalScore >= 50) grade = 'D';
  else grade = 'F';

  return {
    score: finalScore,
    grade,
    cellScores,
    occupiedCount,
    details: {
      cellAvg,
      fillRatio,
      fillPenalty,
      diversityBonus,
      recipeBonus,
      uniqueCrops: uniqueCrops.size,
    },
  };
}
