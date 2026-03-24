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

function resolveDamageState(event) {
  const haystack = `${event?.category ?? ''} ${event?.title ?? ''} ${event?.description ?? ''}`.toLowerCase();
  if (!haystack.trim()) return 'impact';
  if (haystack.includes('frost') || haystack.includes('freeze') || haystack.includes('ice') || haystack.includes('cold')) {
    return 'frost';
  }
  if (haystack.includes('storm') || haystack.includes('thunder') || haystack.includes('wind') || haystack.includes('hail')) {
    return 'storm';
  }
  if (haystack.includes('flood') || haystack.includes('waterlog') || haystack.includes('downspout') || haystack.includes('standing water')) {
    return 'flood';
  }
  if (haystack.includes('heat') || haystack.includes('hot') || haystack.includes('drought')) {
    return 'heat';
  }
  if (haystack.includes('blight')) {
    return 'blight';
  }
  if (
    haystack.includes('critter')
    || haystack.includes('pest')
    || haystack.includes('aphid')
    || haystack.includes('slug')
    || haystack.includes('hornworm')
    || haystack.includes('borer')
    || haystack.includes('butterfl')
    || haystack.includes('raccoon')
  ) {
    return 'pest';
  }
  return 'impact';
}

/**
 * Check if a cell's crop matches the event's target criteria.
 */
function matchesTarget(cell, cellIndex, target, grid) {
  if (!target) return true;

  const { type, filter } = target;

  if (type === 'all') return true;

  if (type === 'random_cells') {
    // Deterministic: use cell index to decide which cells are affected
    // Alternating pattern seeded by cellIndex ensures same inputs = same outputs
    return (cellIndex * 2654435761 >>> 0) % 2 === 0;
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
  const damageState = modifier < 0 ? resolveDamageState(event) : null;
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
      if (damageState) {
        cell.damageState = damageState;
      }
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
