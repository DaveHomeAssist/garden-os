# Codex Prompt — Phase 1B: WASD/Touch Movement

## Task

Implement player movement using the InputManager (Phase 0A) to move the player model (Phase 1A) around the garden plot.

## Context

InputManager already has `move_up/down/left/right` actions registered for WASD and arrow keys. This task wires those to actual player movement with collision boundaries.

## Deliverable

Create `src/game/movement.js`:

```js
export class MovementController {
  constructor(inputManager, playerModel, bounds) {
    // inputManager — from Phase 0A
    // playerModel — from Phase 1A
    // bounds — { minX, maxX, minZ, maxZ } defining walkable area
  }

  // Call each frame — reads input state, updates player position
  update(dt) { ... }

  // Get current player position { x, z }
  getPosition() { ... }

  // Set movement speed (units per second)
  setSpeed(speed) { ... }

  // Enable/disable movement (e.g., during cutscenes, menus)
  setEnabled(enabled) { ... }

  // Cleanup
  dispose() { ... }
}
```

### Movement Spec

| Parameter | Value |
|-----------|-------|
| Walk speed | 2.0 units/second |
| Diagonal normalization | Yes — prevent faster diagonal movement |
| Collision | Rectangular bounds clamping |
| Rotation | Player faces movement direction (smooth lerp, not instant snap) |
| Rotation lerp speed | 10 × dt |

### Touch/Mobile Support

For mobile, add a virtual joystick:
- Appears on touch-start in the lower-left quadrant of the screen
- Circle base (semi-transparent, 100px radius) + thumb circle (40px)
- Maps touch-drag distance/angle to movement direction + speed
- Disappears on touch-end
- Does NOT interfere with existing touch controls (pinch zoom, tap to interact)
- Joystick DOM element is created by MovementController, appended to canvas parent

### Garden Plot Bounds

The garden bed occupies roughly:
- X: -1.0 to 1.0 (8 columns)
- Z: -0.5 to 0.5 (4 rows)

The walkable area should be larger than the bed:
- X: -2.5 to 2.5
- Z: -2.0 to 2.0

These values should be configurable via the `bounds` constructor parameter so zones can define their own walkable areas.

### Integration

- `MovementController.update(dt)` is called from the game loop
- Player position feeds into camera follow (Phase 1C) and proximity interaction (Phase 1D)
- During Story Mode, movement is disabled — only Let It Grow mode enables it

## Constraints

- No external dependencies
- Smooth movement (no jitter, no teleporting)
- 60fps budget — movement calculation must be trivial
- Touch joystick must not block existing mobile interactions

## Testing

- Manual: WASD moves player, arrow keys move player
- Manual: diagonal movement is same speed as cardinal
- Manual: player stops at bounds
- Manual: player rotates to face movement direction
- Manual: touch joystick appears and controls movement on mobile
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add WASD/touch movement with virtual joystick`
- Do NOT push
