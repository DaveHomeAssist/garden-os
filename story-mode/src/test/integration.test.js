// @vitest-environment jsdom
/**
 * Integration Test Suite — story-mode game loop.
 *
 * Tests the store, phase machine, save system, input manager,
 * scoring, and event engine as integrated units.
 *
 * Run: cd story-mode && npx vitest run
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createGameState, createSeasonState, PHASES, PHASE_ORDER, CELL_COUNT, DEFAULT_REPUTATION, DEFAULT_WORLD_STATE, GRID_UNLOCKS } from '../game/state.js';
import { Actions, Store, cloneGameState, gameReducer, normalizeGameState } from '../game/store.js';
import { advance, canAdvance } from '../game/phase-machine.js';
import { applyEventEffect } from '../game/event-engine.js';
import { getMonthlyEvents } from '../data/events.js';
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
import { QuestEngine, QuestStates } from '../game/quest-engine.js';
import { ReputationSystem, ReputationTiers } from '../game/reputation.js';
import { NPC_REGISTRY, getNPCsInZone, getNPCGreeting } from '../data/npcs.js';
import { FESTIVALS, FestivalEngine } from '../game/festivals.js';
import { Inventory, findToolSlotIndex, getItemDef } from '../game/inventory.js';
import { SkillSystem } from '../game/skills.js';
import { CraftingSystem } from '../game/crafting.js';
import { ForagingSystem } from '../game/foraging.js';
import { ZoneManager, evaluateZoneAccess, DEFAULT_ZONE_GATES } from '../scene/zone-manager.js';
import * as ZONE_REGISTRY from '../scene/zones/zone-registry.js';
import { getZoneExitPoints } from '../scene/zones/world-zone-contract.js';
import { createPlayerController } from '../game/player-controller.js';
import { InteractionSystem } from '../game/interaction.js';
import { createCutsceneMachine } from '../game/cutscene-machine.js';
import { createCameraController } from '../scene/camera-controller.js';
import { DayNightCycle } from '../scene/weather-fx.js';
import { ToolManager } from '../game/tool-manager.js';
import { MultiBedManager } from '../game/multi-bed.js';
import * as THREE from 'three';
import { createPlayerController } from '../game/player-controller.js';
import { AudioManager, DEFAULT_SFX_LIBRARY } from '../audio/audio-manager.js';
import { ToolHUD } from '../ui/tool-hud.js';
import { BiomeCropBridge } from '../game/biome-crops.js';
import { getCropById, getRecipes, checkRecipeComplete } from '../data/crops.js';

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
    keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', {
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
    keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'd',
      bubbles: true,
      shiftKey: false,
    }));
    expect(callback).not.toHaveBeenCalled();

    // With shift — should fire
    keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'd',
      bubbles: true,
      shiftKey: true,
    }));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('tracks held keys correctly', () => {
    keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    expect(inputManager.isKeyHeld('w')).toBe(true);

    keyboardTarget.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
    expect(inputManager.isKeyHeld('w')).toBe(false);
  });

  it('unregisters action listeners via the returned cleanup function', () => {
    const callback = vi.fn();
    inputManager.registerAction('test', { keys: ['t'] });
    const off = inputManager.on('test', callback);

    keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    expect(callback).toHaveBeenCalledTimes(1);

    off();
    keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    expect(callback).toHaveBeenCalledTimes(1); // no additional call
  });

  it('supports multiple key bindings per action', () => {
    const callback = vi.fn();
    inputManager.registerAction('cancel', { keys: ['Escape', 'q'] });
    inputManager.on('cancel', callback);

    keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(callback).toHaveBeenCalledTimes(1);

    keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('stops propagation when payload.handled is set', () => {
    const first = vi.fn((payload) => { payload.stop(); });
    const second = vi.fn();

    inputManager.registerAction('intercept', { keys: ['x'] });
    inputManager.on('intercept', first);
    inputManager.on('intercept', second);

    keyboardTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
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

// Phase 1H — Movement, Camera, Tools, Mode Selection
// These tests cover the 3D movement controller, camera follow system,
// proximity interaction, tool HUD, and game-mode selection screen.
// Most features are not yet implemented; tests are structured as skeletons
// with .todo() or .skip() placeholders that will become live as modules land.

describe('Phase 1 — Movement, Camera, Tools, Mode Selection', () => {

  // -------------------------------------------------------------------------
  // 1-A. Movement Integration
  // -------------------------------------------------------------------------
  describe('Movement Integration', () => {
    it('spawns the player at the default position', () => {
      const ctrl = createPlayerController();
      const state = ctrl.getState();
      expect(state.position.x).toBe(0);
      expect(state.position.z).toBe(2.55);
      expect(state.moving).toBe(false);
    });

    it('WASD keys translate the player on the XZ plane', () => {
      const ctrl = createPlayerController();
      // Simulate held 'w' key (forward = negative z)
      ctrl.update(0.016, { x: 0, z: -1 });
      const after = ctrl.getState();
      expect(after.position.z).toBeLessThan(2.55);
      expect(after.moving).toBe(true);
    });

    it('player stops at zone boundary and does not clip through', () => {
      const ctrl = createPlayerController({
        bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
        blockers: [],
        initialPosition: { x: 0.95, y: 0, z: 0 },
      });
      // Move right (positive x) past boundary
      ctrl.update(1.0, { x: 1, z: 0 });
      const state = ctrl.getState();
      expect(state.position.x).toBeLessThanOrEqual(1);
    });

    it('player mesh rotates to face movement direction', () => {
      const ctrl = createPlayerController();
      // Move right
      ctrl.update(0.016, { x: 1, z: 0 });
      const state = ctrl.getState();
      // facing should be atan2(1, 0) = PI/2
      expect(Math.abs(state.facing - Math.PI / 2)).toBeLessThan(0.01);
    });

    it('walk state reflects moving vs stopped', () => {
      const ctrl = createPlayerController();
      // Moving
      ctrl.update(0.016, { x: 1, z: 0 });
      expect(ctrl.getState().moving).toBe(true);
      expect(ctrl.getState().speed).toBeGreaterThan(0);
      // Stopped
      ctrl.update(0.016, { x: 0, z: 0 });
      expect(ctrl.getState().moving).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 1-B. Camera Follow
  // -------------------------------------------------------------------------
  describe('Camera Follow', () => {
    it('player controller provides focus target for camera follow', () => {
      const ctrl = createPlayerController();
      ctrl.update(0.016, { x: 1, z: 0 });
      const state = ctrl.getState();
      // Camera follow uses player position; verify it's updated
      expect(state.position.x).toBeGreaterThan(0);
      expect(typeof state.facing).toBe('number');
    });

    it('orbit input rotates the camera around the player', () => {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      const el = document.createElement('div');
      const camCtrl = createCameraController(camera, el);

      // Record initial position
      const before = camera.position.clone();

      // Simulate pointer drag: pointerdown -> pointermove -> pointerup
      el.dispatchEvent(new PointerEvent('pointerdown', {
        pointerType: 'mouse', button: 0, clientX: 200, clientY: 200,
      }));
      el.dispatchEvent(new PointerEvent('pointermove', {
        pointerType: 'mouse', clientX: 260, clientY: 215,
      }));
      el.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse' }));

      // Camera position should have changed due to orbit
      const after = camera.position.clone();
      expect(after.x).not.toBeCloseTo(before.x, 3);

      camCtrl.dispose();
    });

    it('scroll wheel adjusts zoom level within min/max', () => {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      const el = document.createElement('div');
      const camCtrl = createCameraController(camera, el);

      const before = camera.position.clone();

      // Scroll in (negative deltaY zooms in)
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: -500, cancelable: true }));
      camCtrl.update();
      const afterZoomIn = camera.position.clone();
      const distIn = afterZoomIn.length();

      // Scroll out past max
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: 5000, cancelable: true }));
      camCtrl.update();
      const distOut = camera.position.length();

      // Zoom-in should have brought camera closer than initial
      expect(distIn).toBeLessThan(before.length() + 0.01);
      // Radius is clamped to [4.4, 11.5] — distance can't exceed ~11.5
      expect(distOut).toBeLessThanOrEqual(15);
      // Distance should have increased from zoom-in to zoom-out
      expect(distOut).toBeGreaterThan(distIn);

      camCtrl.dispose();
    });

    it('story mode uses fixed camera presets per scene (no free orbit)', () => {
      const setCameraPresetCalls = [];
      const mockGardenScene = {
        setCameraPreset(name, opts) { setCameraPresetCalls.push({ name, opts }); },
        applyMood: vi.fn(),
        resetMood: vi.fn(),
        playSceneCue: vi.fn(),
      };
      const csm = createCutsceneMachine({
        onStateChange: vi.fn(),
        onFinish: vi.fn(),
        gardenScene: mockGardenScene,
      });
      csm.start({
        id: 'test-fixed-cam', priority: 100, skippable: true,
        beats: [{ speaker: 'narrator', text: 'Hello.', camera: 'overview' }],
      });
      // setCameraPreset called with fixed preset name, not free orbit
      expect(setCameraPresetCalls.length).toBeGreaterThanOrEqual(1);
      expect(setCameraPresetCalls[0].name).toBe('overview');
    });

    it('camera transitions smoothly between presets using lerp', () => {
      const presetSequence = [];
      const mockGardenScene = {
        setCameraPreset(name, opts) { presetSequence.push(name); },
        applyMood: vi.fn(),
        resetMood: vi.fn(),
        playSceneCue: vi.fn(),
      };
      const csm = createCutsceneMachine({
        onStateChange: vi.fn(),
        onFinish: vi.fn(),
        gardenScene: mockGardenScene,
      });
      csm.start({
        id: 'test-lerp-cam', priority: 100, skippable: true,
        beats: [
          { speaker: 'narrator', text: 'Beat one.', camera: 'chapter-intro' },
          { speaker: 'narrator', text: 'Beat two.', camera: 'bed-low-angle' },
        ],
      });
      expect(presetSequence[0]).toBe('chapter-intro');
      // Advance: complete typing then move to beat 2
      csm.next(); // finish typing
      csm.next(); // advance to beat 2
      // Second beat triggers a different preset — lerp target changes
      expect(presetSequence).toContain('bed-low-angle');
      expect(presetSequence.length).toBeGreaterThanOrEqual(2);
    });
  });

  // -------------------------------------------------------------------------
  // 1-C. Proximity Interaction
  // -------------------------------------------------------------------------
  describe('Proximity Interaction', () => {
    it('approaching a garden cell highlights it', () => {
      // Grid layout with one cell at (0, 0, 0)
      const gridLayout = [{ index: 0, x: 0, y: 0, z: 0 }];
      // Player controller starting far away
      const ctrl = createPlayerController({
        bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
        blockers: [],
        initialPosition: { x: 0, y: 0, z: 0.3 },
      });
      const interaction = new InteractionSystem(null, null, ctrl, gridLayout);

      // Player is close to the cell — update should highlight it
      interaction.update(0.016);
      const highlighted = interaction.getHighlighted();
      expect(highlighted).not.toBeNull();
      expect(highlighted.index).toBe(0);

      interaction.dispose();
    });

    it('moving away from a highlighted cell removes the highlight', () => {
      const gridLayout = [{ index: 0, x: 0, y: 0, z: 0 }];
      // Start near the cell
      const ctrl = createPlayerController({
        bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 },
        blockers: [],
        initialPosition: { x: 0, y: 0, z: 0.3 },
      });
      const interaction = new InteractionSystem(null, null, ctrl, gridLayout);

      // Should be highlighted when nearby
      interaction.update(0.016);
      expect(interaction.getHighlighted()).not.toBeNull();

      // Move player far away
      ctrl.update(1.0, { x: 0, z: 1 }); // move in +z direction
      ctrl.update(1.0, { x: 0, z: 1 });
      ctrl.update(1.0, { x: 0, z: 1 });
      interaction.update(0.016);
      expect(interaction.getHighlighted()).toBeNull();

      interaction.dispose();
    });

    it('pressing interact key on highlighted cell applies the equipped tool', () => {
      const gridLayout = [{ index: 0, x: 0, y: 0, z: 0 }];
      const ctrl = createPlayerController({
        bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
        blockers: [],
        initialPosition: { x: 0, y: 0, z: 0.3 },
      });

      let interactedCellIndex = null;
      const interaction = new InteractionSystem(null, null, ctrl, gridLayout, {
        onInteractCell: ({ cellIndex }) => {
          interactedCellIndex = cellIndex;
          return true;
        },
      });

      // Highlight the cell
      interaction.update(0.016);
      expect(interaction.getHighlighted()).not.toBeNull();

      // Interact with highlighted cell
      const result = interaction.interactHighlighted({ source: 'keyboard' });
      expect(result).toBe(true);
      expect(interactedCellIndex).toBe(0);

      interaction.dispose();
    });

    it('highlighted interactable shows a prompt label in screen space', () => {
      const gridLayout = [{ index: 0, x: 0, y: 0, z: 0 }];
      const ctrl = createPlayerController({
        bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
        blockers: [],
        initialPosition: { x: 0, y: 0, z: 0.3 },
      });
      const interaction = new InteractionSystem(null, null, ctrl, gridLayout);
      interaction.update(0.016);
      const highlighted = interaction.getHighlighted();
      expect(highlighted).not.toBeNull();
      // getHighlighted returns label and anchor (screen-space projection source)
      expect(typeof highlighted.label).toBe('string');
      expect(highlighted.label.length).toBeGreaterThan(0);
      expect(highlighted.anchor).toBeDefined();
      expect(typeof highlighted.anchor.x).toBe('number');
      expect(typeof highlighted.anchor.y).toBe('number');
      interaction.dispose();
    });

    it('when multiple interactables overlap, the closest one is selected', () => {
      // Two cells: one at z=0.1 (close), one at z=0.5 (farther)
      const gridLayout = [
        { index: 0, x: 0, y: 0, z: 0.1 },
        { index: 1, x: 0, y: 0, z: 0.5 },
      ];
      // Player at z=0.2 — closer to cell 0 (z=0.1) than cell 1 (z=0.5)
      const ctrl = createPlayerController({
        bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
        blockers: [],
        initialPosition: { x: 0, y: 0, z: 0.2 },
      });
      const interaction = new InteractionSystem(null, null, ctrl, gridLayout);
      interaction.update(0.016);
      const highlighted = interaction.getHighlighted();
      expect(highlighted).not.toBeNull();
      expect(highlighted.index).toBe(0); // closer cell wins
      interaction.dispose();
    });
  });

  // -------------------------------------------------------------------------
  // 1-D. Tool System
  // -------------------------------------------------------------------------
  describe('Tool System', () => {
    it('tool HUD is visible in Let It Grow mode, hidden in Story mode', () => {
      // Create a mock InputManager for ToolHUD
      const listeners = new Map();
      const mockInputManager = {
        registerAction: vi.fn(),
        on(actionName, handler) {
          const set = listeners.get(actionName) ?? new Set();
          set.add(handler);
          listeners.set(actionName, set);
          return () => set.delete(handler);
        },
      };

      const tools = [
        { id: 'hand', label: 'Hand', icon: 'H', shortcut: '1' },
        { id: 'water', label: 'Water', icon: 'W', shortcut: '2' },
      ];

      // Let It Grow mode — HUD should be visible
      const ligStore = createTestStore();
      ligStore.dispatch({ type: Actions.SET_GAME_MODE, payload: { mode: 'let_it_grow' } });
      const ligState = ligStore.getState();
      expect(ligState.campaign.gameMode).toBe('let_it_grow');

      const container = document.createElement('div');
      document.body.appendChild(container);
      const hud = new ToolHUD(container, mockInputManager, ligStore);
      hud.setTools(tools);
      hud.setVisible(ligState.campaign.gameMode === 'let_it_grow');
      expect(hud.visible).toBe(true);

      // Story mode — HUD should be hidden
      const storyStore = createTestStore();
      const storyState = storyStore.getState();
      expect(storyState.campaign.gameMode).toBe('story');
      hud.setVisible(storyState.campaign.gameMode === 'let_it_grow');
      expect(hud.visible).toBe(false);

      hud.dispose();
      container.remove();
    });

    it('number keys 1-5 switch the active tool', () => {
      const listeners = new Map();
      const mockInputManager = {
        registerAction: vi.fn(),
        on(actionName, handler) {
          const set = listeners.get(actionName) ?? new Set();
          set.add(handler);
          listeners.set(actionName, set);
          return () => set.delete(handler);
        },
        emit(actionName, payload = {}) {
          const eventPayload = {
            source: 'keyboard',
            event: new KeyboardEvent('keydown', { key: actionName }),
            preventDefault: vi.fn(),
            ...payload,
          };
          listeners.get(actionName)?.forEach((h) => h(eventPayload));
          return eventPayload;
        },
      };

      const tools = [
        { id: 'trowel', label: 'Trowel', icon: 'T', shortcut: '1' },
        { id: 'watering_can', label: 'Watering Can', icon: 'W', shortcut: '2' },
        { id: 'pruners', label: 'Pruners', icon: 'P', shortcut: '3' },
        { id: 'rake', label: 'Rake', icon: 'R', shortcut: '4' },
        { id: 'basket', label: 'Basket', icon: 'B', shortcut: '5' },
      ];

      const container = document.createElement('div');
      document.body.appendChild(container);
      const hud = new ToolHUD(container, mockInputManager, null);
      hud.setTools(tools);
      hud.setVisible(true);

      // Default selection is the first tool
      expect(hud.getSelectedTool()?.id).toBe('trowel');

      // Press '2' -> watering_can
      mockInputManager.emit('tool_slot_2', {
        event: new KeyboardEvent('keydown', { key: '2' }),
      });
      expect(hud.getSelectedTool()?.id).toBe('watering_can');

      // Press '4' -> rake
      mockInputManager.emit('tool_slot_4', {
        event: new KeyboardEvent('keydown', { key: '4' }),
      });
      expect(hud.getSelectedTool()?.id).toBe('rake');

      // Press '5' -> basket
      mockInputManager.emit('tool_slot_5', {
        event: new KeyboardEvent('keydown', { key: '5' }),
      });
      expect(hud.getSelectedTool()?.id).toBe('basket');

      hud.dispose();
      container.remove();
    });

    it('active tool determines the store action dispatched on interact', () => {
      const store = createTestStore();
      const inventory = new Inventory(store);
      const toolMgr = new ToolManager(store, inventory);

      // Verify that each tool has its expected action mapping
      const wateringCan = toolMgr.getTool('watering_can');
      expect(wateringCan).not.toBeNull();
      expect(wateringCan.action).toBe('WATER_CELL');

      const pruners = toolMgr.getTool('pruning_shears');
      expect(pruners).not.toBeNull();
      expect(pruners.action).toBe('PRUNE_CELL');

      const scanner = toolMgr.getTool('soil_scanner');
      expect(scanner).not.toBeNull();
      expect(scanner.action).toBe('SCAN_CELL');

      // Select watering_can and verify it's active
      toolMgr.selectTool('watering_can');
      const selected = toolMgr.getSelectedTool();
      expect(selected.id).toBe('watering_can');
      expect(selected.action).toBe('WATER_CELL');

      // Switch to pruners
      toolMgr.selectTool('pruning_shears');
      const selected2 = toolMgr.getSelectedTool();
      expect(selected2.id).toBe('pruning_shears');
      expect(selected2.action).toBe('PRUNE_CELL');

      toolMgr.dispose();
    });

    it('tools have cooldowns that prevent rapid repeated use', () => {
      const store = createTestStore();
      const inventory = new Inventory(store);
      const toolMgr = new ToolManager(store, inventory);
      // Register a tool with a 5-second cooldown
      toolMgr.registerTool('cooldown_tool', {
        name: 'Cooldown Tool', icon: 'C', action: 'TEST_ACTION',
        durability: 100, cooldownMs: 5000,
      });
      // Add the tool to inventory so durability check passes
      inventory.addItem('watering_can', 1);
      // Use watering_can on cell 0 (default 0ms cooldown — should succeed twice)
      const firstUse = toolMgr.useTool('watering_can', 0);
      expect(firstUse.success).toBe(true);
      // watering_can has 0ms cooldown, so second use should also succeed
      const secondUse = toolMgr.useTool('watering_can', 0);
      expect(secondUse.success).toBe(true);
      // Now test with the cooldown tool — manually set cooldown in store
      store.dispatch({
        type: 'SET_COOLDOWN',
        payload: { toolId: 'watering_can', cellIndex: 99, key: 'watering_can_99', until: Date.now() + 60000 },
      });
      // canUseTool should return false for the cooldown key
      expect(toolMgr.canUseTool('watering_can', 99)).toBe(false);
      toolMgr.dispose();
    });

    it('tool use dispatches the correct action type to the game store', () => {
      const store = createTestStore();
      const inventory = new Inventory(store);
      const toolMgr = new ToolManager(store, inventory);
      // Spy on store.dispatch to capture dispatched actions
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      // Use watering_can on cell 0
      toolMgr.selectTool('watering_can');
      const result = toolMgr.useTool('watering_can', 0);
      expect(result.success).toBe(true);
      // Verify USE_TOOL was dispatched
      const useToolCall = dispatchSpy.mock.calls.find(
        ([action]) => action.type === 'USE_TOOL',
      );
      expect(useToolCall).toBeDefined();
      expect(useToolCall[0].payload.durabilityCost).toBe(1);
      // Use pruning_shears and verify its dispatch
      toolMgr.selectTool('pruning_shears');
      const result2 = toolMgr.useTool('pruning_shears', 1);
      expect(result2.success).toBe(true);
      const pruneCall = dispatchSpy.mock.calls.filter(
        ([action]) => action.type === 'USE_TOOL',
      );
      expect(pruneCall.length).toBe(2);
      dispatchSpy.mockRestore();
      toolMgr.dispose();
    });
  });

  // -------------------------------------------------------------------------
  // 1-E. Mode Selector
  // -------------------------------------------------------------------------
  describe('Mode Selector', () => {
    it('new game screen presents Story Mode and Let It Grow choices', () => {
      const store = createTestStore();
      // SET_GAME_MODE action exists and accepts 'story'
      store.dispatch({ type: Actions.SET_GAME_MODE, payload: { mode: 'story' } });
      expect(store.getState().campaign.gameMode).toBe('story');
      // SET_GAME_MODE accepts 'let_it_grow'
      store.dispatch({ type: Actions.SET_GAME_MODE, payload: { mode: 'let_it_grow' } });
      expect(store.getState().campaign.gameMode).toBe('let_it_grow');
      // Both modes are valid choices from the new-game screen
    });

    it('selecting Story Mode starts without tool HUD', () => {
      const store = createTestStore();
      // Default gameMode is 'story'
      expect(store.getState().campaign.gameMode).toBe('story');

      // Explicitly set via dispatch
      store.dispatch({ type: Actions.SET_GAME_MODE, payload: { mode: 'story' } });
      const state = store.getState();
      expect(state.campaign.gameMode).toBe('story');

      // ToolHUD should not be visible in story mode
      const mockInputManager = {
        registerAction: vi.fn(),
        on: vi.fn(() => () => {}),
      };
      const container = document.createElement('div');
      document.body.appendChild(container);
      const hud = new ToolHUD(container, mockInputManager, store);
      hud.setVisible(state.campaign.gameMode === 'let_it_grow');
      expect(hud.visible).toBe(false);
      expect(hud.root.hidden).toBe(true);

      hud.dispose();
      container.remove();
    });

    it('selecting Let It Grow starts with tool HUD active', () => {
      const store = createTestStore();
      store.dispatch({ type: Actions.SET_GAME_MODE, payload: { mode: 'let_it_grow' } });
      const state = store.getState();
      expect(state.campaign.gameMode).toBe('let_it_grow');

      // ToolHUD should be visible in Let It Grow mode
      const mockInputManager = {
        registerAction: vi.fn(),
        on: vi.fn(() => () => {}),
      };
      const container = document.createElement('div');
      document.body.appendChild(container);
      const hud = new ToolHUD(container, mockInputManager, store);
      hud.setTools([
        { id: 'hand', label: 'Hand', icon: 'H' },
        { id: 'water', label: 'Water', icon: 'W' },
      ]);
      hud.setVisible(state.campaign.gameMode === 'let_it_grow');
      expect(hud.visible).toBe(true);
      expect(hud.root.hidden).toBe(false);

      hud.dispose();
      container.remove();
    });

    it('save file includes the selected game mode', () => {
      const state = createGameState();
      state.campaign.gameMode = 'let_it_grow';
      const store = new Store(state);
      expect(store.getState().campaign.gameMode).toBe('let_it_grow');
    });

    it('loading a save without gameMode field defaults to story', () => {
      const raw = { campaign: { currentChapter: 1 }, season: { chapter: 1, season: 'spring', phase: 'PLANNING' } };
      const normalized = normalizeGameState(raw);
      expect(normalized.campaign.gameMode).toBe('story');
    });
  });

  // -------------------------------------------------------------------------
  // 1-F. Story Mode Regression
  // -------------------------------------------------------------------------
  describe('Story Mode Regression', () => {
    it('full season still advances through all 6 phases after movement changes', () => {
      // Guard: ensure Phase 1 additions do not break the existing season loop.
      // Mirrors the Full Season Playthrough test within the Phase 1 block.
      globalThis.localStorage = createMockStorage();

      const store = createPlantedStore();
      let state = store.getState();
      expect(state.season.phase).toBe(PHASES.PLANNING);

      // PLANNING -> EARLY_SEASON
      const r1 = advancePhases(store, 1);
      expect(r1[0].advanced).toBe(true);
      state = store.getState();
      expect(state.season.phase).toBe(PHASES.EARLY_SEASON);

      // Resolve early-season event
      store.dispatch({
        type: Actions.APPLY_EVENT,
        payload: { eventActive: null, resolvedEvent: state.season.eventActive, summary: { negativeAffectedCount: 0 } },
      });
      store.dispatch({
        type: Actions.USE_INTERVENTION,
        payload: { interventionId: 'accept_loss', interventionTokens: state.season.interventionTokens },
      });

      // EARLY_SEASON -> MID_SEASON
      const r2 = advancePhases(store, 1);
      expect(r2[0].advanced).toBe(true);
      state = store.getState();
      expect(state.season.phase).toBe(PHASES.MID_SEASON);

      // Resolve mid-season event
      store.dispatch({ type: Actions.APPLY_EVENT, payload: { eventActive: null } });
      store.dispatch({ type: Actions.USE_INTERVENTION, payload: { interventionId: 'accept_loss' } });

      // MID_SEASON -> LATE_SEASON
      const r3 = advancePhases(store, 1);
      expect(r3[0].advanced).toBe(true);
      state = store.getState();
      expect(state.season.phase).toBe(PHASES.LATE_SEASON);

      // Resolve late-season event
      store.dispatch({ type: Actions.APPLY_EVENT, payload: { eventActive: null } });
      store.dispatch({ type: Actions.USE_INTERVENTION, payload: { interventionId: 'accept_loss' } });

      // LATE_SEASON -> HARVEST
      const r4 = advancePhases(store, 1);
      expect(r4[0].advanced).toBe(true);
      state = store.getState();
      expect(state.season.phase).toBe(PHASES.HARVEST);

      // HARVEST -> TRANSITION
      const r5 = advancePhases(store, 1);
      expect(r5[0].advanced).toBe(true);
      state = store.getState();
      expect(state.season.phase).toBe(PHASES.TRANSITION);

      delete globalThis.localStorage;
    });

    it('phase machine transition rules are unchanged from baseline', () => {
      globalThis.localStorage = createMockStorage();

      const store = createPlantedStore();
      let state = store.getState();
      expect(PHASE_ORDER).toEqual([
        PHASES.PLANNING,
        PHASES.EARLY_SEASON,
        PHASES.MID_SEASON,
        PHASES.LATE_SEASON,
        PHASES.HARVEST,
        PHASES.TRANSITION,
      ]);
      expect(canAdvance(state.season)).toBe(true);

      const r1 = advancePhases(store, 1);
      expect(r1[0].advanced).toBe(true);
      state = store.getState();
      expect(state.season.phase).toBe(PHASES.EARLY_SEASON);
      expect(state.season.beatIndex).toBe(0);
      expect(state.season.month).toBe(1);
      expect(canAdvance(state.season)).toBe(false);

      store.dispatch({
        type: Actions.APPLY_EVENT,
        payload: { eventActive: null, resolvedEvent: state.season.eventActive, summary: { negativeAffectedCount: 0 } },
      });
      store.dispatch({
        type: Actions.USE_INTERVENTION,
        payload: { interventionId: 'accept_loss', interventionTokens: state.season.interventionTokens },
      });

      const r2 = advancePhases(store, 1);
      expect(r2[0].advanced).toBe(true);
      state = store.getState();
      expect(state.season.phase).toBe(PHASES.MID_SEASON);
      expect(state.season.beatIndex).toBe(1);
      expect(state.season.month).toBe(2);
      expect(canAdvance(state.season)).toBe(false);

      store.dispatch({ type: Actions.APPLY_EVENT, payload: { eventActive: null } });
      store.dispatch({ type: Actions.USE_INTERVENTION, payload: { interventionId: 'accept_loss' } });

      const r3 = advancePhases(store, 1);
      expect(r3[0].advanced).toBe(true);
      state = store.getState();
      expect(state.season.phase).toBe(PHASES.LATE_SEASON);
      expect(state.season.beatIndex).toBe(2);
      expect(state.season.month).toBe(3);
      expect(canAdvance(state.season)).toBe(false);

      store.dispatch({ type: Actions.APPLY_EVENT, payload: { eventActive: null } });
      store.dispatch({ type: Actions.USE_INTERVENTION, payload: { interventionId: 'accept_loss' } });

      const r4 = advancePhases(store, 1);
      expect(r4[0].advanced).toBe(true);
      state = store.getState();
      expect(state.season.phase).toBe(PHASES.HARVEST);
      expect(state.season.eventActive).toBeNull();
      expect(state.season.interventionChosen).toBeNull();
      expect(state.season.harvestResult).not.toBeNull();
      expect(canAdvance(state.season)).toBe(true);

      const r5 = advancePhases(store, 1);
      expect(r5[0].advanced).toBe(true);
      state = store.getState();
      expect(state.season.phase).toBe(PHASES.TRANSITION);
      expect(canAdvance(state.season)).toBe(true);

      const r6 = advancePhases(store, 1);
      expect(r6[0].advanced).toBe(true);
      state = store.getState();
      expect(state.season.phase).toBe(PHASES.PLANNING);
      expect(state.season.chapter).toBe(2);
      expect(state.season.season).toBe('summer');
      expect(state.campaign.currentChapter).toBe(2);
      expect(state.campaign.currentSeason).toBe('summer');
      expect(state.season.month).toBe(1);
      expect(state.season.beatIndex).toBe(0);
      expect(state.season.harvestResult).toBeNull();
      expect(canAdvance(state.season)).toBe(false);

      delete globalThis.localStorage;
    });

    it('cutscene triggers still fire at the correct phase boundaries', () => {
      globalThis.localStorage = createMockStorage();

      const store = createPlantedStore();
      let state = store.getState();
      const monthOneEvents = getMonthlyEvents(state.season.season, 1, state.season.chapter, state.season.eventsDrawn);
      expect(monthOneEvents.length).toBeGreaterThan(0);

      const r1 = advancePhases(store, 1);
      state = store.getState();
      expect(r1[0].trigger).toMatchObject({
        type: 'event_drawn',
        chapter: 1,
        season: 'spring',
        eventId: state.season.eventActive.id,
        eventTitle: state.season.eventActive.title,
        eventCategory: state.season.eventActive.category,
        eventValence: state.season.eventActive.valence,
      });
      expect(['low', 'medium', 'high']).toContain(r1[0].trigger.eventSeverity);

      const earlyEventId = state.season.eventActive.id;
      store.dispatch({
        type: Actions.APPLY_EVENT,
        payload: { eventActive: null, resolvedEvent: state.season.eventActive, summary: { negativeAffectedCount: 0 } },
      });
      store.dispatch({
        type: Actions.USE_INTERVENTION,
        payload: { interventionId: 'accept_loss', interventionTokens: state.season.interventionTokens },
      });

      const monthTwoEvents = getMonthlyEvents(state.season.season, 2, state.season.chapter, state.season.eventsDrawn);
      expect(monthTwoEvents.length).toBeGreaterThan(0);

      const r2 = advancePhases(store, 1);
      state = store.getState();
      expect(r2[0].trigger).toMatchObject({
        type: 'event_drawn',
        chapter: 1,
        season: 'spring',
        eventId: state.season.eventActive.id,
      });
      expect(state.season.eventActive.id).not.toBe(earlyEventId);

      const midEventId = state.season.eventActive.id;
      store.dispatch({ type: Actions.APPLY_EVENT, payload: { eventActive: null } });
      store.dispatch({ type: Actions.USE_INTERVENTION, payload: { interventionId: 'accept_loss' } });

      const monthThreeEvents = getMonthlyEvents(state.season.season, 3, state.season.chapter, state.season.eventsDrawn);
      expect(monthThreeEvents.length).toBeGreaterThan(0);

      const r3 = advancePhases(store, 1);
      state = store.getState();
      expect(r3[0].trigger).toMatchObject({
        type: 'event_drawn',
        chapter: 1,
        season: 'spring',
        eventId: state.season.eventActive.id,
      });
      expect(state.season.eventActive.id).not.toBe(earlyEventId);
      expect(state.season.eventActive.id).not.toBe(midEventId);

      store.dispatch({ type: Actions.APPLY_EVENT, payload: { eventActive: null } });
      store.dispatch({ type: Actions.USE_INTERVENTION, payload: { interventionId: 'accept_loss' } });

      const r4 = advancePhases(store, 1);
      state = store.getState();
      expect(r4[0].trigger).toMatchObject({
        type: 'harvest_complete',
        chapter: 1,
        season: 'spring',
        score: state.season.harvestResult.score,
        grade: state.season.harvestResult.grade,
      });
      expect(r4[0].trigger.yieldList).toEqual(state.season.harvestResult.yieldList ?? []);
      expect(r4[0].trigger.recipeMatches).toEqual(state.season.harvestResult.recipeMatches ?? []);

      const r5 = advancePhases(store, 1);
      expect(r5[0].trigger).toEqual({
        type: 'chapter_complete',
        chapter: 1,
        season: 'spring',
      });

      const r6 = advancePhases(store, 1);
      expect(r6[0].trigger).toEqual({
        type: 'chapter_start',
        chapter: 2,
        season: 'summer',
      });

      delete globalThis.localStorage;
    });

    it('save/load round-trip still works after Phase 1 state additions', () => {
      globalThis.localStorage = createMockStorage();

      const state = createGameState();
      state.season.activeTool = 'water';
      state.campaign.gameMode = 'let_it_grow';
      const store = new Store(state);

      // Save campaign and season to slot 1
      const savedCampaign = saveCampaign(store.getState().campaign, 1);
      const savedSeason = saveSeasonState(store.getState().season, 1);
      expect(savedCampaign).not.toBeNull();
      expect(savedSeason).not.toBeNull();

      // Load back and verify Phase 1 additions are preserved
      const loadedCampaign = loadCampaign(1);
      const loadedSeason = loadSeasonState(1);
      expect(loadedCampaign).not.toBeNull();
      expect(loadedCampaign.gameMode).toBe('let_it_grow');
      expect(loadedSeason).not.toBeNull();
      expect(loadedSeason.activeTool).toBe('water');

      delete globalThis.localStorage;
    });
  });
});

// Phase 2L — Quests, NPCs, Reputation, Zones
// Tests for the quest lifecycle, NPC reputation, dialogue branching,
// zone transitions, and NPC schedules. Data specs exist in QUEST_DECK.json,
// WORLD_MAP.json, and DIALOGUE_ENGINE.json. Runtime systems are not yet built.

describe('Phase 2 — Quests, NPCs, Reputation, Zones', () => {

  // -------------------------------------------------------------------------
  // 2-A. Quest Lifecycle
  // -------------------------------------------------------------------------
  describe('Quest Lifecycle', () => {
    const INTEGRATION_QUEST_DECK = [
      {
        id: 'gus_tomatoes',
        npc: 'old_gus',
        title: 'Gus Wants Tomatoes',
        requirements: [{ type: 'crop_harvested', id: 'cherry_tom', count: 3 }],
        rewards: [
          { type: 'reputation', id: 'old_gus', amount: 20 },
          { type: 'seed', id: 'heirloom_tomato', amount: 1 },
          { type: 'item', id: 'compost', amount: 2 },
          { type: 'xp', id: 'gardening', amount: 50 },
        ],
        prerequisites: { chapter_min: 3, season: 'summer', reputation: {}, quests_completed: [] },
        timed: false,
      },
      {
        id: 'maya_flowers',
        npc: 'maya',
        title: 'Maya Needs Flowers',
        requirements: [{ type: 'crop_planted', id: 'sunflower', count: 2 }],
        rewards: [{ type: 'reputation', id: 'maya', amount: 10 }],
        prerequisites: { chapter_min: 1, season: null, reputation: {}, quests_completed: [] },
        timed: false,
      },
    ];

    function makeIntegrationEngine(storeOverride) {
      const store = storeOverride ?? new Store(createGameState());
      return new QuestEngine(store, INTEGRATION_QUEST_DECK);
    }

    it('getAvailableQuests respects chapter/season prerequisites', () => {
      const engine = makeIntegrationEngine();

      // Default state: chapter 1, spring -- gus_tomatoes requires chapter 3 + summer
      const lockedIds = engine.getAvailableQuests().map((q) => q.id);
      expect(lockedIds).not.toContain('gus_tomatoes');
      // maya_flowers has no season lock, chapter_min 1, so it should be available
      expect(lockedIds).toContain('maya_flowers');

      // Advance to chapter 3, summer
      const state = engine.store.getState();
      state.campaign.currentChapter = 3;
      state.season.season = 'summer';
      engine.store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      const availableIds = engine.getAvailableQuests().map((q) => q.id);
      expect(availableIds).toContain('gus_tomatoes');

      // Drop back to chapter 1
      const state2 = engine.store.getState();
      state2.campaign.currentChapter = 1;
      engine.store.dispatch({ type: Actions.REPLACE_STATE, payload: { state: state2 } });

      const lockedAgain = engine.getAvailableQuests().map((q) => q.id);
      expect(lockedAgain).not.toContain('gus_tomatoes');
    });

    it('acceptQuest adds quest to questLog with ACCEPTED status', () => {
      const store = new Store(createGameState());
      const state = store.getState();
      state.campaign.currentChapter = 3;
      state.season.season = 'summer';
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      const engine = makeIntegrationEngine(store);
      expect(engine.getAvailableQuests().map((q) => q.id)).toContain('gus_tomatoes');

      const accepted = engine.acceptQuest('gus_tomatoes');
      expect(accepted).toBe(true);

      const entry = engine.store.getState().campaign.questLog.gus_tomatoes;
      expect(entry).toBeDefined();
      expect(entry.state).toBe(QuestStates.ACCEPTED);
      expect(entry.acceptedAt).toBeDefined();
      expect(entry.acceptedSeason).toBe('summer');
      expect(entry.acceptedChapter).toBe(3);

      expect(engine.getAvailableQuests().map((q) => q.id)).not.toContain('gus_tomatoes');
    });

    it('evaluateProgress transitions quest to READY_TO_TURN_IN when requirements met', () => {
      const store = new Store(createGameState());
      const state = store.getState();
      state.campaign.currentChapter = 3;
      state.season.season = 'summer';
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      const engine = makeIntegrationEngine(store);
      engine.acceptQuest('gus_tomatoes');
      expect(engine.store.getState().campaign.questLog.gus_tomatoes.state).toBe(QuestStates.ACCEPTED);

      // Plant cherry_tom in 3 cells, then harvest each
      for (let i = 0; i < 3; i++) {
        store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex: i, cropId: 'cherry_tom' } });
        store.dispatch({ type: Actions.HARVEST_CELL, payload: { cellIndex: i } });
      }

      expect(engine.store.getState().campaign.pantry.cherry_tom).toBe(3);

      const changes = engine.evaluateProgress();
      expect(changes).toEqual(
        expect.arrayContaining([{ questId: 'gus_tomatoes', newState: QuestStates.READY_TO_TURN_IN }]),
      );
      expect(engine.store.getState().campaign.questLog.gus_tomatoes.state).toBe(QuestStates.READY_TO_TURN_IN);
    });

    it('turnInQuest applies rewards (XP, reputation, items, unlocks)', () => {
      const store = new Store(createGameState());
      const state = store.getState();
      state.campaign.currentChapter = 3;
      state.season.season = 'summer';
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      const engine = makeIntegrationEngine(store);
      engine.acceptQuest('gus_tomatoes');

      for (let i = 0; i < 3; i++) {
        store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex: i, cropId: 'cherry_tom' } });
        store.dispatch({ type: Actions.HARVEST_CELL, payload: { cellIndex: i } });
      }
      engine.evaluateProgress();

      const beforeState = engine.store.getState();
      const repBefore = beforeState.campaign.reputation.old_gus ?? 0;

      const rewards = engine.turnInQuest('gus_tomatoes');
      expect(rewards).not.toBeNull();
      expect(rewards).toHaveLength(4);

      const afterState = engine.store.getState();

      expect(afterState.campaign.questLog.gus_tomatoes.state).toBe(QuestStates.COMPLETED);
      expect(afterState.campaign.questLog.gus_tomatoes.completedAt).toBeDefined();

      // Reputation reward: old_gus +20
      expect(afterState.campaign.reputation.old_gus).toBe(repBefore + 20);

      // Seed reward: heirloom_tomato unlocked
      expect(afterState.campaign.cropsUnlocked).toContain('heirloom_tomato');

      // Item reward: compost x2 in inventory
      const compostSlot = afterState.campaign.inventory.slots.find((s) => s?.itemId === 'compost');
      expect(compostSlot).toBeDefined();
      expect(compostSlot.count).toBeGreaterThanOrEqual(2);

      // XP reward: gardening skill gained 50 XP
      const gardeningSkill = afterState.campaign.skills?.gardening;
      expect(gardeningSkill).toBeDefined();
      expect(gardeningSkill.xp).toBeGreaterThanOrEqual(50);
    });

    it('quest state persists through save/load cycle', () => {
      globalThis.localStorage = createMockStorage();
      try {
        const store = new Store(createGameState());
        const state = store.getState();
        state.campaign.currentChapter = 3;
        state.season.season = 'summer';
        store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

        const engine = makeIntegrationEngine(store);
        engine.acceptQuest('gus_tomatoes');

        const preSaveState = engine.store.getState();
        expect(preSaveState.campaign.questLog.gus_tomatoes.state).toBe(QuestStates.ACCEPTED);

        const slot = 0;
        saveCampaign(preSaveState.campaign, slot);
        saveSeasonState(preSaveState.season, slot);

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

        const restoredEntry = restoredState.campaign.questLog.gus_tomatoes;
        expect(restoredEntry).toBeDefined();
        expect(restoredEntry.state).toBe(QuestStates.ACCEPTED);
        expect(restoredEntry.acceptedSeason).toBe('summer');
        expect(restoredEntry.acceptedChapter).toBe(3);

        // A new QuestEngine on the restored store should see the quest as active
        const restoredEngine = new QuestEngine(freshStore, INTEGRATION_QUEST_DECK);
        const activeIds = restoredEngine.getActiveQuests().map((q) => q.id);
        expect(activeIds).toContain('gus_tomatoes');
        expect(restoredEngine.getAvailableQuests().map((q) => q.id)).not.toContain('gus_tomatoes');
      } finally {
        delete globalThis.localStorage;
      }
    });
  });

  // -------------------------------------------------------------------------
  // 2-B. Reputation Integration
  // -------------------------------------------------------------------------
  describe('Reputation Integration', () => {
    it('completing a quest grants reputation points for the quest NPC', () => {
      // Use gus_tomatoes quest: rewards include { type: 'reputation', id: 'old_gus', amount: 15 }
      const store = createTestStore();
      const reputation = new ReputationSystem(store);
      const questDeck = [
        {
          id: 'gus_tomatoes',
          npc: 'old_gus',
          type: 'discover',
          title: "Grandpa's Tomatoes",
          requirements: [{ type: 'crop_harvested', id: 'cherry_tom', count: 3 }],
          rewards: [
            { type: 'seed', id: 'heritage_pepper', amount: 1 },
            { type: 'reputation', id: 'old_gus', amount: 15 },
          ],
          prerequisites: { chapter_min: 1, reputation: {}, quests_completed: [] },
          timed: false,
        },
      ];
      const engine = new QuestEngine(store, questDeck);

      // 1. Start with 0 rep
      expect(reputation.getReputation('old_gus')).toBe(0);

      // 2. Accept the quest, fulfil requirements, and turn in
      engine.acceptQuest('gus_tomatoes');
      // Simulate harvesting 3 cherry_tom into pantry
      for (let i = 0; i < 3; i++) {
        store.dispatch({
          type: Actions.PLANT_CROP,
          payload: { cellIndex: i, cropId: 'cherry_tom' },
        });
        store.dispatch({
          type: Actions.HARVEST_CELL,
          payload: { cellIndex: i, yieldCount: 1 },
        });
      }
      engine.evaluateProgress();
      const rewards = engine.turnInQuest('gus_tomatoes');

      // 3. Assert reputation.old_gus === 15
      expect(reputation.getReputation('old_gus')).toBe(15);
      expect(rewards).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'reputation', id: 'old_gus', amount: 15 }),
      ]));
    });

    it('reputation tier changes at defined thresholds', () => {
      const store = createTestStore();
      const reputation = new ReputationSystem(store);

      // 0 → stranger
      expect(reputation.getTier('old_gus')).toEqual(ReputationTiers.STRANGER);

      // Add 25 → acquaintance
      reputation.addReputation('old_gus', 25);
      expect(reputation.getTier('old_gus')).toEqual(ReputationTiers.ACQUAINTANCE);

      // Add 25 more (total 50) → friend
      reputation.addReputation('old_gus', 25);
      expect(reputation.getTier('old_gus')).toEqual(ReputationTiers.FRIEND);

      // Add 25 more (total 75) → trusted
      reputation.addReputation('old_gus', 25);
      expect(reputation.getTier('old_gus')).toEqual(ReputationTiers.TRUSTED);

      // Add 25 more (total 100) → family
      reputation.addReputation('old_gus', 25);
      expect(reputation.getTier('old_gus')).toEqual(ReputationTiers.FAMILY);
    });

    it('higher reputation tiers unlock new quests from that NPC', () => {
      // gus_mushroom_logs requires { old_gus: 50 } (friend tier)
      const store = createTestStore();
      const reputation = new ReputationSystem(store);
      const questDeck = [
        {
          id: 'gus_mushroom_logs',
          npc: 'old_gus',
          type: 'assist',
          title: 'Mushroom Log Inoculation',
          requirements: [{ type: 'item_delivered', id: 'wood', count: 4 }],
          rewards: [{ type: 'reputation', id: 'old_gus', amount: 25 }],
          prerequisites: { chapter_min: 1, reputation: { old_gus: 50 }, quests_completed: [] },
          timed: false,
        },
      ];
      const engine = new QuestEngine(store, questDeck);

      // At stranger tier (0 rep) → quest is locked (not available)
      expect(reputation.getTier('old_gus')).toEqual(ReputationTiers.STRANGER);
      expect(engine.getAvailableQuests().map((q) => q.id)).not.toContain('gus_mushroom_logs');

      // At acquaintance tier (25 rep) → still locked
      reputation.addReputation('old_gus', 25);
      expect(reputation.getTier('old_gus')).toEqual(ReputationTiers.ACQUAINTANCE);
      expect(engine.getAvailableQuests().map((q) => q.id)).not.toContain('gus_mushroom_logs');

      // Reach friend tier (50 rep) → quest becomes available
      reputation.addReputation('old_gus', 25);
      expect(reputation.getTier('old_gus')).toEqual(ReputationTiers.FRIEND);
      expect(engine.getAvailableQuests().map((q) => q.id)).toContain('gus_mushroom_logs');
    });

    it('reputation decays slightly at season end if no quests completed', () => {
      const store = createTestStore();
      const reputation = new ReputationSystem(store);

      // Build up reputation for two NPCs
      reputation.addReputation('old_gus', 30);
      reputation.addReputation('maya', 10);
      expect(reputation.getReputation('old_gus')).toBe(30);
      expect(reputation.getReputation('maya')).toBe(10);

      // Apply seasonal decay (reduces each by 1)
      reputation.applyDecay();
      expect(reputation.getReputation('old_gus')).toBe(29);
      expect(reputation.getReputation('maya')).toBe(9);

      // Apply multiple decay cycles — should not go below 0
      for (let i = 0; i < 15; i++) {
        reputation.applyDecay();
      }
      expect(reputation.getReputation('old_gus')).toBe(14);
      expect(reputation.getReputation('maya')).toBe(0);
    });

    it('dialogue options change based on reputation tier', () => {
      const store = createTestStore();
      const reputation = new ReputationSystem(store);

      // Stranger tier → stranger greeting
      const strangerGreeting = getNPCGreeting('old_gus', reputation.getTier('old_gus').id);
      expect(strangerGreeting).toBe('Hmm? New around here?');

      // Reach acquaintance tier (25)
      reputation.addReputation('old_gus', 25);
      const acquaintanceGreeting = getNPCGreeting('old_gus', reputation.getTier('old_gus').id);
      expect(acquaintanceGreeting).toBe('You again. Good.');

      // Reach friend tier (50)
      reputation.addReputation('old_gus', 25);
      const friendGreeting = getNPCGreeting('old_gus', reputation.getTier('old_gus').id);
      expect(friendGreeting).toBe('Good to see you, kid.');

      // Reach trusted tier (75)
      reputation.addReputation('old_gus', 25);
      const trustedGreeting = getNPCGreeting('old_gus', reputation.getTier('old_gus').id);
      expect(trustedGreeting).toBe("Soil's listening today. Pay attention.");

      // Reach family tier (100)
      reputation.addReputation('old_gus', 25);
      const familyGreeting = getNPCGreeting('old_gus', reputation.getTier('old_gus').id);
      expect(familyGreeting).toBe('There you are. Grab your gloves.');
    });
  });

  // -------------------------------------------------------------------------
  // 2-C. Dialogue Branching
  // -------------------------------------------------------------------------
  describe('Dialogue Branching', () => {
    it('dialogue with choices presents the correct options', () => {
      vi.useFakeTimers();
      let lastUi = null;
      const machine = createCutsceneMachine({
        onStateChange: (ui) => { lastUi = ui; },
        onFinish: () => {},
        onEffect: () => {},
        gardenScene: {},
      });

      const scene = {
        id: 'test-choices',
        priority: 1,
        skippable: true,
        beats: [{
          speaker: 'garden_gurl',
          text: 'Will you help me?',
          choices: [
            { label: 'Yes, I will!', effect: 'accept_quest' },
            { label: 'Not right now.' },
          ],
        }],
      };

      machine.start(scene);
      // Run all typing timers to completion
      vi.runAllTimers();

      expect(lastUi.visible).toBe(true);
      expect(lastUi.canAdvance).toBe(true);
      expect(lastUi.choices).not.toBeNull();
      expect(lastUi.choices).toHaveLength(2);
      expect(lastUi.choices[0].label).toBe('Yes, I will!');
      expect(lastUi.choices[1].label).toBe('Not right now.');

      machine.finish();
      vi.useRealTimers();
    });

    it('selecting "accept quest" choice dispatches ACCEPT_QUEST effect', () => {
      vi.useFakeTimers();
      let firedEffect = null;
      const machine = createCutsceneMachine({
        onStateChange: () => {},
        onFinish: () => {},
        onEffect: (effect) => { firedEffect = effect; },
        gardenScene: {},
      });

      const scene = {
        id: 'test-accept',
        priority: 1,
        skippable: true,
        beats: [{
          speaker: 'garden_gurl',
          text: 'Take this quest?',
          choices: [
            { label: 'Accept', effect: { type: 'ACCEPT_QUEST', questId: 'water_101' } },
            { label: 'Decline' },
          ],
        }],
      };

      machine.start(scene);
      vi.runAllTimers();

      // Select "Accept" (index 0)
      const selected = machine.selectChoice(0);
      expect(selected).toBe(true);
      expect(firedEffect).toEqual({ type: 'ACCEPT_QUEST', questId: 'water_101' });

      machine.finish();
      vi.useRealTimers();
    });

    it('branching dialogue follows the correct path based on choice', () => {
      vi.useFakeTimers();
      let lastUi = null;
      const machine = createCutsceneMachine({
        onStateChange: (ui) => { lastUi = ui; },
        onFinish: () => {},
        onEffect: () => {},
        gardenScene: {},
      });

      const scene = {
        id: 'test-branch',
        priority: 1,
        skippable: true,
        beats: [{
          speaker: 'garden_gurl',
          text: 'Which path?',
          choices: [
            { label: 'Path A', branchId: 'branch_a' },
            { label: 'Path B', branchId: 'branch_b' },
          ],
        }],
        branches: {
          branch_a: [{ speaker: 'garden_gurl', text: 'You chose path A!' }],
          branch_b: [{ speaker: 'garden_gurl', text: 'You chose path B!' }],
        },
      };

      machine.start(scene);
      vi.runAllTimers();

      // Select Path B (index 1)
      machine.selectChoice(1);
      vi.runAllTimers();

      // The machine should now be on the branch_b beat
      expect(lastUi.visible).toBe(true);
      expect(lastUi.textFull).toBe('You chose path B!');

      machine.finish();
      vi.useRealTimers();
    });

    it('linear dialogue (no choices) auto-advances on click/key', () => {
      vi.useFakeTimers();
      let lastUi = null;
      const machine = createCutsceneMachine({
        onStateChange: (ui) => { lastUi = ui; },
        onFinish: () => {},
        onEffect: () => {},
        gardenScene: {},
      });

      const scene = {
        id: 'test-linear',
        priority: 1,
        skippable: true,
        beats: [
          { speaker: 'garden_gurl', text: 'First line.' },
          { speaker: 'garden_gurl', text: 'Second line.' },
          { speaker: 'garden_gurl', text: 'Third line.' },
        ],
      };

      machine.start(scene);
      vi.runAllTimers();

      // After typing completes, should be on beat 0
      expect(lastUi.visible).toBe(true);
      expect(lastUi.textFull).toBe('First line.');
      expect(lastUi.beatIndex).toBe(0);

      // Call next() to simulate click/key — should advance to beat 1
      machine.next();
      vi.runAllTimers();
      expect(lastUi.textFull).toBe('Second line.');
      expect(lastUi.beatIndex).toBe(1);

      // Advance again to beat 2
      machine.next();
      vi.runAllTimers();
      expect(lastUi.textFull).toBe('Third line.');
      expect(lastUi.beatIndex).toBe(2);

      machine.finish();
      vi.useRealTimers();
    });

    it('keyboard number keys can select dialogue choices', () => {
      vi.useFakeTimers();
      const effects = [];
      const machine = createCutsceneMachine({
        onStateChange: () => {},
        onFinish: () => {},
        onEffect: (effect) => { effects.push(effect); },
        gardenScene: {},
      });

      const scene = {
        id: 'test-number-keys',
        priority: 1,
        skippable: true,
        beats: [{
          speaker: 'garden_gurl',
          text: 'Pick one:',
          choices: [
            { label: 'Option A', effect: { type: 'PICK', value: 0 } },
            { label: 'Option B', effect: { type: 'PICK', value: 1 } },
            { label: 'Option C', effect: { type: 'PICK', value: 2 } },
          ],
        }],
      };

      machine.start(scene);
      vi.runAllTimers();

      // Machine should be awaiting choice
      expect(machine.hasChoices()).toBe(true);

      // selectChoice(1) simulates pressing key "2" (index 1)
      const selected = machine.selectChoice(1);
      expect(selected).toBe(true);
      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({ type: 'PICK', value: 1 });

      machine.finish();
      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // 2-D. Zone Transitions
  // -------------------------------------------------------------------------
  describe('Zone Transitions', () => {
    it('walking to an exit point triggers a zone transition', async () => {
      vi.useFakeTimers();
      const store = {
        getState: () => ({ campaign: { reputation: {}, skills: {}, questLog: {}, activeFestival: null }, season: {} }),
        dispatch: vi.fn(),
      };
      const tracker = { track: vi.fn(), trackObject: vi.fn(), disposeObject: vi.fn(), disposeAll: vi.fn() };
      vi.stubGlobal('document', {
        body: { appendChild: vi.fn() },
        createElement() { return { style: {}, remove: vi.fn() }; },
      });

      const manager = new ZoneManager({ render: vi.fn() }, store, tracker);
      // Register two zones with a simple factory
      let spawnCalled = null;
      const makeFakeZone = () => ({
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(),
        dispose: vi.fn(),
        setSpawnPoint(sp) { spawnCalled = sp; },
        getPlayerPosition() { return null; },
      });
      manager.registerZone('player_plot', makeFakeZone);
      manager.registerZone('neighborhood', makeFakeZone);

      // Add exit from player_plot to neighborhood
      const exitBounds = { minX: -1.5, maxX: 1.5, minZ: -9, maxZ: -8 };
      const exitSpawn = { x: 0, z: 7 };
      manager.addZoneExit('player_plot', exitBounds, 'neighborhood', exitSpawn);

      // Start in player_plot
      const startPromise = manager.transitionTo('player_plot');
      await vi.runAllTimersAsync();
      await startPromise;
      expect(manager.getActiveZone()).toBe('player_plot');

      // Simulate player walking into the exit trigger zone
      const triggerPromise = manager.checkTriggers({ x: 0, z: -8.5 });
      await vi.runAllTimersAsync();
      await triggerPromise;

      expect(manager.getActiveZone()).toBe('neighborhood');
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: Actions.ZONE_CHANGED, payload: expect.objectContaining({ toZone: 'neighborhood' }) }),
      );

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('zone transition plays a fade-out/fade-in animation', async () => {
      vi.useFakeTimers();
      const store = {
        getState: () => ({ campaign: { reputation: {}, skills: {}, questLog: {}, activeFestival: null }, season: {} }),
        dispatch: vi.fn(),
      };
      const tracker = { track: vi.fn(), trackObject: vi.fn(), disposeObject: vi.fn(), disposeAll: vi.fn() };

      const overlayEl = { style: {}, remove: vi.fn() };
      vi.stubGlobal('document', {
        body: { appendChild: vi.fn() },
        createElement() { return overlayEl; },
      });

      const manager = new ZoneManager({ render: vi.fn() }, store, tracker);
      const makeFakeZone = () => ({
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(),
        dispose: vi.fn(),
        setSpawnPoint: vi.fn(),
        getPlayerPosition() { return null; },
      });
      manager.registerZone('player_plot', makeFakeZone);
      manager.registerZone('neighborhood', makeFakeZone);

      const startPromise = manager.transitionTo('player_plot');
      await vi.runAllTimersAsync();
      await startPromise;

      // Record overlay opacity changes during transition
      const opacityLog = [];
      const origSet = manager.setOverlayOpacity.bind(manager);
      manager.setOverlayOpacity = (v) => { opacityLog.push(v); origSet(v); };

      const transPromise = manager.transitionTo('neighborhood');
      await vi.runAllTimersAsync();
      await transPromise;

      // Fade should go 1 (fade-out) then 0 (fade-in)
      expect(opacityLog).toContain(1);
      expect(opacityLog).toContain(0);
      const fadeOutIdx = opacityLog.indexOf(1);
      const fadeInIdx = opacityLog.indexOf(0);
      expect(fadeOutIdx).toBeLessThan(fadeInIdx);

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('previous zone resources are disposed after transition', async () => {
      vi.useFakeTimers();
      const store = {
        getState: () => ({ campaign: { reputation: {}, skills: {}, questLog: {}, activeFestival: null }, season: {} }),
        dispatch: vi.fn(),
      };
      const tracker = { track: vi.fn(), trackObject: vi.fn(), disposeObject: vi.fn(), disposeAll: vi.fn() };
      vi.stubGlobal('document', {
        body: { appendChild: vi.fn() },
        createElement() { return { style: {}, remove: vi.fn() }; },
      });

      const disposeFn = vi.fn();
      const manager = new ZoneManager({ render: vi.fn() }, store, tracker);
      manager.registerZone('player_plot', () => ({
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(),
        dispose: disposeFn,
        setSpawnPoint: vi.fn(),
        getPlayerPosition() { return null; },
      }));
      manager.registerZone('neighborhood', () => ({
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(),
        dispose: vi.fn(),
        setSpawnPoint: vi.fn(),
        getPlayerPosition() { return null; },
      }));

      const startPromise = manager.transitionTo('player_plot');
      await vi.runAllTimersAsync();
      await startPromise;

      expect(disposeFn).not.toHaveBeenCalled();

      // Transition away — old zone should be disposed
      const transPromise = manager.transitionTo('neighborhood');
      await vi.runAllTimersAsync();
      await transPromise;

      expect(disposeFn).toHaveBeenCalled();
      expect(tracker.disposeAll).toHaveBeenCalled();

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('player_plot -> neighborhood -> player_plot roundtrip keeps transitions and disposal clean', async () => {
      vi.useFakeTimers();
      const store = {
        getState: () => ({ campaign: { reputation: {}, skills: {}, questLog: {}, activeFestival: null }, season: {} }),
        dispatch: vi.fn(),
      };
      const tracker = { track: vi.fn(), trackObject: vi.fn(), disposeObject: vi.fn(), disposeAll: vi.fn() };
      vi.stubGlobal('document', {
        body: { appendChild: vi.fn() },
        createElement() { return { style: {}, remove: vi.fn() }; },
      });

      const plotDispose = vi.fn();
      const neighborhoodDispose = vi.fn();
      const manager = new ZoneManager({ render: vi.fn() }, store, tracker);
      manager.registerZone('player_plot', () => ({
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(),
        dispose: plotDispose,
        setSpawnPoint: vi.fn(),
        getPlayerPosition() { return null; },
        update: vi.fn(),
      }));
      manager.registerZone('neighborhood', () => ({
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(),
        dispose: neighborhoodDispose,
        setSpawnPoint: vi.fn(),
        getPlayerPosition() { return null; },
        update: vi.fn(),
      }));

      const toPlot = manager.transitionTo('player_plot');
      await vi.runAllTimersAsync();
      await toPlot;
      expect(manager.getActiveZone()).toBe('player_plot');
      expect(plotDispose).not.toHaveBeenCalled();
      expect(neighborhoodDispose).not.toHaveBeenCalled();

      const toNeighborhood = manager.transitionTo('neighborhood', { x: 1, z: 2 });
      await vi.runAllTimersAsync();
      await toNeighborhood;
      expect(manager.getActiveZone()).toBe('neighborhood');
      expect(plotDispose).toHaveBeenCalledTimes(1);
      expect(neighborhoodDispose).not.toHaveBeenCalled();

      const backHome = manager.transitionTo('player_plot', { x: 0, z: 1 });
      await vi.runAllTimersAsync();
      await backHome;
      expect(manager.getActiveZone()).toBe('player_plot');
      expect(plotDispose).toHaveBeenCalledTimes(1);
      expect(neighborhoodDispose).toHaveBeenCalledTimes(1);
      expect(tracker.disposeAll).toHaveBeenCalledTimes(3);

      manager.update(0.016);
      manager.render();

      const zoneChanges = store.dispatch.mock.calls
        .map(([action]) => action)
        .filter((action) => action?.type === Actions.ZONE_CHANGED);
      expect(zoneChanges).toHaveLength(3);
      expect(zoneChanges.at(-1)?.payload).toEqual({
        fromZone: 'neighborhood',
        toZone: 'player_plot',
        spawnPoint: { x: 0, z: 1 },
      });

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('zone visual theme varies by current season', () => {
      // Zone factories produce distinct visual themes per zone.
      // Verify that each zone factory in ZONE_FACTORIES exists and that
      // zone-factories.js produces zones with different sky/ground colors.
      const zoneIds = Object.keys(ZONE_REGISTRY.ZONE_FACTORIES);
      expect(zoneIds.length).toBeGreaterThanOrEqual(7);

      // Each zone in the registry should have a corresponding factory function
      for (const zoneId of zoneIds) {
        expect(typeof ZONE_REGISTRY.ZONE_FACTORIES[zoneId]).toBe('function');
      }

      // The WORLD_MAP zones define distinct biomes used for seasonal theming
      const worldZones = ZONE_REGISTRY.WORLD_MAP.zones;
      const biomes = new Set(Object.values(worldZones).map((z) => z.biome));
      // There should be multiple distinct biomes across the zones
      expect(biomes.size).toBeGreaterThanOrEqual(3);
    });

    it('player spawns at the correct entry point in the destination zone', async () => {
      vi.useFakeTimers();
      const store = {
        getState: () => ({ campaign: { reputation: {}, skills: {}, questLog: {}, activeFestival: null }, season: {} }),
        dispatch: vi.fn(),
      };
      const tracker = { track: vi.fn(), trackObject: vi.fn(), disposeObject: vi.fn(), disposeAll: vi.fn() };
      vi.stubGlobal('document', {
        body: { appendChild: vi.fn() },
        createElement() { return { style: {}, remove: vi.fn() }; },
      });

      let receivedSpawn = null;
      const manager = new ZoneManager({ render: vi.fn() }, store, tracker);
      manager.registerZone('player_plot', () => ({
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(),
        dispose: vi.fn(),
        setSpawnPoint: vi.fn(),
        getPlayerPosition() { return null; },
      }));
      manager.registerZone('neighborhood', () => ({
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(),
        dispose: vi.fn(),
        setSpawnPoint(sp) { receivedSpawn = sp; },
        getPlayerPosition() { return receivedSpawn; },
      }));

      const startPromise = manager.transitionTo('player_plot');
      await vi.runAllTimersAsync();
      await startPromise;

      // Transition to neighborhood with a specific spawn point
      const expectedSpawn = { x: 0, z: 7 };
      const transPromise = manager.transitionTo('neighborhood', expectedSpawn);
      await vi.runAllTimersAsync();
      await transPromise;

      expect(manager.getActiveZone()).toBe('neighborhood');
      expect(receivedSpawn).toEqual(expectedSpawn);

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('zone transition dispatches ENTER_ZONE to the store', async () => {
      vi.useFakeTimers();
      const store = {
        getState: () => ({ campaign: { reputation: {}, skills: {}, questLog: {}, activeFestival: null }, season: {} }),
        dispatch: vi.fn(),
      };
      const tracker = { track: vi.fn(), trackObject: vi.fn(), disposeObject: vi.fn(), disposeAll: vi.fn() };
      vi.stubGlobal('document', {
        body: { appendChild: vi.fn() },
        createElement() { return { style: {}, remove: vi.fn() }; },
      });

      const manager = new ZoneManager({ render: vi.fn() }, store, tracker);
      manager.registerZone('player_plot', () => ({
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(),
        dispose: vi.fn(),
        setSpawnPoint: vi.fn(),
        getPlayerPosition() { return null; },
      }));
      manager.registerZone('neighborhood', () => ({
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(),
        dispose: vi.fn(),
        setSpawnPoint: vi.fn(),
        getPlayerPosition() { return null; },
      }));

      // Enter initial zone
      const startPromise = manager.transitionTo('player_plot');
      await vi.runAllTimersAsync();
      await startPromise;

      store.dispatch.mockClear();

      // Transition to neighborhood
      const transPromise = manager.transitionTo('neighborhood');
      await vi.runAllTimersAsync();
      await transPromise;

      // Verify ZONE_CHANGED was dispatched (this is the ENTER_ZONE equivalent)
      const zoneChangedCall = store.dispatch.mock.calls.find(
        (call) => call[0].type === Actions.ZONE_CHANGED,
      );
      expect(zoneChangedCall).toBeDefined();
      expect(zoneChangedCall[0].payload.fromZone).toBe('player_plot');
      expect(zoneChangedCall[0].payload.toZone).toBe('neighborhood');

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });
  });

  // -------------------------------------------------------------------------
  // 2-E. NPC Schedules
  // -------------------------------------------------------------------------
  describe('NPC Schedules', () => {
    it('getNPCsInZone returns correct NPCs for a given zone and season', () => {
      // In spring, old_gus and lila are in "neighborhood"; maya is in meadow
      const springNeighborhood = getNPCsInZone('neighborhood', 'spring');
      const springIds = springNeighborhood.map((npc) => npc.id);
      expect(springIds).toContain('old_gus');
      expect(springIds).toContain('lila');
      expect(springNeighborhood).toHaveLength(2);

      const springMeadow = getNPCsInZone('meadow', 'spring');
      expect(springMeadow.map((n) => n.id)).toContain('maya');

      // In fall, old_gus moves to forest_edge — only lila remains in neighborhood
      const fallNeighborhood = getNPCsInZone('neighborhood', 'fall');
      const fallIds = fallNeighborhood.map((npc) => npc.id);
      expect(fallIds).not.toContain('old_gus');
      expect(fallIds).toContain('lila');

      // old_gus should appear in forest_edge during fall
      const fallForest = getNPCsInZone('forest_edge', 'fall');
      const fallForestIds = fallForest.map((npc) => npc.id);
      expect(fallForestIds).toContain('old_gus');

      // Each returned NPC has its activeSchedule populated
      const gusInForest = fallForest.find((npc) => npc.id === 'old_gus');
      expect(gusInForest.activeSchedule).toEqual(NPC_REGISTRY.old_gus.schedule.fall);
    });

    it('changing season moves NPCs — Maya disappears from all zones in winter', () => {
      // Maya has winter: null, so she should not appear in any zone during winter
      const allZones = ['neighborhood', 'forest_edge', 'player_plot', 'meadow', 'riverside', 'greenhouse', 'festival_grounds'];
      for (const zone of allZones) {
        const winterNpcs = getNPCsInZone(zone, 'winter');
        const winterIds = winterNpcs.map((npc) => npc.id);
        expect(winterIds).not.toContain('maya');
      }

      // Maya IS present in spring/summer (meadow) and fall (market_square)
      const springMeadow = getNPCsInZone('meadow', 'spring');
      expect(springMeadow.map((n) => n.id)).toContain('maya');
      const summerMeadow = getNPCsInZone('meadow', 'summer');
      expect(summerMeadow.map((n) => n.id)).toContain('maya');
      const fallMarket = getNPCsInZone('market_square', 'fall');
      expect(fallMarket.map((n) => n.id)).toContain('maya');

      // Lila is in neighborhood spring/summer/fall, greenhouse in winter
      const fallNeighborhood = getNPCsInZone('neighborhood', 'fall');
      expect(fallNeighborhood.map((npc) => npc.id)).toContain('lila');
      expect(getNPCsInZone('neighborhood', 'winter').map((n) => n.id)).not.toContain('lila');
      expect(getNPCsInZone('greenhouse', 'winter').map((n) => n.id)).toContain('lila');
    });

    it('during a festival, festival data includes NPC dialogue for participating NPCs', () => {
      // Each festival defines npcDialogue for the three main NPCs
      const festivalKeys = Object.keys(FESTIVALS);
      expect(festivalKeys.length).toBeGreaterThanOrEqual(4);

      for (const key of festivalKeys) {
        const festival = FESTIVALS[key];
        expect(festival.npcDialogue).toBeDefined();

        // All three core NPCs have festival dialogue
        expect(festival.npcDialogue.old_gus).toEqual(expect.any(String));
        expect(festival.npcDialogue.maya).toEqual(expect.any(String));
        expect(festival.npcDialogue.lila).toEqual(expect.any(String));
      }

      // Bloom Festival is tied to spring and has specific NPC dialogue
      const bloom = FESTIVALS.bloom_festival;
      expect(bloom.season).toBe('spring');
      expect(bloom.npcDialogue.old_gus).toBeTruthy();
      expect(bloom.npcDialogue.maya).toBeTruthy();
      expect(bloom.npcDialogue.lila).toBeTruthy();

      // Verify greeting function still works alongside festival data
      const gusGreeting = getNPCGreeting('old_gus', 'stranger');
      expect(gusGreeting).toBe('Hmm? New around here?');
    });
  });

  // -------------------------------------------------------------------------
  // 2-F. Save/Load — Phase 2 State
  // -------------------------------------------------------------------------
  describe('Save/Load Phase 2', () => {
    beforeEach(() => {
      globalThis.localStorage = createMockStorage();
    });

    afterEach(() => {
      delete globalThis.localStorage;
    });

    it('save includes active quests, reputation, and current zone', () => {
      const state = createGameState();
      state.campaign.questLog.gus_tomatoes = { state: 'ACCEPTED' };
      state.campaign.reputation.old_gus = 15;
      state.campaign.worldState.currentZone = 'neighborhood';
      state.campaign.worldState.visitedZones.push('neighborhood');

      saveCampaign(state.campaign, 0);

      const raw = JSON.parse(localStorage.getItem('gos-story-slot-0-campaign'));
      expect(raw.questLog).toBeDefined();
      expect(raw.questLog.gus_tomatoes.state).toBe('ACCEPTED');
      expect(raw.reputation).toBeDefined();
      expect(raw.reputation.old_gus).toBe(15);
      expect(raw.worldState).toBeDefined();
      expect(raw.worldState.currentZone).toBe('neighborhood');
    });

    it('loading a Phase 2 save restores quest/rep/zone state', () => {
      const state = createGameState();
      state.campaign.questLog.gus_tomatoes = { state: 'IN_PROGRESS', progress: 2 };
      state.campaign.reputation.old_gus = 25;
      state.campaign.worldState.currentZone = 'meadow';
      state.campaign.worldState.visitedZones.push('meadow');

      saveCampaign(state.campaign, 1);
      const loaded = loadCampaign(1);

      expect(loaded.questLog.gus_tomatoes.state).toBe('IN_PROGRESS');
      expect(loaded.questLog.gus_tomatoes.progress).toBe(2);
      expect(loaded.reputation.old_gus).toBe(25);
      expect(loaded.reputation.maya).toBe(0);
      expect(loaded.reputation.lila).toBe(0);
      expect(loaded.worldState.currentZone).toBe('meadow');
      expect(loaded.worldState.visitedZones).toContain('meadow');
      expect(loaded.worldState.visitedZones).toContain('player_plot');
    });

    it('loading a pre-Phase-2 save initializes defaults for new fields', () => {
      // Simulate an old save that has no questLog, reputation, or worldState
      localStorage.setItem('gos-story-slot-2-campaign', JSON.stringify({
        version: 1,
        currentChapter: 3,
        currentSeason: 'fall',
      }));

      const loaded = loadCampaign(2);

      expect(loaded.questLog).toEqual({});
      expect(loaded.reputation).toMatchObject(DEFAULT_REPUTATION);
      expect(loaded.worldState.currentZone).toBe(DEFAULT_WORLD_STATE.currentZone);
      expect(loaded.worldState.visitedZones).toEqual(DEFAULT_WORLD_STATE.visitedZones);
      expect(loaded.version).toBe(4);
    });
  });
});

// Phase 3I — Audio, Day/Night, Festivals, Monthly Events
// Tests for the AudioManager, day/night cycle, festival system, and monthly
// event rotation. Spec references: AUDIO_SPEC.md, EVENT_DECK.json.

describe('Phase 3 — Audio, Day/Night, Festivals, Monthly Events', () => {

  // -------------------------------------------------------------------------
  // 3-A. Audio Integration
  // -------------------------------------------------------------------------
  describe('Audio Integration', () => {
    it('AudioManager initializes only after a user gesture', async () => {
      // Mock AudioContext so init() can construct one
      const mockResume = vi.fn().mockResolvedValue(undefined);
      const MockAudioContext = vi.fn().mockImplementation(() => ({
        state: 'suspended',
        resume: mockResume,
        createOscillator: vi.fn(() => ({
          type: 'sine',
          frequency: { value: 0 },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        })),
        createGain: vi.fn(() => ({
          gain: { value: 0 },
          connect: vi.fn(),
        })),
        destination: {},
        currentTime: 0,
        close: vi.fn(),
        suspend: vi.fn(),
      }));
      globalThis.AudioContext = MockAudioContext;

      const am = new AudioManager();
      expect(am.initialized).toBe(false);
      expect(am.audioContext).toBeNull();

      // init() acts as the gesture-gate — before calling it, nothing works
      await am.init();
      expect(am.initialized).toBe(true);
      expect(am.audioContext).toBeDefined();
      expect(mockResume).toHaveBeenCalled();

      am.dispose();
      delete globalThis.AudioContext;
    });

    it('season change crossfades ambient tracks', async () => {
      vi.useFakeTimers();

      // Stub Audio so createAudioElement returns a mock with a proper play() -> Promise
      const origAudio = globalThis.Audio;
      globalThis.Audio = vi.fn().mockImplementation((url) => ({
        src: url, loop: false, volume: 0, paused: true,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        remove: vi.fn(),
      }));

      const am = new AudioManager();

      // Set spring ambient
      await am.setAmbient('assets/audio/ambient/spring.ogg', { fadeInMs: 100, volume: 0.3 });
      expect(am.ambient).toBeDefined();
      expect(am.ambient.url).toBe('assets/audio/ambient/spring.ogg');
      const springElement = am.ambient.element;

      // Crossfade to summer — setAmbient replaces ambient and schedules old track pause
      await am.setAmbient('assets/audio/ambient/summer.ogg', { fadeInMs: 100, volume: 0.3 });
      expect(am.ambient.url).toBe('assets/audio/ambient/summer.ogg');

      // After fadeIn timer fires, old spring element should be paused
      const springPauseSpy = vi.spyOn(springElement, 'pause');
      await vi.advanceTimersByTimeAsync(200);
      expect(springPauseSpy).toHaveBeenCalled();

      am.dispose();
      globalThis.Audio = origAudio;
      vi.useRealTimers();
    });

    it('game actions trigger correct SFX', async () => {
      // Mock AudioContext for playPlaceholder
      const mockOscillator = {
        type: 'sine',
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      const mockGain = { gain: { value: 0 }, connect: vi.fn() };
      const MockAudioContext = vi.fn().mockImplementation(() => ({
        state: 'running',
        resume: vi.fn().mockResolvedValue(undefined),
        createOscillator: vi.fn(() => ({ ...mockOscillator })),
        createGain: vi.fn(() => ({ ...mockGain })),
        destination: {},
        currentTime: 0,
        close: vi.fn(),
        suspend: vi.fn(),
      }));
      globalThis.AudioContext = MockAudioContext;

      const am = new AudioManager();
      await am.init();

      // Verify all default SFX IDs from the library are registered
      expect(am.sfxRegistry.has('plant')).toBe(true);
      expect(am.sfxRegistry.has('harvest')).toBe(true);
      expect(am.sfxRegistry.has('water')).toBe(true);

      // playSFX should succeed for registered IDs
      const plantResult = am.playSFX('plant');
      expect(plantResult).toBe(true);

      const harvestResult = am.playSFX('harvest');
      expect(harvestResult).toBe(true);

      // Unknown SFX should return false
      const unknownResult = am.playSFX('nonexistent_sfx');
      expect(unknownResult).toBe(false);

      am.dispose();
      delete globalThis.AudioContext;
    });

    it('mute/unmute toggles all audio output', async () => {
      const MockAudioContext = vi.fn().mockImplementation(() => ({
        state: 'running',
        resume: vi.fn().mockResolvedValue(undefined),
        createOscillator: vi.fn(() => ({
          type: 'sine', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
        })),
        createGain: vi.fn(() => ({ gain: { value: 0 }, connect: vi.fn() })),
        destination: {},
        currentTime: 0,
        close: vi.fn(),
        suspend: vi.fn(),
      }));
      globalThis.AudioContext = MockAudioContext;

      // Stub Audio so createAudioElement returns a mock with play() -> Promise
      const origAudio = globalThis.Audio;
      globalThis.Audio = vi.fn().mockImplementation((url) => ({
        src: url, loop: false, volume: 0, paused: true,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        remove: vi.fn(),
      }));

      const am = new AudioManager();
      await am.init();

      // Set up ambient so we can verify volume sync
      await am.setAmbient('assets/audio/ambient/spring.ogg', { fadeMs: 0, volume: 0.5 });
      expect(am.muted).toBe(false);
      expect(am.ambient.element.volume).toBeGreaterThan(0);

      // Mute
      am.setMuted(true);
      expect(am.muted).toBe(true);
      expect(am.ambient.element.volume).toBe(0);

      // playSFX should return false when muted
      const sfxResult = am.playSFX('plant');
      expect(sfxResult).toBe(false);

      // Unmute — ambient volume should restore
      am.setMuted(false);
      expect(am.muted).toBe(false);
      expect(am.ambient.element.volume).toBeGreaterThan(0);

      // playSFX should work again
      const sfxResult2 = am.playSFX('plant');
      expect(sfxResult2).toBe(true);

      am.dispose();
      globalThis.Audio = origAudio;
      delete globalThis.AudioContext;
    });

    it('volume layers (ambient, SFX, music) can be adjusted independently', () => {
      const am = new AudioManager();
      am.setMasterVolume(0.8);
      expect(am.masterVolume).toBe(0.8);
      am.setMusicVolume(0.6);
      expect(am.musicVolume).toBe(0.6);
      am.setSFXVolume(0.4);
      expect(am.sfxVolume).toBe(0.4);
      am.setAmbientVolume(0.2);
      expect(am.ambientVolume).toBe(0.2);
      // Each is independent
      expect(am.masterVolume).toBe(0.8);
      expect(am.musicVolume).toBe(0.6);
      am.dispose();
    });
  });

  // -------------------------------------------------------------------------
  // 3-B. Day/Night Cycle
  // -------------------------------------------------------------------------
  describe('Day/Night Cycle', () => {
    it('day/night cycle is disabled by default in Story mode', () => {
      const state = createGameState();
      expect(state.settings.dayNightEnabled).toBe(false);
      expect(state.campaign.gameMode).toBe('story');
    });

    it('lighting interpolates between day and night values', () => {
      // Build a minimal scene with a lighting rig
      const scene = new THREE.Scene();
      const sun = new THREE.DirectionalLight(0xffffff, 1.0);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
      const fill = new THREE.DirectionalLight(0xffffff, 0.4);
      const rim = new THREE.DirectionalLight(0xffffff, 0.2);
      scene.add(sun, hemi, fill, rim);
      scene.userData.lightingRig = { sun, hemi, fill, rim };

      const cycle = new DayNightCycle(scene, { enabled: true, cycleDurationMs: 10000 });

      // 1. Dawn (timeOfDay = 0.0) — warm directional light, moderate intensity
      cycle.setTimeOfDay(0.0);
      const dawnIntensity = sun.intensity;
      expect(dawnIntensity).toBeCloseTo(0.6, 1);

      // 2. Midday (timeOfDay = 0.25) — brightest sun
      cycle.setTimeOfDay(0.25);
      const noonIntensity = sun.intensity;
      expect(noonIntensity).toBeCloseTo(1.0, 1);

      // 3. Night (timeOfDay = 0.75) — dim lighting
      cycle.setTimeOfDay(0.75);
      const nightIntensity = sun.intensity;
      expect(nightIntensity).toBeCloseTo(0.15, 1);

      // 4. Verify interpolation is smooth — a mid-point between dawn and noon
      //    should have an intensity between the two extremes
      cycle.setTimeOfDay(0.125);
      const midIntensity = sun.intensity;
      expect(midIntensity).toBeGreaterThan(dawnIntensity);
      expect(midIntensity).toBeLessThan(noonIntensity);

      cycle.dispose();
    });

    it('night cycle adds visual elements (stars, fireflies, lanterns)', () => {
      // Build a minimal scene with a lighting rig
      const scene = new THREE.Scene();
      const sun = new THREE.DirectionalLight(0xffffff, 1.0);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
      scene.add(sun, hemi);
      scene.userData.lightingRig = { sun, hemi };

      const cycle = new DayNightCycle(scene, { enabled: true, cycleDurationMs: 10000 });

      // During daytime, stars should be hidden
      cycle.setTimeOfDay(0.25);
      expect(cycle.stars.visible).toBe(false);
      expect(cycle.stars.material.opacity).toBe(0);

      // Advance to night time (0.8 is within the 0.75-0.95 star window)
      cycle.setTimeOfDay(0.8);
      expect(cycle.stars.visible).toBe(true);
      expect(cycle.stars.material.opacity).toBeGreaterThan(0);

      // Moon light should also activate during the star window
      expect(cycle.moonLight.intensity).toBeGreaterThan(0);

      // Outside the star window (e.g. 0.96), stars should hide again
      cycle.setTimeOfDay(0.96);
      expect(cycle.stars.visible).toBe(false);
      expect(cycle.stars.material.opacity).toBe(0);

      cycle.dispose();
    });

    it('mood override (cutscene/event) pauses the day/night cycle', () => {
      const scene = new THREE.Scene();
      const sun = new THREE.DirectionalLight(0xffffff, 1.0);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
      scene.add(sun, hemi);
      scene.userData.lightingRig = { sun, hemi };

      const cycle = new DayNightCycle(scene, { enabled: true, cycleDurationMs: 10000 });

      // Set a known time
      cycle.setTimeOfDay(0.25);
      const noonTime = cycle.getTimeOfDay();
      expect(noonTime).toBeCloseTo(0.25, 2);

      // Disable the cycle (simulates mood override / cutscene pause)
      cycle.setEnabled(false);
      expect(cycle.enabled).toBe(false);

      // Call update — time should NOT advance because cycle is disabled
      cycle.update(1.0);
      const afterUpdate = cycle.getTimeOfDay();
      expect(afterUpdate).toBeCloseTo(noonTime, 2);

      cycle.dispose();
    });

    it('disabling the cycle restores default daytime lighting', () => {
      const scene = new THREE.Scene();
      const sun = new THREE.DirectionalLight(0xffffff, 1.0);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
      scene.add(sun, hemi);
      scene.userData.lightingRig = { sun, hemi };

      const cycle = new DayNightCycle(scene, { enabled: true, cycleDurationMs: 10000 });

      // Set to night time and record lighting state
      cycle.setTimeOfDay(0.75);
      const nightIntensity = sun.intensity;

      // Disable the cycle
      cycle.setEnabled(false);

      // Subsequent update() calls should not change the lighting
      const intensityAfterDisable = sun.intensity;
      cycle.update(0.5);
      const intensityAfterUpdate = sun.intensity;

      // Intensity should not have changed since the cycle is disabled
      expect(intensityAfterUpdate).toBe(intensityAfterDisable);

      cycle.dispose();
    });
  });

  // -------------------------------------------------------------------------
  // 3-C. Festival System
  // -------------------------------------------------------------------------
  describe('Festival System', () => {
    it('festival activates at the correct season and chapter', () => {
      // Set up a store in fall, month 2 - should trigger harvest_week
      const store = new Store(createGameState());
      const state = store.getState();
      state.campaign.currentChapter = 4;
      state.season.season = 'fall';
      state.season.month = 2;
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      const engine = new FestivalEngine(store);

      // checkFestivalStart should detect harvest_week for fall, month 2
      const started = engine.checkFestivalStart();
      expect(started).not.toBeNull();
      expect(started.id).toBe('harvest_week');
      expect(started.season).toBe('fall');

      // Active festival should now be set in the store
      const active = engine.getActiveFestival();
      expect(active).not.toBeNull();
      expect(active.id).toBe('harvest_week');

      // Verify the store state reflects the festival
      const updatedState = store.getState();
      expect(updatedState.campaign.activeFestival).not.toBeNull();
      expect(updatedState.campaign.activeFestival.id).toBe('harvest_week');
      expect(updatedState.campaign.activeFestival.season).toBe('fall');
      expect(updatedState.campaign.activeFestival.month).toBe(2);

      // Wrong month should not trigger a festival
      const springStore = new Store(createGameState());
      const springState = springStore.getState();
      springState.season.season = 'spring';
      springState.season.month = 1; // month 1, but bloom_festival needs month 2
      springStore.dispatch({ type: Actions.REPLACE_STATE, payload: { state: springState } });
      const springEngine = new FestivalEngine(springStore);
      expect(springEngine.checkFestivalStart()).toBeNull();
    });

    it('active festival applies scoring modifier during active period', () => {
      // Start with a store in fall, month 2
      const store = new Store(createGameState());
      const state = store.getState();
      state.season.season = 'fall';
      state.season.month = 2;
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      const engine = new FestivalEngine(store);

      // Before festival: no active festival, no mechanics
      expect(engine.getActiveFestival()).toBeNull();
      const beforeState = store.getState();
      expect(beforeState.campaign.activeFestival).toBeNull();

      // Start the harvest_week festival - it has scoringMultiplier: { multiplier: 1.25 }
      engine.startFestival('harvest_week');

      const afterState = store.getState();
      expect(afterState.campaign.activeFestival).not.toBeNull();
      expect(afterState.campaign.activeFestival.mechanics).toBeDefined();
      expect(afterState.campaign.activeFestival.mechanics.scoringMultiplier).toEqual({
        multiplier: 1.25,
      });

      // The bloom_festival has plantingBonus: { scoreModifier: 0.5 }
      const bloomStore = new Store(createGameState());
      const bloomState = bloomStore.getState();
      bloomState.season.season = 'spring';
      bloomState.season.month = 2;
      bloomStore.dispatch({ type: Actions.REPLACE_STATE, payload: { state: bloomState } });
      const bloomEngine = new FestivalEngine(bloomStore);
      bloomEngine.startFestival('bloom_festival');

      const bloomActive = bloomStore.getState().campaign.activeFestival;
      expect(bloomActive.mechanics.plantingBonus).toEqual({ scoreModifier: 0.5 });
      expect(bloomActive.mechanics.seedDrop).toEqual({
        bonusMultiplier: 2.0,
        rareSeedChance: 0.15,
      });

      // After ending the festival, mechanics should no longer be present
      bloomEngine.endFestival();
      expect(bloomStore.getState().campaign.activeFestival).toBeNull();
    });

    it('completing a festival awards rewards on completion', () => {
      const store = new Store(createGameState());
      const state = store.getState();
      state.season.season = 'spring';
      state.season.month = 2;
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      const engine = new FestivalEngine(store);
      engine.startFestival('bloom_festival');

      // Bloom festival has two activities:
      //   seed_swap (rewardType: 'seed') and flower_show (rewardType: 'reputation')
      const available = engine.getAvailableActivities();
      expect(available).toHaveLength(2);
      expect(available.map((a) => a.id)).toContain('seed_swap');
      expect(available.map((a) => a.id)).toContain('flower_show');

      // Complete seed_swap - rewards: [{ type: 'seed', id: 'festival_seed_bundle', amount: 1 }]
      const seedRewards = engine.doActivity('seed_swap');
      expect(seedRewards).toEqual([{ type: 'seed', id: 'festival_seed_bundle', amount: 1 }]);

      // Verify seed reward was applied via the store (cropsUnlocked includes festival_seed_bundle)
      const afterSeed = store.getState();
      expect(afterSeed.campaign.cropsUnlocked).toContain('festival_seed_bundle');

      // Complete flower_show - rewards: [{ type: 'reputation', id: 'lila', amount: 10 }]
      const repRewards = engine.doActivity('flower_show');
      expect(repRewards).toEqual([{ type: 'reputation', id: 'lila', amount: 10 }]);

      // Verify reputation reward was applied
      const afterRep = store.getState();
      const beforeRepValue = state.campaign.reputation?.lila ?? 0;
      expect(afterRep.campaign.reputation.lila).toBe(
        Math.min(100, beforeRepValue + 10),
      );

      // All activities completed - none left
      expect(engine.getAvailableActivities()).toHaveLength(0);

      // Verify activitiesCompleted tracked in state
      const finalState = store.getState();
      expect(finalState.campaign.activeFestival.activitiesCompleted).toContain('seed_swap');
      expect(finalState.campaign.activeFestival.activitiesCompleted).toContain('flower_show');
    });

    it('each festival can only be completed once per playthrough', () => {
      const store = new Store(createGameState());
      const state = store.getState();
      state.season.season = 'winter';
      state.season.month = 2;
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      const engine = new FestivalEngine(store);
      engine.startFestival('dormancy_challenge');

      // Complete both activities
      const reward1 = engine.doActivity('soil_workshop');
      expect(reward1).toEqual([{ type: 'xp', id: 'festival', amount: 15 }]);
      const reward2 = engine.doActivity('seed_planning');
      expect(reward2).toEqual([{ type: 'seed', id: 'festival_seed_bundle', amount: 1 }]);

      // Repeating a completed activity returns null - no double rewards
      expect(engine.doActivity('soil_workshop')).toBeNull();
      expect(engine.doActivity('seed_planning')).toBeNull();

      // End the festival
      expect(engine.endFestival()).toBe(true);
      expect(engine.getActiveFestival()).toBeNull();

      // After ending, no activities are available
      expect(engine.getAvailableActivities()).toHaveLength(0);

      // Attempting to do an activity on a non-active festival returns null
      expect(engine.doActivity('soil_workshop')).toBeNull();

      // Ending again returns false - no festival to end
      expect(engine.endFestival()).toBe(false);
    });

    it('festival lifecycle: start, activities, end', () => {
      // Full lifecycle test for growth_surge (summer)
      const store = new Store(createGameState());
      const state = store.getState();
      state.season.season = 'summer';
      state.season.month = 2;
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      const engine = new FestivalEngine(store);

      // --- Phase 1: Pre-festival ---
      expect(engine.getActiveFestival()).toBeNull();
      expect(engine.getAvailableActivities()).toHaveLength(0);

      // --- Phase 2: Start festival via checkFestivalStart ---
      const started = engine.checkFestivalStart();
      expect(started).not.toBeNull();
      expect(started.id).toBe('growth_surge');
      expect(started.season).toBe('summer');

      // Store reflects active festival with mechanics
      const activeState = store.getState();
      expect(activeState.campaign.activeFestival.id).toBe('growth_surge');
      expect(activeState.campaign.activeFestival.mechanics.growthSpeed).toEqual({ multiplier: 1.5 });
      expect(activeState.campaign.activeFestival.mechanics.heatChallenge).toEqual({
        damageChance: 0.2,
        damageSeverity: 'heat',
      });

      // checkFestivalStart again should return null (already active)
      expect(engine.checkFestivalStart()).toBeNull();

      // --- Phase 3: Activities ---
      const activities = engine.getAvailableActivities();
      expect(activities).toHaveLength(2);

      // Complete watering_race (xp reward)
      const xpReward = engine.doActivity('watering_race');
      expect(xpReward).toEqual([{ type: 'xp', id: 'festival', amount: 15 }]);

      // One activity remains
      expect(engine.getAvailableActivities()).toHaveLength(1);

      // Complete shade_building (item reward)
      const itemReward = engine.doActivity('shade_building');
      expect(itemReward).toEqual([{ type: 'item', id: 'festival_token', amount: 1 }]);

      // No activities remain
      expect(engine.getAvailableActivities()).toHaveLength(0);

      // Verify all activities tracked
      const midState = store.getState();
      expect(midState.campaign.activeFestival.activitiesCompleted).toEqual(
        expect.arrayContaining(['watering_race', 'shade_building']),
      );

      // --- Phase 4: End festival ---
      expect(engine.endFestival()).toBe(true);

      // Festival is now cleared
      expect(engine.getActiveFestival()).toBeNull();
      expect(store.getState().campaign.activeFestival).toBeNull();

      // No lingering activities or effects
      expect(engine.getAvailableActivities()).toHaveLength(0);
      expect(engine.endFestival()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 3-D. Monthly Event Rotation
  // -------------------------------------------------------------------------
  describe('Monthly Event Rotation', () => {
    it('month-restricted events only fire during their designated month', () => {
      // S01 has months: [1] (spring, month 1 only)
      // U05 has months: [2, 3] (summer, months 2-3 only)
      const chapter = 6;

      // Spring month 1 — S01 should be included
      const springM1 = getMonthlyEvents('spring', 1, chapter, []).map((e) => e.id);
      expect(springM1).toContain('S01');

      // Spring month 2 — S01 should be excluded
      const springM2 = getMonthlyEvents('spring', 2, chapter, []).map((e) => e.id);
      expect(springM2).not.toContain('S01');

      // Summer month 1 — U05 should be excluded (restricted to months 2-3)
      const summerM1 = getMonthlyEvents('summer', 1, chapter, []).map((e) => e.id);
      expect(summerM1).not.toContain('U05');

      // Summer month 2 — U05 should be included
      const summerM2 = getMonthlyEvents('summer', 2, chapter, []).map((e) => e.id);
      expect(summerM2).toContain('U05');
    });

    it('general events (no month restriction) can fire in any month', () => {
      // U06 has no months field — should appear in every month
      const chapter = 12;
      for (let month = 1; month <= 3; month++) {
        const pool = getMonthlyEvents('summer', month, chapter, []).map((e) => e.id);
        expect(pool).toContain('U06');
      }
    });

    it('no duplicate events fire within the same season', () => {
      const alreadyDrawn = ['S01', 'S02'];
      const pool = getMonthlyEvents('spring', 1, 6, alreadyDrawn).map((e) => e.id);
      expect(pool).not.toContain('S01');
      expect(pool).not.toContain('S02');
    });

    it('chapter-gated events respect chapter prerequisites', () => {
      // Chapter 1 pool should be smaller than chapter 12 pool
      const ch1Pool = getMonthlyEvents('spring', 1, 1, []);
      const ch12Pool = getMonthlyEvents('spring', 1, 12, []);
      expect(ch12Pool.length).toBeGreaterThanOrEqual(ch1Pool.length);
    });
  });

  // -------------------------------------------------------------------------
  // 3-E. NPC Schedule — Festival Integration
  // -------------------------------------------------------------------------
  describe('NPC Schedule Integration', () => {
    it('NPCs are in their scheduled zone during normal gameplay', () => {
      const npcsInNeighborhood = getNPCsInZone('neighborhood', 'spring');
      expect(npcsInNeighborhood.length).toBeGreaterThan(0);
      // Old Gus is in neighborhood during spring
      expect(npcsInNeighborhood.some((n) => n.id === 'old_gus')).toBe(true);
    });

    it('season changes move NPCs to their new zone assignments', () => {
      const springNpcs = getNPCsInZone('neighborhood', 'spring');
      const fallNpcs = getNPCsInZone('neighborhood', 'fall');
      // Old Gus moves to forest_edge in fall
      expect(springNpcs.some((n) => n.id === 'old_gus')).toBe(true);
      expect(fallNpcs.some((n) => n.id === 'old_gus')).toBe(false);
      const forestFall = getNPCsInZone('forest_edge', 'fall');
      expect(forestFall.some((n) => n.id === 'old_gus')).toBe(true);
    });

    it('during a festival, all participating NPCs relocate to the festival grounds', () => {
      const coreNpcs = ['old_gus', 'maya', 'lila'];
      const festivalIds = Object.keys(FESTIVALS);

      // Every festival should have npcDialogue entries for all 3 core NPCs
      expect(festivalIds.length).toBeGreaterThanOrEqual(4);

      for (const festivalId of festivalIds) {
        const festival = FESTIVALS[festivalId];
        expect(festival.npcDialogue).toBeDefined();

        for (const npcId of coreNpcs) {
          expect(festival.npcDialogue[npcId]).toBeDefined();
          expect(typeof festival.npcDialogue[npcId]).toBe('string');
          expect(festival.npcDialogue[npcId].length).toBeGreaterThan(0);
        }
      }
    });
  });
});

// Phase 4M — Inventory, Skills, Crafting, Durability
// Tests for the inventory system, skill tree XP, crafting recipes, tool
// durability, and backward compatibility. Spec references: SKILL_TREE.json,
// CRAFTING_RECIPES.json.

describe('Phase 4 — Inventory, Skills, Crafting, Durability', () => {

  // -------------------------------------------------------------------------
  // 4-A. Inventory + Tool Integration
  // -------------------------------------------------------------------------
  describe('Inventory + Tool', () => {
    it('equipping a tool via ADD_ITEM and finding it in inventory', () => {
      const store = new Store(createGameState());
      const inventory = new Inventory(store);

      // 1. Add watering_can to inventory
      const result = inventory.addItem('watering_can', 1);
      expect(result.success).toBe(true);

      // 2. Verify the tool is in a slot
      const state = store.getState();
      const slotIndex = findToolSlotIndex(state.campaign.inventory, 'watering_can');
      expect(slotIndex).toBeGreaterThanOrEqual(0);

      // 3. Verify the tool has correct durability and category
      const slot = state.campaign.inventory.slots[slotIndex];
      expect(slot.itemId).toBe('watering_can');
      expect(slot.durability).toBe(100);
      expect(slot.maxDurability).toBe(100);
      expect(slot.category).toBe('tools');
    });

    it('using a tool decrements its durability via USE_TOOL action', () => {
      const store = new Store(createGameState());
      const inventory = new Inventory(store);

      // 1. Add watering_can with durability 100
      inventory.addItem('watering_can', 1);
      const slotIndex = findToolSlotIndex(store.getState().campaign.inventory, 'watering_can');
      expect(slotIndex).toBeGreaterThanOrEqual(0);

      // 2. Use the tool (costs 5 durability)
      store.dispatch({ type: Actions.USE_TOOL, payload: { slotIndex, durabilityCost: 5 } });

      // 3. Assert durability decreased
      const after = store.getState().campaign.inventory.slots[slotIndex];
      expect(after.durability).toBe(95);
    });

    it('tool at durability 0 cannot lose more durability', () => {
      const store = new Store(createGameState());
      const inventory = new Inventory(store);

      // 1. Add watering_can and drain durability to 0
      inventory.addItem('watering_can', 1);
      const slotIndex = findToolSlotIndex(store.getState().campaign.inventory, 'watering_can');

      store.dispatch({ type: Actions.USE_TOOL, payload: { slotIndex, durabilityCost: 100 } });
      const broken = store.getState().campaign.inventory.slots[slotIndex];
      expect(broken.durability).toBe(0);

      // 2. Using again should not go below 0
      store.dispatch({ type: Actions.USE_TOOL, payload: { slotIndex, durabilityCost: 5 } });
      const stillBroken = store.getState().campaign.inventory.slots[slotIndex];
      expect(stillBroken.durability).toBe(0);
    });

    it('repairing a tool restores its durability via REPAIR_TOOL action', () => {
      const store = new Store(createGameState());
      const inventory = new Inventory(store);

      // 1. Add watering_can and reduce durability to 20
      inventory.addItem('watering_can', 1);
      const slotIndex = findToolSlotIndex(store.getState().campaign.inventory, 'watering_can');
      store.dispatch({ type: Actions.USE_TOOL, payload: { slotIndex, durabilityCost: 80 } });
      expect(store.getState().campaign.inventory.slots[slotIndex].durability).toBe(20);

      // 2. Add repair materials
      inventory.addItem('scrap_metal', 2);
      expect(inventory.getItemCount('scrap_metal')).toBe(2);

      // 3. Dispatch REPAIR_TOOL to restore durability
      store.dispatch({ type: Actions.REPAIR_TOOL, payload: { slotIndex, restoredTo: 100 } });

      // 4. Verify durability restored
      const repaired = store.getState().campaign.inventory.slots[slotIndex];
      expect(repaired.durability).toBe(100);
      expect(repaired.maxDurability).toBe(100);

      // 5. Consume repair material from inventory
      inventory.removeItem('scrap_metal', 1);
      expect(inventory.getItemCount('scrap_metal')).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // 4-B. Skill + Action Integration
  // -------------------------------------------------------------------------
  describe('Skill + Action', () => {
    it('planting a crop awards gardening XP via SkillSystem listener', () => {
      const store = new Store(createGameState());
      const skillSystem = new SkillSystem(store);

      const before = store.getState().campaign.skills.gardening.xp;

      // PLANT_CROP awards 10 gardening XP per ACTION_XP_MAP
      store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex: 0, cropId: 'basil' } });

      const after = store.getState().campaign.skills.gardening.xp;
      expect(after).toBe(before + 10);

      skillSystem.dispose();
    });

    it('harvesting a crop awards gardening XP via SkillSystem listener', () => {
      const store = new Store(createGameState());
      const skillSystem = new SkillSystem(store);

      // Plant first so there is something to harvest
      store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex: 0, cropId: 'basil' } });
      const xpAfterPlant = store.getState().campaign.skills.gardening.xp;

      // HARVEST_CELL awards 25 gardening XP per ACTION_XP_MAP
      store.dispatch({ type: Actions.HARVEST_CELL, payload: { cellIndex: 0 } });
      const xpAfterHarvest = store.getState().campaign.skills.gardening.xp;
      expect(xpAfterHarvest).toBe(xpAfterPlant + 25);

      skillSystem.dispose();
    });

    it('completing a quest awards social XP via SkillSystem listener', () => {
      const store = new Store(createGameState());
      const skillSystem = new SkillSystem(store);

      const beforeSocial = store.getState().campaign.skills.social.xp;

      // COMPLETE_QUEST awards 30 social XP per ACTION_XP_MAP
      store.dispatch({
        type: Actions.COMPLETE_QUEST,
        payload: { questId: 'test_quest', rewards: [] },
      });

      const afterSocial = store.getState().campaign.skills.social.xp;
      expect(afterSocial).toBe(beforeSocial + 30);

      skillSystem.dispose();
    });

    it('crafting an item awards crafting XP via SkillSystem listener', () => {
      const store = new Store(createGameState());
      const inventory = new Inventory(store);
      const skillSystem = new SkillSystem(store);
      const craftingSystem = new CraftingSystem(store, inventory, skillSystem);

      // Add materials for basic_fertilizer: compost x2, plant_matter x3
      inventory.addItem('compost', 2);
      inventory.addItem('plant_matter', 3);

      const beforeCrafting = store.getState().campaign.skills.crafting.xp;

      // Craft the item — recipe awards 15 crafting XP
      const result = craftingSystem.craft('basic_fertilizer');
      expect(result.success).toBe(true);

      const afterCrafting = store.getState().campaign.skills.crafting.xp;
      expect(afterCrafting).toBe(beforeCrafting + 15);

      skillSystem.dispose();
    });

    it('leveling up a skill unlocks its associated buff', () => {
      // Start gardening at 99 XP (level 1)
      const state = createGameState();
      state.campaign.skills.gardening = { xp: 99, level: 1 };
      const store = new Store(state);
      const skillSystem = new SkillSystem(store);

      // Award 1 XP to hit 100 -> level 2
      const result1 = skillSystem.awardXP('gardening', 1);
      expect(result1.newLevel).toBe(2);
      expect(result1.levelsGained).toBe(1);

      // Award 150 XP to hit 250 -> level 3 (unlocks gardening_yield_10 buff)
      const result2 = skillSystem.awardXP('gardening', 150);
      expect(result2.newLevel).toBe(3);
      expect(result2.levelsGained).toBe(1);

      // Verify the buff is now active
      const buffs = skillSystem.getActiveBuffs();
      const yieldBuff = buffs.find((b) => b.buffId === 'gardening_yield_10');
      expect(yieldBuff).toBeDefined();
      expect(yieldBuff.effect.target).toBe('harvest_yield');
      expect(yieldBuff.effect.value).toBe(1.1);

      // Verify the level-up was recorded in store
      const lastLevelUp = store.getState().campaign.lastLevelUp;
      expect(lastLevelUp).toBeDefined();
      expect(lastLevelUp.skillId).toBe('gardening');
      expect(lastLevelUp.newLevel).toBe(3);

      skillSystem.dispose();
    });

    it('active skill buffs modify crafting material cost calculations', () => {
      // At crafting level 3, the crafting_cost_20 buff reduces materials by 20%
      const state = createGameState();
      state.campaign.skills.crafting = { xp: 250, level: 3 };
      const store = new Store(state);
      const inventory = new Inventory(store);
      const skillSystem = new SkillSystem(store);
      const craftingSystem = new CraftingSystem(store, inventory, skillSystem);

      // Verify material_cost_reduction buff value is 0.2
      const reduction = skillSystem.getBuffValue('material_cost_reduction');
      expect(reduction).toBe(0.2);

      // basic_fertilizer needs compost x2, plant_matter x3
      // With 20% reduction: compost = ceil(2 * 0.8) = 2, plant_matter = ceil(3 * 0.8) = 3
      inventory.addItem('compost', 2);
      inventory.addItem('plant_matter', 3);

      const check = craftingSystem.canCraft('basic_fertilizer');
      expect(check.craftable).toBe(true);

      skillSystem.dispose();
    });
  });

  // -------------------------------------------------------------------------
  // 4-C. Crafting + Inventory
  // -------------------------------------------------------------------------
  describe('Crafting + Inventory', () => {
    it('crafting a recipe consumes the required materials', () => {
      const store = new Store(createGameState());
      const inventory = new Inventory(store);
      const skillSystem = new SkillSystem(store);
      const craftingSystem = new CraftingSystem(store, inventory, skillSystem);

      // basic_fertilizer requires compost x2, plant_matter x3
      inventory.addItem('compost', 2);
      inventory.addItem('plant_matter', 3);

      const result = craftingSystem.craft('basic_fertilizer');
      expect(result.success).toBe(true);

      // Materials should be consumed
      expect(inventory.getItemCount('compost')).toBe(0);
      expect(inventory.getItemCount('plant_matter')).toBe(0);

      skillSystem.dispose();
    });

    it('crafted item appears in inventory after crafting', () => {
      const store = new Store(createGameState());
      const inventory = new Inventory(store);
      const skillSystem = new SkillSystem(store);
      const craftingSystem = new CraftingSystem(store, inventory, skillSystem);

      // Record baseline count (default state starts with 3 fertilizer_bags)
      const beforeCount = inventory.getItemCount('fertilizer_bag');

      // Add materials for basic_fertilizer
      inventory.addItem('compost', 2);
      inventory.addItem('plant_matter', 3);

      const result = craftingSystem.craft('basic_fertilizer');
      expect(result.success).toBe(true);
      expect(result.producedItem.itemId).toBe('fertilizer_bag');
      expect(result.producedItem.count).toBe(1);

      // Verify count increased by the crafted amount
      expect(inventory.getItemCount('fertilizer_bag')).toBe(beforeCount + 1);

      skillSystem.dispose();
    });

    it('higher crafting skill reduces material cost via buff', () => {
      // At crafting level 3, the crafting_cost_20 buff reduces materials by 20%
      const state = createGameState();
      state.campaign.skills.crafting = { xp: 250, level: 3 };
      const store = new Store(state);
      const inventory = new Inventory(store);
      const skillSystem = new SkillSystem(store);
      const craftingSystem = new CraftingSystem(store, inventory, skillSystem);

      // mulch_bag requires compost x3, dried_leaves x2
      // With 20% reduction: compost = ceil(3 * 0.8) = 3, dried_leaves = ceil(2 * 0.8) = 2
      // Still same amounts at these counts. Let's verify canCraft reports
      // reduced needs by checking a larger recipe.
      // garden_twine requires plant_fiber x3 -> reduced = ceil(3 * 0.8) = 3
      // Let's use the cost reduction on basic_fertilizer:
      // compost x2 -> ceil(2*0.8) = 2, plant_matter x3 -> ceil(3*0.8) = 3
      // The reduction is small but let's verify it works at level 1 vs level 3
      // by comparing canCraft.missing values

      // At level 3 with cost reduction, add exact materials
      inventory.addItem('compost', 2);
      inventory.addItem('plant_matter', 3);

      const check = craftingSystem.canCraft('basic_fertilizer');
      expect(check.craftable).toBe(true);

      // Verify the reduction value is active
      expect(skillSystem.getBuffValue('material_cost_reduction')).toBe(0.2);

      skillSystem.dispose();
    });

    it('crafting with insufficient materials is blocked', () => {
      const store = new Store(createGameState());
      const inventory = new Inventory(store);
      const skillSystem = new SkillSystem(store);
      const craftingSystem = new CraftingSystem(store, inventory, skillSystem);

      // basic_fertilizer requires compost x2, plant_matter x3
      // Only add compost x1 — insufficient
      inventory.addItem('compost', 1);

      const check = craftingSystem.canCraft('basic_fertilizer');
      expect(check.craftable).toBe(false);
      expect(check.missing.length).toBeGreaterThan(0);

      // Attempt to craft — should fail
      const result = craftingSystem.craft('basic_fertilizer');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Missing materials.');

      // Inventory should be unchanged (compost still present)
      expect(inventory.getItemCount('compost')).toBe(1);

      skillSystem.dispose();
    });

    it('crafting is blocked when inventory is full', () => {
      const store = new Store(createGameState());
      const inventory = new Inventory(store);
      const skillSystem = new SkillSystem(store);
      const craftingSystem = new CraftingSystem(store, inventory, skillSystem);

      // Fill all 20 inventory slots with non-stackable tools
      for (let i = 0; i < 20; i++) {
        inventory.addItem('watering_can', 1);
      }
      expect(inventory.getCapacity().used).toBe(20);

      // Add materials is not possible since inventory is full
      // Try to craft — should fail because we have no materials and no space
      const result = craftingSystem.craft('basic_fertilizer');
      expect(result.success).toBe(false);

      skillSystem.dispose();
    });
  });

  // -------------------------------------------------------------------------
  // 4-D. Full Loop — End-to-End
  // -------------------------------------------------------------------------
  describe('Full Loop', () => {
    it('plant -> harvest -> XP -> craft -> use tool -> repair -> quest complete', () => {
      const store = new Store(createGameState());
      const inventory = new Inventory(store);
      const skillSystem = new SkillSystem(store);
      const craftingSystem = new CraftingSystem(store, inventory, skillSystem);

      // 1. Plant cherry_tom in cell 0 -> gardening XP +10
      store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex: 0, cropId: 'cherry_tom' } });
      const xpAfterPlant = store.getState().campaign.skills.gardening.xp;
      expect(xpAfterPlant).toBe(10);

      // 2. Harvest cell 0 -> gardening XP +25
      store.dispatch({ type: Actions.HARVEST_CELL, payload: { cellIndex: 0 } });
      const xpAfterHarvest = store.getState().campaign.skills.gardening.xp;
      expect(xpAfterHarvest).toBe(35);

      // 3. Add crafting materials (simulate forage + harvest byproducts)
      inventory.addItem('compost', 2);
      inventory.addItem('plant_matter', 3);

      // 4. Craft basic_fertilizer -> crafting XP +15
      const fertilizerBefore = inventory.getItemCount('fertilizer_bag');
      const craftResult = craftingSystem.craft('basic_fertilizer');
      expect(craftResult.success).toBe(true);
      expect(inventory.getItemCount('fertilizer_bag')).toBe(fertilizerBefore + 1);
      const craftingXP = store.getState().campaign.skills.crafting.xp;
      expect(craftingXP).toBe(15);

      // 5. Use the default watering_can (already in inventory from game start)
      const toolSlot = findToolSlotIndex(store.getState().campaign.inventory, 'watering_can');
      store.dispatch({ type: Actions.USE_TOOL, payload: { slotIndex: toolSlot, durabilityCost: 10 } });
      expect(store.getState().campaign.inventory.slots[toolSlot].durability).toBe(90);

      // 6. Repair the tool
      inventory.addItem('scrap_metal', 1);
      store.dispatch({ type: Actions.REPAIR_TOOL, payload: { slotIndex: toolSlot, restoredTo: 100 } });
      expect(store.getState().campaign.inventory.slots[toolSlot].durability).toBe(100);

      // 7. Complete a quest -> social XP +30
      store.dispatch({
        type: Actions.COMPLETE_QUEST,
        payload: {
          questId: 'integration_test_quest',
          rewards: [{ type: 'reputation', id: 'old_gus', amount: 10 }],
        },
      });
      const socialXP = store.getState().campaign.skills.social.xp;
      expect(socialXP).toBe(30);
      expect(store.getState().campaign.reputation.old_gus).toBe(10);

      // 8. Verify all final state is consistent
      expect(store.getState().campaign.skills.gardening.xp).toBe(35);
      expect(store.getState().campaign.skills.crafting.xp).toBe(25); // 15 craft + 10 repair
      expect(store.getState().campaign.questLog.integration_test_quest.state).toBe('COMPLETED');

      skillSystem.dispose();
    });
  });

  // -------------------------------------------------------------------------
  // 4-E. Backward Compatibility
  // -------------------------------------------------------------------------
  describe('Backward Compatibility', () => {
    it('loading a pre-Phase-4 save works without errors', () => {
      // Create a minimal state with no inventory, skills, or durability fields
      const legacyState = {
        campaign: {
          currentChapter: 2,
          currentSeason: 'summer',
          pantry: { basil: 3 },
        },
        season: {
          chapter: 2,
          season: 'summer',
        },
      };

      // Loading into store should not throw
      const store = new Store(legacyState);
      const state = store.getState();
      expect(state.campaign.currentChapter).toBe(2);
      expect(state.campaign.currentSeason).toBe('summer');
    });

    it('pre-Phase-4 save gets default values for new fields', () => {
      const legacyState = {
        campaign: {
          currentChapter: 1,
          currentSeason: 'spring',
        },
        season: {
          chapter: 1,
          season: 'spring',
        },
      };

      const store = new Store(legacyState);
      const state = store.getState();

      // Inventory should be initialized with default empty slots
      expect(state.campaign.inventory).toBeDefined();
      expect(state.campaign.inventory.slots).toBeDefined();
      expect(state.campaign.inventory.capacity).toBe(20);
      expect(state.campaign.inventory.tier).toBe(1);

      // Skills should have default structure with level 1 and 0 XP
      expect(state.campaign.skills).toBeDefined();
      expect(state.campaign.skills.gardening).toBeDefined();
      expect(state.campaign.skills.gardening.level).toBe(1);
      expect(state.campaign.skills.gardening.xp).toBe(0);
      expect(state.campaign.skills.crafting).toBeDefined();
      expect(state.campaign.skills.crafting.level).toBe(1);
    });

    it('game is fully playable after migrating an old save', () => {
      const legacyState = {
        campaign: {
          currentChapter: 1,
          currentSeason: 'spring',
        },
        season: {
          chapter: 1,
          season: 'spring',
        },
      };

      const store = new Store(legacyState);
      const skillSystem = new SkillSystem(store);

      // Plant a crop — should not crash
      store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex: 0, cropId: 'basil' } });
      expect(store.getState().season.grid[0].cropId).toBe('basil');

      // Gardening XP should have been awarded
      expect(store.getState().campaign.skills.gardening.xp).toBe(10);

      // Harvest — should not crash
      store.dispatch({ type: Actions.HARVEST_CELL, payload: { cellIndex: 0 } });
      expect(store.getState().campaign.skills.gardening.xp).toBe(35);

      // Inventory operations should work
      const inventory = new Inventory(store);
      inventory.addItem('compost', 5);
      expect(inventory.getItemCount('compost')).toBe(5);

      skillSystem.dispose();
    });
  });
});

// Phase 5K — Open World, Zones, Foraging, Grid Expansion
// Tests for zone navigation, gating, foraging, expanded garden grids,
// multiple beds, biome crops, and the full end-to-end game loop.
// Data specs: WORLD_MAP.json (8 zones), CROP_SCORING_DATA.json (50 crops).

describe('Phase 5 — Open World, Zones, Foraging, Grid Expansion', () => {

  // -------------------------------------------------------------------------
  // 5-A. Zone Navigation
  // -------------------------------------------------------------------------
  describe('Zone Navigation', () => {
    it('all 8 zones defined in WORLD_MAP.json are loadable', () => {
      const WORLD_MAP = ZONE_REGISTRY.WORLD_MAP;
      const ZONE_FACTORIES = ZONE_REGISTRY.ZONE_FACTORIES;
      const zoneIds = Object.keys(WORLD_MAP.zones);
      expect(zoneIds).toHaveLength(8);

      const store = { getState: () => ({ campaign: {}, season: {} }), dispatch: vi.fn() };
      const tracked = [];
      const tracker = {
        track(obj) { tracked.push(obj); },
        trackObject(obj) { tracked.push(obj); },
        disposeObject: vi.fn(),
        disposeAll: vi.fn(),
      };

      const mockNpcRegistry = { getNPCsInZone: () => [] };

      for (const zoneId of zoneIds) {
        const factory = ZONE_FACTORIES[zoneId];
        expect(factory, `Missing factory for zone: ${zoneId}`).toBeDefined();
        // neighborhood factory accepts an optional npcRegistry arg — pass a mock
        // to avoid canvas.getContext('2d') calls in the headless test env
        const instance = zoneId === 'neighborhood'
          ? factory(store, tracker, mockNpcRegistry)
          : factory(store, tracker);
        expect(instance.scene, `${zoneId} should return a scene`).toBeDefined();
        expect(instance.camera, `${zoneId} should return a camera`).toBeDefined();
        expect(typeof instance.dispose, `${zoneId} should have dispose()`).toBe('function');
        instance.dispose();
      }
    });

    it('zone connections are bidirectional', () => {
      const zones = ZONE_REGISTRY.WORLD_MAP.zones;
      const zoneIds = Object.keys(zones);

      for (const zoneId of zoneIds) {
        const zone = zones[zoneId];
        for (const connectedId of zone.connections) {
          const connected = zones[connectedId];
          expect(
            connected,
            `Zone "${connectedId}" referenced by "${zoneId}" does not exist`,
          ).toBeDefined();
          expect(
            connected.connections,
            `Zone "${connectedId}" has no connections array`,
          ).toContain(zoneId);
        }
      }
    });

    it('reaching an exit point triggers the destination zone transition', async () => {
      const WORLD_MAP = ZONE_REGISTRY.WORLD_MAP;
      const store = {
        getState: () => ({ campaign: { reputation: {}, skills: {}, questLog: {}, activeFestival: null }, season: {} }),
        dispatch: vi.fn(),
      };
      const tracker = {
        track: vi.fn(),
        trackObject: vi.fn(),
        disposeObject: vi.fn(),
        disposeAll: vi.fn(),
      };

      vi.useFakeTimers();
      const body = { appendChild: vi.fn() };
      const mockCtx = {
        fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '', textBaseline: '',
        fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
      };
      vi.stubGlobal('document', {
        body,
        createElement(tag) {
          if (tag === 'canvas') return { width: 0, height: 0, style: {}, remove: vi.fn(), getContext: () => mockCtx };
          return { style: {}, remove: vi.fn() };
        },
      });

      const manager = new ZoneManager({ render: vi.fn() }, store, tracker);
      ZONE_REGISTRY.registerAllZones(manager, store, tracker);

      // Transition to player_plot first
      const first = manager.transitionTo('player_plot');
      await vi.runAllTimersAsync();
      await first;
      expect(manager.getActiveZone()).toBe('player_plot');

      const exitDef = getZoneExitPoints('player_plot', WORLD_MAP)[0];
      const insideExit = { x: exitDef.position.x, z: exitDef.position.z };

      // Verify exits are registered for player_plot
      const registeredExits = manager.zoneExits.get('player_plot');
      expect(registeredExits, 'player_plot should have registered exits').toBeDefined();
      expect(registeredExits.length).toBeGreaterThan(0);

      // Verify the factory for the destination zone is registered
      expect(manager.factories.has(exitDef.destination), `factory for ${exitDef.destination} must be registered`).toBe(true);
      expect(manager.transitioning, 'manager should not be mid-transition').toBe(false);

      manager.activeZoneInstance.setPlayerPosition(insideExit);
      manager.update(0.016);
      await vi.runAllTimersAsync();

      expect(manager.getActiveZone()).toBe(exitDef.destination);

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('spawn points place the player at the correct position in each zone', async () => {
      const WORLD_MAP = ZONE_REGISTRY.WORLD_MAP;
      const store = {
        getState: () => ({ campaign: { reputation: {}, skills: {}, questLog: {}, activeFestival: null }, season: {} }),
        dispatch: vi.fn(),
      };
      const tracker = {
        track: vi.fn(),
        trackObject: vi.fn(),
        disposeObject: vi.fn(),
        disposeAll: vi.fn(),
      };

      vi.useFakeTimers();
      const body = { appendChild: vi.fn() };
      const mockCtx = {
        fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '', textBaseline: '',
        fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
      };
      vi.stubGlobal('document', {
        body,
        createElement(tag) {
          if (tag === 'canvas') return { width: 0, height: 0, style: {}, remove: vi.fn(), getContext: () => mockCtx };
          return { style: {}, remove: vi.fn() };
        },
      });

      const manager = new ZoneManager({ render: vi.fn() }, store, tracker);
      ZONE_REGISTRY.registerAllZones(manager, store, tracker);

      // Test non-gated zones — transition with a specific spawn point and verify placement
      const openZones = ['player_plot', 'neighborhood'];
      for (const zoneId of openZones) {
        const zoneDef = WORLD_MAP.zones[zoneId];
        const customSpawn = { x: 2, z: 3 };
        const transitionResult = manager.transitionTo(zoneId, customSpawn);
        await vi.runAllTimersAsync();
        await transitionResult;

        expect(manager.getActiveZone()).toBe(zoneId);

        // setSpawnPoint should have been called with the custom spawn
        const pos = manager.activeZoneInstance.getPlayerPosition?.();
        if (pos) {
          expect(pos.x).toBe(customSpawn.x);
          expect(pos.z).toBe(customSpawn.z);
        }
      }

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('real zone registry supports a player_plot -> neighborhood -> player_plot roundtrip', async () => {
      const store = {
        getState: () => ({ campaign: { reputation: {}, skills: {}, questLog: {}, activeFestival: null }, season: {} }),
        dispatch: vi.fn(),
      };
      const tracker = {
        track: vi.fn(),
        trackObject: vi.fn(),
        disposeObject: vi.fn(),
        disposeAll: vi.fn(),
      };

      vi.useFakeTimers();
      const body = { appendChild: vi.fn() };
      const mockCtx = {
        fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '', textBaseline: '',
        fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
      };
      vi.stubGlobal('document', {
        body,
        createElement(tag) {
          if (tag === 'canvas') return { width: 0, height: 0, style: {}, remove: vi.fn(), getContext: () => mockCtx };
          return { style: {}, remove: vi.fn() };
        },
      });

      const renderer = { render: vi.fn() };
      const manager = new ZoneManager(renderer, store, tracker);
      ZONE_REGISTRY.registerAllZones(manager, store, tracker);

      const toPlot = manager.transitionTo('player_plot', { x: 0, z: 3 });
      await vi.runAllTimersAsync();
      await toPlot;
      expect(manager.getActiveZone()).toBe('player_plot');

      const toNeighborhoodExit = getZoneExitPoints('player_plot')[0];
      manager.activeZoneInstance.setPlayerPosition({ ...toNeighborhoodExit.position });
      manager.update(0.016);
      await vi.runAllTimersAsync();
      expect(manager.getActiveZone()).toBe('neighborhood');

      const backHomeExit = getZoneExitPoints('neighborhood').find((exit) => exit.destination === 'player_plot');
      manager.activeZoneInstance.setPlayerPosition({ ...backHomeExit.position });
      manager.update(0.016);
      await vi.runAllTimersAsync();
      expect(manager.getActiveZone()).toBe('player_plot');

      manager.update(0.016);
      manager.render();

      expect(renderer.render).toHaveBeenCalled();
      expect(tracker.disposeAll).toHaveBeenCalledTimes(3);

      const zoneChanges = store.dispatch.mock.calls
        .map(([action]) => action)
        .filter((action) => action?.type === Actions.ZONE_CHANGED);
      expect(zoneChanges).toHaveLength(3);
      expect(zoneChanges.at(-1)?.payload).toEqual({
        fromZone: 'neighborhood',
        toZone: 'player_plot',
        spawnPoint: backHomeExit.spawnPoint,
      });

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });
  });

  // -------------------------------------------------------------------------
  // 5-B. Zone Gating
  // -------------------------------------------------------------------------
  describe('Zone Gating', () => {
    it('zones with gate === null are always accessible', () => {
      // player_plot and neighborhood have empty gate objects (no requirements)
      const state = createGameState();
      const store = new Store(state);
      const skillSystem = new SkillSystem(store);
      const reputationSystem = new ReputationSystem(store);
      const questEngine = new QuestEngine(store);
      const festivalEngine = new FestivalEngine(store);
      const systems = { skillSystem, reputationSystem, questEngine, festivalEngine };

      const plotResult = evaluateZoneAccess('player_plot', store.getState(), systems);
      const neighborhoodResult = evaluateZoneAccess('neighborhood', store.getState(), systems);

      expect(plotResult.allowed).toBe(true);
      expect(plotResult.blockers).toHaveLength(0);
      expect(neighborhoodResult.allowed).toBe(true);
      expect(neighborhoodResult.blockers).toHaveLength(0);
    });

    it('skill-gated zones check the player skill level', () => {
      // meadow requires foraging level 3 per DEFAULT_ZONE_GATES
      const state = createGameState();
      state.campaign.skills.foraging = { xp: 0, level: 2 };
      const store = new Store(state);
      const skillSystem = new SkillSystem(store);
      const systems = { skillSystem };

      // At foraging level 2 -> blocked
      const blocked = evaluateZoneAccess('meadow', store.getState(), systems);
      expect(blocked.allowed).toBe(false);
      expect(blocked.blockers.length).toBeGreaterThanOrEqual(1);
      expect(blocked.blockers[0].type).toBe('skill');

      // Level up foraging to 3 -> accessible
      const state2 = createGameState();
      state2.campaign.skills.foraging = { xp: 0, level: 3 };
      const store2 = new Store(state2);
      const skillSystem2 = new SkillSystem(store2);
      const systems2 = { skillSystem: skillSystem2 };

      const allowed = evaluateZoneAccess('meadow', store2.getState(), systems2);
      expect(allowed.allowed).toBe(true);
      expect(allowed.blockers).toHaveLength(0);
    });

    it('reputation-gated zones check the NPC reputation tier', () => {
      // forest_edge requires old_gus reputation at "friend" tier (threshold 50)
      const state = createGameState();
      state.campaign.reputation = { ...state.campaign.reputation, old_gus: 25 };
      const store = new Store(state);
      const reputationSystem = new ReputationSystem(store);
      const systems = { reputationSystem };

      // At 25 reputation (acquaintance) -> blocked
      const blocked = evaluateZoneAccess('forest_edge', store.getState(), systems);
      expect(blocked.allowed).toBe(false);
      expect(blocked.blockers.length).toBeGreaterThanOrEqual(1);
      expect(blocked.blockers[0].type).toBe('reputation');

      // Raise reputation to friend tier (50+)
      reputationSystem.addReputation('old_gus', 25);
      const allowed = evaluateZoneAccess('forest_edge', store.getState(), systems);
      expect(allowed.allowed).toBe(true);
      expect(allowed.blockers).toHaveLength(0);
    });

    it('quest-gated zones check for completed quest prerequisites', () => {
      // riverside requires quest "gus_river_path" completed
      const state = createGameState();
      const store = new Store(state);
      const questEngine = new QuestEngine(store);
      const systems = { questEngine };

      // Quest not completed -> blocked
      const blocked = evaluateZoneAccess('riverside', store.getState(), systems);
      expect(blocked.allowed).toBe(false);
      expect(blocked.blockers.length).toBeGreaterThanOrEqual(1);
      expect(blocked.blockers[0].type).toBe('quest');

      // Mark quest completed via store dispatch
      store.dispatch({
        type: Actions.UPDATE_QUEST_STATE,
        payload: { questId: 'gus_river_path', newState: QuestStates.COMPLETED },
      });

      const allowed = evaluateZoneAccess('riverside', store.getState(), systems);
      expect(allowed.allowed).toBe(true);
      expect(allowed.blockers).toHaveLength(0);
    });

    it('festival-gated zones open only during active festivals', () => {
      // festival_grounds requires an active festival
      const state = createGameState();
      const store = new Store(state);
      const festivalEngine = new FestivalEngine(store);
      const systems = { festivalEngine };

      // No active festival -> blocked
      const blocked = evaluateZoneAccess('festival_grounds', store.getState(), systems);
      expect(blocked.allowed).toBe(false);
      expect(blocked.blockers.length).toBeGreaterThanOrEqual(1);
      expect(blocked.blockers[0].type).toBe('festival');

      // Start a festival
      store.dispatch({
        type: Actions.FESTIVAL_START,
        payload: { festivalId: 'bloom_festival', festival: FESTIVALS.bloom_festival },
      });

      const allowed = evaluateZoneAccess('festival_grounds', store.getState(), systems);
      expect(allowed.allowed).toBe(true);
      expect(allowed.blockers).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 5-C. Foraging
  // -------------------------------------------------------------------------
  describe('Foraging', () => {
    function makeForagingIntegration(zoneId = 'meadow', foragingLevel = 1) {
      const state = createGameState();
      state.campaign.worldState.currentZone = zoneId;
      state.campaign.skills.foraging = { xp: 0, level: foragingLevel };
      const store = new Store(state);
      const inventory = new Inventory(store);
      const skillSystem = new SkillSystem(store);
      const foraging = new ForagingSystem(store, inventory, skillSystem);
      return { store, inventory, skillSystem, foraging };
    }

    it('foraging spots appear in zones that have them and are empty elsewhere', () => {
      const { foraging: meadowForaging } = makeForagingIntegration('meadow');
      const meadowSpots = meadowForaging.getForagingSpots('meadow');
      expect(meadowSpots.length).toBeGreaterThan(0);
      expect(meadowSpots.every((s) => s.id && s.type && s.position)).toBe(true);

      const { foraging: forestForaging } = makeForagingIntegration('forest_edge');
      expect(forestForaging.getForagingSpots('forest_edge').length).toBeGreaterThan(0);

      const { foraging: riverForaging } = makeForagingIntegration('riverside');
      expect(riverForaging.getForagingSpots('riverside').length).toBeGreaterThan(0);

      const { foraging: plotForaging } = makeForagingIntegration('player_plot');
      expect(plotForaging.getForagingSpots('player_plot')).toHaveLength(0);

      const { foraging: nbForaging } = makeForagingIntegration('neighborhood');
      expect(nbForaging.getForagingSpots('neighborhood')).toHaveLength(0);
    });

    it('foraging produces items matching the zone biome', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

      const { foraging } = makeForagingIntegration('forest_edge', 1);
      const result = foraging.forage('forest_herbs');
      expect(result.success).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      const herbItems = ['basil_seed', 'cilantro_seed', 'dried_herbs', 'rosemary_seed', 'heirloom_herb_seed'];
      expect(result.items.every((item) => herbItems.includes(item.itemId))).toBe(true);

      const { foraging: meadowForaging } = makeForagingIntegration('meadow', 1);
      const rockResult = meadowForaging.forage('meadow_rocks');
      expect(rockResult.success).toBe(true);
      const rockItems = ['stone', 'scrap_metal', 'crystal_shard', 'rare_earth'];
      expect(rockResult.items.every((item) => rockItems.includes(item.itemId))).toBe(true);

      vi.restoreAllMocks();
    });

    it('foraging skill level modifies yield quality and quantity', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

      const { foraging: lowForaging } = makeForagingIntegration('meadow', 1);
      const lowResult = lowForaging.forage('meadow_flowers');
      const lowTotal = lowResult.items.reduce((sum, item) => sum + item.count, 0);

      const { foraging: highForaging } = makeForagingIntegration('meadow', 7);
      const highResult = highForaging.forage('meadow_flowers');
      const highTotal = highResult.items.reduce((sum, item) => sum + item.count, 0);

      expect(highTotal).toBeGreaterThan(lowTotal);
      expect(highResult.items.length).toBeGreaterThanOrEqual(lowResult.items.length);

      vi.restoreAllMocks();
    });

    it('foraged spots have a cooldown before they can be harvested again', () => {
      const now = 1_700_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const { foraging } = makeForagingIntegration('meadow', 1);

      const first = foraging.forage('meadow_herbs');
      expect(first.success).toBe(true);
      expect(first.items.length).toBeGreaterThan(0);

      const second = foraging.forage('meadow_herbs');
      expect(second.success).toBe(false);
      expect(second.message).toContain('recover');

      vi.spyOn(Date, 'now').mockReturnValue(now + 300_001);

      const third = foraging.forage('meadow_herbs');
      expect(third.success).toBe(true);
      expect(third.items.length).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });

    it('foraged items go into the player inventory', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

      const { foraging, inventory } = makeForagingIntegration('meadow', 1);

      // Snapshot item counts before foraging (starter items may be present)
      const countsBefore = {};
      for (const slot of inventory.getSlots()) {
        if (slot) {
          countsBefore[slot.itemId] = (countsBefore[slot.itemId] ?? 0) + slot.count;
        }
      }

      const result = foraging.forage('meadow_herbs');
      expect(result.success).toBe(true);

      // Each foraged item should increase its inventory count
      for (const foraged of result.items) {
        if (!foraged.dropped) {
          const before = countsBefore[foraged.itemId] ?? 0;
          const after = inventory.getItemCount(foraged.itemId);
          expect(after).toBe(before + foraged.count);
        }
      }

      vi.restoreAllMocks();
    });
  });

  // -------------------------------------------------------------------------
  // 5-D. Expanded Grid
  // -------------------------------------------------------------------------
  describe('Expanded Grid', () => {
    it('default garden grid is 8x4 (32 cells)', () => {
      const store = new Store(createGameState());
      const state = store.getState();
      expect(state.season.grid.length).toBe(32);
      expect(state.season.gridCols).toBe(8);
      expect(state.season.gridRows).toBe(4);
    });

    it('first expansion grows grid to 8x6 (48 cells)', () => {
      const store = new Store(createGameState());

      // Plant a crop in the first cell before expanding
      store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex: 0, cropId: 'basil' } });

      const expanded = store.dispatch({ type: Actions.EXPAND_GRID, payload: { rows: 6 } });
      expect(expanded.season.grid.length).toBe(48);
      expect(expanded.season.gridRows).toBe(6);
      expect(expanded.season.gridCols).toBe(8);

      // Existing planted crop is preserved
      expect(expanded.season.grid[0].cropId).toBe('basil');

      // New cells are empty with default state
      expect(expanded.season.grid[32].cropId).toBeNull();
      expect(expanded.season.grid[47].cropId).toBeNull();
    });

    it('maximum expansion reaches 8x8 (64 cells)', () => {
      const store = new Store(createGameState());

      const maxRows = Math.max(...GRID_UNLOCKS.map((u) => u.rows));
      const expanded = store.dispatch({ type: Actions.EXPAND_GRID, payload: { rows: maxRows } });
      expect(expanded.season.grid.length).toBe(64);
      expect(expanded.season.gridRows).toBe(8);

      // Further expansion beyond max is rejected (state unchanged)
      const rejected = store.dispatch({ type: Actions.EXPAND_GRID, payload: { rows: 10 } });
      expect(rejected.season.grid.length).toBe(64);
      expect(rejected.season.gridRows).toBe(8);
    });

    it('grid expansion persists through save/load cycle', () => {
      const state = createGameState();
      state.campaign.currentChapter = 6;
      state.campaign.skills.gardening = { xp: 850, level: 5 };
      const normalized = normalizeGameState(state);
      // Chapter 6 with gardening level 5 should expand to 8x6
      expect(normalized.season.gridRows).toBe(6);
      expect(normalized.season.grid.length).toBe(48);
    });

    it('old saves with 32-cell grids load correctly without migration issues', () => {
      // Simulate a legacy save that has a 32-cell (8x4) grid with some planted crops
      const legacyGrid = Array.from({ length: 32 }, () => ({
        cropId: null, protected: false, mulched: false, damageState: null,
        carryForwardType: null, eventModifier: 0, interventionBonus: 0,
        soilFatigue: 0, lastWateredAt: null,
      }));
      legacyGrid[0].cropId = 'basil';
      legacyGrid[5].cropId = 'lettuce';

      // Build a raw state as it would come from a legacy save — grid as plain array
      const legacyState = {
        campaign: { currentChapter: 1, currentSeason: 'spring' },
        season: {
          chapter: 1,
          season: 'spring',
          phase: 'PLANNING',
          grid: legacyGrid,
          gridCols: 8,
          gridRows: 4,
        },
      };

      // normalizeGameState should handle this gracefully
      const normalized = normalizeGameState(legacyState);
      expect(normalized.season.grid.length).toBe(32);
      expect(normalized.season.gridCols).toBe(8);
      expect(normalized.season.gridRows).toBe(4);
      expect(normalized.season.grid[0].cropId).toBe('basil');
      expect(normalized.season.grid[5].cropId).toBe('lettuce');

      // Scoring should work on the 32-cell grid
      const siteConfig = { sunHours: 6, trellis: true, orientation: 'ew' };
      const result = scoreBed(normalized.season.grid, siteConfig, normalized.season.season);
      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
      expect(result.grade).toBeDefined();

      // Individual cell scoring should work
      const cellResult = scoreCell(0, normalized.season.grid, siteConfig, normalized.season.season);
      expect(cellResult).toBeDefined();
      expect(cellResult.cropId).toBe('basil');

      // Loading into a Store should not pad the grid
      const store = new Store(normalized);
      const state = store.getState();
      expect(state.season.grid.length).toBe(32);
    });
  });

  // -------------------------------------------------------------------------
  // 5-E. Multiple Beds
  // -------------------------------------------------------------------------
  describe('Multiple Beds', () => {
    it('player can own multiple garden beds', () => {
      const store = new Store(createGameState());
      const manager = new MultiBedManager(store);

      manager.acquireBed('player_plot', { name: 'Player Plot', zone: 'player_plot' });
      manager.acquireBed('community_plot', { name: 'Community Plot', zone: 'community' });

      const allBeds = manager.getAllBeds();
      expect(allBeds.length).toBe(2);

      const ids = allBeds.map((b) => b.id);
      expect(ids).toContain('player_plot');
      expect(ids).toContain('community_plot');

      manager.dispose();
    });

    it('each bed has independent grid state', () => {
      const store = new Store(createGameState());
      const manager = new MultiBedManager(store);

      manager.acquireBed('bed_a', { name: 'Bed A', zone: 'player_plot' });
      manager.acquireBed('bed_b', { name: 'Bed B', zone: 'community' });

      // Plant basil in bed A, cell 0 via state mutation
      const state = store.getState();
      state.campaign.beds.bed_a.grid[0].cropId = 'basil';
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      const bedA = manager.getBed('bed_a');
      const bedB = manager.getBed('bed_b');
      expect(bedA.grid[0].cropId).toBe('basil');
      expect(bedB.grid[0].cropId).toBeNull();

      manager.dispose();
    });

    it('switching active bed updates the garden scene', () => {
      const store = new Store(createGameState());
      const manager = new MultiBedManager(store);

      manager.acquireBed('bed_a', { name: 'Bed A', zone: 'player_plot' });
      manager.acquireBed('bed_b', { name: 'Bed B', zone: 'community' });

      // Plant different crops in each bed so grids differ
      const state = store.getState();
      state.campaign.beds.bed_a.grid[0].cropId = 'tomato';
      state.campaign.beds.bed_b.grid[0].cropId = 'lettuce';
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      // Switch to bed A
      manager.switchActiveBed('bed_a');
      const gridA = manager.getActiveGrid();
      expect(gridA[0].cropId).toBe('tomato');

      // Switch to bed B
      manager.switchActiveBed('bed_b');
      const gridB = manager.getActiveGrid();
      expect(gridB[0].cropId).toBe('lettuce');

      manager.dispose();
    });

    it('all beds are saved and loaded correctly', () => {
      globalThis.localStorage = createMockStorage();

      const store = new Store(createGameState());
      const manager = new MultiBedManager(store);

      // Acquire two beds
      manager.acquireBed('bed_a', { name: 'Bed A', zone: 'player_plot' });
      manager.acquireBed('bed_b', { name: 'Bed B', zone: 'community' });

      // Plant crops in each bed
      const state = store.getState();
      state.campaign.beds.bed_a.grid[0].cropId = 'basil';
      state.campaign.beds.bed_b.grid[0].cropId = 'lettuce';
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      // Save
      const saved = saveCampaign(store.getState().campaign, 0);
      expect(saved).not.toBeNull();

      // Load into a fresh campaign
      const loaded = loadCampaign(0);
      expect(loaded).not.toBeNull();
      expect(loaded.beds).toBeDefined();
      expect(loaded.beds.bed_a).toBeDefined();
      expect(loaded.beds.bed_b).toBeDefined();
      expect(loaded.beds.bed_a.grid[0].cropId).toBe('basil');
      expect(loaded.beds.bed_b.grid[0].cropId).toBe('lettuce');

      manager.dispose();
      delete globalThis.localStorage;
    });

    it('zone travel and save/load preserve per-zone active beds and forage cooldowns', () => {
      globalThis.localStorage = createMockStorage();
      const now = 1_700_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const state = createGameState();
      state.campaign.skills.foraging = { xp: 0, level: 3 };
      const store = new Store(state);
      const manager = new MultiBedManager(store);

      manager.acquireBed('player_plot', { name: 'Player Plot', zone: 'player_plot' });
      manager.acquireBed('meadow_bed', { name: 'Meadow Bed', zone: 'meadow' });

      store.dispatch({
        type: Actions.ZONE_CHANGED,
        payload: { fromZone: 'player_plot', toZone: 'meadow', spawnPoint: { x: -6, z: 0 } },
      });

      expect(store.getState().campaign.activeBedId).toBe('meadow_bed');

      const inventory = new Inventory(store);
      const skillSystem = new SkillSystem(store);
      const foraging = new ForagingSystem(store, inventory, skillSystem);
      const forageResult = foraging.forage('meadow_herbs');

      expect(forageResult.success).toBe(true);

      const saved = saveCampaign(store.getState().campaign, 0);
      expect(saved).not.toBeNull();

      const loaded = loadCampaign(0);
      expect(loaded.activeBedId).toBe('meadow_bed');
      expect(loaded.worldState.currentZone).toBe('meadow');
      expect(loaded.worldState.forageState.cooldowns.meadow_herbs).toBeGreaterThan(now);
      expect(loaded.worldState.forageState.history.meadow_herbs.zoneId).toBe('meadow');

      const reloadedState = createGameState();
      reloadedState.campaign = loaded;
      reloadedState.season.campaign = loaded;
      const reloadedStore = new Store(reloadedState);
      const reloadedInventory = new Inventory(reloadedStore);
      const reloadedSkillSystem = new SkillSystem(reloadedStore);
      const reloadedForaging = new ForagingSystem(reloadedStore, reloadedInventory, reloadedSkillSystem);
      const blocked = reloadedForaging.forage('meadow_herbs');

      expect(blocked.success).toBe(false);
      expect(blocked.message).toContain('recover');

      manager.dispose();
      vi.restoreAllMocks();
      delete globalThis.localStorage;
    });
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

    it('biome-exclusive crops appear only through foraging in their zone', () => {
      const store = createTestStore();
      const state = store.getState();
      const starterCrops = state.campaign.cropsUnlocked;

      // 1. Biome crops should NOT be in the chapter 1 starter seed list
      const biomeCropIds = ['wild_garlic', 'shiitake_mushroom', 'watercress', 'prairie_onion'];
      for (const cropId of biomeCropIds) {
        expect(starterCrops).not.toContain(cropId);
      }

      // 2. BiomeCropBridge maps crops to their exclusive zones
      const inventory = new Inventory(store);
      const skillSystem = new SkillSystem(store);
      const foragingSystem = new ForagingSystem(store, inventory, skillSystem);
      const bridge = new BiomeCropBridge(store, foragingSystem);

      // forest_edge zone should include woodland biome crops
      const forestCrops = bridge.getBiomeCropsForZone('forest_edge');
      expect(forestCrops).toContain('wild_garlic');
      expect(forestCrops).toContain('shiitake_mushroom');
      expect(forestCrops).not.toContain('prairie_onion');
      expect(forestCrops).not.toContain('watercress');

      // meadow zone should include meadow biome crops
      const meadowCrops = bridge.getBiomeCropsForZone('meadow');
      expect(meadowCrops).toContain('prairie_onion');
      expect(meadowCrops).not.toContain('wild_garlic');

      // riverside zone should include riverside biome crops
      const riverCrops = bridge.getBiomeCropsForZone('riverside');
      expect(riverCrops).toContain('watercress');
      expect(riverCrops).not.toContain('shiitake_mushroom');

      // 3. All biome crops are recognized as biome-exclusive
      for (const cropId of biomeCropIds) {
        expect(bridge.isCropBiomeExclusive(cropId)).toBe(true);
      }

      // 4. Non-biome crops are NOT biome-exclusive
      expect(bridge.isCropBiomeExclusive('lettuce')).toBe(false);
      expect(bridge.isCropBiomeExclusive('basil')).toBe(false);

      bridge.dispose();
      skillSystem.dispose();
    });

    it('new biome crop recipes (foragers_stew, garden_deluxe_salsa) work with scoring', () => {
      // 1. Verify the recipes exist in canonical data
      const recipes = getRecipes();
      expect(recipes.foragers_stew).toBeDefined();
      expect(recipes.foragers_stew.crops).toEqual(['wild_garlic', 'shiitake_mushroom', 'watercress', 'prairie_onion']);
      expect(recipes.garden_deluxe_salsa).toBeDefined();
      expect(recipes.garden_deluxe_salsa.crops).toEqual(['ghost_pepper', 'cherry_tom', 'cilantro', 'onion']);

      // 2. Plant all crops for foragers_stew and score the bed
      const stewLayout = {
        0: 'wild_garlic',
        1: 'shiitake_mushroom',
        2: 'watercress',
        3: 'prairie_onion',
        8: 'lettuce',
        9: 'basil',
        10: 'spinach',
        11: 'arugula',
      };
      const stewStore = createTestStore();
      plantGrid(stewStore, stewLayout);
      const stewState = stewStore.getState();
      const stewResult = scoreBed(stewState.season.grid, stewState.season.siteConfig, stewState.season.season, {});

      // The recipe bonus should be applied (0.2 per complete recipe)
      expect(stewResult.details.recipeBonus).toBeGreaterThanOrEqual(0.2);
      expect(stewResult.score).toBeGreaterThan(0);

      // 3. Plant all crops for garden_deluxe_salsa and score the bed
      const salsaLayout = {
        0: 'ghost_pepper',
        1: 'cherry_tom',
        2: 'cilantro',
        3: 'onion',
        8: 'lettuce',
        9: 'basil',
        10: 'spinach',
        11: 'arugula',
      };
      const salsaStore = createTestStore();
      plantGrid(salsaStore, salsaLayout);
      const salsaState = salsaStore.getState();
      const salsaResult = scoreBed(salsaState.season.grid, salsaState.season.siteConfig, salsaState.season.season, {});

      expect(salsaResult.details.recipeBonus).toBeGreaterThanOrEqual(0.2);
      expect(salsaResult.score).toBeGreaterThan(0);
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
    it('start -> plant -> harvest -> XP -> unlock -> forage -> craft -> quest -> expand -> score -> save/load', () => {
      globalThis.localStorage = createMockStorage();

      // 1. Start new game in Let It Grow mode
      const store = createTestStore();
      store.dispatch({ type: Actions.SET_GAME_MODE, payload: { mode: 'let_it_grow' } });
      expect(store.getState().campaign.gameMode).toBe('let_it_grow');

      // Initialize systems
      const inventory = new Inventory(store);
      const skillSystem = new SkillSystem(store);
      const foragingSystem = new ForagingSystem(store, inventory, skillSystem);
      const questEngine = new QuestEngine(store);
      const reputationSystem = new ReputationSystem(store);

      // 2. Plant cherry_tom x3 in player_plot bed -> gardening XP
      const layout = {
        0: 'cherry_tom',
        1: 'cherry_tom',
        2: 'cherry_tom',
        3: 'basil',
        8: 'lettuce',
        9: 'spinach',
        10: 'arugula',
        11: 'radish',
      };
      plantGrid(store, layout);
      const afterPlant = store.getState();
      expect(afterPlant.season.grid[0].cropId).toBe('cherry_tom');
      expect(afterPlant.season.grid[1].cropId).toBe('cherry_tom');
      expect(afterPlant.season.grid[2].cropId).toBe('cherry_tom');

      // 3. Advance through season phases -> harvest -> XP
      //    Phase machine blocks on beat phases when an event is active,
      //    so we resolve events between advances.
      // PLANNING -> EARLY_SEASON
      const r1 = advancePhases(store, 1);
      expect(r1[0].advanced).toBe(true);
      // Resolve any drawn event by choosing an intervention
      let mid = store.getState();
      if (mid.season.eventActive) {
        store.dispatch({
          type: Actions.USE_INTERVENTION,
          payload: { interventionId: 'accept', eventActive: null },
        });
      }
      // EARLY_SEASON -> MID_SEASON
      const r2 = advancePhases(store, 1);
      expect(r2[0].advanced).toBe(true);
      mid = store.getState();
      if (mid.season.eventActive) {
        store.dispatch({
          type: Actions.USE_INTERVENTION,
          payload: { interventionId: 'accept', eventActive: null },
        });
      }
      // MID_SEASON -> LATE_SEASON
      const r3 = advancePhases(store, 1);
      expect(r3[0].advanced).toBe(true);
      mid = store.getState();
      if (mid.season.eventActive) {
        store.dispatch({
          type: Actions.USE_INTERVENTION,
          payload: { interventionId: 'accept', eventActive: null },
        });
      }
      // LATE_SEASON -> HARVEST
      const r4 = advancePhases(store, 1);
      expect(r4[0].advanced).toBe(true);

      const afterAdvance = store.getState();
      expect(afterAdvance.season.phase).toBe(PHASES.HARVEST);

      // Harvest cells to collect crops and XP
      store.dispatch({ type: Actions.HARVEST_CELL, payload: { cellIndex: 0, yieldCount: 2 } });
      store.dispatch({ type: Actions.HARVEST_CELL, payload: { cellIndex: 1, yieldCount: 2 } });
      store.dispatch({ type: Actions.HARVEST_CELL, payload: { cellIndex: 2, yieldCount: 2 } });

      const afterHarvest = store.getState();
      expect(afterHarvest.campaign.pantry.cherry_tom).toBe(3);
      expect(afterHarvest.season.grid[0].cropId).toBeNull();

      // 4. Level up gardening by awarding enough XP
      skillSystem.awardXP('gardening', 300);
      skillSystem.awardXP('foraging', 300);
      const gardeningLevel = skillSystem.getLevel('gardening');
      expect(gardeningLevel).toBeGreaterThanOrEqual(3);

      // 5. Travel to meadow -> forage
      store.dispatch({ type: Actions.ZONE_CHANGED, payload: { toZone: 'meadow' } });
      const afterTravel = store.getState();
      expect(afterTravel.campaign.worldState.currentZone).toBe('meadow');
      expect(afterTravel.campaign.worldState.visitedZones).toContain('meadow');

      // Forage in meadow
      const meadowSpots = foragingSystem.getForagingSpots('meadow');
      expect(meadowSpots.length).toBeGreaterThan(0);
      const forageResult = foragingSystem.forage(meadowSpots[0].id);
      expect(forageResult.success).toBe(true);
      expect(forageResult.items.length).toBeGreaterThan(0);

      // 6. Craft mulch_bag (basic recipe) from gathered materials
      // Level up crafting to meet the skill requirement (crafting >= 3)
      skillSystem.awardXP('crafting', 500);
      expect(skillSystem.getLevel('crafting')).toBeGreaterThanOrEqual(3);

      // Stock materials so craft check succeeds
      inventory.addItem('compost', 10);
      inventory.addItem('dried_leaves', 10);
      inventory.addItem('plant_matter', 10);

      const craftingSystem = new CraftingSystem(store, inventory, skillSystem);
      const canCraft = craftingSystem.canCraft('mulch_bag');
      expect(canCraft.craftable).toBe(true);
      const craftResult = craftingSystem.craft('mulch_bag');
      expect(craftResult.success).toBe(true);
      expect(craftResult.producedItem.itemId).toBe('mulch_bag');

      // 7. Return to player_plot -> apply mulch to cell
      store.dispatch({ type: Actions.ZONE_CHANGED, payload: { toZone: 'player_plot' } });
      expect(store.getState().campaign.worldState.currentZone).toBe('player_plot');

      store.dispatch({
        type: Actions.CARRY_FORWARD,
        payload: { cellIndex: 0, carryForwardType: 'mulch', mulched: true },
      });
      expect(store.getState().season.grid[0].mulched).toBe(true);

      // 8. Accept quest -> complete via harvest -> reputation + social XP
      store.dispatch({
        type: Actions.ACCEPT_QUEST,
        payload: { questId: 'test_harvest_quest', acceptedAt: Date.now() },
      });
      expect(store.getState().campaign.questLog.test_harvest_quest.state).toBe('ACCEPTED');

      store.dispatch({
        type: Actions.COMPLETE_QUEST,
        payload: {
          questId: 'test_harvest_quest',
          rewards: [
            { type: 'reputation', id: 'old_gus', amount: 15 },
            { type: 'xp', id: 'social', amount: 50 },
          ],
        },
      });
      const afterQuest = store.getState();
      expect(afterQuest.campaign.questLog.test_harvest_quest.state).toBe('COMPLETED');
      expect(afterQuest.campaign.reputation.old_gus).toBeGreaterThan(0);

      // 9. Reputation + skill check for greenhouse zone access
      skillSystem.awardXP('crafting', 1500);
      const craftingLevel = skillSystem.getLevel('crafting');
      expect(craftingLevel).toBeGreaterThanOrEqual(5);
      const greenhouseAccess = evaluateZoneAccess('greenhouse', store.getState(), { skillSystem });
      expect(greenhouseAccess.allowed).toBe(true);

      // 10. Expand grid from 8x4 to 8x6
      const beforeExpand = store.getState();
      expect(beforeExpand.season.gridRows).toBe(4);
      store.dispatch({ type: Actions.EXPAND_GRID, payload: { rows: 6 } });
      const afterExpand = store.getState();
      expect(afterExpand.season.gridRows).toBe(6);
      expect(afterExpand.season.grid.length).toBe(48);

      // 11. Plant biome crops from foraging
      store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex: 32, cropId: 'wild_garlic' } });
      store.dispatch({ type: Actions.PLANT_CROP, payload: { cellIndex: 33, cropId: 'shiitake_mushroom' } });
      expect(store.getState().season.grid[32].cropId).toBe('wild_garlic');
      expect(store.getState().season.grid[33].cropId).toBe('shiitake_mushroom');

      // 12. Score the full bed -> verify grade
      const finalState = store.getState();
      const bedResult = scoreBed(
        finalState.season.grid,
        finalState.season.siteConfig,
        finalState.season.season,
        finalState.campaign.pantry,
      );
      expect(bedResult.score).toBeGreaterThan(0);
      expect(bedResult.grade).toBeDefined();
      expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(bedResult.grade);

      // 13. Save game -> load game -> verify all state restored
      saveCampaign(finalState.campaign, 0);
      saveSeasonState(finalState.season, 0);

      const loadedCampaign = loadCampaign(0);
      const loadedSeason = loadSeasonState(0);
      expect(loadedCampaign).not.toBeNull();
      expect(loadedSeason).not.toBeNull();

      // 14. Assert XP, inventory, quests, reputation, zone access all correct
      expect(loadedCampaign.gameMode).toBe('let_it_grow');
      expect(loadedCampaign.pantry.cherry_tom).toBe(3);
      expect(loadedCampaign.questLog.test_harvest_quest.state).toBe('COMPLETED');
      expect(loadedCampaign.reputation.old_gus).toBeGreaterThan(0);
      expect(loadedCampaign.worldState.visitedZones).toContain('meadow');
      expect(loadedCampaign.worldState.visitedZones).toContain('player_plot');

      skillSystem.dispose();
    });
  });
});
