# Codex Prompt — Phase 1D: Proximity Interaction

## Task

Create a proximity-based interaction system that replaces click-to-select with walk-up-and-interact for Let It Grow mode.

## Context

In Story Mode, players click cells directly. In Let It Grow, players walk near a cell and press an interact button. This task creates the proximity detection and interaction trigger system.

## Deliverable

Create `src/game/interaction.js`:

```js
export class InteractionSystem {
  constructor(store, inputManager, movementController, gridLayout) {
    // store — from Phase 0B
    // inputManager — from Phase 0A
    // movementController — from Phase 1B
    // gridLayout — cell positions in world space: [{ index, x, z, width, depth }]
  }

  // Call each frame — detects nearby interactables, shows prompt
  update(dt) { ... }

  // Get the currently highlighted interactable (or null)
  getHighlighted() { ... }

  // Register a custom interactable (for NPCs, objects — Phase 2+)
  registerInteractable(id, { position, radius, onInteract, label }) { ... }

  // Remove a custom interactable
  unregisterInteractable(id) { ... }

  // Cleanup
  dispose() { ... }
}
```

### Interaction Flow

1. Each frame, calculate distance from player to all interactables (grid cells + custom)
2. Find the closest interactable within interaction radius (default: 0.6 units)
3. If found and it's different from current highlight:
   - Remove highlight from previous
   - Add highlight to new target (visual glow on cell mesh)
   - Show interaction prompt UI
4. If player presses interact action (`select_cell` from InputManager):
   - Trigger the interactable's handler
   - For grid cells: dispatch to store (same as current click behavior)
5. If no interactable in range: clear highlight and hide prompt

### Interaction Prompt UI

- Small floating label above the highlighted object
- Shows: "[E] Plant" or "[E] Harvest" or "[E] Talk" depending on context
- Styled with `--soil` background, `--cream` text, DM Mono font
- Positioned via CSS transform tracking the 3D object's screen position
- On mobile: shows a tap-target button instead of keyboard hint

### Grid Cell Positions

The garden bed model (bed-model.js) creates 32 cells in an 8×4 grid. The interaction system needs their world-space positions. Read these from the bed model's mesh children or compute from known grid dimensions:
- Cell width: ~0.25 units
- Grid origin: centered on bed model
- 8 columns (X axis), 4 rows (Z axis)

### Visual Highlight

When a cell is highlighted:
- Add a subtle emissive glow to the cell mesh (emissive color: `#e8c84a` at intensity 0.3)
- Animate: pulse emissive intensity between 0.2 and 0.4 (sine wave, period 1.5s)
- Remove glow when no longer highlighted

## Constraints

- No external dependencies
- Must coexist with Story Mode's click-to-select (both systems can be active, but proximity only triggers in Let It Grow mode)
- Performance: only check nearby cells, not all 32 every frame (spatial hash or distance-sorted early exit)
- Highlight must not conflict with existing cell selection visuals

## Testing

- Manual: walk near cell — highlight appears
- Manual: walk away — highlight disappears
- Manual: press E near cell — triggers interaction
- Manual: on mobile — tap prompt button triggers interaction
- Manual: verify Story Mode click-to-select still works
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add proximity-based interaction system for Let It Grow mode`
- Do NOT push
