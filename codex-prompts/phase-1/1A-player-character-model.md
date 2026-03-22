# Codex Prompt — Phase 1A: Player Character Model

## Task

Create a low-poly player character model rendered in Three.js that can walk around the garden plot.

## Context

Story Mode uses a fixed camera looking at the garden bed. Let It Grow mode adds a player avatar that walks around the garden in real-time. The avatar needs to be procedurally generated (like Calvin the sheepdog) — no external model files.

## Deliverable

Create `src/scene/player-model.js`:

```js
export class PlayerModel {
  constructor(tracker) { ... } // ResourceTracker from Phase 0D

  // The Three.js group containing the player mesh
  get mesh() { ... }

  // Set world position
  setPosition(x, z) { ... }

  // Set facing direction (radians)
  setRotation(angle) { ... }

  // Animation update — call each frame with delta time
  update(dt) { ... }

  // Start/stop walk animation
  setWalking(isWalking) { ... }

  // Equip visual (shows tool in hand — optional visual indicator)
  setEquippedTool(toolId) { ... }

  // Cleanup
  dispose() { ... }
}
```

### Visual Design

- **Style**: Simple, cozy — matches the garden aesthetic. Think low-poly Stardew Valley character.
- **Composition**: Body (rounded box), head (sphere), arms (cylinders), legs (cylinders)
- **Colors**: Use warm earth tones — `#8B6F47` (boots), `#4A7C59` (shirt/overalls), `#F5DEB3` (skin), `#654321` (hair)
- **Scale**: Roughly 0.4 units tall (garden bed cells are ~0.25 units wide)
- **Walk animation**: Simple bob (translate Y on sine wave) + leg alternation (rotate legs on X axis)
- **Idle animation**: Subtle breathing (scale Y oscillation on torso)

### Integration Points

- Player model is added to the garden scene's Three.js scene graph
- Position is controlled by the movement system (Phase 1B)
- Camera follow system (Phase 1C) targets this model's position
- ResourceTracker from Phase 0D tracks all geometries/materials

## Constraints

- Procedural geometry only — no GLB/OBJ/FBX files
- No external dependencies
- All geometries and materials tracked via ResourceTracker
- Must look good at the camera distances used in garden-scene.js (zoom range 4.4–11.5)
- Shadow casting enabled (the garden scene uses shadow maps)

## Testing

- Manual: add player model to garden scene, verify it renders at correct scale
- Manual: verify walk animation looks natural
- Manual: verify shadow casting works
- Run: `npx vitest run` (no regressions)

## After completing changes

- Commit with message: `feat: add procedural player character model with walk animation`
- Do NOT push
