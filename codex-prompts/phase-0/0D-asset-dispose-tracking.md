# Codex Prompt — Phase 0D: Asset Dispose Tracking

## Task

Add systematic Three.js resource disposal tracking to prevent memory leaks when transitioning between zones (needed for Phase 2+).

## Why

Three.js geometries, materials, and textures must be explicitly disposed. Currently the game only has one scene that lives forever. The expansion adds zone transitions where scenes are created and destroyed. Without dispose tracking, each zone switch leaks GPU memory.

## Current State

`src/scene/garden-scene.js` — creates the main renderer, scene, lights, and delegates to:
- `bed-model.js` — creates geometries + materials for the cedar bed, cells, trellis, critter guard
- `scenery.js` — creates geometries + materials for house, fence, landscape, trees, particles
- `weather-fx.js` — creates particle systems for rain, frost plane, sun rays

None of these track what they create. No `dispose()` methods exist.

## Deliverable

### 1. Create `src/scene/resource-tracker.js`

```js
export class ResourceTracker {
  constructor() {
    this._resources = new Set();
  }

  // Track a resource (geometry, material, texture, render target)
  track(resource) {
    this._resources.add(resource);
    return resource; // allow chaining: const geo = tracker.track(new BoxGeometry(...))
  }

  // Track all resources in a Three.js object and its children
  trackObject(obj) {
    // Recursively traverse obj.children
    // Track: obj.geometry, obj.material (and material.map, material.normalMap, etc.)
    // Return obj for chaining
  }

  // Dispose all tracked resources and clear the set
  disposeAll() {
    for (const resource of this._resources) {
      if (resource.dispose) resource.dispose();
    }
    this._resources.clear();
  }

  // Count of tracked resources (for debugging)
  get count() { return this._resources.size; }
}
```

### 2. Integrate into scene modules

In each of these files, accept a `ResourceTracker` instance and use `tracker.track()` when creating:
- `garden-scene.js` — renderer, scene-level resources
- `bed-model.js` — all geometries and materials for the bed
- `scenery.js` — all geometries and materials for props
- `weather-fx.js` — particle geometries, materials, textures

### 3. Add dispose method to garden-scene.js

```js
export function disposeGardenScene(scene, tracker) {
  // Stop animation loop
  // Remove event listeners
  // tracker.disposeAll()
  // renderer.dispose()
  // renderer.domElement.remove()
}
```

## Constraints

- No external dependencies
- Don't change visual output — only add tracking wrappers
- ResourceTracker must handle: Geometry, BufferGeometry, Material (all types), Texture, WebGLRenderTarget
- Materials can have nested textures (.map, .normalMap, .envMap, etc.) — traverse them
- Must not double-dispose (Set prevents this)

## Testing

- Add `src/scene/resource-tracker.test.js` — unit test track/dispose/count
- Manual: start game, play one season, check browser devtools for WebGL resource count (via Three.js stats or renderer.info)
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add Three.js resource disposal tracking for zone transitions`
- Do NOT push
