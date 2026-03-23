# Hybrid Render Spec — Garden OS Story Mode

**Date:** 2026-03-22
**Scope:** Selective sprite integration into the existing procedural 3D runtime
**Rule:** Keep procedural geometry as the world backbone. Sprites add personality, not replace structure.

---

## Current State

### Renderer
- Three.js WebGL2, fallback WebGL1
- DPR capped at 2.0, PCFSoftShadowMap 1024x1024
- ACESFilmic tone mapping, FogExp2 (density 0.022)
- Fixed timestep 1/60

### Scene Graph (all procedural)
| Layer | Objects | File |
|-------|---------|------|
| Sky | Gradient canvas sphere (r=50) | garden-scene.js:155 |
| Ground | 40x40 vertex-colored plane | garden-scene.js:181 |
| Bed | Cedar frame, 32 soil cells (8x4, 0.5m) | bed-model.js |
| Crops | 8 faction geometries, growth-scaled | garden-scene.js:889-1169 |
| Scenery | Fence, trees, porch, house, neighbor house | scenery.js |
| Creatures | Cat, neighbor arm, sheepdog, bird, butterflies | garden-scene.js:211-727 |
| Player | Rigged avatar with 5 swappable tools | player-character.js |
| Weather | Rain, frost overlay, sun rays | weather-fx.js |
| Atmosphere | Leaves (fall), snow (winter), puddles (spring), string lights | garden-scene.js:542-701 |

### Style System (scene-style.js)
| Mode | Tone Map | Exposure | Shadows | Fog | Saturation | Use |
|------|----------|---------|---------|-----|------------|-----|
| Planner | None | 1.0 | Off | 0 | 0.55 | Planning/Inspect |
| Story | ACES | 1.18 | On | 1.0x | 1.0 | Narrative phases |
| Celebration | ACES | 1.25 | On | 0.78x | 1.08 | Harvest/Grade |

### Sprite Infrastructure (sprite-loader.js)
- 16 single textures (bed layers, crop icons, env, UI)
- 8 sprite sheets (crop-sheet, bed-seasons, 6 growth-stage sheets)
- 4 growth stages: SEED / SPROUT / GROWING / HARVEST
- Frame extraction via UV offset/repeat, SRGB, linear filter
- Lazy-loaded, cached by key+frame
- **Status: loaded but not wired into 3D scene rendering**

### Performance
- ResourceTracker for geometry/material/texture disposal
- Raycasting limited to bed.cellMeshes only
- Object pooling (dust puffs, weather particles)
- Visibility gating per creature/seasonal element
- Crop mesh signature cache (JSON.stringify dedup)

---

## Gaps

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| G1 | Sprite loader textures not applied to any 3D meshes | Growth stage sprites exist but crops render as procedural geometry only | P1 |
| G2 | No character portrait/bust system | Dialogue has no visual identity — characters are only referenced by name | P1 |
| G3 | No cutscene insert renderer | Chapter transitions and story beats are text-only | P2 |
| G4 | No billboard sprite component | Critters and crop accents can't use sprite overlays | P2 |
| G5 | No reaction frame system | Dialogue lacks emotional range — no visual response to events | P2 |
| G6 | Crop growth stages are scale-only | 0.4x → 0.7x → 1.0x scale, no visual differentiation per stage | P2 |
| G7 | No harvest/celebration visual FX beyond exposure bump | Celebration mode changes lighting but has no particle reward beats | P3 |
| G8 | No recipe reward visuals | Recipes are data-only, no visual payoff moment | P3 |

---

## Hybrid Render Architecture

### Principle
Procedural geometry = **structure and simulation truth**
Sprites = **identity, emotion, and garnish**

Never let a sprite override placement logic, scoring, or growth state. Sprites read from game state; they don't drive it.

### Integration Points

```
game-state (crops.js, phase, season)
       |
       v
garden-scene.js sync()
       |
       +---> procedural crop mesh (position, faction geometry, damage tint)
       |         |
       |         +---> sprite accent overlay (billboard, growth stage texture)
       |
       +---> creature meshes (procedural skeleton)
       |         |
       |         +---> sprite portrait (dialogue system, bust frame)
       |
       +---> cutscene layer (overlay div or HUD canvas)
                 |
                 +---> sprite insert cards (chapter art, reaction frames)
```

### New Components

**1. BillboardSprite (scene utility)**
```
createBillboardSprite(texture, width, height, anchor)
  - THREE.Sprite or PlaneGeometry facing camera
  - anchor: 'bottom' (crops) or 'center' (critters)
  - auto-scales with camera distance (optional)
  - respects scene style saturation/tint
```

**2. CropAccentLayer (per-cell overlay)**
```
syncCropAccent(cellIndex, cropId, growthStage, season)
  - reads from sprite-loader.getGrowthTexture(cropId, stage)
  - positions billboard above procedural crop mesh
  - blends: SEED=hidden, SPROUT=0.3 opacity, GROWING=0.6, HARVEST=1.0
  - fallback: no accent if texture missing (procedural still renders)
```

**3. PortraitRenderer (dialogue/cutscene)**
```
showPortrait(characterId, emotion, position)
  - HTML overlay or canvas HUD (not in 3D scene)
  - character bust sprite with emotion variant
  - slide-in animation, auto-dismiss
  - positions: 'left', 'right', 'center'
```

**4. EventFXPool (celebration/harvest)**
```
triggerHarvestFX(cellPosition, cropId)
  - sprite confetti burst (pooled, 8-12 particles)
  - crop-colored particles from crop emoji palette
  - 1.5s lifetime, gravity + fade
```

---

## Asset Wiring Order

### Phase 1 — Character Identity (highest ROI)
**Goal:** Characters become visually distinct in dialogue

| Task | Asset Needed | Wire Into | Effort |
|------|-------------|-----------|--------|
| 1.1 | Garden GURL bust (neutral, happy, worried, determined) | PortraitRenderer | 4 sprites + renderer |
| 1.2 | Onion Man bust (neutral, grumpy, surprised) | PortraitRenderer | 3 sprites |
| 1.3 | Vegeman bust (neutral, heroic, tired) | PortraitRenderer | 3 sprites |
| 1.4 | Portrait slide-in/out animation | PortraitRenderer | CSS/canvas anim |

**Ship gate:** Dialogue scenes show character portrait beside text.

### Phase 2 — Crop Growth Presentation
**Goal:** Growth stages are visually distinct beyond scale

| Task | Asset Needed | Wire Into | Effort |
|------|-------------|-----------|--------|
| 2.1 | BillboardSprite utility | garden-scene.js | New component |
| 2.2 | CropAccentLayer sync | garden-scene.js sync() | Per-cell overlay logic |
| 2.3 | Wire existing grow-*.png sheets | sprite-loader → CropAccentLayer | 6 crops x 4 stages |
| 2.4 | Growth opacity blend | CropAccentLayer | SEED=0, SPROUT=0.3, etc. |

**Ship gate:** Crops visually progress through 4 distinct stages. Procedural mesh still controls position/faction shape. Sprite adds surface detail.

### Phase 3 — Critter Sprites
**Goal:** Billboard critters replace or accent skeletal meshes

| Task | Asset Needed | Wire Into | Effort |
|------|-------------|-----------|--------|
| 3.1 | Cat sprite (sitting, pouncing) | garden-scene.js cat section | 2 frames |
| 3.2 | Bird sprite (perched, flying) | garden-scene.js bird section | 2 frames |
| 3.3 | Butterfly sprite sheet (4-frame wing cycle) | butterfly section | Replace geometry |
| 3.4 | Billboard facing in render loop | render() | Camera-aligned rotation |

**Ship gate:** Critters render as sprites that face camera. Sheepdog stays procedural (has full skeletal animation).

### Phase 4 — Event FX & Celebration
**Goal:** Harvest moments feel rewarding

| Task | Asset Needed | Wire Into | Effort |
|------|-------------|-----------|--------|
| 4.1 | EventFXPool (confetti particles) | garden-scene.js | New pooled system |
| 4.2 | Harvest burst trigger | sync() on HARVEST phase entry | Per-cell FX |
| 4.3 | Recipe reward card (HTML overlay) | cutscene layer | Portrait-style slide-in |
| 4.4 | Chapter intro pose card | cutscene layer | Full-width sprite |
| 4.5 | Seasonal transition card | cutscene layer | Fade overlay |

**Ship gate:** Harvesting a crop triggers a visual reward. Recipe completion shows a styled card.

---

## Rules

1. **Planner mode never shows sprites.** Flat, inspectable, no ambiguity. Sprite accents only render in Story and Celebration modes.

2. **Procedural mesh is always the placement authority.** Sprite billboard reads position from the procedural crop mesh group. If the mesh doesn't exist, the sprite doesn't render.

3. **Missing textures fail silently.** sprite-loader already warns on missing PNGs. CropAccentLayer and PortraitRenderer must handle null textures gracefully — show procedural fallback, not a broken scene.

4. **No texture bombing.** Maximum active sprite textures at any time: 32 crop accents + 6 critter frames + 1 portrait + 1 event card = ~40. Well within WebGL texture unit limits.

5. **Celebration mode is the only mode that adds FX particles.** Story mode gets sprite accents. Celebration adds confetti/reward beats on top.

6. **Sprites are cosmetic, not semantic.** Game state, scoring, and save data never reference sprite assets. A player with no textures loaded gets full gameplay with procedural visuals only.

---

## Ship Gates (Go/No-Go)

| Phase | Gate | Verification |
|-------|------|-------------|
| 1 | Portrait shows in dialogue, dismisses cleanly, no layout shift | Manual: trigger 3 dialogue scenes |
| 2 | All 6 crops show 4 distinct growth stages in Story mode | Manual: advance through full season |
| 2 | Planner mode shows zero sprite accents | Manual: switch to planner mid-season |
| 3 | Critter billboards face camera at all orbit angles | Manual: orbit 360 degrees |
| 3 | Sheepdog still runs with full skeletal animation | Manual: trigger opening scene |
| 4 | Harvest FX fires once per cell, pools correctly, no leak | Console: check ResourceTracker count after 32 harvests |
| 4 | Recipe card shows and dismisses without blocking input | Manual: complete a recipe |
| All | No regression in 60fps on 2x DPR mobile Safari | Performance: run 5-minute session, check frame drops |
