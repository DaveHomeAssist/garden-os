/**
 * MultiBedManager: the player-facing API for owning and tending more than one
 * garden bed. State rules live in ./beds.js and the store reducers; this class
 * only reads through them and dispatches ACQUIRE_BED, SWITCH_BED, and
 * EXPAND_BED_GRID, all of which the authority runtimes also validate.
 */
import { GRID_UNLOCKS, ROWS } from './state.js';
import { Actions } from './store.js';
import { getInventoryItemCount } from './inventory.js';
import {
  BED_KIT_ITEM_ID,
  HOME_BED_ID,
  canSwitchBed,
  checkBedAcquisition,
  createBedRecord,
  getBedGrid,
  listBeds,
} from './beds.js';

function createBedState(id, name, zone = HOME_BED_ID, cols, rows) {
  return createBedRecord({ bedId: id, name, zone, cols, rows });
}

class MultiBedManager {
  /**
   * @param {import('./store.js').Store} store
   */
  constructor(store) {
    this._store = store;
    this._disposed = false;
  }

  _state() {
    return this._store.getState();
  }

  /** Next free id in the bed_2, bed_3 pattern. */
  nextBedId() {
    const state = this._state();
    const taken = new Set([...Object.keys(state.campaign.beds ?? {}), state.campaign.activeBedId ?? HOME_BED_ID]);
    for (let index = 2; index < 100; index += 1) {
      const candidate = `bed_${index}`;
      if (!taken.has(candidate)) return candidate;
    }
    return null;
  }

  /** Whether the player can build another bed right now, and why not. */
  canBuildBed({ zone = HOME_BED_ID } = {}) {
    const state = this._state();
    const bedId = this.nextBedId();
    const check = checkBedAcquisition(state, { bedId, name: `Bed ${listBeds(state).length + 1}`, zone }, {
      getItemCount: (itemId) => getInventoryItemCount(state.campaign.inventory, itemId),
    });
    return check.ok ? { ok: true, bedId } : { ok: false, code: check.code, reason: check.message };
  }

  /**
   * Build a new bed from a raised bed kit.
   * @returns {{ ok: boolean, bed?: object, reason?: string, code?: string }}
   */
  buildBed(name, { bedId = this.nextBedId(), zone = HOME_BED_ID } = {}) {
    if (this._disposed) return { ok: false, reason: 'Unavailable.' };
    const state = this._state();
    const check = checkBedAcquisition(state, { bedId, name, zone }, {
      getItemCount: (itemId) => getInventoryItemCount(state.campaign.inventory, itemId),
    });
    if (!check.ok) return { ok: false, code: check.code, reason: check.message };
    this._store.dispatch({
      type: Actions.ACQUIRE_BED,
      payload: { bedId: check.bedId, name: check.name, zone: check.zone },
    });
    const bed = this.getBed(check.bedId);
    return bed ? { ok: true, bed } : { ok: false, reason: 'The bed could not be built.' };
  }

  /** Compatibility wrapper: acquireBed(id, { name, zone }) returns the bed or null. */
  acquireBed(bedId, { name, zone = HOME_BED_ID } = {}) {
    const result = this.buildBed(name, { bedId, zone });
    return result.ok ? result.bed : null;
  }

  /** A bed record; for the active bed the grid comes from the live season. */
  getBed(bedId) {
    return listBeds(this._state()).find((bed) => bed.id === bedId) ?? null;
  }

  getAllBeds() {
    return listBeds(this._state());
  }

  getBedsForZone(zoneId) {
    return this.getAllBeds().filter((bed) => bed?.zone === zoneId);
  }

  getActiveBed() {
    return this.getAllBeds().find((bed) => bed.active) ?? null;
  }

  canSwitch() {
    return canSwitchBed(this._state());
  }

  /**
   * Tend another bed. Returns true when the active bed changed.
   * @param {string} bedId
   */
  switchActiveBed(bedId) {
    if (this._disposed) return false;
    const before = this._state().campaign.activeBedId;
    if (!this._state().campaign.beds?.[bedId] || bedId === before) return false;
    this._store.dispatch({ type: Actions.SWITCH_BED, payload: { bedId } });
    return this._state().campaign.activeBedId === bedId;
  }

  syncActiveBedToZone(zoneId) {
    if (this._disposed) return null;
    const nextBed = this.getBedsForZone(zoneId)[0] ?? null;
    if (!nextBed) return null;
    this.switchActiveBed(nextBed.id);
    return this.getActiveBed();
  }

  getActiveGrid() {
    const state = this._state();
    return getBedGrid(state, state.campaign.activeBedId ?? HOME_BED_ID);
  }

  getGridForBed(bedId) {
    return getBedGrid(this._state(), bedId);
  }

  expandBedGrid(bedId, newRows) {
    if (this._disposed) return false;
    const state = this._state();
    const isActive = bedId === (state.campaign.activeBedId ?? HOME_BED_ID);
    const bed = state.campaign.beds?.[bedId];
    if (!bed && !isActive) return false;
    const currentRows = (isActive ? state.season.gridRows : bed.gridRows) ?? ROWS;
    const maxRows = Math.max(...GRID_UNLOCKS.map((unlock) => unlock.rows));
    if (!Number.isInteger(newRows) || newRows <= currentRows || newRows > maxRows) return false;
    this._store.dispatch({ type: Actions.EXPAND_BED_GRID, payload: { bedId, rows: newRows } });
    return true;
  }

  serializeBeds() {
    return this.getAllBeds();
  }

  dispose() {
    this._disposed = true;
    this._store = null;
  }
}

export { BED_KIT_ITEM_ID, MultiBedManager, createBedState };
