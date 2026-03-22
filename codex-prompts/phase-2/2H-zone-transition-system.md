# Codex Prompt — Phase 2H: Zone Transition System

## Task

Create `src/scene/zone-manager.js` — handles loading, unloading, and transitioning between Three.js scenes for different game zones.

## Context

The expansion introduces multiple zones: player plot, neighborhood, expansion zones, event areas. Each zone is an independent Three.js scene. Only one zone is active at a time. Transitions use fade-out → dispose → load → fade-in.

## Deliverable

Create `src/scene/zone-manager.js`:

```js
export class ZoneManager {
  constructor(renderer, store, resourceTracker) {
    // renderer — shared WebGLRenderer
    // store — game state
    // resourceTracker — from Phase 0D
  }

  // Register a zone factory
  // factory: () => { scene, camera, update(dt), dispose() }
  registerZone(zoneId, factory) { ... }

  // Get currently active zone ID
  getActiveZone() { ... }

  // Transition to a new zone
  // Returns a Promise that resolves when transition is complete
  async transitionTo(zoneId, spawnPoint = null) {
    // 1. Fade overlay to black (300ms)
    // 2. Dispose current zone (tracker.disposeAll())
    // 3. Create new zone via factory
    // 4. Set player spawn point
    // 5. Fade overlay from black (300ms)
    // 6. Dispatch ZONE_CHANGED to store
  }

  // Update current zone (called each frame)
  update(dt) { ... }

  // Render current zone
  render() { ... }

  // Cleanup everything
  dispose() { ... }
}
```

### Fade Overlay

- Full-screen `<div>` with `position: fixed; inset: 0; background: black; pointer-events: none`
- Opacity transitions via CSS: `transition: opacity 300ms ease`
- Z-index above canvas but below UI panels
- Created by ZoneManager, appended to document body

### Zone Factory Contract

Each zone module exports a factory function:

```js
// Example: src/scene/zones/player-plot.js
export function createPlayerPlot(store, tracker) {
  const scene = new THREE.Scene();
  // ... build the scene ...

  return {
    scene,
    camera,
    update(dt) { /* per-frame updates */ },
    dispose() { /* zone-specific cleanup */ },
  };
}
```

### Zone Registration (in boot/main.js)

```js
zoneManager.registerZone('player_plot', () => createPlayerPlot(store, tracker));
zoneManager.registerZone('neighborhood', () => createNeighborhood(store, tracker));
// etc.
```

### Transition Triggers

Zone transitions are triggered by:
1. Player walking to a zone exit (edge of walkable area)
2. UI button (world map — Phase 5)
3. Quest events (e.g., "go talk to Maya" opens neighborhood)

The trigger system should expose:

```js
// Define zone exits as rectangular trigger areas
addZoneExit(fromZone, triggerBounds, toZone, spawnPoint) { ... }

// Check if player is in a trigger area (called each frame in update)
checkTriggers(playerPosition) { ... }
```

### Store Integration

Add actions:
- `ZONE_CHANGED` — { fromZone, toZone, spawnPoint }
- `ZONE_VISITED` — { zoneId } (for tracking first visits)

State: `campaign.worldState: { currentZone, visitedZones: Set }`

## Constraints

- Single scene at a time — never render two zones simultaneously
- Resource tracker must dispose ALL resources from previous zone
- Renderer is shared — do not create a new renderer per zone
- Transition must feel smooth — no black flicker or layout shift
- No external dependencies
- Must work on mobile (WebGL context preserved across transitions)

## Testing

- Manual: register two zones, transition between them — verify smooth fade
- Manual: verify GPU memory doesn't grow (check renderer.info.memory)
- Manual: verify player spawn point works after transition
- Unit test: zone registration, getActiveZone, transition callback order
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add zone transition system with fade effects and resource disposal`
- Do NOT push
