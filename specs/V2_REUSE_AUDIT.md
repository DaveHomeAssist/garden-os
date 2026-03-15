# Garden OS v2 Reuse Audit (for v3 Build)

Date: 2026-03-15  
Source build: [`garden-league-simulator-v2.html`](../garden-league-simulator-v2.html)  
Spec baseline: [`PROMPT_CHAIN.md`](./PROMPT_CHAIN.md), [`SEASON_ENGINE_SPEC.md`](./SEASON_ENGINE_SPEC.md), [`NARRATIVE_SPEC.md`](./NARRATIVE_SPEC.md), [`SCORING_RULES.md`](./SCORING_RULES.md)

## 1) Executive Summary
- v2 is a strong **single-pass scoring sandbox**.
- v3 target is a **chaptered season engine** with `Plan -> Commit -> 3 beats -> Harvest -> Review -> Transition`.
- Reuse strategy:
  - **Keep as-is:** small utility and a11y/input patterns.
  - **Refactor:** scoring/data/render modules.
  - **Rewrite:** season flow/state machine, event/intervention engine, progression/campaign, dialogue orchestration.

## 2) Fit vs Spec (High-Level)
| Area | v2 status | v3 requirement | Decision |
|---|---|---|---|
| Bed topology | 8x4 fixed grid exists | 8x4 fixed core arena | Reuse |
| Crop placement UX | Fully implemented + keyboard | Needed in PLANNING/COMMIT phases | Reuse with light refactor |
| Scoring factors | 6 factors implemented | 6-factor deterministic scoring required | Refactor to exact rules data |
| Season flow | `planning -> simulating -> results` only | Full multi-phase state machine | Rewrite |
| Event system | No beat events | 3 beat events/season + effects | Rewrite |
| Interventions | None | 1 intervention/beat | Rewrite |
| Campaign progression | None | 12 chapters + unlocks/carry-forward | Rewrite |
| Narrative layer | Heuristic `pickNarrator` | Trigger-driven dialogue engine | Rewrite |
| Persistence | Score history only | Full season/campaign state persistence | Refactor/expand |

## 3) Reusable Foundations (Keep)
### Data/layout primitives
- Grid constants and zone model:
  - `GRID_COLS`, `GRID_ROWS`, `TRELLIS_ROWS`, `ACCESS_ROWS` at [garden-league-simulator-v2.html:909](../garden-league-simulator-v2.html#L909)
- Cell coordinate helpers:
  - `cellToRowCol`, `formatCell` at [garden-league-simulator-v2.html:1126](../garden-league-simulator-v2.html#L1126), [garden-league-simulator-v2.html:1413](../garden-league-simulator-v2.html#L1413)

### Utility and input/a11y
- Safe utility helpers:
  - `clamp`, `randomPick` at [garden-league-simulator-v2.html:1070](../garden-league-simulator-v2.html#L1070)
- Modal focus trap / keyboard protections:
  - `trapModalTabKey`, `shouldIgnoreGlobalShortcuts` at [garden-league-simulator-v2.html:1093](../garden-league-simulator-v2.html#L1093)
- Grid keyboard navigation pattern:
  - `handleGridKeydown`, roving `tabIndex` usage in `renderBoard` at [garden-league-simulator-v2.html:1563](../garden-league-simulator-v2.html#L1563), [garden-league-simulator-v2.html:1603](../garden-league-simulator-v2.html#L1603)

### Automation hooks
- Keep both hooks for testability:
  - `window.render_game_to_text` and `window.advanceTime` at [garden-league-simulator-v2.html:2005](../garden-league-simulator-v2.html#L2005)

## 4) Reuse with Refactor
### Scoring module
- Functions to retain structurally, but align to new rule tables:
  - `computeSunFit`, `computeSupportFit`, `computeShadeFit`, `computeAccessFit`, `computeSeasonFit`, `computeAdjacency`, `scoreCell`, `simulateSeason` at [garden-league-simulator-v2.html:1151](../garden-league-simulator-v2.html#L1151)
- Refactor needed because:
  - v2 uses internal constants and heuristic balances.
  - v3 needs strict parity with [`SCORING_RULES.md`](./SCORING_RULES.md) and [`CROP_SCORING_DATA.json`](./CROP_SCORING_DATA.json).

### Crop roster/data model
- Reuse data shape from `CROPS` object at [garden-league-simulator-v2.html:915](../garden-league-simulator-v2.html#L915).
- Refactor required:
  - v2 currently contains **19** crops; prompt chain target uses **20 crops** in shared context.
  - Data source should move from hardcoded inline object to external/embedded canonical spec payload.

### Results and diagnostics UI
- Reuse panel concepts and rendering plumbing:
  - `renderResults`, factor bars, violation list, history list at [garden-league-simulator-v2.html:1679](../garden-league-simulator-v2.html#L1679)
- Refactor needed for v3 outputs:
  - Add beat-by-beat event impact, intervention log, chapter objective status, carry-forward summary.

## 5) Rewrite Required (Core Gaps)
### Season state machine and commit gate
- v2 mode model is too thin:
  - `state.mode: 'planning'` with transitions to `simulating` and `results` at [garden-league-simulator-v2.html:1007](../garden-league-simulator-v2.html#L1007), [garden-league-simulator-v2.html:1793](../garden-league-simulator-v2.html#L1793)
- v3 must implement phases from [`SEASON_ENGINE_SPEC.md`](./SEASON_ENGINE_SPEC.md):
  - `PLANNING`, `COMMIT`, `EARLY_SEASON`, `MID_SEASON`, `LATE_SEASON`, `HARVEST`, `REVIEW`, `TRANSITION`.

### Event deck + interventions
- v2 has no event-resolution loop and no intervention token system.
- Required full rewrite:
  - event draws per beat, weighted by season/chapter/roster
  - intervention action resolution order
  - persistent beat logs and visible aftereffects

### Campaign/progression/meta
- v2 challenge mode (`CHALLENGES` + modal) is standalone and non-campaign:
  - [garden-league-simulator-v2.html:953](../garden-league-simulator-v2.html#L953), [garden-league-simulator-v2.html:1832](../garden-league-simulator-v2.html#L1832)
- v3 requires chapter progression, unlock sequencing, carry-forward states, recipes, mastery, journal.

### Dialogue engine
- v2 uses static heuristic commentary (`pickNarrator`) at [garden-league-simulator-v2.html:1369](../garden-league-simulator-v2.html#L1369).
- v3 requires trigger-driven narrative beats and chapter-authorial lines aligned to narrative spec.

## 6) UI Component Reuse Matrix
| Component | v2 location | Reuse decision | Notes |
|---|---|---|---|
| 3-panel app shell (`controls / board / results`) | [garden-league-simulator-v2.html:794](../garden-league-simulator-v2.html#L794) | Refactor | Keep structure; restyle to new art tokens and chapter HUD needs. |
| Crop selector listbox | [garden-league-simulator-v2.html:811](../garden-league-simulator-v2.html#L811) | Reuse | Good accessibility baseline; needs chapter-based availability locks. |
| Bed grid UI | [garden-league-simulator-v2.html:847](../garden-league-simulator-v2.html#L847) | Reuse | Core interaction can stay; must support phase locks and beat markers. |
| Score ring + factor bars | [garden-league-simulator-v2.html:873](../garden-league-simulator-v2.html#L873) | Refactor | Keep visuals as shell; data feed and reveal timing must change. |
| Event log list | [garden-league-simulator-v2.html:890](../garden-league-simulator-v2.html#L890) | Refactor | Repurpose for beat/event/intervention timeline. |
| Challenge modal | [garden-league-simulator-v2.html:894](../garden-league-simulator-v2.html#L894) | Rewrite | Replace with event cards + commit confirmation + chapter prompts. |

## 7) Suggested v3 Module Cut (from v2)
1. `core/grid.ts` equivalent (or JS module): topology + helpers + placement rules.
2. `core/scoring.js`: pure deterministic scoring from canonical data.
3. `core/season-engine.js`: phase transitions, event draw, intervention resolution.
4. `ui/board.js`: board rendering + keyboard interaction.
5. `ui/results.js`: harvest/review rendering.
6. `narrative/dialogue.js`: trigger-based line dispatch.
7. `persistence/save.js`: campaign/season state serialization.

## 8) Build Priority Recommendation
1. Keep existing v2 board interaction and keyboard model.
2. Replace `runSimulation` with full season phase engine.
3. Replace heuristic narrator with dialogue event bus.
4. Wire progression and chapter objectives.
5. Refit results screen to review/carry-forward output.

Net: v2 is a usable **interaction and scoring prototype base**, but v3’s identity depends on rewriting the simulation loop into the spec’d phase/event/intervention campaign engine.
