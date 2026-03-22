# Claude Prompt — Phase 0E: Integration Test Harness

## Task

Design and implement a lightweight integration test harness that validates the core game loop works end-to-end after the Phase 0 refactoring (InputManager, Store, main.js decomposition).

## Context

Phase 0 restructures the internal architecture without changing gameplay. The integration tests verify that the refactoring didn't break anything by testing the full flow: game initialization → phase progression → event handling → scoring → save/load.

## What to Build

Create `src/test/integration.test.js` using Vitest (already in the project).

### Test Scenarios

**1. Full Season Playthrough**
- Initialize a new game (store with fresh state)
- Plant 8+ crops on the grid (minimum required)
- Advance through all 6 phases: PLANNING → EARLY → MID → LATE → HARVEST → TRANSITION
- Verify state transitions are correct at each phase
- Verify at least 1 event is drawn per beat phase
- Verify harvest scoring produces a valid grade (A+ through F)

**2. Save/Load Round-Trip**
- Play through 2 seasons
- Save to slot 1
- Create a fresh store
- Load from slot 1
- Verify all campaign state matches: chapter, season, pantry, keepsakes, soilHealth
- Verify season state is rebuildable from campaign data

**3. Store Dispatch Integrity**
- Dispatch every action type defined in the store
- Verify each produces expected state change
- Verify subscribers are notified for each action
- Verify unknown actions are no-ops

**4. Input → Action Pipeline**
- Verify InputManager correctly registers default actions
- Verify action callbacks fire on simulated key events
- Verify pointer position tracking works

**5. Scoring Consistency**
- Set up a known grid configuration (specific crops in specific cells)
- Compute scores
- Verify scores match expected values (document expected values in test)
- Change one cell, re-score, verify only that cell + adjacents changed

**6. Event Engine Determinism**
- Draw events with same chapter/season/seed → verify same events drawn
- Apply event to known grid state → verify damage/protection applied correctly

### Test Utilities

Create `src/test/test-helpers.js`:

```js
// Create a store with a predefined grid state
export function createTestStore(gridOverrides = {}) { ... }

// Plant a specific crop layout
export function plantGrid(store, layout) { ... }
// layout: { 0: 'tomato_01', 5: 'basil_01', ... }

// Advance N phases
export function advancePhases(store, n) { ... }

// Simulate a key event for InputManager
export function simulateKey(inputManager, key) { ... }

// Assert grid state matches expected
export function assertGridState(store, expected) { ... }
```

## Approach

1. Read the refactored code (store.js, input-manager.js, game-init.js, phase-router.js)
2. Understand the dispatch/action patterns
3. Write tests that exercise the full pipeline
4. Ensure tests are fast (< 5 seconds total)
5. Ensure tests are deterministic (no timing dependencies, no real DOM if possible)

## Constraints

- Use Vitest (already installed)
- No browser-dependent tests (mock DOM if needed via jsdom)
- Tests must be runnable with `npx vitest run`
- No external test dependencies beyond what's already in package.json
- Tests should be maintainable — clear assertions, descriptive test names

## Deliverable

- `src/test/integration.test.js` — 6 test scenarios above
- `src/test/test-helpers.js` — shared utilities
- All tests passing

## After completing changes

- Commit with message: `test: add integration test harness for Phase 0 refactoring`
- Do NOT push
