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
 * Pick a random planted cell index, or -1 if none.
 */
function randomPlantedIndex(grid) {
  const planted = getPlantedIndices(grid);
  if (planted.length === 0) return -1;
  return planted[Math.floor(Math.random() * planted.length)];
}

/**
 * Get indices adjacent to cellIndex (up/down/left/right) that have a crop.
 */
function getAdjacentPlantedIndices(grid, cellIndex, cols = 8, rows = 4) {
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
 * Mulch a cell — adds +0.5 intervention bonus.
 */
export function mulch(grid, cellIndex) {
  if (cellIndex < 0 || cellIndex >= grid.length) return;
  grid[cellIndex].mulched = true;
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
 * Apply an intervention by id. For protect/mulch/companion_patch/prune,
 * auto-targets a random planted cell. For swap, auto-picks a random
 * planted cell and one of its adjacent planted neighbors.
 */
export function applyIntervention(grid, interventionId) {
  if (interventionId === 'accept_loss') {
    accept_loss();
    return;
  }

  if (interventionId === 'protect') {
    const idx = randomPlantedIndex(grid);
    if (idx >= 0) protect(grid, idx);
    return;
  }

  if (interventionId === 'mulch') {
    const idx = randomPlantedIndex(grid);
    if (idx >= 0) mulch(grid, idx);
    return;
  }

  if (interventionId === 'companion_patch') {
    const idx = randomPlantedIndex(grid);
    if (idx >= 0) companion_patch(grid, idx);
    return;
  }

  if (interventionId === 'prune') {
    const idx = randomPlantedIndex(grid);
    if (idx >= 0) prune(grid, idx);
    return;
  }

  if (interventionId === 'swap') {
    const idxA = randomPlantedIndex(grid);
    if (idxA < 0) return;
    const adjacentPlanted = getAdjacentPlantedIndices(grid, idxA);
    if (adjacentPlanted.length === 0) return;
    const idxB = adjacentPlanted[Math.floor(Math.random() * adjacentPlanted.length)];
    swap(grid, idxA, idxB);
  }
}
