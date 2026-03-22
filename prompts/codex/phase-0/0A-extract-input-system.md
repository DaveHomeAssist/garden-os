# Codex Prompt — Phase 0A: Extract Input System

## Task

Extract all input handling (keyboard, mouse, touch) from `main.js` into a new dedicated `src/input/input-manager.js` module.

## Why

The current `main.js` handles input inline alongside game logic, UI routing, and rendering orchestration. The Let It Grow expansion needs free-roam movement (WASD/touch), tool switching, and proximity interaction — none of which can cleanly bolt onto the current monolithic input handling.

## Current State

In `src/main.js`, look for:
- `addEventListener('keydown', ...)` — keyboard handling
- `addEventListener('click', ...)` / `addEventListener('pointerdown', ...)` — mouse/touch for cell selection
- `addEventListener('touchstart', ...)` / `addEventListener('touchmove', ...)` — touch gestures
- Raycaster setup for cell picking (may be in `garden-scene.js`)

These are scattered across main.js and possibly garden-scene.js. All need to route through a single input manager.

## Deliverable

Create `src/input/input-manager.js` with this API:

```js
export class InputManager {
  constructor(canvas, options = {}) { ... }

  // Register a named action with its bindings
  // Example: registerAction('select_cell', { keys: ['Enter', 'Space'], pointer: true })
  registerAction(name, bindings) { ... }

  // Subscribe to an action
  // callback receives { action, source: 'keyboard'|'pointer'|'touch', event, position }
  on(actionName, callback) { ... }

  // Unsubscribe
  off(actionName, callback) { ... }

  // Called each frame — updates held-key state, pointer position
  update(dt) { ... }

  // Query: is this key currently held?
  isKeyHeld(key) { ... }

  // Query: current pointer/touch position in normalized coords
  getPointerPosition() { ... }

  // Cleanup all listeners
  dispose() { ... }
}
```

### Default Actions to Register

| Action | Keys | Pointer | Touch | Purpose |
|--------|------|---------|-------|---------|
| `select_cell` | Enter, Space | click | tap | Select grid cell |
| `cancel` | Escape | — | — | Close panel, deselect |
| `next_tool` | Tab, ] | — | — | Cycle tool forward |
| `prev_tool` | Shift+Tab, [ | — | — | Cycle tool backward |
| `pause` | P, Escape | — | — | Toggle pause |
| `move_up` | W, ArrowUp | — | — | (Reserved for Phase 1) |
| `move_down` | S, ArrowDown | — | — | (Reserved for Phase 1) |
| `move_left` | A, ArrowLeft | — | — | (Reserved for Phase 1) |
| `move_right` | D, ArrowRight | — | — | (Reserved for Phase 1) |

Movement actions should be registered but not wired to anything yet — they'll be consumed in Phase 1.

## Modify main.js

1. Remove all `addEventListener` calls for keyboard/mouse/touch
2. Import and instantiate `InputManager`
3. Wire existing handlers through `inputManager.on('action_name', handler)`
4. Call `inputManager.update(dt)` in the render loop
5. Pass `inputManager` to any module that needs input (e.g., garden-scene for raycasting)

## Constraints

- No external dependencies
- Must not break any existing input behavior — cell selection, pause, keyboard shortcuts must all work identically
- Touch support must be preserved for mobile
- The Raycaster in garden-scene.js should receive pointer position from InputManager rather than setting up its own listeners
- Export as ES module (Vite handles bundling)

## Testing

After changes:
- Verify cell selection works via click and keyboard
- Verify pause toggle works
- Verify touch/tap works on mobile viewport
- Verify no duplicate event listeners (check with browser devtools)
- Run existing test suite: `npx vitest run`

## After completing changes

- Commit with message: `refactor: extract input system from main.js into InputManager`
- Do NOT push — leave for manual review
