# Garden OS — System Map v2 Proposal

Status: Active
Last Updated: 2026-03-23
Purpose: define the canonical structure for the next revision of `system-map.html` so it reflects the actual hybrid repo, not only the legacy planner stack.
Revision Note: expanded 2026-03-23 with full node inventory, scoring pipeline, phase machine detail, edge types, criticality tiers, and data flow diagrams.

## Why This Needs To Change

The current [system-map.html](../system-map.html) is useful, but it is no longer an accurate top-level map of the repo:

- it is centered on the planner and scoring engine
- it underrepresents `story-mode/` as the active flagship runtime
- it does not show the canonical-source hierarchy across `specs/`, root `docs/`, and `docs/story-mode/`
- it does not distinguish shared resources from runtime-local assets and data
- it does not distinguish active runtime code from generated files, historical artifacts, and staging docs
- it still reads like Garden OS is one static tool chain instead of a hybrid repo

## Proposal Summary

The next system map should describe Garden OS in six layers:

1. **Public Surfaces**  
   What users and developers can open directly on GitHub Pages.
2. **Runtime Systems**  
   The actual executable branches: root static tools and the `story-mode` app.
3. **Canonical Data + Docs**  
   What is source of truth versus planning/supporting material.
4. **Shared Resources**  
   Shared runtime data, brand assets, and media that should not be duplicated per line.
5. **Persistence + Delivery**  
   localStorage, `.gos.json`, GitHub Pages, PWA assets, build output.
6. **Legacy + Future Boundaries**  
   What is historical, what is active, and what may become shared-core later.

## Proposed Canonical Map

```text
Garden OS
├─ Public Surfaces
│  ├─ Hub / index.html
│  ├─ Story Mode
│  ├─ Planner v4.3
│  ├─ Legacy Season Engine v4
│  ├─ Build + Ops + Brand + Explainers
│  └─ Dev Tools
│     ├─ Scoring Visualizer
│     ├─ Scoring Map
│     ├─ Fairness Tester
│     ├─ System Map
│     └─ System Topology
├─ Runtime Systems
│  ├─ Root Static Tools
│  │  ├─ planner logic
│  │  ├─ legacy season simulator
│  │  └─ diagnostics / explainability pages
│  └─ story-mode app
│     ├─ game state + phase machine
│     ├─ cutscene machine
│     ├─ Three.js scene layer
│     ├─ UI sheets / dialogue / review flows
│     └─ persistence + save/load
├─ Canonical Data + Docs
│  ├─ specs/
│  ├─ docs/HANDOFF.md
│  ├─ root docs/
│  └─ docs/story-mode/
├─ Shared Resources
│  ├─ future data/shared/
│  ├─ future data/<mode>/
│  ├─ assets/shared/
│  ├─ story-mode/assets/
│  └─ story-mode/src/data/
├─ Persistence + Delivery
│  ├─ localStorage
│  ├─ .gos.json import/export
│  ├─ manifest.json / sw.js
│  ├─ GitHub Pages root
│  └─ story-mode/dist
└─ Legacy + Future Boundaries
   ├─ archive/ archives/
   ├─ garden-league-simulator lineage
   ├─ output/ reports/
   └─ possible future shared-core extraction
```

## Recommended Page Sections

### 01. What Garden OS Is

Open with a short, honest framing:

- Garden OS is a browser-native garden planning and simulation repo
- the root repo ships explainability tools and legacy play surfaces
- `story-mode/` is the active flagship runtime

This section should replace planner-only framing.

### 02. Public Surface Map

Show the live routes and their user roles:

- `index.html` as launcher
- `story-mode/` as flagship playable experience
- planner, build guide, ops guide, brand guide, how-it-thinks as support surfaces
- dev tools as diagnostics and architecture views

This should map directly to the current live route registry in `docs/active-hosted-urls.md`.

### 03. Runtime Architecture

Split runtime architecture into two branches:

#### Root Static Branch

- single-file HTML tools
- no build step
- deterministic planner/scoring utilities
- legacy season sandbox

#### Story Mode Branch

- `story-mode/src/`
- Vite build
- Three.js scene layer
- phase machine
- cutscene machine
- responsive HUD/sheet UI

The current system map does not make this distinction clearly enough.

### 04. Canonical Source Hierarchy

The page should explicitly name the order of truth:

1. `specs/`
2. `docs/HANDOFF.md`
3. root `docs/`
4. `docs/story-mode/`
5. progress logs and output artifacts

This is important because the repo now contains overlapping documentation sets.

### 05. Shared Resource Boundaries

The page should explicitly show resource ownership:

- shared canon in `specs/`
- shared runtime JSON in a future `data/shared/`
- root shared brand/media under `assets/shared/`
- story-mode-only runtime assets in `story-mode/assets/`
- story-mode-only authored data in `story-mode/src/data/`

It should also show the current problem cases:

- loose root JSON/config files
- duplicate archive trees
- generated `dist/` and `output/` paths sitting near source

### 06. State + Persistence

Show where state lives and how it moves:

- planner and root tools: localStorage + `.gos.json`
- story mode: localStorage campaign/save state
- generated build: `story-mode/dist`
- hosted delivery: GitHub Pages

This should also call out that root tools and story-mode use different runtime packaging models.

### 07. Current Risks / Friction

The map should name the current architectural tensions, not hide them:

- root repo instructions still assume single-file-only architecture
- story-mode is now a built app inside the same repo
- legacy simulator and story-mode overlap in mechanics and campaign concepts
- resources are still mixed by version, scope, and lifecycle in the top-level tree
- docs are richer than the current system map suggests

### 08. Future Extraction Boundaries

This section should stay explicitly provisional.

Potential future shared-core candidates:

- deterministic scoring primitives
- phase / progression helpers
- persistence schemas
- shared garden data and event interpretation

Do not present these as an existing shared engine yet. Reuse is still mostly conceptual, not packaged. Shared resource boundaries should be cleaned up before shared-core extraction is presented as real architecture.

## Visual Proposal

The next `system-map.html` should keep the dark operator aesthetic, but shift from a single pipeline diagram to a layered topology view:

- top row: public surfaces
- middle row: runtime systems
- lower row: canonical data/docs
- footer row: persistence, deployment, legacy, and future boundaries

Recommended label colors:

- green: active user-facing surfaces
- blue: runtime systems
- amber: canonical docs/specs
- muted red: legacy or risk boundaries

## Content Rules For The New Map

- Do not describe `theme-organizer-resource` as a Garden OS system.
- Do not imply the root single-file rules apply unchanged to `story-mode/`.
- Do not present historical simulators as the primary runtime.
- Do not imply all current root-level JSON/config files are correctly placed.
- Do not collapse docs, specs, and progress logs into one undifferentiated “documentation” block.
- Do explicitly show that Story Mode is the current flagship branch.

## Minimal Implementation Plan

1. Reframe the hero and summary around the hybrid repo.
2. Replace planner-only layer blocks with a split root-tools / story-mode runtime section.
3. Add canonical-source hierarchy and shared-resource boundary sections.
4. Add live-route registry and current-risks sections.
5. Keep topology detail links pointing to `scoring-map.html` and `system-topology.html` for deep dives.

## Decision

Garden OS should be mapped as:

- a **hybrid repo**
- with **Story Mode as the flagship runtime**
- **root tools as stable support and explainability surfaces**
- **shared resources stored by scope, not by version label**
- and **specs/docs as the actual canonical backbone**

That is the clearest description of the repo as it exists on 2026-03-31.

---

## APPENDIX A — Full Node Inventory

### Layer 1: User Interface Nodes

| Node | Runtime | File | Lines | Description |
|------|---------|------|-------|-------------|
| Hub | Root | `index.html` | 409 | Public launcher with Story Mode as primary CTA |
| Story Mode | Vite | `story-mode-live/` | app | Published Three.js 3D garden, HUD, dialogue, panels built from `story-mode/` |
| Planner v4.3 | Root | `garden-planner-v4.html` | 6,076 | Grid UI, scoring panel, export/import |
| Legacy Sandbox | Root | `garden-league-simulator-v4.html` | 2,971 | Chapter-based season sandbox |
| Build Guide | Root | `garden-cage-build-guide.html` | 2,270 | Interactive cage construction specs |
| Ops Guide | Root | `garden-cage-ops-guide.html` | 1,313 | Seasonal maintenance checklist |
| Brand Guide | Root | `brand-guide.html` | — | Design tokens and component reference |
| How It Thinks | Root | `how-it-thinks.html` | ~500 | Plain-English scoring walkthrough |
| Scoring Visualizer | Root | `scoring-visualizer.html` | — | Interactive per-cell factor breakdown |
| Scoring Map | Root | `scoring-map.html` | — | Scoring architecture reference |
| Fairness Tester | Root | `fairness-tester.html` | — | Crop balance analysis across factions |
| System Map | Root | `system-map.html` | — | Ecosystem overview (this page, to be rebuilt) |
| System Topology | Root | `system-topology.html` | — | D3-based interactive system graph |

### Layer 2: Simulation & Game Engine Nodes

| Node | Owner | Description |
|------|-------|-------------|
| Scoring Engine | Shared (spec-driven) | 6-factor deterministic algorithm: sun fit (2x), support, shade, access, season, adjacency |
| Phase Machine | Story Mode | 8-phase state machine: PLANNING → COMMIT → EARLY/MID/LATE_SEASON → HARVEST → REVIEW → TRANSITION |
| Event Draw | Story Mode | Weighted random from 40-card deck with valence guarantee and chapter gating |
| Intervention System | Story Mode | 6 types (swap, prune, protect, mulch, companion patch, accept loss), 1 token/beat |
| Carry-Forward Logic | Story Mode | Soil fatigue, infrastructure persistence (mulch/compact/enrich), pantry, event memory |
| Bed Score Aggregation | Shared | Cell average + diversity/fill/tall/trellis/recipe bonuses/penalties |
| Cutscene Machine | Story Mode | Chapter intros, character interactions, portrait animations |

### Layer 3: Domain Knowledge Nodes

| Node | Canonical Source | Description |
|------|-----------------|-------------|
| Crop Database | `specs/CROP_SCORING_DATA.json` | 50 crops (20 campaign + 30 expansion), 8 factions |
| Scoring Rules | `specs/SCORING_RULES.md` | Single source of truth for the 6-factor algorithm |
| Season Engine Spec | `specs/SEASON_ENGINE_SPEC.md` | Phase machine contract, event resolution order |
| Event Deck | `specs/EVENT_DECK.json` | 40+ events with mechanical effects, seasonal pools, chapter availability |
| Dialogue Engine | `specs/DIALOGUE_ENGINE.json` | Character trigger mapping |
| Character Voices | `docs/VOICE_BIBLE.md` | 4 speakers, tone rules, speaking order |
| Recipes | Inline in crop data + story mode | 7 campaign recipes + 5 hidden Mom recipes |
| Progression | `specs/PROGRESSION_SPEC.md` | Chapter-gated crop unlocks, mastery, keepsakes |
| Narrative | `specs/NARRATIVE_SPEC.md` | 12-chapter story arc, season rotation |
| Intervention Logic | `specs/INTERVENTION_LOGIC_TABLE.md` | Rules for each intervention type |

### Layer 4: Data & Persistence Nodes

| Node | Mechanism | Scope |
|------|-----------|-------|
| Planner Workspace | localStorage `gardenOS_workspace` | Single workspace, schema-validated via `gos-schema.json` |
| Campaign State | localStorage `gos-story-slot-{0-2}-campaign` | Per-slot: chapter, pantry, keepsakes, journal, recipes |
| Season State | localStorage `gos-story-slot-{0-2}-season` | Per-slot: grid, phase, events, interventions, harvest |
| Save Slot Manager | localStorage `gos-story-active-slot` | 3 independent campaign slots |
| File Export/Import | `.gos.json` files | Planner workspace snapshots with schema validation |
| Schema Contract | `gos-schema.json` | JSON Schema 2020-12, version 1 |
| PWA Manifest | `manifest.json` + `sw.js` | Installability and offline caching |

### Layer 5: Narrative & Progression Nodes

| Node | Description |
|------|-------------|
| Campaign Progression | 12 chapters, 4 seasons/year rotation, chapter-gated crop unlocks |
| Cutscene Machine | Chapter intros, character interactions, portrait animations |
| Journal System | Per-season entries: score, grade, events, crops, timestamp |
| Keepsake Awards | Achievement-like items triggered by gameplay milestones |
| Winter Review | End-of-year retrospective with campaign summary |
| Mastery Rank | Cumulative progression metric across chapters |

---

## APPENDIX B — Scoring Pipeline (Full Detail)

### Input → Processing → Output

```
INPUT:
  Grid (32 cells, each with cropId or null)
  Site Config (sunHours, trellis, orientation, wall side)
  Season (spring / summer / fall / winter)

STEP 1: DERIVE CELL TRAITS (per cell)
  rowFromWall     ← depends on wall side + orientation
  effectiveLight  ← baseSunHours - shadowPenalty - tallCropShade
  isTrellisRow    ← row 0 if back wall (orientation-dependent)
  hasVertSupport  ← isTrellisRow AND site.trellis enabled
  accessScore     ← rowFromFront / (totalRows - 1)

STEP 2: COMPUTE 6 FACTORS (per planted cell)
  sunFit          ← f(crop.sunMin, crop.sunIdeal, effectiveLight)      → 0–5
  supportFit      ← f(crop.support, hasVertSupport)                    → 1–5
  shadeFit        ← f(crop.shadeScore, effectiveLight)                 → 0–5
  accessFit       ← f(crop.tall, row)                                  → 3–5
  seasonFit       ← f(crop.coolSeason, season)                         → 1–5
  adjacencyScore  ← sum of neighbor interactions                       → -2 to +2

STEP 3: WEIGHTED CORE
  weightedCore    ← (sunFit × 2 + supFit + shadeFit + accFit + seaFit) / 3
  seasonalMult    ← crop.seasonalMultipliers[season]                   → 0–1
  preAdjScore     ← weightedCore × seasonalMult

STEP 4: MODIFIERS
  cellScore       ← clamp(preAdjScore + adjacencyScore, 0, 10)
  + cell.eventModifier    (from event mechanical effects)
  + cell.interventionBonus (mulch +0.5, companion patch +1.0)
  - cell.soilFatigue      (carry-forward, -0.3 per consecutive heavy-feeder season, cap -0.9)
  finalScore      ← clamp(result, 0, 10)

STEP 5: BED AGGREGATION
  cellAvg         ← mean(finalScore for all planted cells)
  fillPenalty     ← (1 - sqrt(occupiedCount / 32)) × 1.5
  diversityBonus  ← +0.7 (4+ crops), +0.5 (3), +0.3 (2), 0 (1)
  tallPenalty     ← -0.8 if multiple distinct tall crops
  trellisPenalty  ← -0.6 if multiple support-requiring crops
  recipeBonus     ← +0.2 per completed recipe (max 0.8)
  bedScore        ← clamp(cellAvg + bonuses - penalties, 0, 10)

OUTPUT:
  HarvestResult { score, grade, cellScores[], bedAverage,
                  occupiedCount, yieldList[], recipeMatches[], eventImpact }
```

### Adjacency Submodel

For each orthogonal neighbor of a planted cell:
```
delta = 0
if neighbor.id in crop.companions:       delta += 0.5
if neighbor.id in crop.conflicts:        delta -= 1.2
if crop.tall AND neighbor.tall:          delta -= 0.75   (tall-tall penalty)
if neighbor.id == crop.id:               delta -= 0.2    (monoculture)
if abs(crop.water - neighbor.water) >= 2: delta -= 0.5   (water mismatch)

adjacencyScore = clamp(sum(deltas), -2, +2)
```

### Light Model

```
baseSunHours = site.sunHours             (user input, 2–10)
shadowPenalty = max(0, (2 - rowFromWall) × 0.75)
effectiveLight = max(1, baseSunHours - shadowPenalty)

if adjacent tall crop on light-source side:
    effectiveLight -= 0.5
```

---

## APPENDIX C — Phase Machine (Story Mode)

### State Transitions

```
PLANNING ─[commit]─→ EARLY_SEASON ─[advance]─→ MID_SEASON ─[advance]─→
LATE_SEASON ─[advance]─→ HARVEST ─[auto]─→ REVIEW ─[continue]─→
TRANSITION ─[auto]─→ PLANNING (next season)
```

No backward transitions after COMMIT.

### Per-Beat Flow (EARLY / MID / LATE)

```
1. Phase Machine enters beat
2. Event Draw: weighted random from eligible pool
   - Filters: not already drawn this season, chapter-available
   - Valence guarantee: beat 2 forces opposite valence if beats 0-1 were uniform
3. Player sees Event Card (mechanical effect preview)
4. Player chooses Intervention (or accept loss)
5. Intervention applies to grid first
6. Event mechanical effect resolves against modified grid
7. Scoring snapshot taken for beat
8. Beat index increments; if beat 3 complete → HARVEST
```

### Intervention Token Economy

- 1 token available per beat (not banked across beats)
- Must spend or forfeit during the beat
- 3 tokens total per season (one per beat)

### Intervention Types

| Type | Effect | Target |
|------|--------|--------|
| `swap` | Exchange crops between 2 adjacent planted cells | 2 cells |
| `prune` | Remove crop from cell (becomes empty) | 1 cell |
| `protect` | Shield cell from current event | 1 cell |
| `mulch` | +0.5 score this beat, +0.25 carry-forward next season | 1 cell |
| `companion_patch` | +1.0 adjacency for current beat | 1 cell |
| `accept_loss` | Forfeit token, no effect | — |

### Carry-Forward Mechanics

| Mechanic | Scope | Persistence |
|----------|-------|-------------|
| Soil fatigue | Per-cell | -0.3/season for repeated heavy-feeders, cap -0.9, resets on rotation/empty |
| Mulch | Per-cell | `carryForwardType: 'mulched'`, +0.25 next season |
| Infrastructure | Per-cell | `compacted` / `enriched` modifiers survive season transition |
| Event memory | Per-cell | Lasting effects decrement over subsequent seasons |
| Pantry | Campaign | Append-only crop harvest record |
| Recipes | Campaign | Completed recipe IDs accumulate across seasons |
| Keepsakes | Campaign | Awarded by milestone triggers, permanent |

---

## APPENDIX D — Edge Types & Criticality

### Edge Type Definitions

| Type | Color | Direction | Meaning | Example |
|------|-------|-----------|---------|---------|
| **Data Flow** | `#10b981` green | bidirectional | State reads/writes | Grid ↔ localStorage |
| **Control Signal** | `#f59e0b` amber | directed | Phase transitions, triggers | Phase Machine → Event Draw |
| **Actuation** | `#ef4444` red | directed | Mutations to game state | Intervention System → Grid |
| **Event/Feed** | `#8b5cf6` purple | directed | Reactive notifications | Event Draw → Character Voices |
| **Reference** | `#6b7280` gray | directed | Read-only lookup | Scoring Engine → Crop Database |

### Criticality Tiers

| Tier | Badge | Criteria | Nodes |
|------|-------|----------|-------|
| **P0** | System-Critical | Breaks the game or corrupts data if wrong | Scoring Engine, Phase Machine, Campaign State, Crop Database, Schema Contract |
| **P1** | Important | Degrades gameplay or UX significantly | Event Draw, Intervention System, Carry-Forward, Save Slot Manager, Season State, Bed Score Aggregation |
| **P2** | Supporting | Can be missing without blocking play | Character Voices, Keepsakes, Journal, Winter Review, Cutscene Machine, Dev Tools |

---

## APPENDIX E — Key Data Flow Diagrams

### Flow 1: Planner Score Cycle

```
User Click → Grid Update → Derive Cell Traits →
6-Factor Score → Adjacency Pass → Bed Aggregation →
Score Panel Re-render → localStorage Write
```
Trigger: every crop place/remove or site setting change.

### Flow 2: Story Mode Beat Cycle

```
Phase Machine advances → Event Draw (weighted random + valence check) →
Player sees Event Card → Player chooses Intervention →
Intervention applies to Grid → Event resolves against Grid →
Scoring snapshot → Beat scores cached → Phase Machine checks next transition
```
Trigger: player clicks "advance" or selects intervention.

### Flow 3: Season Transition

```
HARVEST → Final scoring → HarvestResult (score, grade, yield, recipes) →
REVIEW → Journal entry written → Campaign updated (pantry, keepsakes, recipes) →
TRANSITION → Carry-forward applied (fatigue, infrastructure, event memory) →
Next season PLANNING → Grid partially reset, chapter-unlocked crops available
```

### Flow 4: Campaign Persistence

```
Every phase change → Serialize campaign + season →
Strip circular refs (campaign ref from season) →
Write to localStorage slot →
On reload: deserialize → Validate → Resume phase
```

### Flow 5: Cross-Runtime Scoring Lineage

```
specs/SCORING_RULES.md (canonical single source of truth)
    ├─→ Planner: inline scoreCropInCell() in garden-planner-v4.html
    └─→ Story Mode: story-mode/src/scoring/cell-score.js

specs/CROP_SCORING_DATA.json (canonical crop data)
    ├─→ Planner: inline CROPS object
    └─→ Story Mode: story-mode/src/data/crops.js

NOTE: these are independent implementations of the same spec.
No shared code module exists. Spec is the source of truth.
```

### Flow 6: Event System Lifecycle

```
EVENT_DECK.json → Event Draw Algorithm →
  Filter: not drawn this season, chapter-available
  Valence guarantee (beat 2 only)
  Weighted probability (draw weight × crop-presence bonus × chapter scaling)
→ eventActive set on Season State →
  Player sees Event Card →
  Intervention modifies grid →
  mechanicalEffect resolves (applies eventModifier to affected cells) →
  Event memory persists (lasting effects decrement over seasons)
```

---

## APPENDIX F — Current Data Silos (Integration Gaps)

| Gap | Root Tools | Story Mode | Impact |
|-----|-----------|------------|--------|
| Workspace data | `gardenOS_workspace` in localStorage | `gos-story-slot-*` in localStorage | No cross-tool import |
| Crop roster | Inline in planner HTML | `story-mode/src/data/crops.js` | Potential drift from spec |
| Scoring code | Inline in planner HTML | `story-mode/src/scoring/cell-score.js` | Independent implementations |
| Schema validation | `gos-schema.json` on import | No formal schema file | Story Mode state unvalidated |
| Recipe data | Not present | Inline in game code | Planner unaware of recipes |

These are not bugs — they reflect the intentional zero-dependency root constraint. But the system map should make them visible so future extraction decisions are informed.
