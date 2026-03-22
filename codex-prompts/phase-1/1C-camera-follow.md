# Codex Prompt — Phase 1C: Camera Follow System

## Task

Modify `src/scene/camera-controller.js` to add a follow mode that tracks the player character while preserving all existing preset pose functionality.

## Current State

`camera-controller.js` implements:
- Orbit controls with spherical coordinate clamping
- Zoom range: 4.4–11.5
- 6 preset poses (Overview, Closeup, Side, Birds, Chapter Intro, Harvest Hero)
- Lerp-based smooth transitions between presets
- Touch support (pinch zoom, drag orbit)

## Deliverable

Add to the existing CameraController:

```js
// New methods to add:

// Enable follow mode — camera tracks a target position
setFollowTarget(targetGetter) {
  // targetGetter is a function returning { x, y, z }
  // Camera maintains its current offset from target
  // Orbit controls still work (player can rotate around character)
}

// Disable follow mode — return to fixed/preset mode
clearFollowTarget() { ... }

// Set follow parameters
setFollowParams({
  offset,        // { x, y, z } — camera offset from target (default: { x: 0, y: 5, z: 7 })
  smoothing,     // 0–1 — how quickly camera catches up (default: 0.08)
  lookAtOffset,  // { x, y, z } — offset for lookAt target (default: { x: 0, y: 0.5, z: 0 })
}) { ... }
```

### Follow Behavior

1. Camera position = `target + offset`, interpolated with smoothing factor
2. Camera lookAt = `target + lookAtOffset`
3. Orbit controls adjust the offset — when player orbits, the offset rotates but follow continues
4. Zoom adjusts the offset distance (closer/further from character)
5. When follow is active, preset poses are temporarily disabled (calling a preset in follow mode has no effect)
6. Smooth transition when entering/exiting follow mode (lerp over 0.5s)

### Integration

- Phase 1B's MovementController provides the target getter: `() => playerModel.mesh.position`
- In Let It Grow mode: `camera.setFollowTarget(() => player.mesh.position)`
- In Story Mode: `camera.clearFollowTarget()` (existing preset behavior unchanged)

## Constraints

- Must not break existing preset pose system
- Must not break existing orbit/zoom controls
- Touch support must work in follow mode (pinch zoom, drag orbit still function)
- Camera must never clip through the ground plane (clamp Y > 1.0)
- Smooth — no jitter, no snapping

## Testing

- Manual: enable follow, move player — camera tracks smoothly
- Manual: orbit while following — offset rotates, follow continues
- Manual: zoom while following — works correctly
- Manual: switch to Story Mode — presets work normally
- Manual: transition into/out of follow mode is smooth
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add camera follow mode for player tracking`
- Do NOT push
