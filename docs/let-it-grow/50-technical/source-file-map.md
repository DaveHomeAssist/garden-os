# Source File Map

## Directory Structure

```
garden-os/story-mode/
├── index.html              — Game shell (HUD, panels, canvas viewport)
├── package.json            — three@0.180, vite@7.1, vitest@3.2
├── vite.config.js          — Base: /garden-os/story-mode-live/, dev: 0.0.0.0:5174
├── assets/
│   └── css/
│       └── theme.css       — Design system (colors, dialogue, portraits, responsive)
└── src/
    ├── main.js             — Orchestrator (state, input, UI routing, cutscene triggers)
    ├── data/
    │   ├── crops.js        — Crop/recipe accessors, faction queries, yield analysis
    │   ├── events.js       — Weighted event draw, season/chapter filtering
    │   ├── cutscenes.js    — 50+ static scenes + 3 dynamic builders
    │   ├── cutscenes.test.js — 13-category validation (154+ scenarios)
    │   ├── keepsakes.js    — 7 collectible milestones
    │   ├── loader.js       — Build-time JSON import (offline-capable)
    │   ├── portraits.js    — 5 characters × 6 emotions, CSS layers
    │   └── speakers.js     — 6 speaker profiles (position, animation, emoji)
    ├── game/
    │   ├── phase-machine.js — 6-phase turn engine (PLAN→EARLY→MID→LATE→HARVEST→TRANSITION)
    │   ├── event-engine.js  — Event application: targeting, damage, protection, carry-forward
    │   ├── intervention.js  — 6 player actions: protect, mulch, patch, prune, swap, accept
    │   ├── cutscene-machine.js — Queued playback: priority, typing, camera/mood integration
    │   ├── save.js          — 3-slot localStorage: campaign, season, keepsakes, journal
    │   ├── state.js         — Core structures: grid (8×4), campaign, season, phase enum
    │   └── loop.js          — requestAnimationFrame render loop (delta capped at 50ms)
    ├── scene/
    │   ├── garden-scene.js  — Three.js renderer: shadows, lighting, crops, props, raycasting
    │   ├── bed-model.js     — Cedar raised bed: 32 cells, trellis, critter guard, labels
    │   ├── camera-controller.js — Orbit/zoom, preset poses with lerp, touch support
    │   ├── scenery.js       — Procedural: house, fence, landscape, seasonal swaps, particles
    │   └── weather-fx.js    — Rain (300 pts), frost plane, sun rays, keyword-triggered
    ├── scoring/
    │   ├── bed-score.js     — Aggregate: fill ratio, diversity, recipe, grade (A+ to F)
    │   └── cell-score.js    — 6-factor weighted: sun, support, shade, access, season, adjacency
    └── ui/
        ├── backpack-panel.js   — Keepsakes, recipes, pantry, season trail
        ├── chapter-text.js     — 12 chapter titles + narrative text
        ├── dialogue-panel.js   — Visual novel: portrait layers, typing, accessibility
        ├── event-card.js       — Bottom-sheet intervention picker, token tracking
        ├── harvest-reveal.js   — Animated score, factor bars, recipe/keepsake display
        ├── pause-panels.js     — Journal + bug report archives
        ├── read-only-sheet.js  — Generic modal framework (XSS-safe)
        ├── season-calendar.js  — HUD calendar with beat progress dots
        └── winter-review.js    — Year-end review: soil, performance, strategic hints
```

## External Data Dependencies

| File | Location | Purpose |
|------|----------|---------|
| `CROP_SCORING_DATA.json` | `specs/` (parent dir) | Crop definitions, scoring params |
| `EVENT_DECK.json` | `specs/` (parent dir) | Canonical event deck |
| `DIALOGUE_ENGINE.json` | `specs/` (parent dir) | Dialogue routing data |

These are imported at build time via `loader.js` and Vite path alias.

## Key Architectural Rules

1. **Game engine owns facts** — crop growth, event draws, harvest math
2. **Narrative layer owns presentation** — cutscenes, camera, dialogue timing
3. **Scene syncs to state each frame** but never mutates it
4. **Scoring is pure math** — no side effects
5. **UI receives state, returns callbacks** — no direct state access
6. **Phase machine returns structured results** with narrative triggers (not silent mutation)
