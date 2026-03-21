/**
 * Cell Scoring — 6-factor algorithm from SCORING_RULES.md.
 * Deterministic: same inputs = same outputs.
 */
import { getCropById } from '../data/crops.js';
import { COLS, ROWS } from '../game/state.js';

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

function cellToRowCol(index) {
  return { row: Math.floor(index / COLS), col: index % COLS };
}

function getNeighborIndices(index) {
  const { row, col } = cellToRowCol(index);
  const neighbors = [];
  if (row > 0) neighbors.push(index - COLS);
  if (row < ROWS - 1) neighbors.push(index + COLS);
  if (col > 0) neighbors.push(index - 1);
  if (col < COLS - 1) neighbors.push(index + 1);
  return neighbors;
}

/**
 * Factor 1: Sun Fit (weight 2x)
 * effectiveLight defaults to site sun hours for now.
 */
export function sunFit(crop, effectiveLight) {
  if (effectiveLight >= crop.sunIdeal) return 5.0;
  if (effectiveLight >= crop.sunMin) {
    const range = crop.sunIdeal - crop.sunMin;
    return range > 0 ? 3.0 + 2.0 * ((effectiveLight - crop.sunMin) / range) : 5.0;
  }
  const range = crop.sunMin;
  return range > 0 ? 1.0 + 2.0 * (effectiveLight / range) : 1.0;
}

/**
 * Factor 2: Support Fit
 */
export function supportFit(crop, hasTrellis) {
  if (!crop.support) return 3.0;
  return hasTrellis ? 5.0 : 1.0;
}

/**
 * Factor 3: Shade Tolerance
 */
export function shadeFit(crop, effectiveLight) {
  if (effectiveLight < crop.sunMin) return crop.shadeScore * 0.6;
  return crop.shadeScore;
}

/**
 * Factor 4: Access Fit
 */
export function accessFit(crop, row) {
  const accessScore = row / (ROWS - 1);
  if (!crop.tall) return 3.0 + accessScore * 2.0;
  return 3.0;
}

/**
 * Factor 5: Season Fit
 */
export function seasonFit(crop, season) {
  const sm = crop.seasonalMultipliers || crop.sm;
  if (!sm) return 3.0;
  const mult = sm[season] ?? 0.5;
  return 1.0 + mult * 4.0;
}

/**
 * Factor 6: Adjacency (additive, clamped -2 to +2)
 */
export function adjacencyScore(cropId, cellIndex, grid) {
  const crop = getCropById(cropId);
  if (!crop) return 0;

  let score = 0;
  const neighborIndices = getNeighborIndices(cellIndex);
  const seen = new Set();

  for (const ni of neighborIndices) {
    const neighbor = grid[ni];
    if (!neighbor || !neighbor.cropId) continue;

    const nCrop = getCropById(neighbor.cropId);
    if (!nCrop) continue;

    if (crop.companions.includes(neighbor.cropId)) score += 0.5;
    if (crop.conflicts.includes(neighbor.cropId)) score -= 1.2;
    if (crop.tall && nCrop.tall) score -= 0.75;
    if (neighbor.cropId === cropId && !seen.has(neighbor.cropId)) score -= 0.2;

    const waterDiff = Math.abs((crop.water || 2) - (nCrop.water || 2));
    if (waterDiff >= 2) score -= 0.5;

    seen.add(neighbor.cropId);
  }

  return clamp(score, -2, 2);
}

/**
 * Compute full cell score (0-10 scale).
 */
export function scoreCell(cellIndex, grid, siteConfig, season) {
  const cell = grid[cellIndex];
  if (!cell || !cell.cropId) return null;

  const crop = getCropById(cell.cropId);
  if (!crop) return null;

  const { row } = cellToRowCol(cellIndex);
  const effectiveLight = siteConfig.sunHours || 6;
  const hasTrellis = row === 0 && (siteConfig.trellis ?? true);

  const sf = sunFit(crop, effectiveLight);
  const sup = supportFit(crop, hasTrellis);
  const shd = shadeFit(crop, effectiveLight);
  const acc = accessFit(crop, row);
  const sea = seasonFit(crop, season);
  const adj = adjacencyScore(cell.cropId, cellIndex, grid);

  const sm = crop.seasonalMultipliers || crop.sm || {};
  const seasonalMult = sm[season] ?? 0.5;

  const weightedCore = (sf * 2 + sup + shd + acc + sea) / 3;
  const preAdj = weightedCore * seasonalMult;
  const base = clamp(preAdj + adj, 0, 10);

  const final = clamp(
    base + (cell.eventModifier || 0) + (cell.interventionBonus || 0) - (cell.soilFatigue || 0),
    0, 10
  );

  return {
    total: final,
    factors: { sunFit: sf, supportFit: sup, shadeFit: shd, accessFit: acc, seasonFit: sea, adjacency: adj },
    cropId: cell.cropId,
    cellIndex,
  };
}
