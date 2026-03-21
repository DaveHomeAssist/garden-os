/**
 * Intervention Engine — applies mechanical effects of player interventions to the grid.
 * Each intervention type modifies cell state before scoring.
 */

/**
 * Get indices of all cells that have a crop planted.
 */
function getPlantedIndices(grid) {
  return grid
    .map((cell, i) => (cell.cropId ? i : -1))
    .filter((i) => i >= 0);
}

/**
 * Get indices adjacent to cellIndex (up/down/left/right) that have a crop.
 */
export function getAdjacentPlantedIndices(grid, cellIndex, cols = 8, rows = 4) {
  const row = Math.floor(cellIndex / cols);
  const col = cellIndex % cols;
  const neighbors = [];
  if (row > 0) neighbors.push(cellIndex - cols);
  if (row < rows - 1) neighbors.push(cellIndex + cols);
  if (col > 0) neighbors.push(cellIndex - 1);
  if (col < cols - 1) neighbors.push(cellIndex + 1);
  return neighbors.filter((i) => grid[i] && grid[i].cropId);
}

/**
 * Shield one cell from the current event (event skips this cell).
 */
export function protect(grid, cellIndex) {
  if (cellIndex < 0 || cellIndex >= grid.length) return;
  grid[cellIndex].protected = true;
}

/**
 * Mulch a cell — adds +0.5 intervention bonus this season
 * and carries +0.25 into the next season.
 */
export function mulch(grid, cellIndex) {
  if (cellIndex < 0 || cellIndex >= grid.length) return;
  grid[cellIndex].mulched = true;
  grid[cellIndex].carryForwardType = 'mulched';
  grid[cellIndex].interventionBonus += 0.5;
}

/**
 * Swap cropIds between two adjacent cells.
 */
export function swap(grid, indexA, indexB) {
  if (indexA < 0 || indexA >= grid.length) return;
  if (indexB < 0 || indexB >= grid.length) return;
  const temp = grid[indexA].cropId;
  grid[indexA].cropId = grid[indexB].cropId;
  grid[indexB].cropId = temp;
}

/**
 * Companion patch — adds +1.0 intervention bonus to a cell.
 */
export function companion_patch(grid, cellIndex) {
  if (cellIndex < 0 || cellIndex >= grid.length) return;
  grid[cellIndex].interventionBonus += 1.0;
}

/**
 * Prune — removes a crop from the cell entirely.
 */
export function prune(grid, cellIndex) {
  if (cellIndex < 0 || cellIndex >= grid.length) return;
  grid[cellIndex].cropId = null;
}

/**
 * Accept loss — no-op, just saves the token (no grid modification).
 */
export function accept_loss() {
  // Intentional no-op.
}

/**
 * Apply an intervention by id using explicit target indices.
 */
export function applyIntervention(grid, interventionId, targetA = -1, targetB = -1) {
  if (interventionId === 'accept_loss') {
    accept_loss();
    return;
  }

  if (interventionId === 'protect') {
    if (targetA >= 0) protect(grid, targetA);
    return;
  }

  if (interventionId === 'mulch') {
    if (targetA >= 0) mulch(grid, targetA);
    return;
  }

  if (interventionId === 'companion_patch') {
    if (targetA >= 0) companion_patch(grid, targetA);
    return;
  }

  if (interventionId === 'prune') {
    if (targetA >= 0) prune(grid, targetA);
    return;
  }

  if (interventionId === 'swap') {
    if (targetA >= 0 && targetB >= 0) swap(grid, targetA, targetB);
  }
}

export function getTargetableCells(grid, interventionId, firstCell = -1) {
  const planted = getPlantedIndices(grid);

  if (interventionId === 'accept_loss') return [];
  if (interventionId === 'swap') {
    if (firstCell >= 0) {
      return getAdjacentPlantedIndices(grid, firstCell);
    }
    return planted.filter((index) => getAdjacentPlantedIndices(grid, index).length > 0);
  }

  return planted;
}
