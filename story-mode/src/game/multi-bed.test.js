/**
 * Multiple beds: each bed keeps its own crops, soil, and history; the active
 * bed is projected into the live season grid and parked on every switch.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { BedManager } from './bed-manager.js';
import { Actions, Store } from './store.js';
import { COLS, PHASES, ROWS, createGameState } from './state.js';
import { addItemToInventoryState, getInventoryItemCount } from './inventory.js';
import { BED_KIT_ITEM_ID, HOME_BED_ID, getBedGrid } from './beds.js';
import { advance } from './phase-machine.js';

function stateWithKits(count = 2) {
  const state = createGameState();
  state.campaign.inventory = addItemToInventoryState(state.campaign.inventory, BED_KIT_ITEM_ID, count).inventory;
  return state;
}

function plant(store, cellIndex, cropId) {
  store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex, cropId } });
}

describe('BedManager', () => {
  let store;
  let beds;

  beforeEach(() => {
    store = new Store(stateWithKits(2));
    beds = new BedManager(store);
  });

  it('builds a bed from a raised bed kit and spends the kit', () => {
    const result = beds.buildBed('Back Fence');
    expect(result.ok).toBe(true);
    expect(result.bed).toMatchObject({ id: 'bed_2', name: 'Back Fence', zone: HOME_BED_ID, gridCols: COLS, gridRows: ROWS });
    expect(result.bed.grid).toHaveLength(COLS * ROWS);
    expect(getInventoryItemCount(store.getState().campaign.inventory, BED_KIT_ITEM_ID)).toBe(1);
    // The implicit first bed became a real record so it can be parked.
    expect(store.getState().campaign.beds[HOME_BED_ID]).toBeTruthy();
  });

  it('refuses to build without a kit and past the home plot bed slots', () => {
    const bare = new BedManager(new Store(createGameState()));
    expect(bare.canBuildBed()).toMatchObject({ ok: false, code: 'NO_BED_KIT' });

    const rich = new BedManager(new Store(stateWithKits(5)));
    expect(rich.buildBed('Two').ok).toBe(true);
    expect(rich.buildBed('Three').ok).toBe(true);
    const fourth = rich.buildBed('Four');
    expect(fourth).toMatchObject({ ok: false, code: 'BED_LIMIT' });
  });

  it('refuses beds where WORLD_MAP has no bed slots', () => {
    expect(beds.buildBed('Meadow Bed', { zone: 'meadow' })).toMatchObject({ ok: false, code: 'NO_BED_SLOT' });
  });

  it('keeps each bed independent across switches', () => {
    plant(store, 0, 'basil');
    beds.buildBed('Second');
    expect(beds.switchActiveBed('bed_2')).toBe(true);
    expect(store.getState().season.grid[0].cropId).toBeNull();

    plant(store, 1, 'lettuce');
    expect(beds.switchActiveBed(HOME_BED_ID)).toBe(true);
    const state = store.getState();
    expect(state.season.grid[0].cropId).toBe('basil');
    expect(state.season.grid[1].cropId).toBeNull();
    expect(getBedGrid(state, 'bed_2')[1].cropId).toBe('lettuce');
    expect(beds.getActiveBed().id).toBe(HOME_BED_ID);
  });

  it('returns false for unknown beds and the bed already active', () => {
    expect(beds.switchActiveBed('missing')).toBe(false);
    beds.buildBed('Second');
    expect(beds.switchActiveBed(HOME_BED_ID)).toBe(false);
  });

  it('locks switching while harvest is being scored', () => {
    beds.buildBed('Second');
    const state = store.getState();
    state.season.phase = PHASES.HARVEST;
    store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });
    expect(beds.canSwitch()).toBe(false);
    expect(beds.switchActiveBed('bed_2')).toBe(false);
  });

  it('expands a parked bed and the active bed through the projection', () => {
    beds.buildBed('Second');
    expect(beds.expandBedGrid('bed_2', 6)).toBe(true);
    expect(beds.getBed('bed_2').grid).toHaveLength(COLS * 6);
    expect(beds.expandBedGrid(HOME_BED_ID, 6)).toBe(true);
    expect(store.getState().season.grid).toHaveLength(COLS * 6);
    expect(beds.expandBedGrid('bed_2', 3)).toBe(false);
  });

  it('rolls parked beds into the next season with their own soil and history', () => {
    plant(store, 0, 'basil');
    beds.buildBed('Second');
    beds.switchActiveBed('bed_2');
    plant(store, 2, 'cherry_tom');
    beds.switchActiveBed(HOME_BED_ID);

    const state = store.getState();
    state.season.campaign = state.campaign;
    state.season.phase = PHASES.TRANSITION;
    advance(state);
    expect(state.season.phase).toBe(PHASES.PLANNING);

    const parked = state.campaign.beds.bed_2;
    expect(parked.history.at(-1)).toMatchObject({ chapter: 1 });
    expect(parked.previousGrid[2].cropId).toBe('cherry_tom');
    expect(parked.grid[2].cropId).toBeNull();
    expect(parked.grid[2].soilFatigue).toBeGreaterThan(0);
    expect(state.campaign.beds[HOME_BED_ID].history.length).toBeGreaterThan(0);
  });
});
