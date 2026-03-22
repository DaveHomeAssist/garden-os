/**
 * Test Helpers — utilities for integration tests.
 * Provides factory functions and assertion helpers for the game loop,
 * store, save system, and input manager.
 */
import { createGameState, createSeasonState, PHASES, PHASE_ORDER, CELL_COUNT } from '../game/state.js';
import { Actions, Store, normalizeGameState } from '../game/store.js';
import { advance, canAdvance } from '../game/phase-machine.js';

/**
 * Create a Store with optional state overrides.
 * gridOverrides is an object keyed by cell index, with partial cell data.
 *   e.g. { 0: { cropId: 'basil' }, 3: { cropId: 'lettuce' } }
 */
export function createTestStore(gridOverrides = {}) {
  const initialState = createGameState();

  for (const [index, overrides] of Object.entries(gridOverrides)) {
    const i = Number(index);
    if (i >= 0 && i < initialState.season.grid.length) {
      Object.assign(initialState.season.grid[i], overrides);
    }
  }

  return new Store(initialState);
}

/**
 * Plant specific crops at specific positions.
 * layout is an object keyed by cell index with crop IDs.
 *   e.g. { 0: 'basil', 1: 'lettuce', 2: 'pepper' }
 */
export function plantGrid(store, layout) {
  for (const [index, cropId] of Object.entries(layout)) {
    store.dispatch({
      type: Actions.PLANT_CROP,
      payload: { cellIndex: Number(index), cropId },
    });
  }
  return store.getState();
}

/**
 * Advance through N game phases via the phase machine.
 * Uses the produceState pattern: clones state, mutates via advance(), then dispatches.
 * Returns an array of advance results.
 *
 * Note: The phase machine's advance() mutates the passed state directly,
 * then we dispatch ADVANCE_PHASE with the mutated state to update the store.
 */
export function advancePhases(store, n) {
  const results = [];

  for (let i = 0; i < n; i++) {
    const state = store.getState();

    if (!canAdvance(state.season)) {
      results.push({ advanced: false, reason: 'canAdvance returned false' });
      break;
    }

    const result = advance(state);

    if (!result.advanced) {
      results.push(result);
      break;
    }

    // Dispatch the mutated state back into the store
    store.dispatch({
      type: Actions.ADVANCE_PHASE,
      payload: { state },
    });

    results.push(result);
  }

  return results;
}

/**
 * Simulate a keyboard key event on an InputManager instance.
 * Creates and dispatches a synthetic KeyboardEvent on the keyboardTarget.
 */
export function simulateKey(inputManager, key, options = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    altKey: options.altKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    shiftKey: options.shiftKey ?? false,
  });
  inputManager.keyboardTarget.dispatchEvent(event);

  // Also dispatch keyup to clean up heldKeys
  const upEvent = new KeyboardEvent('keyup', {
    key,
    bubbles: true,
    cancelable: true,
  });
  inputManager.keyboardTarget.dispatchEvent(upEvent);

  return event;
}

/**
 * Assert grid matches expected state.
 * expected is an object keyed by cell index, each value an object of expected properties.
 *   e.g. { 0: { cropId: 'basil' }, 5: { cropId: null, damageState: 'frost' } }
 *
 * Throws if any expected property does not match.
 */
export function assertGridState(store, expected) {
  const state = store.getState();
  const grid = state.season.grid;
  const mismatches = [];

  for (const [index, props] of Object.entries(expected)) {
    const i = Number(index);
    const cell = grid[i];
    if (!cell) {
      mismatches.push(`Cell ${i}: does not exist`);
      continue;
    }

    for (const [key, expectedValue] of Object.entries(props)) {
      if (cell[key] !== expectedValue) {
        mismatches.push(
          `Cell ${i}.${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(cell[key])}`
        );
      }
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Grid state mismatch:\n  ${mismatches.join('\n  ')}`);
  }
}

/**
 * Build a planting layout that fills at least 8 cells (minimum for advancing
 * past PLANNING phase) using only crops available in chapter 1.
 * Returns an object keyed by cell index with crop IDs.
 */
export function buildMinimalLayout() {
  // Uses chapter-1 crops from CROP_SCORING_DATA.json (chapterUnlock <= 1):
  // lettuce, spinach, arugula, radish, basil, marigold
  return {
    0: 'lettuce',
    1: 'basil',
    2: 'spinach',
    3: 'arugula',
    8: 'radish',
    9: 'marigold',
    10: 'lettuce',
    11: 'basil',
  };
}

/**
 * Create a store with a minimal valid planting layout already applied.
 * Ready to advance past the PLANNING phase.
 */
export function createPlantedStore(layoutOverrides = null) {
  const store = createTestStore();
  const layout = layoutOverrides ?? buildMinimalLayout();
  plantGrid(store, layout);
  return store;
}

export { Actions, PHASES, PHASE_ORDER, CELL_COUNT };
