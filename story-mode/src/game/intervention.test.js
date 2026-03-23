import { afterEach, describe, expect, it, vi } from 'vitest';

import { executeToolAction, canUseTool, repairTool } from './intervention.js';
import { PHASES, createGameState } from './state.js';
import { Actions, Store } from './store.js';
import { Inventory } from './inventory.js';

function makeStore() {
  return new Store(createGameState());
}

function plant(store, cellIndex, cropId = 'lettuce') {
  store.dispatch({
    type: Actions.PLANT_CROP,
    payload: { cellIndex, cropId },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('canUseTool', () => {
  it('validates water requirements and cooldowns', () => {
    const state = createGameState();
    expect(canUseTool(state, 'water', 0, 10_000)).toMatchObject({
      valid: false,
      reason: 'Water needs a planted cell.',
    });

    state.season.grid[0].cropId = 'lettuce';
    state.season.toolCooldowns.water_0 = 20_000;
    expect(canUseTool(state, 'water', 0, 10_000)).toMatchObject({
      valid: false,
      reason: 'Recently watered.',
    });

    expect(canUseTool(state, 'water', 0, 25_000)).toMatchObject({ valid: true });
  });

  it('blocks harvest until late season', () => {
    const state = createGameState();
    state.season.grid[2].cropId = 'basil';

    expect(canUseTool(state, 'harvest', 2)).toMatchObject({
      valid: false,
      reason: 'Crop is not ready yet.',
    });

    state.season.phase = PHASES.LATE_SEASON;
    expect(canUseTool(state, 'harvest', 2)).toMatchObject({ valid: true });
  });

  it('validates protect and mulch against state flags', () => {
    const state = createGameState();
    state.season.grid[3].cropId = 'spinach';
    state.season.grid[4].mulched = true;

    expect(canUseTool(state, 'protect', 3)).toMatchObject({ valid: true });

    state.season.grid[3].protected = true;
    expect(canUseTool(state, 'protect', 3)).toMatchObject({
      valid: false,
      reason: 'Cell is already protected.',
    });

    expect(canUseTool(state, 'mulch', 4)).toMatchObject({
      valid: false,
      reason: 'Cell is already mulched.',
    });
  });
});

describe('executeToolAction', () => {
  it('waters a crop, adds bonus, and applies cooldown', () => {
    const store = makeStore();
    plant(store, 0, 'lettuce');

    const result = executeToolAction(store, 'water', 0, 100_000);
    const next = store.getState();

    expect(result.success).toBe(true);
    expect(result.effects.bonus).toBeCloseTo(0.3, 5);
    expect(next.season.grid[0].interventionBonus).toBeCloseTo(0.3, 5);
    expect(next.season.grid[0].lastWateredAt).toBe(100_000);
    expect(next.season.toolCooldowns.water_0).toBe(130_000);
    expect(canUseTool(next, 'water', 0, 110_000)).toMatchObject({ valid: false });
  });

  it('returns open_crop_picker for plant when no crop is selected', () => {
    const store = makeStore();

    const result = executeToolAction(store, 'plant', 1, 50_000);

    expect(result.success).toBe(false);
    expect(result.action).toBe('open_crop_picker');
    expect(store.getState().season.grid[1].cropId).toBeNull();
  });

  it('plants immediately when a crop is already selected', () => {
    const store = makeStore();
    store.dispatch({
      type: Actions.SET_SELECTED_CROP,
      payload: { cropId: 'basil' },
    });

    const result = executeToolAction(store, 'plant', 1, 60_000);

    expect(result.success).toBe(true);
    expect(store.getState().season.grid[1].cropId).toBe('basil');
  });

  it('harvests a mature crop into the pantry and clears the cell', () => {
    const store = makeStore();
    plant(store, 2, 'lettuce');
    store.dispatch({
      type: Actions.ADVANCE_PHASE,
      payload: { phase: PHASES.LATE_SEASON },
    });

    const result = executeToolAction(store, 'harvest', 2, 70_000);
    const next = store.getState();

    expect(result.success).toBe(true);
    expect(next.season.grid[2].cropId).toBeNull();
    expect(next.campaign.pantry.lettuce).toBe(1);
    expect(next.season.harvestResult).not.toBeNull();
  });

  it('protects a crop and starts cooldown tracking', () => {
    const store = makeStore();
    plant(store, 5, 'spinach');

    const result = executeToolAction(store, 'protect', 5, 80_000);
    const next = store.getState();

    expect(result.success).toBe(true);
    expect(next.season.grid[5].protected).toBe(true);
    expect(next.season.toolCooldowns.protect_5).toBe(140_000);
  });

  it('mulches a cell with enriched carry-forward and bonus', () => {
    const store = makeStore();
    plant(store, 6, 'radish');

    const result = executeToolAction(store, 'mulch', 6, 90_000);
    const next = store.getState();

    expect(result.success).toBe(true);
    expect(next.season.grid[6].mulched).toBe(true);
    expect(next.season.grid[6].carryForwardType).toBe('enriched');
    expect(next.season.grid[6].interventionBonus).toBeCloseTo(0.2, 5);
    expect(next.season.toolCooldowns.mulch_6).toBe(210_000);
  });

  it('returns inspect action for hand tool', () => {
    const store = makeStore();

    const result = executeToolAction(store, 'hand', 7, 95_000);

    expect(result.success).toBe(true);
    expect(result.action).toBe('inspect');
    expect(result.effects.cellIndex).toBe(7);
  });

  it('decrements tool durability on use', () => {
    const store = makeStore();
    plant(store, 1, 'lettuce');

    const before = store.getState().campaign.inventory.slots[0].durability;
    executeToolAction(store, 'water', 1, 120_000);
    const after = store.getState().campaign.inventory.slots[0].durability;

    expect(after).toBe(before - 1);
  });

  it('blocks broken tools and allows repair when materials exist', () => {
    const store = makeStore();
    plant(store, 1, 'lettuce');
    store.dispatch({
      type: Actions.USE_TOOL,
      payload: { slotIndex: 0, durabilityCost: 100 },
    });

    expect(canUseTool(store.getState(), 'water', 1)).toMatchObject({
      valid: false,
      reason: 'Tool is broken — repair needed.',
    });

    const inventory = new Inventory(store);
    inventory.addItem('plant_matter', 2);
    const result = repairTool(store, inventory, 0);
    expect(result.success).toBe(true);
    expect(store.getState().campaign.inventory.slots[0].durability).toBe(100);
  });
});
