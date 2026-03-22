/**
 * Bed Scoring — aggregate from cell scores per SCORING_RULES.md.
 */
import { scoreCell } from './cell-score.js';
import { CELL_COUNT, getGridCols, getGridRows } from '../game/state.js';
import { checkRecipeComplete, getRecipes, getCropById, getYieldListForGrid, getRecipeMatchesForGrid } from '../data/crops.js';

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

export function scoreBed(grid, siteConfig, season, pantry = {}) {
  const totalCells = Array.isArray(grid) ? grid.length : CELL_COUNT;
  if (Array.isArray(grid)) {
    grid.cols = getGridCols(grid);
    grid.rows = getGridRows(grid);
  }
  const cellScores = [];
  let occupiedCount = 0;
  let totalScore = 0;
  const uniqueCrops = new Set();

  for (let i = 0; i < totalCells; i++) {
    const result = scoreCell(i, grid, siteConfig, season);
    cellScores.push(result);
    if (result) {
      occupiedCount++;
      totalScore += result.total;
      uniqueCrops.add(result.cropId);
    }
  }

  if (occupiedCount === 0) {
    return { score: 0, grade: 'F', cellScores, occupiedCount, yieldList: [], recipeMatches: [], details: {} };
  }

  const cellAvg = totalScore / occupiedCount;
  const fillRatio = occupiedCount / totalCells;
  const fillPenalty = (1 - Math.sqrt(fillRatio)) * 1.5;
  const yieldList = getYieldListForGrid(grid);
  const recipeMatches = getRecipeMatchesForGrid(grid);

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

  // Bug 1: Tall/trellis penalties — penalize multiple tall or support crop types
  const tallTypes = new Set();
  const supportTypes = new Set();
  for (const cell of grid) {
    if (!cell.cropId) continue;
    const crop = getCropById(cell.cropId);
    if (!crop) continue;
    if (crop.tall) tallTypes.add(cell.cropId);
    if (crop.support) supportTypes.add(cell.cropId);
  }
  const tallPenalty = tallTypes.size > 1 ? -0.8 : 0;
  const trellisPenalty = supportTypes.size > 1 ? -0.6 : 0;

  const bedScore = clamp(cellAvg + diversityBonus - fillPenalty + recipeBonus + tallPenalty + trellisPenalty, 0, 10);
  const finalScore = Math.round(bedScore * 10);

  // Bug 3: Grade thresholds corrected to match spec
  let grade;
  if (finalScore >= 90) grade = 'A+';
  else if (finalScore >= 85) grade = 'A';
  else if (finalScore >= 70) grade = 'B';
  else if (finalScore >= 55) grade = 'C';
  else if (finalScore >= 40) grade = 'D';
  else grade = 'F';

    return {
      score: finalScore,
      grade,
      cellScores,
      occupiedCount,
      yieldList,
      recipeMatches,
      details: {
      cellAvg,
      fillRatio,
      fillPenalty,
      diversityBonus,
      recipeBonus,
      tallPenalty,
      trellisPenalty,
      uniqueCrops: uniqueCrops.size,
    },
  };
}
