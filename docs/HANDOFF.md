---
Status: Active
Document Version: 1.0
Compatible With: Garden OS v4.3, Schema v1, Season Engine v3
Owner: Dave Robertson
Last Updated: 2026-03-16
Artifact Class: Ref
---

# Garden OS — AI Handoff Document

> **Repository:** [github.com/DaveHomeAssist/garden-os](https://github.com/DaveHomeAssist/garden-os)
> **Live:** [davehomeassist.github.io/garden-os/](https://davehomeassist.github.io/garden-os/)

---

## What This Is

Garden OS is a local-first, browser-native raised-bed garden planning system. Zero backend, zero dependencies, zero build step. Every tool is a single self-contained HTML file deployed to GitHub Pages. The core mission: make garden placement decisions *explainable* — not just produce layouts, but show players *why* each score is high or low.

**Architecture:** Single-file HTML tools → localStorage persistence → `.gos.json` file export/import → JSON Schema validation. Offline-capable. Runs entirely in the browser.

---

## What Exists Today

### User-Facing Tools (nav: Home → Play Game → Planner → Build Guide → Ops Guide → How It Thinks)

| Tool | File | Lines | Purpose |
|------|------|-------|---------|
| Hub | `index.html` | 131 | Navigation hub (Mom's Sanctuary) |
| Marketing Home | `home.html` | ~450 | Alternate landing page (test) |
| Planner v4.3 | `garden-planner-v4.html` | 3,505 | Core placement UI, scoring breakdown, export/import |
| Season Engine v3 | `garden-league-simulator-v3.html` | 2,650 | 12-chapter narrative campaign with events, interventions, carry-forward |
| Build Guide | `garden-cage-build-guide.html` | 2,270 | Interactive cage construction specs |
| Ops Guide | `garden-cage-ops-guide.html` | 1,313 | Seasonal maintenance checklist |
| How It Thinks | `how-it-thinks.html` | ~500 | Plain-English scoring walkthrough |

### Developer Tools (nav: ← Garden → Visualizer → Scoring Map → Fairness Tester → System Map → Topology)

| Tool | File | Purpose |
|------|------|---------|
| Scoring Visualizer | `scoring-visualizer.html` | Interactive per-cell scoring factor breakdown |
| Scoring Map | `scoring-map.html` | Scoring engine architecture reference |
| Fairness Tester | `fairness-tester.html` | Crop balance analysis across factions |
| System Map | `system-map.html` | Full ecosystem architecture (dark mode) |
| System Topology | `system-topology.html` | D3-based interactive system graph (dark mode) |

### Navigation Structure

Two-track nav with bridge links:
- **User track:** 6 items + "Dev Tools →" right-aligned at 55% opacity
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

---

## Roadmap

### Phase 1 ✅ Complete

- Canonical schema + explainable score breakdown + export/import + all user-track tools live

### Phase 2 (Days 31-60)

- Layout simulator / "What If?" mode
- Garden Doctor symptom triage tool
- Yield forecast + harvest window
- Difficulty presets (easy/standard/hard)

### Phase 3 (Days 61-90)

- A/B experiment tracking between beds
- Succession planting timeline
- Season retrospective with printable summary

---

## Deployment

**GitHub Pages:** Push to `main` → auto-deploys via `.github/workflows/pages.yml`. No build step. Entire repo root served at `davehomeassist.github.io/garden-os/`.

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

### Season Engine (`garden-league-simulator-v3.html`)

- `mkSeason()` — creates a new season state
- Phase transition functions: `commitGrid()`, `advancePhase()`, `resolveEvent()`, `calculateHarvest()`
- `DIALOGUE_ENGINE` — trigger → character line mapping
- `EVENT_DECK` — event cards with modifiers
- `carryForward()` — persists fatigue, event memory, infrastructure between seasons

### Adding New Features

1. Add data to `/specs/` files (crops, events, dialogue)
2. Update the corresponding `.html` file
3. Test with `.gos.json` export/import for schema compatibility
4. Push to `main` → live in < 1 minute

---

## File Naming Conventions

- All kebab-case (snake_case duplicates removed as of 2026-03-16)
- User-track: descriptive names (`how-it-thinks.html`, `garden-planner-v4.html`)
- Dev-track: short functional names (`scoring-visualizer.html`, `fairness-tester.html`)
- Specs: UPPER_SNAKE_CASE markdown/json (`SCORING_RULES.md`, `EVENT_DECK.json`)

## Legacy / Unlinked Files (safe to ignore)

- `garden-os-home.html` — original marketing page (superseded by `home.html`)
- `garden-league-simulator.html`, `garden-league-simulator-v2.html`, `garden-os-simulator-v2.html` — old game versions
- `archive/` folder — versioned HTML snapshots (v1-v7)
