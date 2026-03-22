# Codex Prompt — Phase 0C: Decompose main.js

## Task

Refactor `src/main.js` from a monolithic orchestrator into a thin boot + wire-up file by extracting concerns into dedicated modules.

## Why

main.js currently handles: game initialization, phase routing, UI binding, input handling, cutscene triggers, and render loop orchestration. For the expansion, main.js needs to be a ~150-line boot file that wires modules together. Each concern gets its own module.

## Prerequisites

This task assumes 0A (InputManager) and 0B (Store) are already complete. main.js should already import InputManager and Store.

## Deliverable

Extract these concerns from main.js:

### 1. `src/game/game-init.js`
- Create initial game state from save or new game
- Set up the store with initial state
- Load canonical data (crops, events, dialogue)
- Return configured store + data refs

### 2. `src/game/phase-router.js`
- Route phase transitions: when store dispatches ADVANCE_PHASE, call the right phase handler
- Connect phase-machine.js outputs to store dispatches
- Trigger cutscenes based on phase results

### 3. `src/ui/ui-binder.js`
- Wire DOM elements to store state
- Subscribe to store changes and update UI panels
- Handle UI events (button clicks, tab switches) → dispatch to store

### 4. Resulting main.js structure

```js
import { InputManager } from './input/input-manager.js';
import { Store, gameReducer } from './game/store.js';
import { initGame } from './game/game-init.js';
import { PhaseRouter } from './game/phase-router.js';
import { bindUI } from './ui/ui-binder.js';
import { createGardenScene } from './scene/garden-scene.js';
import { startLoop } from './game/loop.js';

// Boot
const { store, data } = initGame();
const input = new InputManager(canvas);
const scene = createGardenScene(store, input);
const router = new PhaseRouter(store, scene, data);
bindUI(store, input, router);
startLoop(scene, store, input);
```

main.js should be under 50 lines — just imports, wiring, and boot.

## Constraints

- No external dependencies
- No behavior changes — game must play identically before and after
- Each extracted module exports a clean API
- No circular imports
- Preserve all existing keyboard shortcuts, button handlers, panel switching

## Testing

- Run existing test suite: `npx vitest run`
- Manual: start new game, play through 1 full season, verify all phases work
- Manual: save, reload, load save — verify persistence
- Manual: test all UI panels (backpack, journal, calendar, event cards)

## After completing changes

- Commit with message: `refactor: decompose main.js into game-init, phase-router, ui-binder`
- Do NOT push
