/**
 * Integration Test Suite — story-mode game loop.
 *
 * Tests the store, phase machine, save system, input manager,
 * scoring, and event engine as integrated units.
 *
 * Run: cd story-mode && npx vitest run
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createGameState, createSeasonState, PHASES, PHASE_ORDER, CELL_COUNT } from '../game/state.js';
import { Actions, Store, cloneGameState, gameReducer, normalizeGameState } from '../game/store.js';
import { advance, canAdvance } from '../game/phase-machine.js';
import { applyEventEffect } from '../game/event-engine.js';
import { scoreCell } from '../scoring/cell-score.js';
import { scoreBed } from '../scoring/bed-score.js';
import {
  saveCampaign,
  loadCampaign,
  saveSeasonState,
  loadSeasonState,
  deleteCampaign,
  subscribeToStoreSaves,
  listSaves,
  SAVE_SLOTS,
} from '../game/save.js';

import {
  createTestStore,
  plantGrid,
  advancePhases,
  assertGridState,
  buildMinimalLayout,
  createPlantedStore,
} from './test-helpers.js';

// ---------------------------------------------------------------------------
// Mock localStorage for save/load tests (node environment has no localStorage)
// ---------------------------------------------------------------------------
function createMockStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
  };
}

function createKeyboardEvent(type, init = {}) {
  const event = new Event(type, {
    bubbles: init.bubbles ?? false,
    cancelable: init.cancelable ?? false,
  });

  Object.defineProperties(event, {
    key: { value: init.key ?? '', enumerable: true },
    altKey: { value: Boolean(init.altKey), enumerable: true },
    ctrlKey: { value: Boolean(init.ctrlKey), enumerable: true },
    metaKey: { value: Boolean(init.metaKey), enumerable: true },
    shiftKey: { value: Boolean(init.shiftKey), enumerable: true },
  });

  return event;
}

// ---------------------------------------------------------------------------
// 1. Full Season Playthrough
// ---------------------------------------------------------------------------
describe('Full Season Playthrough', () => {
  beforeEach(() => {
    globalThis.localStorage = createMockStorage();
  });

  afterEach(() => {
    delete globalThis.localStorage;
  });

  it('advances through all 6 phases from PLANNING to TRANSITION and produces a grade', () => {
    const store = createPlantedStore();

    // Verify we start in PLANNING with 8 crops planted
    let state = store.getState();
    expect(state.season.phase).toBe(PHASES.PLANNING);
    const plantedCount = state.season.grid.filter((c) => c.cropId !== null).length;
    expect(plantedCount).toBeGreaterThanOrEqual(8);

    // Advance: PLANNING -> EARLY_SEASON
    const results = advancePhases(store, 1);
    expect(results[0].advanced).toBe(true);
    state = store.getState();
    expect(state.season.phase).toBe(PHASES.EARLY_SEASON);

    // For beat phases (EARLY/MID/LATE), we need to resolve events before advancing.
    // The phase machine sets eventActive and requires interventionChosen or null eventActive.
    // Set interventionChosen to allow advancement.
    store.dispatch({
      type: Actions.APPLY_EVENT,
      payload: {
        eventActive: null,
        resolvedEvent: state.season.eventActive,
        summary: { negativeAffectedCount: 0 },
      },
    });
    store.dispatch({
      type: Actions.USE_INTERVENTION,
      payload: { interventionId: 'accept_loss', interventionTokens: state.season.interventionTokens },
    });

    // Advance: EARLY_SEASON -> MID_SEASON
    const r2 = advancePhases(store, 1);
    expect(r2[0].advanced).toBe(true);
    state = store.getState();
    expect(state.season.phase).toBe(PHASES.MID_SEASON);

    // Resolve mid-season event
    store.dispatch({
      type: Actions.APPLY_EVENT,
      payload: { eventActive: null },
    });
    store.dispatch({
      type: Actions.USE_INTERVENTION,
      payload: { interventionId: 'accept_loss' },
    });

    // Advance: MID_SEASON -> LATE_SEASON
    const r3 = advancePhases(store, 1);
    expect(r3[0].advanced).toBe(true);
    state = store.getState();
    expect(state.season.phase).toBe(PHASES.LATE_SEASON);

    // Resolve late-season event
    store.dispatch({
      type: Actions.APPLY_EVENT,
      payload: { eventActive: null },
    });
    store.dispatch({
      type: Actions.USE_INTERVENTION,
      payload: { interventionId: 'accept_loss' },
    });

    // Advance: LATE_SEASON -> HARVEST
    const r4 = advancePhases(store, 1);
    expect(r4[0].advanced).toBe(true);
    state = store.getState();
    expect(state.season.phase).toBe(PHASES.HARVEST);
    expect(state.season.harvestResult).not.toBeNull();

    // Verify harvest result has a score and grade
    const harvest = state.season.harvestResult;
    expect(typeof harvest.score).toBe('number');
    expect(harvest.score).toBeGreaterThanOrEqual(0);
    expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(harvest.grade);

    // Advance: HARVEST -> TRANSITION
    const r5 = advancePhases(store, 1);
    expect(r5[0].advanced).toBe(true);
    state = store.getState();
    expect(state.season.phase).toBe(PHASES.TRANSITION);

    // Verify a journal entry was recorded
    expect(state.campaign.journalEntries.length).toBeGreaterThanOrEqual(1);
    const entry = state.campaign.journalEntries[0];
    expect(entry.chapter).toBe(1);
    expect(entry.season).toBe('spring');
    expect(typeof entry.score).toBe('number');
    expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(entry.grade);
  });
});

// ---------------------------------------------------------------------------
// 2. Save/Load Round-Trip
// ---------------------------------------------------------------------------
describe('Save/Load Round-Trip', () => {
  beforeEach(() => {
    globalThis.localStorage = createMockStorage();
  });

  afterEach(() => {
    delete globalThis.localStorage;
  });

  it('persists and restores campaign + season state through localStorage', () => {
    const store = createPlantedStore();
    const state = store.getState();
    const slot = 0;

    // Save campaign and season
    const savedCampaign = saveCampaign(state.campaign, slot);
    expect(savedCampaign).not.toBeNull();
    expect(savedCampaign.updatedAt).toBeDefined();

    const savedSeason = saveSeasonState(state.season, slot);
    expect(savedSeason).not.toBeNull();

    // Load them back
    const loadedCampaign = loadCampaign(slot);
    const loadedSeason = loadSeasonState(slot);

    expect(loadedCampaign).not.toBeNull();
    expect(loadedSeason).not.toBeNull();

    // Verify campaign round-trip
    expect(loadedCampaign.currentChapter).toBe(state.campaign.currentChapter);
    expect(loadedCampaign.currentSeason).toBe(state.campaign.currentSeason);
    expect(loadedCampaign.cropsUnlocked).toEqual(state.campaign.cropsUnlocked);

    // Verify season round-trip preserves grid
    expect(loadedSeason.phase).toBe(state.season.phase);
    expect(loadedSeason.grid.cells.length).toBe(CELL_COUNT);
    for (let i = 0; i < CELL_COUNT; i++) {
      expect(loadedSeason.grid.cells[i].cropId).toBe(state.season.grid[i].cropId);
    }
  });

  it('loads saved state into a fresh store and verifies state match', () => {
    // Build a store with some state
    const original = createPlantedStore();
    original.dispatch({
      type: Actions.AWARD_KEEPSAKE,
      payload: {
        awarded: { id: 'test_keepsake', earnedAt: '2026-01-01T00:00:00Z', chapter: 1, season: 'spring' },
      },
    });
    original.dispatch({
      type: Actions.PUSH_JOURNAL,
      payload: { entry: { chapter: 1, season: 'spring', score: 72, grade: 'B' } },
    });

    const originalState = original.getState();
    const slot = 1;

    // Save
    saveCampaign(originalState.campaign, slot);
    saveSeasonState(originalState.season, slot);

    // Load into a fresh store
    const loadedCampaign = loadCampaign(slot);
    const loadedSeason = loadSeasonState(slot);
    expect(loadedCampaign).not.toBeNull();

    const freshStore = new Store(createGameState());
    freshStore.dispatch({
      type: Actions.LOAD_SAVE,
      payload: {
        state: {
          campaign: loadedCampaign,
          season: { ...loadedSeason, campaign: loadedCampaign },
        },
      },
    });

    const restoredState = freshStore.getState();

    // Verify key state properties match
    expect(restoredState.campaign.currentChapter).toBe(originalState.campaign.currentChapter);
    expect(restoredState.campaign.keepsakes).toHaveLength(1);
    expect(restoredState.campaign.keepsakes[0].id).toBe('test_keepsake');
    expect(restoredState.campaign.journalEntries).toHaveLength(1);
    expect(restoredState.campaign.journalEntries[0].score).toBe(72);

    // Grid should match
    for (let i = 0; i < CELL_COUNT; i++) {
      expect(restoredState.season.grid[i].cropId).toBe(originalState.season.grid[i].cropId);
    }
  });

  it('rejects invalid slot numbers', () => {
    const campaign = createGameState().campaign;
    expect(saveCampaign(campaign, -1)).toBeNull();
    expect(saveCampaign(campaign, SAVE_SLOTS)).toBeNull();
    expect(saveCampaign(campaign, 1.5)).toBeNull();
    expect(loadCampaign(-1)).toBeNull();
  });

  it('delete clears both campaign and season from a slot', () => {
    const state = createGameState();
    const slot = 2;

    saveCampaign(state.campaign, slot);
    saveSeasonState(state.season, slot);
    expect(loadCampaign(slot)).not.toBeNull();

    deleteCampaign(slot);
    expect(loadCampaign(slot)).toBeNull();
    expect(loadSeasonState(slot)).toBeNull();
  });

  it('subscribeToStoreSaves auto-persists on dispatch', () => {
    const store = new Store(createGameState());
    const slot = 0;
    const unsub = subscribeToStoreSaves(store, () => slot);

    store.dispatch({
      type: Actions.PLANT_CROP,
      payload: { cellIndex: 0, cropId: 'basil' },
    });

    const loaded = loadCampaign(slot);
    expect(loaded).not.toBeNull();
    const loadedSeason = loadSeasonState(slot);
    expect(loadedSeason).not.toBeNull();
    expect(loadedSeason.grid.cells[0].cropId).toBe('basil');

    unsub();

    // After unsubscribing, further dispatches should not save
    deleteCampaign(slot);
    store.dispatch({
      type: Actions.PLANT_CROP,
      payload: { cellIndex: 1, cropId: 'lettuce' },
    });
    expect(loadCampaign(slot)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Store Dispatch Integrity
// ---------------------------------------------------------------------------
describe('Store Dispatch Integrity', () => {
  it('dispatches every action type and verifies state changes + subscriber notifications', () => {
    const store = new Store(createGameState());
    const subscriber = vi.fn();
    const unsub = store.subscribe(subscriber);

    // PLANT_CROP
    store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex: 0, cropId: 'basil' } });
    expect(store.getState().season.grid[0].cropId).toBe('basil');
    expect(subscriber).toHaveBeenCalledTimes(1);

    // SET_DAMAGE
    store.dispatch({ type: Actions.SET_DAMAGE, payload: { cellIndex: 0, damageState: 'frost' } });
    expect(store.getState().season.grid[0].damageState).toBe('frost');

    // SET_PROTECTION
    store.dispatch({ type: Actions.SET_PROTECTION, payload: { cellIndex: 0, protected: true } });
    expect(store.getState().season.grid[0].protected).toBe(true);

    // UPDATE_SOIL
    store.dispatch({ type: Actions.UPDATE_SOIL, payload: { cellIndex: 0, soilFatigue: 0.3 } });
    expect(store.getState().season.grid[0].soilFatigue).toBe(0.3);

    // CARRY_FORWARD
    store.dispatch({ type: Actions.CARRY_FORWARD, payload: { cellIndex: 0, carryForwardType: 'mulched' } });
    expect(store.getState().season.grid[0].carryForwardType).toBe('mulched');

    // SET_SELECTED_CROP
    store.dispatch({ type: Actions.SET_SELECTED_CROP, payload: { cropId: 'lettuce' } });
    expect(store.getState().selectedCropId).toBe('lettuce');

    // REMOVE_CROP
    store.dispatch({ type: Actions.REMOVE_CROP, payload: { cellIndex: 0 } });
    expect(store.getState().season.grid[0].cropId).toBeNull();

    // ADVANCE_PHASE
    store.dispatch({ type: Actions.ADVANCE_PHASE, payload: { phase: PHASES.EARLY_SEASON } });
    expect(store.getState().season.phase).toBe(PHASES.EARLY_SEASON);

    // ADVANCE_CHAPTER
    store.dispatch({ type: Actions.ADVANCE_CHAPTER, payload: { chapter: 3, season: 'fall' } });
    expect(store.getState().campaign.currentChapter).toBe(3);
    expect(store.getState().campaign.currentSeason).toBe('fall');

    // AWARD_KEEPSAKE
    store.dispatch({
      type: Actions.AWARD_KEEPSAKE,
      payload: { awarded: { id: 'golden_seed', earnedAt: '2026-01-01T00:00:00Z' } },
    });
    expect(store.getState().campaign.keepsakes).toHaveLength(1);
    expect(store.getState().campaign.keepsakes[0].id).toBe('golden_seed');

    // Duplicate keepsake should not be added
    store.dispatch({
      type: Actions.AWARD_KEEPSAKE,
      payload: { awarded: { id: 'golden_seed', earnedAt: '2026-01-02T00:00:00Z' } },
    });
    expect(store.getState().campaign.keepsakes).toHaveLength(1);

    // PUSH_JOURNAL
    store.dispatch({
      type: Actions.PUSH_JOURNAL,
      payload: { entry: { chapter: 1, season: 'spring', score: 65, grade: 'C' } },
    });
    expect(store.getState().campaign.journalEntries).toHaveLength(1);

    // APPLY_EVENT
    store.dispatch({
      type: Actions.APPLY_EVENT,
      payload: { eventActive: { id: 'test-storm', title: 'Storm' }, resolvedEvent: null },
    });
    expect(store.getState().season.eventActive.id).toBe('test-storm');

    // USE_INTERVENTION
    store.dispatch({
      type: Actions.USE_INTERVENTION,
      payload: { interventionId: 'protect', interventionTokens: 2, eventActive: null },
    });
    expect(store.getState().season.interventionChosen).toBe('protect');
    expect(store.getState().season.interventionTokens).toBe(2);

    // RESET_SEASON
    store.dispatch({ type: Actions.RESET_SEASON, payload: {} });
    expect(store.getState().season.phase).toBe(PHASES.PLANNING);
    expect(store.getState().season.grid.every((c) => c.cropId === null)).toBe(true);

    // All dispatches should have notified subscriber
    const callCount = subscriber.mock.calls.length;
    expect(callCount).toBeGreaterThan(10);

    // Verify subscriber receives (state, action) pair
    const lastCall = subscriber.mock.calls[callCount - 1];
    expect(lastCall[0]).toHaveProperty('season');
    expect(lastCall[0]).toHaveProperty('campaign');
    expect(lastCall[1]).toHaveProperty('type');

    unsub();
  });

  it('does not notify subscribers for unknown actions (state unchanged)', () => {
    const store = new Store(createGameState());
    const subscriber = vi.fn();
    store.subscribe(subscriber);

    store.dispatch({ type: 'TOTALLY_UNKNOWN' });
    expect(subscriber).not.toHaveBeenCalled();
  });

  it('returns cloned state — mutations do not leak', () => {
    const store = new Store(createGameState());
    store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex: 0, cropId: 'basil' } });

    const s1 = store.getState();
    const s2 = store.getState();

    // Different object references
    expect(s1).not.toBe(s2);
    expect(s1.season.grid).not.toBe(s2.season.grid);
    expect(s1.season.grid[0]).not.toBe(s2.season.grid[0]);

    // But deep-equal
    expect(s1.season.grid[0].cropId).toBe(s2.season.grid[0].cropId);

    // Mutating one doesn't affect the other
    s1.season.grid[0].cropId = 'MUTATED';
    expect(store.getState().season.grid[0].cropId).toBe('basil');
  });
});

// ---------------------------------------------------------------------------
// 4. Input -> Action Pipeline
// ---------------------------------------------------------------------------
describe('Input -> Action Pipeline', () => {
  // InputManager requires DOM event targets. We use minimal stubs.
  let inputManager;
  let keyboardTarget;
  let pointerTarget;

  beforeEach(async () => {
    // Create minimal DOM-like event targets
    keyboardTarget = new EventTarget();
    pointerTarget = new EventTarget();
    // Add getBoundingClientRect for pointer position calculations
    pointerTarget.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });

    const { InputManager } = await import('../input/input-manager.js');
    inputManager = new InputManager(pointerTarget, { keyboardTarget, pointerTarget });
  });

  afterEach(() => {
    inputManager?.dispose();
  });

  it('registers actions with key bindings and fires callbacks on key events', () => {
    const callback = vi.fn();

    inputManager.registerAction('advance', { keys: ['Space'] });
    inputManager.on('advance', callback);

    // Dispatch a keyboard event matching the binding
    keyboardTarget.dispatchEvent(createKeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    }));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0].action).toBe('advance');
    expect(callback.mock.calls[0][0].source).toBe('keyboard');
  });

  it('supports modifier key bindings', () => {
    const callback = vi.fn();

    inputManager.registerAction('debug', { keys: ['Shift+d'] });
    inputManager.on('debug', callback);

    // Without shift — should not fire
    keyboardTarget.dispatchEvent(createKeyboardEvent('keydown', {
      key: 'd',
      bubbles: true,
      shiftKey: false,
    }));
    expect(callback).not.toHaveBeenCalled();

    // With shift — should fire
    keyboardTarget.dispatchEvent(createKeyboardEvent('keydown', {
      key: 'd',
      bubbles: true,
      shiftKey: true,
    }));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('tracks held keys correctly', () => {
    keyboardTarget.dispatchEvent(createKeyboardEvent('keydown', { key: 'w' }));
    expect(inputManager.isKeyHeld('w')).toBe(true);

    keyboardTarget.dispatchEvent(createKeyboardEvent('keyup', { key: 'w' }));
    expect(inputManager.isKeyHeld('w')).toBe(false);
  });

  it('unregisters action listeners via the returned cleanup function', () => {
    const callback = vi.fn();
    inputManager.registerAction('test', { keys: ['t'] });
    const off = inputManager.on('test', callback);

    keyboardTarget.dispatchEvent(createKeyboardEvent('keydown', { key: 't' }));
    expect(callback).toHaveBeenCalledTimes(1);

    off();
    keyboardTarget.dispatchEvent(createKeyboardEvent('keydown', { key: 't' }));
    expect(callback).toHaveBeenCalledTimes(1); // no additional call
  });

  it('supports multiple key bindings per action', () => {
    const callback = vi.fn();
    inputManager.registerAction('cancel', { keys: ['Escape', 'q'] });
    inputManager.on('cancel', callback);

    keyboardTarget.dispatchEvent(createKeyboardEvent('keydown', { key: 'Escape' }));
    expect(callback).toHaveBeenCalledTimes(1);

    keyboardTarget.dispatchEvent(createKeyboardEvent('keydown', { key: 'q' }));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('stops propagation when payload.handled is set', () => {
    const first = vi.fn((payload) => { payload.stop(); });
    const second = vi.fn();

    inputManager.registerAction('intercept', { keys: ['x'] });
    inputManager.on('intercept', first);
    inputManager.on('intercept', second);

    keyboardTarget.dispatchEvent(createKeyboardEvent('keydown', { key: 'x' }));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. Scoring Consistency
// ---------------------------------------------------------------------------
describe('Scoring Consistency', () => {
  it('produces deterministic scores for the same grid configuration', () => {
    const grid = Array.from({ length: CELL_COUNT }, () => ({
      cropId: null,
      protected: false,
      mulched: false,
      damageState: null,
      carryForwardType: null,
      eventModifier: 0,
      interventionBonus: 0,
      soilFatigue: 0,
    }));

    // Plant a known layout
    grid[0].cropId = 'lettuce';
    grid[1].cropId = 'basil';
    grid[2].cropId = 'spinach';
    grid[3].cropId = 'arugula';
    grid[8].cropId = 'radish';
    grid[9].cropId = 'marigold';
    grid[10].cropId = 'lettuce';
    grid[11].cropId = 'basil';

    const siteConfig = { sunHours: 6, trellis: true, orientation: 'ew' };
    const season = 'spring';

    // Score twice
    const result1 = scoreBed(grid, siteConfig, season);
    const result2 = scoreBed(grid, siteConfig, season);

    // Must be identical
    expect(result1.score).toBe(result2.score);
    expect(result1.grade).toBe(result2.grade);
    expect(result1.occupiedCount).toBe(result2.occupiedCount);
    expect(result1.details.cellAvg).toBe(result2.details.cellAvg);
    expect(result1.details.diversityBonus).toBe(result2.details.diversityBonus);

    // Cell scores must match
    for (let i = 0; i < CELL_COUNT; i++) {
      if (result1.cellScores[i]) {
        expect(result1.cellScores[i].total).toBe(result2.cellScores[i].total);
        expect(result1.cellScores[i].factors).toEqual(result2.cellScores[i].factors);
      }
    }
  });

  it('changing one cell only affects that cell and its neighbors', () => {
    const makeGrid = () => Array.from({ length: CELL_COUNT }, () => ({
      cropId: null,
      protected: false,
      mulched: false,
      damageState: null,
      carryForwardType: null,
      eventModifier: 0,
      interventionBonus: 0,
      soilFatigue: 0,
    }));

    const siteConfig = { sunHours: 6, trellis: true, orientation: 'ew' };
    const season = 'spring';

    // Grid A: plant at positions 0,1,2,3 and 8,9,10,11
    const gridA = makeGrid();
    gridA[0].cropId = 'lettuce';
    gridA[1].cropId = 'basil';
    gridA[2].cropId = 'spinach';
    gridA[3].cropId = 'arugula';
    gridA[8].cropId = 'radish';
    gridA[9].cropId = 'marigold';
    gridA[10].cropId = 'lettuce';
    gridA[11].cropId = 'basil';

    // Grid B: same except change cell 3 from arugula to radish
    const gridB = makeGrid();
    gridB[0].cropId = 'lettuce';
    gridB[1].cropId = 'basil';
    gridB[2].cropId = 'spinach';
    gridB[3].cropId = 'radish'; // changed
    gridB[8].cropId = 'radish';
    gridB[9].cropId = 'marigold';
    gridB[10].cropId = 'lettuce';
    gridB[11].cropId = 'basil';

    const scoresA = [];
    const scoresB = [];
    for (let i = 0; i < CELL_COUNT; i++) {
      scoresA.push(scoreCell(i, gridA, siteConfig, season));
      scoresB.push(scoreCell(i, gridB, siteConfig, season));
    }

    // The changed cell (3) and its neighbors (2, 4, 11) may differ.
    // Cell 4 is empty so null. Cells far away (8, 9, 10) should be identical
    // unless they are neighbors of cell 3.
    // Cell 3's neighbors: 2 (left), 4 (right, empty), 11 (below)
    const potentiallyAffected = new Set([2, 3, 4, 11]);

    for (let i = 0; i < CELL_COUNT; i++) {
      if (potentiallyAffected.has(i)) continue;
      if (scoresA[i] === null && scoresB[i] === null) continue;
      if (scoresA[i] !== null && scoresB[i] !== null) {
        expect(scoresA[i].total).toBe(scoresB[i].total);
      }
    }

    // The changed cell itself SHOULD differ (arugula vs radish)
    expect(scoresA[3]).not.toBeNull();
    expect(scoresB[3]).not.toBeNull();
    // Verify they are different crops
    expect(scoresA[3].cropId).toBe('arugula');
    expect(scoresB[3].cropId).toBe('radish');
  });

  it('returns null for empty cells', () => {
    const grid = Array.from({ length: CELL_COUNT }, () => ({
      cropId: null,
      protected: false,
      mulched: false,
      damageState: null,
      carryForwardType: null,
      eventModifier: 0,
      interventionBonus: 0,
      soilFatigue: 0,
    }));
    const siteConfig = { sunHours: 6, trellis: true, orientation: 'ew' };

    expect(scoreCell(0, grid, siteConfig, 'spring')).toBeNull();
  });

  it('scores an empty bed as 0 / F', () => {
    const grid = Array.from({ length: CELL_COUNT }, () => ({
      cropId: null,
      protected: false,
      mulched: false,
      damageState: null,
      carryForwardType: null,
      eventModifier: 0,
      interventionBonus: 0,
      soilFatigue: 0,
    }));
    const result = scoreBed(grid, { sunHours: 6, trellis: true }, 'spring');
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
  });

  it('applies eventModifier and interventionBonus to cell scores', () => {
    const grid = Array.from({ length: CELL_COUNT }, () => ({
      cropId: null,
      protected: false,
      mulched: false,
      damageState: null,
      carryForwardType: null,
      eventModifier: 0,
      interventionBonus: 0,
      soilFatigue: 0,
    }));
    grid[0].cropId = 'basil';
    const siteConfig = { sunHours: 6, trellis: true, orientation: 'ew' };

    const baseScore = scoreCell(0, grid, siteConfig, 'spring');

    // Add a positive eventModifier
    grid[0].eventModifier = 1.0;
    const boostedScore = scoreCell(0, grid, siteConfig, 'spring');

    // The boosted score should be higher (clamped to 10)
    expect(boostedScore.total).toBeGreaterThanOrEqual(baseScore.total);

    // Reset and test interventionBonus
    grid[0].eventModifier = 0;
    grid[0].interventionBonus = 0.5;
    const interventionScore = scoreCell(0, grid, siteConfig, 'spring');
    expect(interventionScore.total).toBeGreaterThanOrEqual(baseScore.total);
  });
});

// ---------------------------------------------------------------------------
// 6. Event Engine Determinism
// ---------------------------------------------------------------------------
describe('Event Engine Determinism', () => {
  it('applies negative event effects to unprotected planted cells', () => {
    const grid = Array.from({ length: CELL_COUNT }, () => ({
      cropId: null,
      protected: false,
      mulched: false,
      damageState: null,
      carryForwardType: null,
      eventModifier: 0,
      interventionBonus: 0,
      soilFatigue: 0,
    }));

    grid[0].cropId = 'basil';
    grid[1].cropId = 'lettuce';
    grid[2].cropId = 'spinach';

    const event = {
      id: 'test-frost',
      title: 'Late Frost',
      category: 'weather',
      valence: 'negative',
      mechanicalEffect: {
        modifier: -0.5,
        target: { type: 'all' },
        duration: 'current_beat',
      },
    };

    const result = applyEventEffect(grid, event);

    expect(result.affectedCells).toHaveLength(3);
    expect(result.negativeAffectedCount).toBe(3);
    expect(result.protectedCells).toHaveLength(0);

    // All planted cells should have damage and modified eventModifier
    expect(grid[0].eventModifier).toBe(-0.5);
    expect(grid[1].eventModifier).toBe(-0.5);
    expect(grid[2].eventModifier).toBe(-0.5);
    expect(grid[0].damageState).toBe('frost');
  });

  it('skips protected cells and clears protection after resolution', () => {
    const grid = Array.from({ length: CELL_COUNT }, () => ({
      cropId: null,
      protected: false,
      mulched: false,
      damageState: null,
      carryForwardType: null,
      eventModifier: 0,
      interventionBonus: 0,
      soilFatigue: 0,
    }));

    grid[0].cropId = 'basil';
    grid[0].protected = true;
    grid[1].cropId = 'lettuce';

    const event = {
      id: 'test-storm',
      title: 'Storm Front',
      category: 'weather',
      valence: 'negative',
      mechanicalEffect: {
        modifier: -1.0,
        target: { type: 'all' },
        duration: 'current_beat',
      },
    };

    const result = applyEventEffect(grid, event);

    // Cell 0 was protected — should be skipped
    expect(result.protectedCells).toContain(0);
    expect(result.affectedCells).not.toContain(0);
    expect(grid[0].eventModifier).toBe(0);
    expect(grid[0].damageState).toBeNull();

    // Cell 1 was unprotected — should be affected
    expect(result.affectedCells).toContain(1);
    expect(grid[1].eventModifier).toBe(-1.0);
    expect(grid[1].damageState).toBe('storm');

    // All protection should be cleared after event
    expect(grid[0].protected).toBe(false);
    expect(grid[1].protected).toBe(false);
  });

  it('same event on identical grids produces identical results', () => {
    function makeGrid() {
      const grid = Array.from({ length: CELL_COUNT }, () => ({
        cropId: null,
        protected: false,
        mulched: false,
        damageState: null,
        carryForwardType: null,
        eventModifier: 0,
        interventionBonus: 0,
        soilFatigue: 0,
      }));
      grid[0].cropId = 'basil';
      grid[1].cropId = 'lettuce';
      grid[5].cropId = 'spinach';
      grid[1].protected = true;
      return grid;
    }

    const event = {
      id: 'deterministic-test',
      title: 'Heat Wave',
      category: 'weather',
      valence: 'negative',
      mechanicalEffect: {
        modifier: -0.75,
        target: { type: 'all' },
        duration: 'current_beat',
      },
    };

    const gridA = makeGrid();
    const gridB = makeGrid();

    const resultA = applyEventEffect(gridA, event);
    const resultB = applyEventEffect(gridB, event);

    // Results should be structurally identical
    expect(resultA.affectedCells).toEqual(resultB.affectedCells);
    expect(resultA.protectedCells).toEqual(resultB.protectedCells);
    expect(resultA.negativeAffectedCount).toBe(resultB.negativeAffectedCount);

    // Grid cells should have identical state
    for (let i = 0; i < CELL_COUNT; i++) {
      expect(gridA[i].eventModifier).toBe(gridB[i].eventModifier);
      expect(gridA[i].damageState).toBe(gridB[i].damageState);
      expect(gridA[i].protected).toBe(gridB[i].protected);
    }
  });

  it('applies carry-forward type from event', () => {
    const grid = Array.from({ length: CELL_COUNT }, () => ({
      cropId: null,
      protected: false,
      mulched: false,
      damageState: null,
      carryForwardType: null,
      eventModifier: 0,
      interventionBonus: 0,
      soilFatigue: 0,
    }));
    grid[0].cropId = 'basil';

    const event = {
      id: 'waterlog-event',
      title: 'Standing Water',
      category: 'infrastructure',
      valence: 'negative',
      mechanicalEffect: {
        modifier: -0.3,
        target: { type: 'all' },
      },
      carryForward: {
        effect: 'Soil compacted from waterlogged ground',
      },
    };

    applyEventEffect(grid, event);
    expect(grid[0].carryForwardType).toBe('compacted');
    expect(grid[0].damageState).toBe('flood');
  });

  it('does nothing when event has no mechanicalEffect', () => {
    const grid = Array.from({ length: CELL_COUNT }, () => ({
      cropId: null,
      protected: false,
      mulched: false,
      damageState: null,
      carryForwardType: null,
      eventModifier: 0,
      interventionBonus: 0,
      soilFatigue: 0,
    }));
    grid[0].cropId = 'basil';

    const result = applyEventEffect(grid, { id: 'noop', title: 'Nothing' });
    expect(result.affectedCells).toHaveLength(0);
    expect(grid[0].eventModifier).toBe(0);
    expect(grid[0].damageState).toBeNull();
  });

  it('positive events apply positive modifiers without damage state', () => {
    const grid = Array.from({ length: CELL_COUNT }, () => ({
      cropId: null,
      protected: false,
      mulched: false,
      damageState: null,
      carryForwardType: null,
      eventModifier: 0,
      interventionBonus: 0,
      soilFatigue: 0,
    }));
    grid[0].cropId = 'basil';

    const event = {
      id: 'sunny-day',
      title: 'Perfect Weather',
      category: 'weather',
      valence: 'positive',
      mechanicalEffect: {
        modifier: 0.5,
        target: { type: 'all' },
      },
    };

    const result = applyEventEffect(grid, event);
    expect(result.affectedCells).toContain(0);
    expect(result.negativeAffectedCount).toBe(0);
    expect(grid[0].eventModifier).toBe(0.5);
    expect(grid[0].damageState).toBeNull();
  });
});

// ===========================================================================
// Phase 1H — Movement, Camera, Tools, Mode Selection
// ===========================================================================
// These tests cover the 3D movement controller, camera follow system,
// proximity interaction, tool HUD, and game-mode selection screen.
// Most features are not yet implemented; tests are structured as skeletons
// with .todo() or .skip() placeholders that will become live as modules land.
// ===========================================================================

describe('Phase 1 — Movement, Camera, Tools, Mode Selection', () => {

  // -------------------------------------------------------------------------
  // 1-A. Movement Integration
  // -------------------------------------------------------------------------
  describe('Movement Integration', () => {
    it.todo('spawns the player at the zone spawnPoint on scene load');

    it.skip('WASD keys translate the player mesh on the XZ plane', () => {
      // TODO: Implement when MovementController is built
      // Expected flow:
      //   1. Create MovementController with a mock mesh
      //   2. Simulate held 'w' key for one tick via update(dt)
      //   3. Assert mesh.position.z decreased (forward)
    });

    it.skip('player stops at zone boundary and does not clip through', () => {
      // TODO: Implement when zone bounds checking is added
      // Expected flow:
      //   1. Position player at boundary edge
      //   2. Apply movement toward boundary
      //   3. Assert position clamped within zone.bounds
    });

    it.todo('player mesh rotates to face movement direction');

    it.todo('walk animation plays while moving, idle animation plays when stopped');
  });

  // -------------------------------------------------------------------------
  // 1-B. Camera Follow
  // -------------------------------------------------------------------------
  describe('Camera Follow', () => {
    it.todo('camera tracks the player position with a fixed offset');

    it.skip('orbit input rotates the camera around the player', () => {
      // TODO: Implement when CameraController is built
      // Expected flow:
      //   1. Record initial camera angle
      //   2. Simulate horizontal pointer drag
      //   3. Assert azimuth angle changed, radius unchanged
    });

    it.skip('scroll wheel adjusts zoom level within min/max', () => {
      // TODO: Implement when CameraController is built
      // Expected flow:
      //   1. Dispatch wheel event with positive deltaY
      //   2. Assert camera distance increased
      //   3. Verify it does not exceed maxZoom
    });

    it.todo('story mode uses fixed camera presets per scene (no free orbit)');

    it.todo('camera transitions smoothly between presets using lerp');
  });

  // -------------------------------------------------------------------------
  // 1-C. Proximity Interaction
  // -------------------------------------------------------------------------
  describe('Proximity Interaction', () => {
    it.skip('approaching a garden cell highlights it', () => {
      // TODO: Implement when ProximitySystem is built
      // Expected flow:
      //   1. Place player at distance > threshold from cell
      //   2. Move player within threshold
      //   3. Assert cell mesh emissive color is set (highlight on)
    });

    it.skip('moving away from a highlighted cell removes the highlight', () => {
      // TODO: Implement when ProximitySystem is built
      // Expected flow:
      //   1. Start within threshold (highlighted)
      //   2. Move player away
      //   3. Assert cell mesh emissive color is cleared
    });

    it.skip('pressing interact key on highlighted cell applies the equipped tool', () => {
      // TODO: Implement when tool + proximity systems are integrated
      // Expected flow:
      //   1. Equip watering can, highlight a planted cell
      //   2. Press interact key
      //   3. Assert WATER_CELL action dispatched to store
    });

    it.todo('highlighted interactable shows a prompt label in screen space');

    it.todo('when multiple interactables overlap, the closest one is selected');
  });

  // -------------------------------------------------------------------------
  // 1-D. Tool System
  // -------------------------------------------------------------------------
  describe('Tool System', () => {
    it.skip('tool HUD is visible in Let It Grow mode, hidden in Story mode', () => {
      // TODO: Implement when ToolHUD component is built
      // Expected flow:
      //   1. Create store with gameMode: 'let_it_grow'
      //   2. Assert ToolHUD.visible === true
      //   3. Create store with gameMode: 'story'
      //   4. Assert ToolHUD.visible === false
    });

    it.skip('number keys 1-5 switch the active tool', () => {
      // TODO: Implement when ToolManager is built
      // Expected flow:
      //   1. Register tools [trowel, watering_can, pruners, rake, basket]
      //   2. Press '2'
      //   3. Assert activeTool === 'watering_can'
    });

    it.skip('active tool determines the store action dispatched on interact', () => {
      // TODO: Implement when tool-action mapping exists
      // Expected flow:
      //   1. Equip trowel → interact with empty cell → PLANT_CROP dispatched
      //   2. Equip watering_can → interact with planted cell → WATER_CELL dispatched
      //   3. Equip pruners → interact with damaged cell → PRUNE_CELL dispatched
    });

    it.todo('tools have cooldowns that prevent rapid repeated use');

    it.todo('tool use dispatches the correct action type to the game store');
  });

  // -------------------------------------------------------------------------
  // 1-E. Mode Selector
  // -------------------------------------------------------------------------
  describe('Mode Selector', () => {
    it.todo('new game screen presents Story Mode and Let It Grow choices');

    it.skip('selecting Story Mode starts without tool HUD', () => {
      // TODO: Implement when ModeSelector is built
      // Expected flow:
      //   1. Dispatch SELECT_MODE with payload { mode: 'story' }
      //   2. Assert store.getState().gameMode === 'story'
      //   3. Assert tool HUD is not rendered
    });

    it.skip('selecting Let It Grow starts with tool HUD active', () => {
      // TODO: Implement when ModeSelector is built
      // Expected flow:
      //   1. Dispatch SELECT_MODE with payload { mode: 'let_it_grow' }
      //   2. Assert store.getState().gameMode === 'let_it_grow'
      //   3. Assert tool HUD is rendered
    });

    it.todo('save file includes the selected game mode');

    it.todo('loading a save without gameMode field defaults to story');
  });

  // -------------------------------------------------------------------------
  // 1-F. Story Mode Regression
  // -------------------------------------------------------------------------
  describe('Story Mode Regression', () => {
    it.skip('full season still advances through all 6 phases after movement changes', () => {
      // Guard: ensure Phase 1 additions do not break the existing season loop.
      // This mirrors the "Full Season Playthrough" test above but within
      // the Phase 1 describe block so regressions are caught in context.
      // TODO: Re-enable once movement controller is integrated
    });

    it.todo('phase machine transition rules are unchanged from baseline');

    it.todo('cutscene triggers still fire at the correct phase boundaries');

    it.todo('save/load round-trip still works after Phase 1 state additions');
  });
});

// ===========================================================================
// Phase 2L — Quests, NPCs, Reputation, Zones
// ===========================================================================
// Tests for the quest lifecycle, NPC reputation, dialogue branching,
// zone transitions, and NPC schedules. Data specs exist in QUEST_DECK.json,
// WORLD_MAP.json, and DIALOGUE_ENGINE.json. Runtime systems are not yet built.
// ===========================================================================

describe('Phase 2 — Quests, NPCs, Reputation, Zones', () => {

  // -------------------------------------------------------------------------
  // 2-A. Quest Lifecycle
  // -------------------------------------------------------------------------
  describe('Quest Lifecycle', () => {
    it.skip('quest becomes available when all prerequisites are met', () => {
      // TODO: Implement when QuestManager is built
      // Expected flow:
      //   1. Load quest "gus_tomatoes" from QUEST_DECK.json
      //   2. Set campaign to chapter 3, season summer
      //   3. Assert quest status === 'available'
      //   4. Set campaign to chapter 1 → status should be 'locked'
    });

    it.skip('accepting a quest transitions it from available to active', () => {
      // TODO: Implement when QuestManager is built
      // Expected flow:
      //   1. Dispatch ACCEPT_QUEST { questId: 'gus_tomatoes' }
      //   2. Assert quest state === 'active'
      //   3. Assert NPC dialogue switches to progressDialogue
    });

    it.skip('planting and harvesting required crops advances quest progress', () => {
      // TODO: Implement when quest-progress tracking is built
      // Expected flow:
      //   1. Accept quest requiring 3 cherry_tom harvests
      //   2. Dispatch HARVEST_CELL for cherry_tom 3 times
      //   3. Assert quest.progress.crop_harvested.cherry_tom === 3
      //   4. Assert quest status === 'ready_to_turn_in'
    });

    it.skip('turning in a completed quest grants all listed rewards', () => {
      // TODO: Implement when quest reward system is built
      // Expected flow:
      //   1. Complete quest requirements
      //   2. Dispatch TURN_IN_QUEST
      //   3. Assert seed reward added to inventory
      //   4. Assert reputation increased for the quest NPC
      //   5. Assert quest status === 'completed'
    });

    it.todo('quest state persists through save/load cycle');
  });

  // -------------------------------------------------------------------------
  // 2-B. Reputation Integration
  // -------------------------------------------------------------------------
  describe('Reputation Integration', () => {
    it.skip('completing a quest grants reputation points for the quest NPC', () => {
      // TODO: Implement when reputation system is built
      // Expected flow:
      //   1. Start with 0 rep for old_gus
      //   2. Complete and turn in gus_tomatoes quest (rewards 15 rep)
      //   3. Assert reputation.old_gus === 15
    });

    it.skip('reputation tier changes at defined thresholds', () => {
      // TODO: Implement when reputation tiers are built
      // Expected flow:
      //   1. Add rep incrementally: 0 → stranger, 25 → acquaintance,
      //      50 → friend, 100 → trusted
      //   2. Assert tier label changes at each threshold
    });

    it.skip('higher reputation tiers unlock new quests from that NPC', () => {
      // TODO: Implement when quest prerequisites check rep tiers
      // Expected flow:
      //   1. Quest X requires rep tier "friend" with old_gus
      //   2. At tier "stranger" → quest locked
      //   3. Reach "friend" → quest becomes available
    });

    it.todo('reputation decays slightly at season end if no quests completed');

    it.todo('dialogue options change based on reputation tier');
  });

  // -------------------------------------------------------------------------
  // 2-C. Dialogue Branching
  // -------------------------------------------------------------------------
  describe('Dialogue Branching', () => {
    it.skip('dialogue with choices presents the correct options', () => {
      // TODO: Implement when DialogueRunner is built
      // Expected flow:
      //   1. Trigger a dialogue node that has "choices" array
      //   2. Assert all choice labels are rendered
      //   3. Assert no auto-advance happens (waits for selection)
    });

    it.skip('selecting "accept quest" choice dispatches ACCEPT_QUEST action', () => {
      // TODO: Implement when dialogue-quest integration exists
      // Expected flow:
      //   1. Open quest-offer dialogue
      //   2. Select the "accept" choice
      //   3. Assert ACCEPT_QUEST dispatched with correct questId
    });

    it.skip('branching dialogue follows the correct path based on choice', () => {
      // TODO: Implement when DialogueRunner branching logic exists
      // Expected flow:
      //   1. At branch node, select choice B
      //   2. Assert next node matches choice B's "next" pointer
      //   3. Assert choice A's path was not followed
    });

    it.todo('linear dialogue (no choices) auto-advances on click/key');

    it.todo('keyboard number keys can select dialogue choices');
  });

  // -------------------------------------------------------------------------
  // 2-D. Zone Transitions
  // -------------------------------------------------------------------------
  describe('Zone Transitions', () => {
    it.skip('walking to an exit point triggers a zone transition', () => {
      // TODO: Implement when zone transition system is built
      // Expected flow:
      //   1. Position player at player_plot exit point (south edge)
      //   2. Move player past the exit threshold
      //   3. Assert CHANGE_ZONE dispatched with destination "neighborhood"
    });

    it.skip('zone transition plays a fade-out/fade-in animation', () => {
      // TODO: Implement when transition VFX are built
      // Expected flow:
      //   1. Trigger zone change
      //   2. Assert fade overlay opacity goes 0 → 1 → 0
      //   3. Assert new zone scene is loaded between fades
    });

    it.skip('previous zone resources are disposed after transition', () => {
      // TODO: Implement when ZoneManager handles disposal
      // Expected flow:
      //   1. Record geometry/texture count before transition
      //   2. Transition to new zone
      //   3. Assert old zone meshes disposed, renderer info shows cleanup
    });

    it.todo('zone visual theme varies by current season');

    it.skip('player spawns at the correct entry point in the destination zone', () => {
      // TODO: Implement when spawn-point mapping exists
      // Expected flow:
      //   1. Exit player_plot via south → arrive in neighborhood
      //   2. Assert player.position matches neighborhood's north entry point
    });

    it.todo('zone transition dispatches ENTER_ZONE to the store');
  });

  // -------------------------------------------------------------------------
  // 2-E. NPC Schedules
  // -------------------------------------------------------------------------
  describe('NPC Schedules', () => {
    it.skip('NPCs appear in their correct zone based on the current season', () => {
      // TODO: Implement when NPC schedule system is built
      // Expected flow:
      //   1. Set season to spring
      //   2. Query NPCSchedule for old_gus
      //   3. Assert old_gus is in "market_square" or his defined spring zone
    });

    it.todo('NPC greeting dialogue matches the current reputation tier');

    it.todo('NPC offers quest dialogue when they have an available quest for the player');
  });

  // -------------------------------------------------------------------------
  // 2-F. Save/Load — Phase 2 State
  // -------------------------------------------------------------------------
  describe('Save/Load Phase 2', () => {
    it.skip('save includes active quests, reputation, and current zone', () => {
      // TODO: Implement when Phase 2 state shape is finalized
      // Expected flow:
      //   1. Accept a quest, earn reputation, enter a zone
      //   2. Save to slot
      //   3. Read raw localStorage JSON
      //   4. Assert quests, reputation, currentZone fields present
    });

    it.skip('loading a Phase 2 save restores quest/rep/zone state', () => {
      // TODO: Implement when LOAD_SAVE handles Phase 2 fields
      // Expected flow:
      //   1. Save state with active quest + 25 rep for old_gus + zone "meadow"
      //   2. Load into fresh store
      //   3. Assert all values restored
    });

    it.skip('loading a pre-Phase-2 save initializes defaults for new fields', () => {
      // TODO: Implement when normalizeGameState handles Phase 2 migration
      // Expected flow:
      //   1. Create a save with no quests/reputation/zone fields
      //   2. Load it
      //   3. Assert quests = [], reputation = {}, currentZone = 'player_plot'
    });
  });
});

// ===========================================================================
// Phase 3I — Audio, Day/Night, Festivals, Monthly Events
// ===========================================================================
// Tests for the AudioManager, day/night cycle, festival system, and monthly
// event rotation. Spec references: AUDIO_SPEC.md, EVENT_DECK.json.
// ===========================================================================

describe('Phase 3 — Audio, Day/Night, Festivals, Monthly Events', () => {

  // -------------------------------------------------------------------------
  // 3-A. Audio Integration
  // -------------------------------------------------------------------------
  describe('Audio Integration', () => {
    it.skip('AudioManager initializes only after a user gesture', () => {
      // TODO: Implement when AudioManager is built
      // Expected flow:
      //   1. Create AudioManager without prior gesture
      //   2. Assert audioContext.state === 'suspended'
      //   3. Simulate click event
      //   4. Assert audioContext.state === 'running' (or resumed)
    });

    it.skip('season change crossfades ambient tracks', () => {
      // TODO: Implement when AudioManager handles seasonal audio
      // Expected flow:
      //   1. Set season to spring → spring ambient playing
      //   2. Advance to summer
      //   3. Assert spring track fading out, summer track fading in
      //   4. After crossfade duration, only summer track audible
    });

    it.skip('game actions trigger correct SFX', () => {
      // TODO: Implement when SFX mapping is built
      // Expected flow:
      //   1. Dispatch PLANT_CROP → assert "plant" SFX played
      //   2. Dispatch HARVEST_CELL → assert "harvest" SFX played
      //   3. Dispatch USE_INTERVENTION → assert "intervention" SFX played
    });

    it.skip('mute/unmute toggles all audio output', () => {
      // TODO: Implement when AudioManager mute control is built
      // Expected flow:
      //   1. Verify audio playing (masterGain.gain > 0)
      //   2. Call audioManager.mute()
      //   3. Assert masterGain.gain.value === 0
      //   4. Call audioManager.unmute()
      //   5. Assert masterGain.gain.value restored
    });

    it.todo('volume layers (ambient, SFX, music) can be adjusted independently');
  });

  // -------------------------------------------------------------------------
  // 3-B. Day/Night Cycle
  // -------------------------------------------------------------------------
  describe('Day/Night Cycle', () => {
    it.todo('day/night cycle is disabled by default in Story mode');

    it.skip('lighting interpolates between day and night values', () => {
      // TODO: Implement when DayNightController is built
      // Expected flow:
      //   1. Set timeOfDay = 0.0 (dawn) → assert warm directional light
      //   2. Set timeOfDay = 0.5 (noon) → assert bright overhead light
      //   3. Set timeOfDay = 1.0 (night) → assert dim blue ambient
      //   4. Assert interpolation is smooth (no sudden jumps)
    });

    it.skip('night cycle adds visual elements (stars, fireflies, lanterns)', () => {
      // TODO: Implement when night visual elements are built
      // Expected flow:
      //   1. Set timeOfDay past dusk threshold
      //   2. Assert star particle system active
      //   3. Assert lantern point lights enabled in zone
    });

    it.todo('mood override (cutscene/event) pauses the day/night cycle');

    it.todo('disabling the cycle restores default daytime lighting');
  });

  // -------------------------------------------------------------------------
  // 3-C. Festival System
  // -------------------------------------------------------------------------
  describe('Festival System', () => {
    it.skip('festival activates at the correct season and chapter', () => {
      // TODO: Implement when FestivalManager is built
      // Expected flow:
      //   1. Set chapter = 4, season = 'fall'
      //   2. Query FestivalManager for active festivals
      //   3. Assert "harvest_festival" is active (or whichever is defined)
    });

    it.skip('active festival modifies scoring for its duration', () => {
      // TODO: Implement when festival scoring hooks are built
      // Expected flow:
      //   1. Score a cell without festival → baseline score
      //   2. Activate festival with bonus modifier
      //   3. Score same cell → assert score differs by modifier amount
    });

    it.skip('completing a festival returns unique rewards', () => {
      // TODO: Implement when festival reward system is built
      // Expected flow:
      //   1. Participate in festival tasks
      //   2. Complete festival
      //   3. Assert unique keepsake or item awarded
    });

    it.todo('each festival can only be completed once per playthrough');

    it.skip('festival ends correctly when its season/chapter ends', () => {
      // TODO: Implement when festival lifecycle management exists
      // Expected flow:
      //   1. Activate festival in fall
      //   2. Advance season to winter
      //   3. Assert festival deactivated, no lingering effects
    });
  });

  // -------------------------------------------------------------------------
  // 3-D. Monthly Event Rotation
  // -------------------------------------------------------------------------
  describe('Monthly Event Rotation', () => {
    it.skip('month-restricted events only fire during their designated month', () => {
      // TODO: Implement when monthly rotation logic is built
      // Expected flow:
      //   1. Set month to March
      //   2. Query available events
      //   3. Assert March-only events included, July-only events excluded
    });

    it.skip('general events (no month restriction) can fire in any month', () => {
      // TODO: Implement when event eligibility checks exist
      // Expected flow:
      //   1. Filter EVENT_DECK for events with no monthRestriction
      //   2. Assert these appear in the eligible pool for every month
    });

    it.todo('no duplicate events fire within the same season');

    it.todo('chapter-gated events respect chapter prerequisites');
  });

  // -------------------------------------------------------------------------
  // 3-E. NPC Schedule — Festival Integration
  // -------------------------------------------------------------------------
  describe('NPC Schedule Integration', () => {
    it.todo('NPCs are in their scheduled zone during normal gameplay');

    it.todo('season changes move NPCs to their new zone assignments');

    it.todo('during a festival, all participating NPCs relocate to the festival grounds');
  });
});

// ===========================================================================
// Phase 4M — Inventory, Skills, Crafting, Durability
// ===========================================================================
// Tests for the inventory system, skill tree XP, crafting recipes, tool
// durability, and backward compatibility. Spec references: SKILL_TREE.json,
// CRAFTING_RECIPES.json.
// ===========================================================================

describe('Phase 4 — Inventory, Skills, Crafting, Durability', () => {

  // -------------------------------------------------------------------------
  // 4-A. Inventory + Tool Integration
  // -------------------------------------------------------------------------
  describe('Inventory + Tool', () => {
    it.skip('equipping an item from inventory places it in the tool HUD', () => {
      // TODO: Implement when InventoryManager + ToolHUD are integrated
      // Expected flow:
      //   1. Add "watering_can" to inventory
      //   2. Dispatch EQUIP_ITEM { itemId: 'watering_can', slot: 1 }
      //   3. Assert toolHUD.slot[1] === 'watering_can'
    });

    it.skip('using a tool decrements its durability', () => {
      // TODO: Implement when durability system is built
      // Expected flow:
      //   1. Equip tool with durability 100
      //   2. Use tool once
      //   3. Assert durability === 95 (or per-tool cost)
    });

    it.skip('broken tool (durability 0) prevents further use until repaired', () => {
      // TODO: Implement when tool breakage logic exists
      // Expected flow:
      //   1. Set tool durability to 0
      //   2. Attempt to use tool
      //   3. Assert action is blocked and "tool broken" feedback shown
    });

    it.skip('repairing a tool consumes materials and restores durability', () => {
      // TODO: Implement when repair system is built
      // Expected flow:
      //   1. Tool at durability 20, inventory has scrap_metal
      //   2. Dispatch REPAIR_TOOL { toolId, materialId: 'scrap_metal' }
      //   3. Assert durability restored (e.g. to 70)
      //   4. Assert scrap_metal removed from inventory
    });
  });

  // -------------------------------------------------------------------------
  // 4-B. Skill + Action Integration
  // -------------------------------------------------------------------------
  describe('Skill + Action', () => {
    it.skip('planting a crop awards gardening XP', () => {
      // TODO: Implement when XP award system is built
      // Expected flow:
      //   1. Dispatch PLANT_CROP for cell 0
      //   2. Assert skills.gardening.xp increased by 10 (per SKILL_TREE.json)
    });

    it.skip('harvesting a crop awards gardening XP', () => {
      // TODO: Implement when harvest XP hook is built
      // Expected flow:
      //   1. Dispatch HARVEST_CELL
      //   2. Assert skills.gardening.xp increased by 25
    });

    it.skip('completing a quest awards social XP', () => {
      // TODO: Implement when quest-XP integration is built
      // Expected flow:
      //   1. Turn in completed quest
      //   2. Assert skills.social.xp increased by quest XP reward
    });

    it.skip('crafting an item awards crafting XP', () => {
      // TODO: Implement when crafting-XP integration is built
      // Expected flow:
      //   1. Dispatch CRAFT_ITEM { recipeId: 'mulch_mat' }
      //   2. Assert skills.crafting.xp increased by recipe XP amount
    });

    it.skip('leveling up a skill unlocks its associated buff', () => {
      // TODO: Implement when skill level-up logic exists
      // Expected flow:
      //   1. Set skills.gardening.xp to 99 (level 1)
      //   2. Award 1 more XP → total 100 → level 2
      //   3. Assert level === 2
      //   4. Check if level 3 (at 250 XP) grants a buff → assert buff active
    });

    it.skip('active skill buffs modify game calculations', () => {
      // TODO: Implement when buff application hooks exist
      // Expected flow:
      //   1. Unlock "green_thumb_1" buff (harvest yield +5%)
      //   2. Harvest a crop
      //   3. Assert yield includes the +5% modifier
    });
  });

  // -------------------------------------------------------------------------
  // 4-C. Crafting + Inventory
  // -------------------------------------------------------------------------
  describe('Crafting + Inventory', () => {
    it.skip('crafting a recipe consumes the required materials', () => {
      // TODO: Implement when CraftingManager is built
      // Expected flow:
      //   1. Add plant_matter x3 and compost x1 to inventory
      //   2. Craft "mulch_mat" (requires plant_matter x3, compost x1)
      //   3. Assert plant_matter count === 0, compost count === 0
    });

    it.skip('crafted item appears in inventory after crafting', () => {
      // TODO: Implement when crafting output logic exists
      // Expected flow:
      //   1. Craft "mulch_mat"
      //   2. Assert inventory contains mulch_mat x1
    });

    it.skip('higher crafting skill reduces material cost', () => {
      // TODO: Implement when skill-cost reduction is built
      // Expected flow:
      //   1. At crafting level 1: recipe needs 3 plant_matter
      //   2. At crafting level 5 with cost reduction buff: needs 2
      //   3. Assert reduced cost allows crafting with fewer materials
    });

    it.skip('crafting with insufficient materials is blocked', () => {
      // TODO: Implement when crafting validation exists
      // Expected flow:
      //   1. Recipe requires compost x2 but inventory has compost x1
      //   2. Attempt craft
      //   3. Assert craft action rejected, inventory unchanged
    });

    it.skip('crafting is blocked when inventory is full', () => {
      // TODO: Implement when inventory capacity limits exist
      // Expected flow:
      //   1. Fill inventory to max capacity
      //   2. Attempt to craft an item
      //   3. Assert craft blocked with "inventory full" feedback
    });
  });

  // -------------------------------------------------------------------------
  // 4-D. Full Loop — End-to-End
  // -------------------------------------------------------------------------
  describe('Full Loop', () => {
    it.skip('plant -> harvest -> XP -> forage -> craft -> use -> repair -> quest', () => {
      // TODO: Implement when all Phase 4 systems are integrated
      // Expected flow:
      //   1. Plant a cherry_tom in cell 0 → gardening XP +10
      //   2. Advance to harvest → harvest cell → gardening XP +25
      //   3. Gain plant_matter from harvest
      //   4. Forage in meadow → gain dried_leaves
      //   5. Craft mulch_mat from plant_matter + dried_leaves → crafting XP
      //   6. Equip and use mulch_mat on cell → durability decreases
      //   7. Repair mulch_mat with scrap_metal
      //   8. Complete a quest requiring mulch usage → social XP + reputation
      //   9. Assert all XP totals, inventory state, and quest status correct
    });
  });

  // -------------------------------------------------------------------------
  // 4-E. Backward Compatibility
  // -------------------------------------------------------------------------
  describe('Backward Compatibility', () => {
    it.skip('loading a pre-Phase-4 save works without errors', () => {
      // TODO: Implement when normalizeGameState handles Phase 4 migration
      // Expected flow:
      //   1. Create a save JSON that has no inventory, skills, or durability fields
      //   2. Load into store
      //   3. Assert no errors thrown
    });

    it.skip('pre-Phase-4 save gets default values for new fields', () => {
      // TODO: Implement when migration defaults are defined
      // Expected flow:
      //   1. Load old save
      //   2. Assert inventory === [], skills === default levels, durability === max
    });

    it.skip('game is fully playable after migrating an old save', () => {
      // TODO: Implement when migration + gameplay loop is verified
      // Expected flow:
      //   1. Load migrated save
      //   2. Plant, harvest, advance season
      //   3. Assert no crashes or undefined property errors
    });
  });
});

// ===========================================================================
// Phase 5K — Open World, Zones, Foraging, Grid Expansion
// ===========================================================================
// Tests for zone navigation, gating, foraging, expanded garden grids,
// multiple beds, biome crops, and the full end-to-end game loop.
// Data specs: WORLD_MAP.json (8 zones), CROP_SCORING_DATA.json (50 crops).
// ===========================================================================

describe('Phase 5 — Open World, Zones, Foraging, Grid Expansion', () => {

  // -------------------------------------------------------------------------
  // 5-A. Zone Navigation
  // -------------------------------------------------------------------------
  describe('Zone Navigation', () => {
    it.skip('all 8 zones defined in WORLD_MAP.json are loadable', () => {
      // TODO: Implement when ZoneLoader is built
      // The 8 zones are: player_plot, neighborhood, market_square,
      // meadow, forest_edge, riverside, greenhouse, festival_grounds
      // Expected flow:
      //   1. For each zone ID in WORLD_MAP.json
      //   2. Call ZoneLoader.load(zoneId)
      //   3. Assert scene is created without errors
    });

    it.skip('zone connections are bidirectional', () => {
      // TODO: Implement when zone connection validation is built
      // Expected flow:
      //   1. Load WORLD_MAP.json
      //   2. For each zone A with connection to zone B
      //   3. Assert zone B also lists zone A in its connections
    });

    it.skip('reaching an exit point triggers the destination zone transition', () => {
      // TODO: Implement when exit-point detection is built
      // Expected flow:
      //   1. Load player_plot zone
      //   2. Move player to south exit point { x: 0, z: -2.0 }
      //   3. Assert transition initiated with destination "neighborhood"
    });

    it.skip('spawn points place the player at the correct position in each zone', () => {
      // TODO: Implement when spawn positioning is built
      // Expected flow:
      //   1. Transition to each zone
      //   2. Assert player.position matches zone.spawnPoint from WORLD_MAP.json
    });
  });

  // -------------------------------------------------------------------------
  // 5-B. Zone Gating
  // -------------------------------------------------------------------------
  describe('Zone Gating', () => {
    it.skip('zones with gate === null are always accessible', () => {
      // TODO: Implement when zone gating system is built
      // Expected flow:
      //   1. player_plot and neighborhood have gate: null
      //   2. Assert canEnterZone('player_plot') === true always
      //   3. Assert canEnterZone('neighborhood') === true always
    });

    it.skip('skill-gated zones check the player skill level', () => {
      // TODO: Implement when skill gate checks exist
      // Expected flow:
      //   1. Zone requires gardening level 3
      //   2. At level 2 → canEnterZone returns false
      //   3. At level 3 → canEnterZone returns true
    });

    it.skip('reputation-gated zones check the NPC reputation tier', () => {
      // TODO: Implement when rep gate checks exist
      // Expected flow:
      //   1. Zone requires "friend" tier with an NPC
      //   2. At "stranger" tier → blocked
      //   3. At "friend" tier → accessible
    });

    it.skip('quest-gated zones check for completed quest prerequisites', () => {
      // TODO: Implement when quest gate checks exist
      // Expected flow:
      //   1. Zone requires quest "neighborhood_intro" completed
      //   2. Quest not done → blocked
      //   3. Quest completed → accessible
    });

    it.skip('festival-gated zones open only during active festivals', () => {
      // TODO: Implement when festival gate checks exist
      // Expected flow:
      //   1. festival_grounds has a festival gate
      //   2. No active festival → blocked
      //   3. Active festival → accessible
    });
  });

  // -------------------------------------------------------------------------
  // 5-C. Foraging
  // -------------------------------------------------------------------------
  describe('Foraging', () => {
    it.skip('foraging spots appear in zones marked with foraging: true', () => {
      // TODO: Implement when ForagingManager is built
      // Expected flow:
      //   1. Load WORLD_MAP.json
      //   2. Zones with foraging: true should have forage spots
      //   3. Zones with foraging: false should have none
    });

    it.skip('foraging produces items matching the zone biome', () => {
      // TODO: Implement when biome-item mapping is built
      // Expected flow:
      //   1. Forage in "forest_edge" (woodland biome)
      //   2. Assert item is from woodland item pool (e.g. shiitake_mushroom, wild_garlic)
    });

    it.skip('foraging skill level modifies yield quality and quantity', () => {
      // TODO: Implement when skill-foraging integration is built
      // Expected flow:
      //   1. At foraging level 1 → base yield
      //   2. At foraging level 5 → improved yield or rare item chance
    });

    it.skip('foraged spots have a cooldown before they can be harvested again', () => {
      // TODO: Implement when forage cooldown system is built
      // Expected flow:
      //   1. Forage a spot → items received
      //   2. Immediately attempt again → blocked (cooldown active)
      //   3. Advance time past cooldown → foraging allowed again
    });

    it.skip('foraged items go into the player inventory', () => {
      // TODO: Implement when foraging-inventory integration is built
      // Expected flow:
      //   1. Inventory starts empty
      //   2. Forage in meadow
      //   3. Assert new item(s) present in inventory
    });
  });

  // -------------------------------------------------------------------------
  // 5-D. Expanded Grid
  // -------------------------------------------------------------------------
  describe('Expanded Grid', () => {
    it.skip('default garden grid is 8x4 (32 cells)', () => {
      // TODO: Implement when grid expansion system is built
      // Expected flow:
      //   1. Create new game
      //   2. Assert grid.length === 32 (8 columns x 4 rows)
    });

    it.skip('first expansion grows grid to 8x6 (48 cells)', () => {
      // TODO: Implement when EXPAND_GRID action is built
      // Expected flow:
      //   1. Dispatch EXPAND_GRID { rows: 6 }
      //   2. Assert grid.length === 48
      //   3. Assert new cells are empty with default state
    });

    it.skip('maximum expansion reaches 8x8 (64 cells)', () => {
      // TODO: Implement when grid max size is enforced
      // Expected flow:
      //   1. Dispatch EXPAND_GRID { rows: 8 }
      //   2. Assert grid.length === 64
      //   3. Dispatch EXPAND_GRID { rows: 10 } → assert rejected (max is 8)
    });

    it.todo('grid expansion persists through save/load cycle');

    it.skip('old saves with 32-cell grids load correctly without migration issues', () => {
      // TODO: Implement when grid migration logic exists
      // Expected flow:
      //   1. Load save with 32-cell grid into a system that supports 64
      //   2. Assert grid.length === 32 (not padded unless player expands)
      //   3. Assert scoring still works on the 32-cell grid
    });
  });

  // -------------------------------------------------------------------------
  // 5-E. Multiple Beds
  // -------------------------------------------------------------------------
  describe('Multiple Beds', () => {
    it.skip('player can own multiple garden beds', () => {
      // TODO: Implement when multi-bed system is built
      // Expected flow:
      //   1. Start with 1 bed (player_plot cedar_bed)
      //   2. Dispatch ACQUIRE_BED { bedId: 'community_plot' }
      //   3. Assert beds.length === 2
    });

    it.skip('each bed has independent grid state', () => {
      // TODO: Implement when bed-specific state management is built
      // Expected flow:
      //   1. Plant basil in bed 0, cell 0
      //   2. Plant lettuce in bed 1, cell 0
      //   3. Assert bed0.grid[0].cropId === 'basil'
      //   4. Assert bed1.grid[0].cropId === 'lettuce'
    });

    it.skip('switching active bed updates the garden scene', () => {
      // TODO: Implement when bed-switching UI/scene exists
      // Expected flow:
      //   1. Active bed = 0 → garden scene shows bed 0 grid
      //   2. Dispatch SWITCH_BED { bedIndex: 1 }
      //   3. Assert scene now renders bed 1 grid
    });

    it.todo('all beds are saved and loaded correctly');
  });

  // -------------------------------------------------------------------------
  // 5-F. Biome Crops
  // -------------------------------------------------------------------------
  describe('Biome Crops', () => {
    it('all 50 crops in CROP_SCORING_DATA.json have valid scoring data', async () => {
      // This test can run NOW — it validates the spec file directly.
      const fs = await import('node:fs');
      const path = await import('node:path');
      const dataPath = path.resolve(
        import.meta.dirname, '..', '..', '..', 'specs', 'CROP_SCORING_DATA.json'
      );
      const raw = fs.readFileSync(dataPath, 'utf-8');
      const data = JSON.parse(raw);
      const crops = Object.values(data.crops);

      // Verify total count matches the spec description
      expect(crops.length).toBe(50);

      // Verify every crop has required scoring fields
      for (const crop of crops) {
        expect(crop).toHaveProperty('id');
        expect(crop).toHaveProperty('name');
        expect(crop).toHaveProperty('faction');
        expect(crop).toHaveProperty('sunMin');
        expect(crop).toHaveProperty('sunIdeal');
        expect(typeof crop.sunMin).toBe('number');
        expect(typeof crop.sunIdeal).toBe('number');
        expect(crop.sunIdeal).toBeGreaterThanOrEqual(crop.sunMin);
      }
    });

    it.skip('biome-exclusive crops appear only through foraging in their zone', () => {
      // TODO: Implement when biome crop foraging is built
      // Expected flow:
      //   1. Biome crops (wild_garlic, shiitake_mushroom, etc.) not in starter seed list
      //   2. Forage in forest_edge → can find woodland biome crops
      //   3. Forage in meadow → can find meadow biome crops
      //   4. Assert biome crops cannot be found in mismatched zones
    });

    it.skip('new biome crop recipes (foragers_stew, garden_deluxe_salsa) work with scoring', () => {
      // TODO: Implement when recipe scoring integration includes new recipes
      // Expected flow:
      //   1. Plant all crops for "foragers_stew" recipe
      //   2. Score the bed
      //   3. Assert recipe bonus is applied to the bed score
    });

    it('total crop count including biome crops is 50', async () => {
      // This test can run NOW — validates the canonical crop count.
      const fs = await import('node:fs');
      const path = await import('node:path');
      const dataPath = path.resolve(
        import.meta.dirname, '..', '..', '..', 'specs', 'CROP_SCORING_DATA.json'
      );
      const raw = fs.readFileSync(dataPath, 'utf-8');
      const data = JSON.parse(raw);

      expect(Object.keys(data.crops).length).toBe(50);
      expect(data.description).toContain('50 crops');
    });
  });

  // -------------------------------------------------------------------------
  // 5-G. Full Game Loop — End-to-End
  // -------------------------------------------------------------------------
  describe('Full Game Loop E2E', () => {
    it.skip('start -> plant -> harvest -> XP -> unlock -> forage -> craft -> quest -> expand -> score -> save/load', () => {
      // TODO: Implement when all Phase 5 systems are integrated
      // This is the ultimate integration test that exercises every system
      // in a single continuous playthrough.
      //
      // Expected flow:
      //   1. Start new game in Let It Grow mode
      //   2. Plant cherry_tom x3 in player_plot bed → gardening XP
      //   3. Advance seasons → harvest → gardening XP + plant_matter
      //   4. Level up gardening to unlock meadow zone access
      //   5. Travel to meadow → forage → gather wild_clover
      //   6. Craft mulch_mat from plant_matter + wild_clover → crafting XP
      //   7. Return to player_plot → apply mulch_mat to cell
      //   8. Talk to NPC → accept quest → complete via harvest → reputation + social XP
      //   9. Reputation unlocks greenhouse zone
      //  10. Expand grid from 8x4 to 8x6
      //  11. Plant biome crops from foraging
      //  12. Score the full bed → verify grade
      //  13. Save game → load game → verify all state restored
      //  14. Assert XP, inventory, quests, reputation, zone access all correct
    });
  });
});
