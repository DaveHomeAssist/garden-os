# Codex Prompt — Phase 0B: Centralize State Store

## Task

Create a centralized state store (`src/game/store.js`) that mediates all game state mutations through a dispatch → reducer → notify pattern.

## Why

Currently `main.js` directly mutates state objects in `state.js`. The expansion needs: undo/replay support, debug tools, multiplayer sync, and multiple systems (quests, reputation, inventory) all reading/writing state. A central store prevents race conditions and makes state changes auditable.

## Current State

`src/game/state.js` exports:
- `GameState` — top-level container with campaign + season refs
- `CampaignState` — persistent across 12 chapters (chapter, season, cropUnlocks, pantry, keepsakes, journal, soilHealth)
- `SeasonState` — resets each chapter (phase, grid[32], interventionTokens, events, beatScores)
- `PHASES` enum — PLANNING, EARLY_SEASON, MID_SEASON, LATE_SEASON, HARVEST, TRANSITION

`main.js` modifies these directly: `state.season.phase = PHASES.EARLY_SEASON`, `state.campaign.chapter++`, etc.

## Deliverable

Create `src/game/store.js`:

```js
export class Store {
  constructor(initialState) { ... }

  // Get current state (read-only copy or frozen ref)
  getState() { ... }

  // Dispatch an action — runs through reducer, notifies subscribers
  // action = { type: 'ADVANCE_PHASE' } or { type: 'PLANT_CROP', payload: { cellIndex, cropId } }
  dispatch(action) { ... }

  // Subscribe to state changes — callback receives (newState, action)
  subscribe(callback) { ... }

  // Unsubscribe
  unsubscribe(callback) { ... }
}

// Action types (string constants)
export const Actions = {
  ADVANCE_PHASE: 'ADVANCE_PHASE',
  PLANT_CROP: 'PLANT_CROP',
  REMOVE_CROP: 'REMOVE_CROP',
  APPLY_EVENT: 'APPLY_EVENT',
  USE_INTERVENTION: 'USE_INTERVENTION',
  SET_DAMAGE: 'SET_DAMAGE',
  SET_PROTECTION: 'SET_PROTECTION',
  UPDATE_SOIL: 'UPDATE_SOIL',
  CARRY_FORWARD: 'CARRY_FORWARD',
  ADVANCE_CHAPTER: 'ADVANCE_CHAPTER',
  AWARD_KEEPSAKE: 'AWARD_KEEPSAKE',
  PUSH_JOURNAL: 'PUSH_JOURNAL',
  LOAD_SAVE: 'LOAD_SAVE',
  NEW_GAME: 'NEW_GAME',
};

// Reducer — pure function, returns new state
export function gameReducer(state, action) { ... }
```

### Reducer Rules

1. **Pure function** — no side effects, no DOM, no localStorage
2. Returns a **new state object** (shallow copy at minimum) — do not mutate in place
3. Each action type handles one concern
4. Unknown actions return state unchanged
5. Grid operations work on cell index (0–31)

### Integration

1. In `main.js`: replace `new GameState()` with `new Store(initialState)`
2. Replace all direct state mutations with `store.dispatch({ type, payload })`
3. Replace all state reads with `store.getState()`
4. `save.js` subscribes to store for auto-save triggers
5. UI modules receive state via callbacks, never hold references

### Do NOT change these files yet

- `phase-machine.js` — it can dispatch actions via the store, but don't restructure the phase machine itself
- `event-engine.js` — same, dispatch through store but don't rewrite engine logic
- `scoring/` — scoring is pure math, doesn't need the store

## Constraints

- No external dependencies (no Redux, no MobX)
- State must be serializable (no functions, no circular refs)
- Reducer must be synchronous
- Keep it simple — this is a game, not an enterprise app. No middleware, no thunks.
- Must not break existing gameplay flow

## Testing

- Write unit tests for the reducer: `src/game/store.test.js`
- Test each action type produces expected state change
- Test that subscribers are notified
- Test that unknown actions are no-ops
- Run full test suite: `npx vitest run`

## After completing changes

- Commit with message: `refactor: add centralized state store with dispatch/reducer pattern`
- Do NOT push
