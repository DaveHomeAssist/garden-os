---
Status: Active
Document Version: 1.1
Compatible With: Garden OS v4.3, Story Mode v0.1, Schema v1, Season Engine v4
Owner: Dave Robertson
Last Updated: 2026-03-22
Artifact Class: Ref
---

# Garden OS — AI Handoff Document

> **Repository:** [github.com/DaveHomeAssist/garden-os](https://github.com/DaveHomeAssist/garden-os)
> **Live:** [davehomeassist.github.io/garden-os/](https://davehomeassist.github.io/garden-os/)

---

## What This Is

Garden OS is now a hybrid browser-native repo with two active product layers:

1. **Root static tool suite**: planner, legacy season simulator, guides, explainers, and dev tools shipped as direct HTML files from repo root.
2. **`story-mode/` app**: a Three.js + Vite story-driven prototype served at `/garden-os/story-mode/`.

The core mission remains the same: make garden decisions explainable, playable, and reusable across planning, simulation, and narrative surfaces.

**Architecture:** static root tools + canonical specs/docs + localStorage/file persistence + a separate `story-mode` runtime for richer 3D play. Zero backend. GitHub Pages remains the delivery model.

## Current State Snapshot (2026-03-22)

### Repo Shape

- Repo root is still the public Garden OS hub and tool surface.
- `story-mode/` is the most actively evolving runtime and the primary public CTA from `index.html`.
- `specs/` remains the canonical contract layer for scoring, season flow, dialogue, progression, and UI.
- `docs/` remains the canonical repo-level context layer.
- `docs/story-mode/` is an imported story-mode package covering product, systems, technical, and roadmap material for the Let It Grow expansion path.

### Working Inventory

- Approximate raw repo size: 3007 files / 561 directories.
- Approximate working source footprint excluding `.git`, `dist`, and `story-mode/node_modules`: 301 files.
- Root HTML surfaces: 12 public/dev entry files.
- `docs/`: 85 files.
- `specs/`: 16 canonical or historical spec files.
- `story-mode/src/`: 32 source files.

### What Is Actually Live

- Primary public entry: `index.html` with Story Mode as the lead CTA.
- Current flagship playable build: `/story-mode/`.
- Root planner and legacy season simulator remain live, but Story Mode is the active evolution path.
- Dev track tools remain important for inspection and validation, but the current `system-map.html` is planner-centric and no longer reflects the full repo accurately.

### Canonical Source Hierarchy

1. `specs/` for gameplay and contract truth.
2. `docs/HANDOFF.md` for repo-wide intake and current-state orientation.
3. Root `docs/` for repo-level design, launch, migration, and audits.
4. `docs/story-mode/` for story-mode and Let It Grow-specific expansion/technical planning.
5. `progress.md` and `story-mode/progress.md` for implementation chronology, not canon.

### Important Reality Checks

- Root `CLAUDE.md` still describes a no-build, single-file HTML world. That is true for root tools, but **not** for `story-mode/`, which intentionally uses Vite, Three.js, and Vitest.
- The repo now has two active simulation surfaces: `garden-league-simulator-v4.html` as the legacy deterministic season sandbox, and `story-mode/` as the active narrative/3D branch.
- `theme-organizer-resource` is no longer the intended home for Garden OS planning docs. The staged package is now local at `docs/story-mode/`.

---

## What Exists Today

### User-Facing Live Surfaces

#### Root Track (GitHub Pages repo root)

| Tool | File | Lines | Purpose |
|------|------|-------|---------|
| Hub | `index.html` | 355 | Public Garden OS launcher with Story Mode as primary CTA |
| Story Mode | `story-mode/` | app | Active Vite/Three.js narrative prototype |
| Planner v4.3 | `garden-planner-v4.html` | 6,076 | Core placement UI, scoring breakdown, export/import |
| Legacy Season Engine v4.0 | `garden-league-simulator-v4.html` | 2,971 | Prior chapter-based season sandbox; still live, no longer the flagship branch |
| Build Guide | `garden-cage-build-guide.html` | 2,270 | Interactive cage construction specs |
| Ops Guide | `garden-cage-ops-guide.html` | 1,313 | Seasonal maintenance checklist |
| Brand Guide | `brand-guide.html` | 1 file | Design tokens and reference surface |
| How It Thinks | `how-it-thinks.html` | ~500 | Plain-English scoring walkthrough |

#### Developer / Analysis Track

| Tool | File | Purpose |
|------|------|---------|
| Scoring Visualizer | `scoring-visualizer.html` | Interactive per-cell scoring factor breakdown |
| Scoring Map | `scoring-map.html` | Scoring engine architecture reference |
| Fairness Tester | `fairness-tester.html` | Crop balance analysis across factions |
| System Map | `system-map.html` | Existing dark-mode ecosystem page; now outdated against current repo shape |
| System Topology | `system-topology.html` | D3-based interactive system graph (dark mode) |

### Story Mode Runtime (`story-mode/`)

| Area | Path | Purpose |
|------|------|---------|
| App entry | `story-mode/index.html` | Story Mode shell served on GitHub Pages |
| Runtime source | `story-mode/src/` | Scene, game, scoring, sync, data, and UI logic |
| Build output | `story-mode/dist/` | Generated deployable bundle |
| Package manifest | `story-mode/package.json` | Vite + Three.js + Vitest toolchain |
| Implementation log | `story-mode/progress.md` | Most current build chronology |

Story Mode currently includes:
- chapter intros and cutscene-machine architecture
- animated speakers and portraits, including Calvin
- intervention targeting flow
- winter review flow
- keepsakes, recipe matches, and carry-forward campaign state
- mobile-responsive HUD/panel work
- front-of-bed camera/scenery reorientation

### Navigation Structure

Two-track nav with bridge links:
- **User track:** Story Mode → Hub → Planner → Build Guide → Ops Guide → Brand Guide → How It Thinks → Dev Tools →
- **Dev track:** 5 items + "← Garden" left-aligned at 55% opacity
- Shared nav bar style: dark soil (`#5c3d1e`) background, `DM Mono` font, sun (`#e8c84a`) accent

---

## Design System

### Canonical Font Stack (user-track pages)

- **Headings/Serif:** Fraunces (weight 600)
- **Body/Sans:** DM Sans (weight 300-500)
- **Labels/Mono:** DM Mono (weight 400-500)
- **Google Fonts import:** `Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,400&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500`

### Color Palette

```
--soil: #5c3d1e        (dark earth brown — header, nav)
--soil-mid: #7a5230    (mid brown)
--soil-light: #9a6b42  (light brown)
--leaf: #3d7a4f        (forest green — primary accent)
--leaf-bright: #5aab6b (bright green — CTAs, active states)
--leaf-pale: #c8e6c9   (pale green — badges)
--sun: #e8c84a         (warm gold — nav accent, highlights)
--sun-pale: #fdf3c0    (pale gold — badges)
--cream: #f7f2ea       (off-white — page background)
--cream-dark: #ede5d8  (darker cream — panels)
--text: #1e110a        (near-black — headings)
--text-mid: #5a3e2b    (mid brown — body text)
--text-light: #7d5f45  (light brown — muted text)
--border: #c8b090      (tan — borders)
```

### Border Radius

Canonical: `8px` for cards, panels, inputs. Pill shapes (`999px`) for badges only.

### Dev-Track Aesthetic

Dev pages use their own visual language:
- Scoring visualizer/map: Inter + Georgia, 18px radius, light mode data dashboard
- System map/topology: system-ui + DM Mono, 6px radius, dark mode terminal aesthetic
- Fairness tester: canonical stack (Fraunces/DM Sans/DM Mono), 8px radius

---

## Crop Data Model

**Source:** `/specs/CROP_SCORING_DATA.json` — 20 crops, 8 factions

```json
{
  "id": "cherry_tom",
  "name": "Cherry Tomato",
  "emoji": "🍅",
  "faction": "climbers",
  "sunMin": 6,
  "sunIdeal": 8,
  "support": true,
  "shadeScore": 1,
  "coolSeason": false,
  "tall": true,
  "water": 3,
  "companions": ["basil", "marigold"],
  "conflicts": ["broccoli"],
  "chapterUnlock": 2,
  "recipes": ["tomato_sandwich", "weeknight_pasta", "moms_sauce"],
  "eventVulnerabilities": ["pest-target", "blight-prone", "heat-tolerant"],
  "seasonalMultipliers": { "spring": 0.5, "summer": 1.0, "fall": 0.3 }
}
```

### Key Fields for Scoring

| Field | Scoring Use |
|-------|-------------|
| `sunMin` / `sunIdeal` | Sun fit factor (weight 2x) |
| `support` | Hard constraint — if true and not in trellis row → score = 1.0 |
| `shadeScore` (1-5) | Shade tolerance factor |
| `tall` | Access fit + adjacency tall-tall penalty |
| `water` (1-3) | Soil fatigue + adjacency water mismatch |
| `companions` / `conflicts` | Adjacency bonuses (+0.5) / penalties (-1.2) |
| `coolSeason` | Season fit factor |
| `seasonalMultipliers` | Per-season score scaling (0.0-1.0) |
| `eventVulnerabilities` | Tags for event damage |

### 8 Factions

Climbers, Fast Cycles, Brassicas, Roots, Greens, Herbs, Fruiting, Companions

### 4 Recipes

1. **Herb Bowl:** basil + dill
2. **Tomato Sandwich:** cherry_tom + basil + lettuce
3. **Weeknight Pasta:** cherry_tom + basil + pepper + onion
4. **Mom's Sauce:** cherry_tom + basil + pepper + onion + carrot

---

## Scoring Algorithm (Deterministic)

**Source:** `/specs/SCORING_RULES.md`

### Light Model

```
baseSunHours = site.sunHours (2-10 range)
shadowPenalty = max(0, (2 - rowFromWall) × 0.75)  // 0-1.5 hrs lost near wall
effectiveLight = max(1, baseSunHours - shadowPenalty)

// Tall-crop shading:
for each tall crop in adjacent row toward light source:
  effectiveLight -= 0.5
```

Grid: 8 cols × 4 rows (32 cells, row-major index). Wall orientation affects shadow direction.

### Six Scoring Factors (0-5 scale each)

1. **Sun Fit (weight 2x):** Reward ideal sun, smooth in viable range, penalize insufficient
2. **Support Fit (weight 1x):** Climbers need trellis (hard constraint); non-climbers neutral at 3.0
3. **Shade Tolerance (weight 1x):** Shade-lovers thrive in shadow; sun-demanding crops struggle
4. **Access Fit (weight 1x):** Short crops score higher in front (accessible) rows; tall indifferent
5. **Season Fit (weight 1x):** Cool crops dominate spring/fall; warm crops dominate summer
6. **Adjacency (additive, -2 to +2):** Companions +0.5, conflicts -1.2, tall-tall -0.75, monoculture -0.2, water mismatch -0.5

### Cell Score

```
weightedCore = (sunFit × 2 + supFit + shadeFit + accFit + seaFit) / 3
preAdjScore = weightedCore × crop.seasonalMultipliers[season]
cellScore = clamp(preAdjScore + adjScore, 0, 10)
```

### Bed Score Aggregation

```
cellAvg + diversityBonus + tallPenalty + trellisPenalty - fillPenalty + recipeBonus
```

Grades: A ≥ 8.5, B ≥ 7.0, C ≥ 5.5, D ≥ 4.0, F < 4.0

### Soil Fatigue

Heavy feeders (water ≥ 3) in consecutive seasons: -0.3 per season, capped at -0.9. Rotating in light feeders resets the counter.

---

## Cell Trait System (Derived, Not Stored)

Computed at runtime from CageConfig. Never persisted directly.

| Trait | Derivation | Scoring Use |
|-------|-----------|-------------|
| `isTrellisRow` | cell in trellis.climbZones | Support fit hard requirement |
| `hasVerticalSupport` | trellis.enabled && isTrellisRow | Support fit = 5 if true, 1 if false |
| `isProtected` | protection.enabled && in protectedZones | Structural bonus (future) |
| `accessScore` | proximity to front/door side, 0-1 | Access fit multiplier for short crops |

---

## Season Engine (Game Loop)

**Source:** `/specs/SEASON_ENGINE_SPEC.md`

### State Machine (8 Phases)

```
PLANNING → COMMIT → EARLY_SEASON → MID_SEASON → LATE_SEASON → HARVEST → REVIEW → TRANSITION → PLANNING
```

No backward transitions after COMMIT. All state persisted to localStorage.

### Carry-Forward Mechanics

1. **Soil fatigue map:** which crop family last occupied each cell — accumulates penalty for consecutive heavy feeders
2. **Event memory:** damage events carry -0.3 to -0.5 modifier into next season, expires after 2-3 seasons
3. **Infrastructure persistence:** mulch carries +0.3 bonus forward one season

---

## Narrative & Campaign (12 Chapters)

**Source:** `/specs/NARRATIVE_SPEC.md` + `/docs/CAMPAIGN_DESIGN.md`

**Year 1 — Learning:** First Light (Spring, target 4.0) → Vertical Law (Summer, 5.5) → Good Neighbors (Fall, 6.0) → Dormant (Winter, retrospective)

**Year 2 — Understanding:** Quick Harvest (Spring, 6.5) → Critter Pressure (Summer, 7.0) → Rotation and Rest (Fall, 7.5) → Long Reflection (Winter, comparison)

**Year 3 — Mastery:** Challenge Accepted (Spring, modifiers) → Double Crop (Summer, succession) → Sauce Season (Fall, Mom's Sauce climax) → The Circle (Winter, epilogue)

### Character Voices

| Character | Role | Tone | Speaks |
|-----------|------|------|--------|
| **Garden GURL** | Judge | Cold, sharp, legally annoyed | First, every trigger |
| **Onion Man** | Heart | Tender, reactive, sports-poisoned | Second, emotional framing |
| **Vegeman** | Temptation | Impulsive, overconfident, charismatic fool | Third, chapters 2/10 + tutorials |
| **Garden Critters** | Pressure | Collective, petty, territorial, deadpan | Fourth, event-driven only |

Fixed speaking order. Deterministic triggers — no random chatter. 80+ triggers mapped in `/specs/DIALOGUE_ENGINE.json`.

---

## Event System (40-Card Deck)

**Source:** `/specs/EVENT_DECK.json`

- **Positive:** early spring, rich soil, beneficial insects, pollinator arrival
- **Negative:** heat wave (-1.5), late frost (-2.0), pest surge (-1.0), blight (-1.5 for 2 rounds)
- **Mixed:** drought, neighbor's shade, urban runoff, stray cat

3 events drawn per season (early, mid, late beats). Deterministic draw from seed.

**Player interventions** (spend tokens): deep water, mulch, row cover, companion spray, succession replant.

---

## Schema

**Canonical:** `/gos-schema.json` (JSON Schema v2020-12, 490 lines)

Defines: Workspace, Bed, CageConfig, PlannerState, SiteSettings, CropRecord, ScoreSummaryCache. Crop enum: 38 crops across 8 categories. Version field for migration.

**Human-readable reference:** `/SCHEMA.md`

---

## Spec & Doc Index

### Specs (`/specs/`)

| File | Size | Content |
|------|------|---------|
| `CROP_SCORING_DATA.json` | 11K | 20 crops, 8 factions, recipes, vulnerabilities |
| `SCORING_RULES.md` | 16K | Complete deterministic scoring algorithm |
| `SEASON_ENGINE_SPEC.md` | 28K | State machine, phases, carry-forward |
| `NARRATIVE_SPEC.md` | 30K | 12 chapters, score targets, story beats |
| `DIALOGUE_SYSTEM.md` | 17K | Speaking order, timing, 80+ trigger rules |
| `DIALOGUE_ENGINE.json` | 61K | Character lines keyed by trigger |
| `EVENT_DECK.json` | 48K | 40+ event cards with modifiers |
| `UI_SPEC.md` | 50K | Complete UI layout, components, interactions |
| `PROGRESSION_SPEC.md` | 28K | Chapter unlocks, challenge modifiers, trophies |

### Design Docs (`/docs/`)

| File | Content |
|------|---------|
| `HANDOFF.md` | Repo-wide intake and current-state summary |
| `ART_DIRECTION.md` | Visual pillars (worn surface, Philly grit, seasonal honesty), color by season, texture vocabulary |
| `VOICE_BIBLE.md` | 4 character voices, tone rules, sample lines, recognition test |
| `GAME_FEEL.md` | Juice layer — placement feedback, harvest payoff, seasonal transitions, commentary timing |
| `CAMPAIGN_DESIGN.md` | 12-chapter arc — Year 1 learn, Year 2 master, Year 3 challenge |
| `GAME_DESIGN_ANALYSIS.md` | System balance, progression pacing, emotional arcs |
| `GAME_DESIGN_CRITIQUE.md` | Strengths, high-impact gaps, improvement roadmap |
| `REPLAYABILITY.md` | Challenge modifiers, experimental A/B beds, difficulty modes |
| `SEASONAL_EVENT_SYSTEM.md` | Event deck design, decision trees, balancing rules |
| `MARKETING_STRATEGY.md` | Positioning, audience, distribution |
| `MIGRATION-CONTRACT.md` | Schema migration rules between versions |
| `active-hosted-urls.md` | Current deployment audit — all live URLs, nav structure |
| `UI_GRAPHICAL_IMPROVEMENT_AUDIT.md` | Visual polish roadmap |
| `SYSTEM_MAP_PROPOSAL.md` | Proposed canonical system map structure for the hybrid repo |
| `story-mode/` | Imported story-mode / Let It Grow package: overview, systems, narrative, technical, roadmap |

---

## Roadmap

### Active Focus

- Keep Story Mode as the flagship playable branch.
- Maintain the root planner and legacy simulator as stable explainability and reference tools.
- Reconcile repo-wide canon between `specs/`, root `docs/`, and `docs/story-mode/`.
- Redesign the system map so it reflects the hybrid root-tools + story-mode architecture.

### Likely Next Structural Work

- Clarify which systems are shared candidates versus story-mode-specific implementations.
- Decide whether any runtime logic should move into a future shared-core layer after real reuse appears in more than one simulation surface.
- Reduce legacy/document duplication and retire outdated planner-only architecture descriptions where they conflict with the live repo.

---

## Deployment

**GitHub Pages:** Push to `main` → auto-deploys via `.github/workflows/pages.yml`.

- Repo root serves the static Garden OS hub and tool pages at `davehomeassist.github.io/garden-os/`.
- `story-mode/` is served as a built sub-app at `davehomeassist.github.io/garden-os/story-mode/`.
- Root tools still have no build step.
- `story-mode/` does have a build step (`vite build`) and should be treated as an explicit exception to the root single-file rule.

**Testing locally:** `python3 -m http.server 8000` from repo root.

---

## Code Entry Points

### Planner (`garden-planner-v4.html`)

- `scoreCropInCell()` — core scoring function
- `deriveCellTraits()` — computes traits from cage config
- `renderGrid()` — draws the bed
- `exportWorkspace()` / `importWorkspace()` — `.gos.json` I/O
- `CROPS` object — full crop roster
- `SCORING_CONSTANTS` — weights, shadow penalties, clamps

### Season Engine (`garden-league-simulator-v4.html`)

- `mkSeason()` — creates a new season state
- Phase transition functions: `commitGrid()`, `advancePhase()`, `resolveEvent()`, `calculateHarvest()`
- `DIALOGUE_ENGINE` — trigger → character line mapping
- `EVENT_DECK` — event cards with modifiers
- `carryForward()` — persists fatigue, event memory, infrastructure between seasons

### Story Mode (`story-mode/src/`)

- `main.js` — app bootstrap, UI orchestration, persistence, and trigger wiring
- `game/phase-machine.js` — chapter/season/phase progression logic
- `game/cutscene-machine.js` — narrative sequencing and playback state
- `game/intervention.js` — intervention availability and target resolution
- `scene/garden-scene.js` — Three.js world, lighting, camera presets, world actors
- `data/cutscenes.js` — authored and dynamic cutscene content
- `data/speakers.js` / `data/portraits.js` / `data/keepsakes.js` — narrative/supporting data
- `ui/` modules — dialogue, winter review, event cards, harvest reveal, and sheet surfaces

### Adding New Features

1. Decide whether the change belongs to the root static tool suite or `story-mode/`.
2. Update canonical data/contracts in `/specs/` when the change affects shared game rules.
3. Update the corresponding root HTML file or `story-mode/src/` modules.
4. If the change touches story-mode, validate with `vite build`; if it touches root tools, validate the direct HTML surface.
5. Push to `main` → Pages deploys the root and the `story-mode` subpath.

---

## File Naming Conventions

- All kebab-case (snake_case duplicates removed as of 2026-03-16)
- User-track: descriptive names (`how-it-thinks.html`, `garden-planner-v4.html`)
- Dev-track: short functional names (`scoring-visualizer.html`, `fairness-tester.html`)
- Specs: UPPER_SNAKE_CASE markdown/json (`SCORING_RULES.md`, `EVENT_DECK.json`)

## Legacy / Unlinked Files (safe to ignore)

- `garden-os-home.html` — original marketing page (superseded by `index.html`)
- `garden-league-simulator.html`, `garden-league-simulator-v2.html`, `garden-league-simulator-v3.html`, `garden-os-simulator-v2.html` — old game versions
- `archive/` folder — versioned HTML snapshots (v1-v7)
