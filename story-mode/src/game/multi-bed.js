/**
 * MultiBedManager — manages multiple garden beds per campaign.
 *
 * Each bed has its own independent grid, name, zone, and dimensions.
 * The manager coordinates with the store via ACQUIRE_BED and SWITCH_BED actions.
 */
import { createGrid, attachGridMeta, COLS, ROWS, GRID_UNLOCKS } from './state.js';
import { Actions } from './store.js';

/**
 * Create a BedState object.
 * @param {string} id
 * @param {string} name
 * @param {string} zone
 * @param {number} cols
 * @param {number} rows
 * @returns {BedState}
 */
function createBedState(id, name, zone, cols = COLS, rows = ROWS) {
  return {
    id,
    name,
    zone,
    grid: createGrid(cols, rows),
    gridCols: cols,
    gridRows: rows,
    harvestResult: null,
  };
}

class MultiBedManager {
  /**
   * @param {import('./store.js').Store} store
   */
  constructor(store) {
    this._store = store;
    this._disposed = false;
  }

  /**
   * Acquire a new garden bed.
   * Creates a bed with an empty grid and dispatches ACQUIRE_BED.
   * @param {string} bedId
   * @param {{ name: string, zone: string, initialGridCols?: number, initialGridRows?: number }} opts
   * @returns {BedState}
   */
  acquireBed(bedId, { name, zone, initialGridCols = COLS, initialGridRows = ROWS } = {}) {
    if (this._disposed) return null;

    const bed = createBedState(bedId, name, zone, initialGridCols, initialGridRows);

    this._store.dispatch({
      type: Actions.ACQUIRE_BED,
      payload: { bedId, bed },
    });

    return bed;
  }

  /**
   * Get a bed by ID from the store state.
   * @param {string} bedId
   * @returns {BedState|null}
   */
  getBed(bedId) {
    const state = this._store.getState();
    return state.campaign.beds?.[bedId] ?? null;
  }

  /**
   * Get all beds as an array.
   * @returns {BedState[]}
   */
  getAllBeds() {
    const state = this._store.getState();
    const beds = state.campaign.beds ?? {};
    return Object.values(beds);
  }

  /**
   * Get all beds in a specific zone.
   * @param {string} zoneId
   * @returns {BedState[]}
   */
  getBedsForZone(zoneId) {
    return this.getAllBeds().filter((bed) => bed?.zone === zoneId);
  }

  /**
   * Get the currently active bed.
   * @returns {BedState|null}
   */
  getActiveBed() {
    const state = this._store.getState();
    const activeBedId = state.campaign.activeBedId;
    if (!activeBedId) return null;
    return state.campaign.beds?.[activeBedId] ?? null;
  }

  /**
   * Switch the active bed. Returns true if the bed exists and was switched.
   * @param {string} bedId
   * @returns {boolean}
   */
  switchActiveBed(bedId) {
    if (this._disposed) return false;

    const state = this._store.getState();
    if (!state.campaign.beds?.[bedId]) return false;

    this._store.dispatch({
      type: Actions.SWITCH_BED,
      payload: { bedId },
    });

    return true;
  }

  /**
   * Switch the active bed to the first bed assigned to a zone.
   * Returns the bed that became active or null when no bed exists in the zone.
   * @param {string} zoneId
   * @returns {BedState|null}
   */
  syncActiveBedToZone(zoneId) {
    if (this._disposed) return null;
    const nextBed = this.getBedsForZone(zoneId)[0] ?? null;
    if (!nextBed) return null;
    this.switchActiveBed(nextBed.id);
    return this.getBed(nextBed.id);
  }

  /**
   * Get the grid of the currently active bed.
   * @returns {Cell[]|null}
   */
  getActiveGrid() {
    const bed = this.getActiveBed();
    return bed?.grid ?? null;
  }

  /**
   * Get the grid for a specific bed.
   * @param {string} bedId
   * @returns {Cell[]|null}
   */
  getGridForBed(bedId) {
    const bed = this.getBed(bedId);
    return bed?.grid ?? null;
  }

  /**
   * Expand a bed's grid by adding rows.
   * Dispatches EXPAND_BED_GRID action.
   * @param {string} bedId
   * @param {number} newRows
   * @returns {boolean}
   */
  expandBedGrid(bedId, newRows) {
    if (this._disposed) return false;

    const state = this._store.getState();
    const bed = state.campaign.beds?.[bedId];
    if (!bed) return false;

    const currentRows = bed.gridRows ?? ROWS;
    const maxRows = Math.max(...GRID_UNLOCKS.map((u) => u.rows));

    if (!Number.isInteger(newRows) || newRows <= currentRows || newRows > maxRows) {
      return false;
    }

    this._store.dispatch({
      type: Actions.EXPAND_BED_GRID,
      payload: { bedId, rows: newRows },
    });

    return true;
  }

  /**
   * Serialize all beds for save/load.
   * @returns {BedState[]}
   */
  serializeBeds() {
    return this.getAllBeds();
  }

  /**
   * Load beds from serialized state.
   * Dispatches ACQUIRE_BED for each bed.
   * @param {BedState[]} bedStates
   */
  loadBeds(bedStates) {
    if (this._disposed) return;
    if (!Array.isArray(bedStates)) return;

    for (const bed of bedStates) {
      if (!bed?.id) continue;
      this._store.dispatch({
        type: Actions.ACQUIRE_BED,
        payload: { bedId: bed.id, bed },
      });
    }
  }

  /**
   * Clean up references.
   */
  dispose() {
    this._disposed = true;
    this._store = null;
  }
}

export { MultiBedManager, createBedState };
