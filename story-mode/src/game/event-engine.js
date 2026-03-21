/**
 * Event Engine — applies mechanical effects of events to the grid.
 * Reads event.mechanicalEffect and modifies cell.eventModifier accordingly.
 * Protected cells are skipped, then protection is cleared.
 */
import { getCropById } from '../data/crops.js';
import { COLS, ROWS } from './state.js';

function resolveCarryForwardType(event) {
  const text = `${event?.carryForward?.effect ?? ''}`.toLowerCase();
  if (!text) return null;
  if (text.includes('enriched')) return 'enriched';
  if (text.includes('compacted') || text.includes('waterlogged')) return 'compacted';
  return null;
}

/**
 * Check if a cell's crop matches the event's target criteria.
 */
function matchesTarget(cell, cellIndex, target, grid) {
  if (!target) return true;

  const { type, filter } = target;

  if (type === 'all') return true;

  if (type === 'random_cells') {
    // Apply to roughly half the planted cells at random
    return Math.random() < 0.5;
  }

  if (type === 'crop_filter') {
    if (!cell.cropId) return false;
    const crop = getCropById(cell.cropId);
    if (!crop) return false;
    // Check the crop's eventVulnerabilities array
    if (crop.eventVulnerabilities && crop.eventVulnerabilities.includes(filter)) {
      return true;
    }
    return false;
  }

  if (type === 'faction') {
    if (!cell.cropId) return false;
    const crop = getCropById(cell.cropId);
    if (!crop) return false;
    return crop.faction === filter;
  }

  if (type === 'row') {
    // filter like "row-3" means row index 3
    const rowNum = parseInt(filter.replace('row-', ''), 10);
    const cellRow = Math.floor(cellIndex / COLS);
    return cellRow === rowNum;
  }

  // Default: apply to all planted cells
  return cell.cropId !== null;
}

/**
 * Apply an event's mechanical effect to the grid.
 * Protected cells are skipped. Protection is cleared after resolution.
 */
export function applyEventEffect(grid, event) {
  if (!event || !event.mechanicalEffect) {
    return {
      affectedCells: [],
      protectedCells: [],
      negativeAffectedCount: 0,
      removedCells: [],
      eventId: event?.id ?? null,
      eventTitle: event?.title ?? null,
    };
  }

  const { modifier, target } = event.mechanicalEffect;
  const carryForwardType = resolveCarryForwardType(event);
  if (modifier === undefined || modifier === null) {
    return {
      affectedCells: [],
      protectedCells: [],
      negativeAffectedCount: 0,
      removedCells: [],
      eventId: event.id,
      eventTitle: event.title,
    };
  }

  const affectedCells = [];
  const protectedCells = [];

  for (let i = 0; i < grid.length; i++) {
    const cell = grid[i];
    if (!cell.cropId) continue;

    // Protected cells skip the event
    if (cell.protected === true) {
      protectedCells.push(i);
      continue;
    }

    if (matchesTarget(cell, i, target, grid)) {
      cell.eventModifier += modifier;
      if (carryForwardType) {
        cell.carryForwardType = carryForwardType;
      }
      affectedCells.push(i);
    }
  }

  // Clear protection after event resolves
  for (let i = 0; i < grid.length; i++) {
    grid[i].protected = false;
  }

  return {
    affectedCells,
    protectedCells,
    negativeAffectedCount: modifier < 0 ? affectedCells.length : 0,
    removedCells: [],
    eventId: event.id,
    eventTitle: event.title,
  };
}
