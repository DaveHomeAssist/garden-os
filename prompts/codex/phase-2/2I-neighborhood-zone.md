# Codex Prompt — Phase 2I: Neighborhood Zone Scene

## Task

Create `src/scene/zones/neighborhood.js` — the first non-garden zone, featuring NPC locations and a community feel.

## Context

The neighborhood is where players meet quest-giving NPCs. It's a simple outdoor area with identifiable NPC spots, ambient scenery, and paths connecting locations.

## Deliverable

Create `src/scene/zones/neighborhood.js`:

```js
export function createNeighborhood(store, tracker, npcRegistry) {
  // Returns: { scene, camera, update(dt), dispose() }
}
```

### Scene Layout

```
+---------------------------------------------+
|                Sky dome                       |
|  [Gus's Garden]    [Path]    [Lila's Kitchen]|
|       🌻              |            🍳         |
|                       |                       |
|       [Path] ----[Community Plot]---- [Path]  |
|                       |                       |
|  [Maya's Workshop]    |    [Back to Plot →]   |
|       🔧              |         (exit)        |
+---------------------------------------------+
```

### Scene Elements

| Element | Description | Three.js Implementation |
|---------|-------------|------------------------|
| Ground plane | Grass with worn dirt paths | PlaneGeometry + simple material (green with brown path strips) |
| Gus's Garden | Fenced area with overgrown beds | BoxGeometry fence + green cylinders (plants) |
| Maya's Workshop | Small shed structure | BoxGeometry walls + roof |
| Lila's Kitchen | Outdoor kitchen counter | BoxGeometry counter + awning |
| Community Plot | Open garden beds | Similar to player plot bed but simpler |
| Paths | Dirt walkways connecting locations | PlaneGeometry strips (brown material) |
| Trees | Decorative border trees | ConeGeometry tops + CylinderGeometry trunks |
| Zone exit | Archway back to player plot | BoxGeometry frame |

### NPC Placement

- Read NPC positions from `npcRegistry.getNPCsInZone('neighborhood', currentSeason)`
- Place NPC indicator at each position (simple colored cylinder + floating name label)
- NPC indicators are registered as interactables (Phase 1D's `registerInteractable`)
- Interacting with an NPC opens their dialogue (quest offer, greeting, etc.)

### Walkable Area

- Bounds: X: -4 to 4, Z: -3 to 3
- Paths constrain preferred movement (visual only — player can walk anywhere within bounds)

### Lighting

- Match garden scene's seasonal lighting (reuse lighting rig from garden-scene.js)
- Softer, more ambient than the focused garden plot lighting
- Hemisphere light: sky + ground colors per season

### Seasonal Variation

- Tree colors change per season (spring: bright green, summer: deep green, fall: orange/red, winter: bare)
- Seasonal props: flower pots (spring), hanging lights (summer), harvest baskets (fall), snow dusting (winter)
- Use `store.getState().campaign.season` to determine current season

## Constraints

- All resources tracked via ResourceTracker
- Scene must dispose cleanly (no leaked geometries/materials)
- No external dependencies or model files — procedural geometry only
- Keep geometry count reasonable (< 200 objects) for mobile performance
- Matches the cozy aesthetic of the garden scene

## Testing

- Manual: transition to neighborhood from player plot — scene loads
- Manual: walk around — all elements visible, NPC spots marked
- Manual: interact with NPC position — triggers dialogue
- Manual: walk to exit — returns to player plot
- Manual: seasonal variation visible
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add neighborhood zone with NPC locations and seasonal variation`
- Do NOT push
