# Garden OS Story Mode — Current State Audit

> Last updated: 2026-03-22

## Module Inventory (34 source files)

### src/data/ (8 files) — Static Registries
| File | Purpose | Maturity |
|------|---------|----------|
| `crops.js` | Crop/recipe accessors: getCropById, getCropsForChapter, getCropsByFaction, recipe matching | Production |
| `events.js` | Weighted random event draw from canonical deck, season/chapter filtering | Production |
| `cutscenes.js` | 50+ static scenes + 3 dynamic builders (event/intervention/harvest commentary) | Production |
| `cutscenes.test.js` | 13-category test suite: 112 event + 24 intervention + 18 harvest scenarios | Production |
| `keepsakes.js` | 7 collectible items tied to chapter milestones, persists across campaigns | Production |
| `loader.js` | Build-time import of CROP_SCORING_DATA, EVENT_DECK, DIALOGUE_ENGINE JSONs | Production |
| `portraits.js` | 5 characters × 6 emotions, layered CSS portrait system | Production |
| `speakers.js` | 6 speaker profiles with positioning, animation, emoji, defaults | Production |

### src/game/ (7 files) — Engine
| File | Purpose | Maturity |
|------|---------|----------|
| `phase-machine.js` | 6-phase state machine: PLANNING → EARLY → MID → LATE → HARVEST → TRANSITION | Production |
| `event-engine.js` | Applies events to grid: damage types, protection, carry-forward, targeting | Production |
| `intervention.js` | 6 actions: protect, mulch, companion_patch, prune, swap, accept_loss | Production |
| `cutscene-machine.js` | Queued playback with priority, typing animation, camera/mood integration | Production |
| `save.js` | 3-slot localStorage persistence, keepsake awards, journal entries | Production |
| `state.js` | Core structures: 8×4 grid, campaign state, season state, phase enum | Production |
| `loop.js` | requestAnimationFrame render loop (game logic is event-driven, not frame-driven) | Production |

### src/scene/ (5 files) — Three.js Rendering
| File | Purpose | Maturity |
|------|---------|----------|
| `garden-scene.js` | Full renderer: shadows, tone mapping, 8 crop factions, props, raycasting, camera presets | Production |
| `bed-model.js` | 8×4 cedar frame, 32 soil cells, trellis, critter guard, grid lines, row labels | Production |
| `camera-controller.js` | Orbit/zoom with spherical coords, preset poses with lerp, touch support | Production |
| `scenery.js` | Procedural: house, fence, landscape, seasonal trees, clouds, smoke, fireflies, props | Production |
| `weather-fx.js` | Rain (300 particles), frost plane, sun rays; keyword-triggered from events | Production |

### src/scoring/ (2 files) — Math
| File | Purpose | Maturity |
|------|---------|----------|
| `bed-score.js` | Bed-level: fill ratio, diversity, recipe bonus, grade scale (A+ through F) | Production |
| `cell-score.js` | 6-factor weighted formula: sun, support, shade, access, season, adjacency | Production |

### src/ui/ (9 files) — DOM Panels
| File | Purpose | Maturity |
|------|---------|----------|
| `backpack-panel.js` | Keepsakes, recipes, pantry, season trail | Production |
| `chapter-text.js` | 12-chapter titles + narrative text | Production |
| `dialogue-panel.js` | Visual novel interface: portrait layers, speaker badge, typing, accessibility | Production |
| `event-card.js` | Bottom-sheet intervention picker with token economy | Production |
| `harvest-reveal.js` | Animated score counter, factor bars, recipe/keepsake display | Production |
| `pause-panels.js` | Journal + bug report archive sheets | Production |
| `read-only-sheet.js` | Generic modal framework with XSS prevention | Production |
| `season-calendar.js` | HUD calendar with beat progress dots | Production |
| `winter-review.js` | Year-end review: soil fatigue, best/worst cells, strategic hints | Production |

### assets/css/ (1 file)
| File | Purpose |
|------|---------|
| `theme.css` | Full design system: colors, dialogue panel, portrait animations, responsive breakpoints |

## Architecture Summary

```
main.js (orchestrator — state, input, UI routing, cutscene triggers)
├── data/     → immutable registries loaded at build time
├── game/     → turn-based engine (phase machine drives everything)
├── scene/    → Three.js visual layer (render-only, no game logic)
├── scoring/  → pure math (no side effects)
└── ui/       → DOM panels (receive state, return callbacks)
```

**Key design principle:** "Game engine owns facts. Narrative layer owns presentation. Scene syncs to state each frame but never mutates it."

## Known Gaps for Expansion
- No free-roam player movement (grid-click only)
- NPCs are commentators, not quest-givers
- Turn-based only (no real-time option)
- No audio system
- No networking/multiplayer
- No skill tree or crafting
- Single garden plot (no world zones)
