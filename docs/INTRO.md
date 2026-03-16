# Garden OS — Project Intro (3 Levels)

---

## Level 1 — Quick (About Us)

Garden OS is a free, browser-based raised bed garden planner. Tell it your bed size, sun exposure, and zone — it scores every placement and explains why. No account, no install, no backend. Works offline. Includes a 12-chapter narrative game, build guides for cage construction, and seasonal ops checklists. Everything runs from a single HTML file and stays on your device.

---

## Level 2 — Standard (For Viewers)

### What Garden OS Does

Garden OS is a collection of free, browser-based tools for planning and maintaining a raised bed garden. The centerpiece is a **placement planner** that scores every crop in every cell of your bed based on sun exposure, companion planting, support needs, season fit, and access — then tells you *why* each score is high or low, not just what it is.

### The Tools

- **Garden Planner v4.3** — Drag crops into an 8x4 grid. Real-time scoring with factor breakdowns. Export your plan as a file you own.
- **Season Engine v3** — A 12-chapter narrative strategy game where you inherit a raised bed, survive weather events, earn interventions, and work toward completing Mom's sauce recipe across three growing years.
- **Build Guide** — Step-by-step interactive construction specs for building a cattle panel garden cage with trellis.
- **Ops Guide** — Seasonal maintenance checklist organized by month and task type.
- **How It Thinks** — A plain-English walkthrough of how the planner scores placements, written for people who don't care about algorithms but want to understand the advice.

### How It Works

You open any tool in your browser. No download, no sign-up, no server. Your data saves to your device automatically and can be exported as a `.gos.json` file. Every tool is a single self-contained HTML file — no build step, no dependencies, no infrastructure. Works in Chrome, Safari, Firefox, and Edge. Works offline once loaded.

### Who It's For

It was built for a specific person — a mom with a backyard raised bed who wants help figuring out what goes where. But the scoring engine is real: 6 weighted factors, deterministic light modeling, adjacency analysis, soil fatigue tracking, and seasonal multipliers across 20 crops and 8 factions. It's approachable on the surface and precise underneath.

### What Makes It Different

Most garden planners generate a layout and leave you to trust it. Garden OS explains every decision. Click any cell to see what's helping the score, what's hurting it, and what single change would improve it most. The scoring is fully deterministic — same inputs always produce the same outputs, no hidden randomness, no server-side magic.

---

## Level 3 — Full Context (For AI Agents)

### Identity

Garden OS is a zero-backend, browser-native raised bed garden planning system. Every tool is a single self-contained HTML file deployed via GitHub Pages. No build step, no package manager, no framework, no runtime dependencies. Architecture: vanilla HTML/CSS/JS → localStorage persistence → `.gos.json` file export/import → JSON Schema validation. Offline-capable after first load.

**Repository:** `github.com/DaveHomeAssist/garden-os`
**Live:** `davehomeassist.github.io/garden-os/`
**Version:** Planner v4.3, Season Engine v3
**Status:** Phase 1 complete. Phase 2-3 roadmapped.

### Tool Inventory

The site uses a two-track navigation system:

**User Track** (nav: Home → Play Game → Planner → Build Guide → Ops Guide → How It Thinks → Dev Tools →)

| File | Purpose |
|------|---------|
| `index.html` | Hub page — Mom's Sanctuary. Card-based launcher for all user tools. |
| `garden-planner-v4.html` | Core planner. 8x4 grid, drag-to-place crops, real-time scoring with per-cell factor breakdown, adjacency analysis, export/import as `.gos.json`. |
| `garden-league-simulator-v3.html` | 12-chapter narrative game. State machine with 8 phases per season. 4 character voices, 40-card event deck, intervention system, carry-forward mechanics. |
| `garden-cage-build-guide.html` | Interactive construction guide for a cattle panel garden cage. Materials lists, assembly sequence, measurements. |
| `garden-cage-ops-guide.html` | Seasonal ops checklist. Monthly breakdown of planting, maintenance, harvest, and defense tasks. |
| `how-it-thinks.html` | Plain-English scoring explanation. Uses everyday analogies to explain the 6 scoring factors. |
| `home.html` | Alternate marketing home page (test variant). |

**Dev Track** (nav: ← Garden → Visualizer → Scoring Map → Fairness Tester → System Map → Topology)

| File | Purpose |
|------|---------|
| `scoring-visualizer.html` | Interactive debug tool. Pick a crop, select a cell, see all 6 scoring factors update in real time. |
| `scoring-map.html` | Architecture reference for the scoring pipeline: raw config → derived traits → score → validity → UI. |
| `fairness-tester.html` | Crop balance analysis. Charts and tables showing score distributions across all crops, factions, and seasons. |
| `system-map.html` | Full ecosystem architecture diagram. Dark mode. Component relationships and data flow. |
| `system-topology.html` | D3-based interactive DAG. Draggable nodes, edge labels, criticality levels, trust zones. Dark mode. |

### Design System

**Fonts (user track):** Fraunces (serif headings, weight 600), DM Sans (body, weight 300-500), DM Mono (labels/mono, weight 400-500).

**Colors:** `--soil: #5c3d1e` (nav/header), `--leaf: #3d7a4f` (primary accent), `--leaf-bright: #5aab6b` (CTAs), `--sun: #e8c84a` (nav highlight), `--cream: #f7f2ea` (background), `--text: #1e110a` (headings), `--text-mid: #5a3e2b` (body), `--border: #c8b090`.

**Border radius:** 8px canonical. Pill shapes (999px) for badges only.

**Nav bar:** Dark soil background, DM Mono 0.65rem uppercase, sun-colored active indicator. User track has "Dev Tools →" bridge at 55% opacity right-aligned. Dev track has "← Garden" bridge at 55% opacity left-aligned.

**Dev track aesthetic diverges intentionally:** Scoring tools use Inter/Georgia with 18px radius. System map/topology use dark mode with system-ui and 6px radius.

### Data Model

**20 crops** across **8 factions** (Climbers, Fast Cycles, Brassicas, Roots, Greens, Herbs, Fruiting, Companions). Each crop record includes: `id`, `name`, `emoji`, `faction`, `sunMin`, `sunIdeal`, `support` (boolean), `shadeScore` (1-5), `coolSeason` (boolean), `tall` (boolean), `water` (1-3), `companions[]`, `conflicts[]`, `chapterUnlock`, `recipes[]`, `eventVulnerabilities[]`, `seasonalMultipliers` (per-season 0-1 floats).

**4 recipes:** Herb Bowl, Tomato Sandwich, Weeknight Pasta, Mom's Sauce (the narrative climax).

**Canonical data source:** `/specs/CROP_SCORING_DATA.json`
**Schema:** `/gos-schema.json` (JSON Schema v2020-12, 490 lines)

### Scoring Algorithm

Deterministic. Same inputs always produce the same output.

**Grid:** 8 cols × 4 rows (32 cells). Wall orientation affects shadow direction.

**Light model:** `effectiveLight = max(1, baseSunHours - wallShadowPenalty - tallCropShading)` where wall shadow = `max(0, (2 - rowFromWall) × 0.75)` and each adjacent tall crop toward light subtracts 0.5 hours.

**6 scoring factors** (each 0-5 scale):

1. **Sun Fit (weight 2x):** Compares effective light against crop's sunMin/sunIdeal. 5.0 at ideal, smooth interpolation in viable range, penalized below minimum.
2. **Support Fit (weight 1x):** Climbers (`support: true`) score 5.0 in trellis rows, 1.0 elsewhere (hard constraint). Non-climbers neutral at 3.0.
3. **Shade Tolerance (weight 1x):** Based on crop's shadeScore (1-5). Shade-lovers thrive in low light; sun-demanding crops suffer.
4. **Access Fit (weight 1x):** Short crops score higher in front (accessible) rows. Tall crops indifferent.
5. **Season Fit (weight 1x):** Cool-season crops score 5.0 in spring/fall, penalized in summer. Warm-season crops inverse.
6. **Adjacency (additive, -2 to +2):** Companions +0.5 each, conflicts -1.2 each, tall-tall -0.75, monoculture -0.2, water mismatch (|delta| ≥ 2) -0.5. Summed across 4 orthogonal neighbors, clamped.

**Cell score:** `clamp((sunFit×2 + supFit + shadeFit + accFit + seaFit) / 3 × seasonalMultiplier + adjScore, 0, 10)`

**Bed score:** `cellAvg + diversityBonus + tallPenalty + trellisPenalty - fillPenalty + recipeBonus`. Grades: A ≥ 8.5, B ≥ 7.0, C ≥ 5.5, D ≥ 4.0, F < 4.0.

**Soil fatigue:** Heavy feeders (water ≥ 3) in consecutive seasons accumulate -0.3/season penalty, capped at -0.9. Rotation resets.

**Full spec:** `/specs/SCORING_RULES.md`

### Season Engine State Machine

8 phases per season: `PLANNING → COMMIT → EARLY_SEASON → MID_SEASON → LATE_SEASON → HARVEST → REVIEW → TRANSITION`. No backward transitions after COMMIT. All state persisted to localStorage.

**Carry-forward between seasons:** soil fatigue map (crop family per cell), event memory (damage modifiers decay over 2-3 seasons), infrastructure persistence (mulch, enrichment).

**Events:** 40-card deck (`/specs/EVENT_DECK.json`). 3 drawn per season (one per beat). Positive, negative, and mixed valence. Deterministic draw from seed. Player spends intervention tokens to counter.

**Full spec:** `/specs/SEASON_ENGINE_SPEC.md`

### Narrative Structure

12 chapters across 3 years. Year 1 teaches mechanics (placement → trellis → companions). Year 2 deepens systems (factions → events → rotation). Year 3 challenges mastery (modifiers → succession → Mom's Sauce climax).

**4 character voices** with fixed speaking order:
1. **Garden GURL** — Judge. Cold, sharp, legally annoyed. Scoring voice.
2. **Onion Man** — Heart. Tender, reactive, sports-poisoned. Emotional framing.
3. **Vegeman** — Temptation. Impulsive, overconfident, charismatic fool. Teaches pitfalls.
4. **Garden Critters** — Pressure. Collective nuisance. Petty, territorial, deadpan.

80+ deterministic dialogue triggers mapped in `/specs/DIALOGUE_ENGINE.json`. No random chatter.

**Full specs:** `/specs/NARRATIVE_SPEC.md`, `/docs/VOICE_BIBLE.md`, `/docs/CAMPAIGN_DESIGN.md`

### Cell Traits (Derived, Not Stored)

Computed at runtime from CageConfig. `isTrellisRow` (from climb zones), `hasVerticalSupport` (trellis enabled + in trellis row), `isProtected` (protection zones), `accessScore` (proximity to front, 0-1 normalized). Only the cage configuration is persisted — traits are always derived.

### Deployment

GitHub Pages. Push to `main` → auto-deploys via `.github/workflows/pages.yml`. No build step. Entire repo root served. Local testing: `python3 -m http.server 8000`.

### Spec & Doc Index

| Path | Content |
|------|---------|
| `/specs/CROP_SCORING_DATA.json` | 20 crops, 8 factions, recipes, vulnerabilities |
| `/specs/SCORING_RULES.md` | Complete deterministic scoring algorithm |
| `/specs/SEASON_ENGINE_SPEC.md` | State machine, phases, carry-forward |
| `/specs/NARRATIVE_SPEC.md` | 12 chapters, score targets, story beats |
| `/specs/DIALOGUE_SYSTEM.md` | Speaking order, timing, trigger rules |
| `/specs/DIALOGUE_ENGINE.json` | Character lines keyed by 80+ triggers |
| `/specs/EVENT_DECK.json` | 40+ event cards with modifiers |
| `/specs/UI_SPEC.md` | Complete UI layout and interaction spec |
| `/specs/PROGRESSION_SPEC.md` | Chapter unlocks, challenges, trophies |
| `/gos-schema.json` | JSON Schema v2020-12 for workspace format |
| `/docs/ART_DIRECTION.md` | Visual pillars, seasonal color, texture vocabulary |
| `/docs/VOICE_BIBLE.md` | 4 character voices, tone rules, sample lines |
| `/docs/GAME_FEEL.md` | Feedback timing, juice layer, transitions |
| `/docs/CAMPAIGN_DESIGN.md` | 12-chapter arc structure |
| `/docs/HANDOFF.md` | Full AI handoff with code entry points and roadmap |

### Code Entry Points

**Planner:** `scoreCropInCell()` (core scoring), `deriveCellTraits()` (cage → traits), `renderGrid()`, `exportWorkspace()` / `importWorkspace()`.

**Season Engine:** `mkSeason()` (new season state), `commitGrid()`, `advancePhase()`, `resolveEvent()`, `calculateHarvest()`, `carryForward()`.

**Data objects in HTML:** `CROPS`, `SCORING_CONSTANTS`, `DIALOGUE_ENGINE`, `EVENT_DECK`.

### Roadmap

Phase 1 complete. Phase 2 (days 31-60): layout simulator, garden doctor, yield forecast, difficulty presets. Phase 3 (days 61-90): A/B bed experiments, succession planting timeline, season retrospective with print.
