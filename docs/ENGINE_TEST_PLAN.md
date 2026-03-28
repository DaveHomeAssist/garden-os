# Garden OS Engine — Test Plan

**Target:** `garden-league-simulator-v4.html` (console tests) + `story-mode/` (Vitest suite)
**Generated:** 2026-03-16
**Updated:** 2026-03-28
**Test Runners:**
- Browser console diagnostic: `docs/engine-console-tests.js` — 36 tests for the v4 simulator engine
- Vitest (story-mode): `cd story-mode && npm test` — **329 tests across 28 test files**

---

## Testable Features Inventory

35 functions across 7 layers.

### Scoring Layer (6 pure functions)

| Function | Input | Output | Notes |
|----------|-------|--------|-------|
| `sunFit(crop, L)` | crop object, light value | 0–5 | Continuous scale based on min/ideal |
| `supFit(crop, row)` | crop object, row index | 1, 3, or 5 | Binary trellis check |
| `shadeFit(crop, L)` | crop object, light value | 0–5 | Shade tolerance rating |
| `accFit(crop, row)` | crop object, row index | 3–5 | Front row bonus for short crops |
| `seaFit(crop, season)` | crop object, season string | 2–5 | Cool vs warm season fit |
| `adjScore(idx, cropId, grid)` | cell index, crop ID, grid | -2 to +2 | Companion/conflict/crowding |

### Aggregation Layer (3 pure functions)

| Function | Input | Output | Notes |
|----------|-------|--------|-------|
| `effectiveLight(idx, grid)` | cell index, grid | 1–6 | Row shadow + tall crop occlusion |
| `scoreCell(idx, grid, season)` | cell index, grid, season | score object or null | Composites all 6 factors |
| `bedScore(grid, season)` | grid, season | full result | Grade, yield, recipes, factor summary |

### Event Layer (4 functions)

| Function | Input | Output | Deterministic? |
|----------|-------|--------|----------------|
| `eventPool(season)` | season string | filtered event array | Yes |
| `drawEvent(pool, state)` | pool, game state | event or null | Seeded RNG |
| `resolveTargets(event, grid)` | event, grid | cell indices | Yes (grid-index order) |
| `applyEvent(event, grid)` | event, grid | affected indices | Mutates grid |

### State Layer (6 factory functions)

| Function | Pure? | Notes |
|----------|-------|-------|
| `mkCell(r, c)` | Yes | Default cell object |
| `mkGrid()` | Yes | 32 empty cells |
| `mkCF()` | Yes | Empty carry-forward |
| `mkSeason(ch, cf)` | Yes | New season from chapter + carry-forward |
| `mkCampaign()` | Yes | Fresh campaign state |
| `countPlanted(grid)` | Yes | Count non-null cells |

### Utility Layer (5 pure functions)

| Function | Notes |
|----------|-------|
| `clamp(n, lo, hi)` | Boundary enforcement |
| `rc(i)` | Index → {row, col} |
| `ri(r, c)` | {row, col} → index |
| `nbs(i)` | Neighbor indices (4-connected) |
| `grade(score)` | 0–100 → letter grade |

### Dialogue Layer (3 stateful functions)

| Function | Notes |
|----------|-------|
| `selectLine(pool, triggerKey, charKey)` | Avoids recent repeats |
| `shouldFirePlacementDialogue(trigger)` | Throttles to every 3rd placement |
| `determinePlacementTrigger(idx, cropId)` | Reads grid for context |

### Intervention Layer (2 side-effect functions)

| Function | Notes |
|----------|-------|
| `execIntervention(i)` | Protect/mulch/swap/prune/patch |
| `doAcceptLoss()` | Skip intervention, apply event |

### Persistence Layer (6 side-effect functions)

| Function | Notes |
|----------|-------|
| `save()` / `load()` | Season state ↔ localStorage |
| `saveCampaign()` / `loadCampaign()` | Campaign state ↔ localStorage |
| `saveH()` / `loadH()` | History ↔ localStorage |

---

## Impact Assessment

### P0 — Critical (invisible bugs that compound)

| Function | Blast Radius | Frequency | Detectability |
|----------|-------------|-----------|---------------|
| `scoreCell()` | Every cell score | Every render | Low |
| `bedScore()` | Grade, pass/fail, recipes | Every render | Medium |
| `effectiveLight()` | All sun scoring | Every render | Low |
| `adjScore()` | Companion/conflict | Every render | Low |
| `applyEvent()` | Grid corruption | Every beat | Medium |
| `resolveTargets()` | Wrong cells hit | Every beat | Low |
| `drawEvent()` | Wrong event | Every beat | Medium |

### P1 — High (visible but recoverable)

| Function | Notes |
|----------|-------|
| `sunFit()`, `supFit()`, `seaFit()` | Individual factor errors |
| `doAcceptLoss()` | Double event risk |
| `execIntervention()` | Swap modifier corruption |
| `save()`/`load()` | Data loss |
| `selectLine()` | Dialogue repetition |

### P2 — Medium (annoying but contained)

| Function | Notes |
|----------|-------|
| `shadeFit()`, `accFit()` | One factor among six |
| `mkSeason()`, `mkCF()` | Wrong initial state |
| `grade()` | Cosmetic grade letter |
| `clamp()`, `rc()`, `ri()`, `nbs()` | Foundational utilities |
| Crop database integrity | Missing fields, broken refs |
| Companion symmetry | Asymmetric relationships |

### P3 — Low (cosmetic)

| Function | Notes |
|----------|-------|
| Dialogue trigger frequency | Wrong voice line timing |
| Dialogue jargon scan | Leaked internal terms |
| HOWTO jargon scan | "beat"/"token"/"faction" |

---

## Test Implementation

### Approach: Console Diagnostic (Option A)

**File:** `docs/engine-console-tests.js`

Paste into browser DevTools on the simulator page. Call `runAllTests()`. Returns a pass/fail table.

### Harness Notes

- The v4 engine is wrapped in an IIFE, so its pure functions are not directly available on `window`.
- The console runner builds a private bridge from the page's inline simulator source and exposes only the functions/data needed for diagnostics.
- Tests that mutate season state, campaign state, or localStorage run inside a sandbox that snapshots and restores live page state after each case.

### Test Count: 36 executable tests

| Priority | Count | Coverage |
|----------|-------|----------|
| P0 | 9 | Engine bridge availability, scoring determinism, light model, event determinism, Math.random scan |
| P1 | 11 | Factor ranges, adjacency, event safety, intervention transitions, dialogue trigger behavior |
| P2 | 13 | Utilities, crop data integrity, companion symmetry, bedScore aggregation, carry-forward, persistence round-trips |
| P3 | 3 | Dialogue jargon, empty pools, HOWTO jargon |
| **Total** | **36** | |

### Specific Tests

#### P0 — Scoring Determinism
- Build known grid (4 crops), score 50 times, verify bit-identical results
- Verify `scoreCell()` returns valid object for planted cells
- Verify `scoreCell()` returns null for empty cells

#### P0 — Light Model
- Empty grid: verify row 0 = 4.5, row 1 = 5.25, row 2 = 6, row 3 = 6
- Tall crop shadow: verify cell behind tall crop loses 0.5 light

#### P0 — Event Targeting
- Verify `resolveTargets()` returns same cells for same grid (deterministic)
- Verify targets are in ascending grid index order (not random)
- Scan source for `Math.random` — only allowed in `wRand` fallback

#### P1 — Factor Functions
- `sunFit()`: all 20 crops × 11 light levels → all results in [0, 5]
- `supFit()`: support crop in trellis = 5, not in trellis = 1, non-support = 3
- `accFit()`: tall crops stay flat at 3; non-tall crops rise from 3 in row 0 to 5 in row 3
- `seaFit()`: cool crop in spring = 5, summer = 2; warm crop reversed
- `adjScore()`: positive for companions, negative for conflicts, clamped to [-2, 2]

#### P1 — Intervention Safety
- Protected cell excluded from `applyEvent()` affected list
- Protected cell `eventModifier` unchanged after event
- `execIntervention()` swap preserves crop IDs and event modifiers
- `doAcceptLoss()` applies current event exactly once and logs it once
- `selectLine()` avoids immediate repeats until the pool is exhausted
- `shouldFirePlacementDialogue()` respects first-crop and every-third-placement rules
- `determinePlacementTrigger()` correctly identifies companion, conflict, and trellis contexts

#### P2 — Utilities
- `clamp()`: 5 boundary cases
- `rc()`/`ri()`: round-trip verification on corners and edges
- `nbs()`: corner = 2 neighbors, edge = 3, center = 4
- `grade()`: all 6 grade boundaries
- `countPlanted()`: empty = 0, partial = correct count

#### P2 — Crop Data
- All 20 crops have all required fields
- All companion/conflict references point to valid crop IDs
- Season multipliers in [0, 1] range
- Chapter unlocks in [1, 12] range
- Companion symmetry documented (asymmetries reported, not failed)

#### P2 — BedScore
- Empty grid: average = 0, grade = F, no cell scores
- Mixed planting: finalScore in [0, 100], valid grade, correct cell count

#### P2 — Carry-Forward + Persistence
- `mkSeason()` applies infrastructure, soil fatigue, and event-memory carry-forward correctly
- `save()` / `load()` round-trip season state
- `saveCampaign()` / `loadCampaign()` round-trip campaign state
- `saveH()` / `loadH()` round-trip history and preserve the 12-entry cap

#### P3 — Dialogue Cleanliness
- No "beat", "token", or "faction" in DIALOGUE_DB lines
- No empty pools or blank strings
- No banned jargon in HOWTO_SECTIONS

---

## Running the Tests

```
1. Open garden-league-simulator-v4.html in browser
2. Open DevTools → Console
3. Paste contents of docs/engine-console-tests.js
4. Type: runAllTests()
5. Review console.table output
```

Expected output:
```
=== Garden OS Engine Tests ===
36/36 passed, 0 failed

┌─────┬────────────────────────────────────────────┬──────┬──────────────┐
│ idx │ name                                       │ pass │ detail       │
├─────┼────────────────────────────────────────────┼──────┼──────────────┤
│ 0   │ P0: Scoring determinism (50 runs)          │ true │ All 50: 42.3 │
│ 1   │ P0: scoreCell returns object for planted   │ true │ Got score... │
│ ... │ ...                                        │ ...  │ ...          │
└─────┴────────────────────────────────────────────┴──────┴──────────────┘
```

---

## Vitest Story-Mode Suite (Option B — Now Active)

**Current count: 329 tests / 28 test files** (as of 2026-03-28)

The story-mode engine has been extracted into testable modules under `story-mode/src/`.
Run: `cd story-mode && npm test`

### Test Files by Category

| Category | File | Notes |
|---|---|---|
| **game/intervention** | `src/game/intervention.test.js` | `canUseTool`, `executeToolAction` — water/harvest/protect/mulch/plant |
| **game/store** | `src/game/store.test.js` | Reducer, all Actions, subscriber notifications |
| **game/quest-engine** | `src/game/quest-engine.test.js` | Quest lifecycle: available → active → complete/abandon |
| **game/festivals** | `src/game/festivals.test.js` | FestivalEngine: start/end/activities |
| **game/biome-crops** | `src/game/biome-crops.test.js` | BiomeCropBridge: zone lookup, unlock, forage |
| **game/crafting** | `src/game/crafting.test.js` | CraftingSystem recipe resolution |
| **game/foraging** | `src/game/foraging.test.js` | Forage actions and zone gating |
| **game/inventory** | `src/game/inventory.test.js` | Inventory slots, stacking, upgrade |
| **game/skills** | `src/game/skills.test.js` | SkillSystem XP, level-up, tool bonuses |
| **game/save** | `src/game/save.test.js` | Save/load round-trips, migration |
| **game/reputation** | `src/game/reputation.test.js` | Reputation add/decay/clamp |
| **game/interaction** | `src/game/interaction.test.js` | Proximity interaction engine |
| **game/player-controller** | `src/game/player-controller.test.js` | WASD/touch movement, collision |
| **game/tool-manager** | `src/game/tool-manager.test.js` | Tool state, durability, repair |
| **game/multi-bed** | `src/game/multi-bed.test.js` | Multiple bed acquisition and switching |
| **game/game-init** | `src/game/game-init.test.js` | Initialization and default state |
| **scene/camera-controller** | `src/scene/camera-controller.test.js` | Camera follow, clamp, zoom |
| **scene/zone-manager** | `src/scene/zone-manager.test.js` | Zone transitions and visited tracking |
| **scene/resource-tracker** | `src/scene/resource-tracker.test.js` | Asset lifecycle and disposal |
| **scene/scene-style** | `src/scene/scene-style.test.js` | Phase → scene style mapping |
| **scoring** | `src/scoring/scoring.test.js` | Scoring functions and factor weights |
| **audio** | `src/audio/audio-manager.test.js` | AudioManager play/stop/mute |
| **data/events** | `src/data/events.test.js` | Event pool, draw, targeting |
| **data/npcs** | `src/data/npcs.test.js` | NPC registry, schedules, greetings |
| **data/cutscenes** | `src/data/cutscenes.test.js` | Cutscene trigger and sequence data |
| **ui/shop-panel** | `src/ui/shop-panel.test.js` | ShopPanel render and purchase flow |
| **ui/tool-hud** | `src/ui/tool-hud.test.js` | Tool HUD active-tool display |
| **ui/zone-travel** | `src/ui/zone-travel.test.js` | Zone travel overlay |
| **integration** | `src/test/integration.test.js` | Full game-loop E2E across all phases |

---

## Future: Automated CI Tests (Option B)

When ready to extract the engine into a testable module:

1. Extract pure functions into `garden-os-engine.js`
2. Add `vitest.config.js` pointing to the module
3. Write equivalent tests using Vitest assertions
4. Add to pre-commit hook

This requires a CLAUDE.md exception for the multi-file constraint but gives real CI integration and coverage reports.

---

## Files

| File | Purpose |
|------|---------|
| `docs/ENGINE_TEST_PLAN.md` | This document — test strategy and inventory |
| `docs/ENGINE_AUDIT_TESTS.md` | 10 detailed audit specs for Codex read-only analysis |
| `docs/engine-console-tests.js` | Browser console diagnostic with a private source bridge and 36 executable tests |
