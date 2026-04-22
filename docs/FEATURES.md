# Garden OS — Complete Feature Set

> **Version:** 1.1
> **Updated:** 2026-03-16 original; partial refresh 2026-04-20
> **Last verified:** 2026-04-20 (scope-limited: crop count, simulator version, application map)
> **Architecture:** Static HTML root tools + `story-mode/` Vite and Three.js runtime. GitHub Pages, zero backend for the product.
> **Live:** https://davehomeassist.github.io/garden-os/ (hub) · https://davehomeassist.github.io/garden-os/story-mode-live/ (flagship runtime)

---

## System Architecture

Garden OS is a collection of single-file HTML tools for raised bed garden planning. Each tool is self-contained with inline CSS and JS. No build step, no external JS dependencies, no module system. State persists in `localStorage`.

### Application Map

| File | Purpose | State |
|------|---------|-------|
| `index.html` | Hub / landing page | Static |
| `garden-planner-v4.html` | Grid planner + scoring engine (v4.4) | Active. Phases 1 to 3 complete 2026-03-31 |
| `garden-league-simulator-v4.html` | Legacy deterministic season simulator | Stable, still playable |
| `story-mode-live/` | Flagship Story Mode runtime (12 chapter campaign) | Active. Vite + Three.js + Vitest (329 tests passing) |
| `garden-doctor.html` | Symptom triage tool (Phase 2B) | Shipped 2026-03-31 |
| `scoring-visualizer.html` | Debug tool for scoring | Reference |
| `fairness-tester.html` | Algorithm validation | Reference |
| `garden-cage-build-guide.html` | Physical build instructions | Static |
| `garden-cage-ops-guide.html` | Seasonal checklists | Static |

### Shared Resources

| File | Purpose |
|------|---------|
| `garden-os-theme.css` | Design tokens (colors, fonts, spacing) |
| `specs/SCORING_RULES.md` | Canonical scoring algorithm |
| `specs/CROP_SCORING_DATA.json` | 50-crop roster with full metadata (v3 schema, 2026-03-22) |

---

# Garden Planner (garden-planner-v4.html)

## Core: Grid Planner + Scoring Engine

**Phase:** Original app

### What it does

Interactive 8×4 grid representing a raised bed garden. Users paint crops into cells. Each placement is scored on 6 factors. The deterministic scoring engine provides real-time feedback on placement quality.

### Six Scoring Factors

| Factor | Weight | What it measures |
|--------|--------|-----------------|
| Sun Fit | 2× | Effective light hours vs. crop ideal/minimum |
| Support Fit | 1× | Climber has trellis access |
| Shade Tolerance | 1× | Crop shade score vs. actual light level |
| Access Fit | 1× | Short crops in front rows, tall in back |
| Season Fit | 1× | Cool-season/heat-tolerance match |
| Adjacency | Additive | Companion bonuses + conflict penalties |

Score range: 0-10 per cell. Bed average reported as overall score.

### Cell Data Structure

```js
{
  id: "cell-5",
  row: 1,
  col: 5,
  crop: "cherry_tom" | null,
  effectiveLight: 6.5,        // computed from sun hours - shadow
  hasVerticalSupport: true,    // isTrellisRow && trellis enabled
  isTrellisRow: true,
  isProtected: false,
  isCritterSafe: false,
  scoreSummaryCache: { scoreTotal: 7.3 }
}
```

### Crop Roster (50 crops, 8 factions)

Canonical roster in `specs/CROP_SCORING_DATA.json` (v3, last updated 2026-03-22). Factions: `brassicas`, `climbers`, `companions`, `fast_cycles`, `fruiting`, `greens`, `herbs`, `roots`. The earlier 20 crop, 4 faction roster below is historical from the v1.0 era of this doc and is retained as an audit trail only; do not treat it as current.

**Historical v1.0 roster (superseded):** Climbers (Cherry Tomato, Pole Beans, Peas, Indeterminate Tomato), Greens (Leaf Lettuce, Spinach, Kale, Arugula, Chard, Bok Choy, Mustard Greens, Tatsoi, Mizuna), Roots (Carrot, Beet, Radish, Onion), Herbs (Basil, Dill, Parsley, Cilantro).

### Crop Properties

```js
{
  name: "Cherry Tomato",
  short: "CT",
  emoji: "🍅",
  color: "#ff6b6b",
  category: "fruiting",
  sunMin: 6, sunIdeal: 8,
  shadeScore: 1,
  support: true,
  tall: true,
  coolSeason: false,
  heatTolerance: 4,
  waterNeed: 3,
  companionTags: ["basil", "greens"],
  conflictTags: ["brassica"],
  companionBonus: 0.5,
  conflictPenalty: -1.0
}
```

### Workspace Storage

```js
// localStorage key: "gardenOS_workspace"
{
  version: 1,
  name: "My Garden",
  beds: [{
    id: "bed-1",
    name: "Bed 1",
    width: 8, height: 4,
    cells: [{ id, row, col, crop, ... }],
    settings: { orientation, wallSide, trellis, cage, ... },
    scoreSummaryCache: { scoreTotal: ... }
  }],
  workspaceSettings: { rightTab: "score", zone: 6, ... },
  harvests: [],
  lastModified: timestamp
}
```

### Tools

- **Paint:** Click cells to place selected crop
- **Erase:** Click cells to remove crop
- **Inspect:** Click cells to view score breakdown (Phase 1)

---

## Feature 1: Score Explainer (Inspect Tool)

**Phase:** 1

### What it does

A third tool mode alongside Paint and Erase. Clicking a planted cell in Inspect mode shows a per-factor score breakdown in the right sidebar, teaching the gardener WHY a placement scores the way it does.

### Score breakdown shape

```js
{
  crop: { name, emoji, ... },
  lightHours: 6.5,
  sunFit: 4.2,              // 0-5
  supFit: 5.0,              // support fit
  shadeFit: 3.0,
  accFit: 4.0,
  seaFit: 5.0,
  structBonus: 0.5,          // trellis/protection bonuses
  structContrib: [{ label, value }],
  weightedCore: 33.4,
  preAdjRaw: 5.6,
  baseScore: 5.6,
  // + adjacency breakdown
  adjacency: [
    { neighbor: "basil", bonus: 0.5, reason: "Companion" },
    { neighbor: "dill", bonus: -1.0, reason: "Conflict" }
  ]
}
```

### Functions

- `computeScoreBreakdown(ck, cell, inputs)` — Decomposes score into 6 factors
- `computeAdjacencyBreakdown(cell)` — Lists neighbor interactions
- `getScoreBreakdown(cell, inputs)` — Public API combining both

### UI

- Inspect tool button in toolbar
- Right sidebar "Inspect" tab shows full breakdown when cell is selected
- Keyboard navigation supported (arrow keys move selection)
- Empty cell shows "Select a planted cell" message

---

## Feature 2: Companion Planting Reference

**Phase:** 1

### What it does

A searchable reference tab in the right sidebar showing all companion and conflict relationships for any crop. Linked to the scoring engine's adjacency rules.

### Functions

- `getCompanionRelationships(cropKey)` — Analyzes all bidirectional relationships
- `renderCompanionPanel()` — Full panel UI with search, dropdown, relationship list

### Relationship shape

```js
{
  key: "basil",
  crop: { name, emoji, ... },
  type: "companion" | "conflict" | "neutral",
  bonus: 0.5,
  reason: "Mutual companion benefit"
}
```

### UI

- "Companions" tab in right sidebar
- Search input with live filtering
- Crop dropdown selector (all 20 crops)
- Crop header: emoji, name, category badge
- Tag summary: likes/avoids
- Three sections: Companions (green ✓), Conflicts (red ✗), Neutral (gray —)
- Grid crops bold-highlighted in relationship list

### CSS

`.companion-panel`, `.companion-search`, `.companion-select`, `.companion-crop-header`, `.companion-row`, `.companion-icon`, `.companion-name`, `.companion-bonus`, `.companion-reason`, `.companion-good`, `.companion-bad`, `.companion-neutral`, `.companion-section-label`

---

## Feature 3: Planting Calendar

**Phase:** 2

### What it does

A Gantt-style timeline showing indoor start, transplant, direct sow, and harvest windows for every crop currently on the grid, based on USDA hardiness zone frost dates.

### Data

**Frost dates** — Hardcoded for zones 3-10:

```js
FROST_DATES = {
  3:  { lastFrost: "May 15",  firstFrost: "Sep 15" },
  6:  { lastFrost: "Apr 15",  firstFrost: "Oct 20" },
  10: { lastFrost: "Jan 30",  firstFrost: "Dec 15" }
  // ... all 8 zones
}
```

**Crop timing** — 36 crops with weekly offsets relative to last frost:

```js
CROP_TIMING = {
  cherry_tom: { indoorWeeks: -8, transplantWeeks: 0, directSow: false, harvestWeeks: 10 },
  carrot:     { indoorWeeks: null, transplantWeeks: null, directSow: true, harvestWeeks: 10 }
  // ... all crops
}
```

### Functions

- `parseFrostDate(dateStr)` — "Apr 15" → Date object
- `weekToMonth(weekOffset, lastFrostDate)` — Week offset → fractional month index
- `getCalendarZone()` / `setCalendarZone(z)` — Read/persist zone in workspace
- `renderCalendarPanel()` — Full Gantt chart with frost lines

### UI

- "Calendar" tab in right sidebar
- Zone selector dropdown (zones 3-10, default 6, persisted)
- CSS grid layout with month columns (Jan-Dec)
- One row per unique crop on the grid
- Colored bars:
  - Indoor start: green (`--spring`, 60% opacity)
  - Transplant/direct sow: golden (`--sun`)
  - Harvest: orange (`--fall`)
- Dashed blue frost date markers
- Legend with color swatches
- Empty state: "Place crops to see your planting calendar"

### CSS

`.calendar-panel`, `.calendar-zone`, `.calendar-grid`, `.calendar-header`, `.calendar-crop`, `.calendar-bar`, `.calendar-indoor`, `.calendar-transplant`, `.calendar-harvest`, `.calendar-frost-line`, `.calendar-frost-label`, `.calendar-legend`, `.calendar-empty`

---

## Feature 4: Garden Plan Print Layout

**Phase:** 2

### What it does

Generates a clean, single-page landscape print layout of the current garden grid and triggers `window.print()`. Designed to be taped to the potting bench wall.

### Print layout contents

- Title: workspace/bed name
- Grid score average
- 8×4 HTML table: each cell shows crop emoji, 2-letter code, and score
- Cell backgrounds: crop color at 20% opacity
- Legend: only crops currently on the grid
- Bed settings: dimensions, orientation, wall, sun hours, trellis, cage
- Notes: blank lines for handwritten notes
- Footer: generation date

### Function

`printGardenPlan()`:
1. Creates `.print-layout` div with formatted content
2. Appends to `<body>`
3. Calls `window.print()`
4. Removes div on `afterprint` event (3s fallback)

### Typography

- Title: Fraunces SemiBold 18pt, soil brown
- Cell labels: DM Mono 8pt
- Scores: DM Mono 7pt
- Legend: DM Sans 9pt
- Page: landscape, 0.5in margins

### CSS

`.btn-print`, `.print-layout`, `.print-title`, `.print-subtitle`, `.print-grid-table`, `.print-cell-emoji`, `.print-cell-label`, `.print-cell-score`, `.print-legend`, `.print-settings`, `.print-notes`, `.print-footer`

`@media print` rules hide all app UI except `.print-layout`.

---

## Feature 5: Harvest Tracker

**Phase:** 3

### What it does

Log actual harvests per cell: date, amount, unit, quality, and note. Harvests accumulate per crop and per cell over the season. Summary stats in a dedicated sidebar tab, harvest badge on grid cells.

### Harvest entry shape

```js
{
  id: "h-1710576000000",
  cellId: "cell-5",
  crop: "cherry_tom",
  date: "2026-08-12",
  amount: 3,
  unit: "lb",               // lb | oz | count | bunch | basket
  quality: "excellent",      // excellent | good | fair | poor
  note: "Best plant this year"
}
```

### Storage

Stored in `_workspace.harvests` array. Persists via existing `saveState()` pipeline.

### Functions

- `getHarvests()` — All harvests from workspace
- `getHarvestsForCell(cellId)` — Filtered by cell
- `getHarvestsByCrop(cropKey)` — Filtered by crop
- `saveHarvest(entry)` — Push + saveState
- `deleteHarvest(id)` — Remove + saveState
- `getHarvestSummary()` — Aggregate stats: total count, per-crop amounts, best cell
- `renderHarvestTab()` — Summary + recent harvest list
- `renderHarvestForm(cell)` — Inline form for logging

### UI

**Harvest tab** in right sidebar:
- Summary stats: total harvests, per-crop totals with emoji, best-performing cell
- Recent harvests list (newest first): crop, cell, date, amount, quality badge, note, delete button
- Empty state: "No harvests yet — click a planted cell to log one"

**Harvest form** (from inspect mode):
- Date picker (default today)
- Amount input (number, step 0.1)
- Unit dropdown (lb, oz, count, bunch, basket)
- Quality pills: excellent, good, fair, poor (color-coded)
- Note textarea
- Save / Cancel buttons

**Cell badge:**
- Small orange circle (14px) in corner with harvest count
- Rendered during `renderBed()`

### CSS

`.harvest-summary`, `.harvest-summary-stat`, `.harvest-entry`, `.harvest-entry-header`, `.harvest-entry-crop`, `.harvest-entry-date`, `.harvest-entry-amount`, `.harvest-quality`, `.harvest-quality-excellent`, `.harvest-quality-good`, `.harvest-quality-fair`, `.harvest-quality-poor`, `.harvest-entry-note`, `.harvest-form`, `.harvest-form-label`, `.harvest-quality-pills`, `.harvest-quality-pill`, `.harvest-badge`, `.harvest-log-btn`, `.harvest-empty`

---

# Season Engine (garden-league-simulator-v3.html)

## Core: 12-Chapter Narrative Game

**Phase:** Original app

### What it does

A narrative garden planning game spanning 12 chapters across 4 seasons. The player places crops on an 8×4 grid, faces random events (pests, weather, opportunities), manages interventions, earns keepsakes, completes recipes, and tries to maximize their garden score.

### Game Loop

```
PLANNING → (place crops) → SIMULATION → (events fire) → HARVEST → (score + yield)
  → WINTER_REVIEW → (carry-forward) → next chapter
```

### Character System

| Character | Role | Tone |
|-----------|------|------|
| Garden GURL | Primary voice, mentor | Warm, encouraging |
| Onion Man | Reality checker | Dry, practical |
| Vegeman | Educator | Enthusiastic, precise |
| Critters | Antagonists | Mischievous, chaotic |

---

## Season Engine Patches (15 fixes)

**Phase:** 2

### Scoring Integrity (Phase 1 — Critical)

**1. Deterministic target selection**
- Removed `Math.random()` shuffle from `resolveTargets()`
- Candidates now selected in grid index order: `.slice(0, max)`
- Same inputs → same affected cells, always

**2. Double event application guard**
- After `doAcceptLoss()` in `advanceBeat()`, `S.currentEvent` is set to `null`
- Prevents second `if` block from re-applying the same event
- `S.eventAffectedCells` checked before any application

**3. Deterministic dialogue triggers**
- Replaced `Math.random() < 0.333` with `S.chapter % 3 === 0`
- All dialogue selection is now first-match, fixed character order

### Code Quality (Phase 2)

**4. Extracted `buildCarryForward()`**
- ~30 lines of soil fatigue, infrastructure, event memory, and mulch logic
- Extracted from both `completeChapter()` and `doTransition()`
- Single shared function, called from both sites

**5. Dead code removal**
- `fmt()` function — defined, never called. Removed.
- `.companion-buff` CSS — defined, never applied. Removed.
- `.fill-counter` CSS — never used. Removed.
- `.sim-dot` CSS + `@keyframes sim-blink` — never used. Removed.

**6. Inverted dark mode removed**
- `@media(prefers-color-scheme:dark)` block set lighter colors (inverted)
- Removed entirely — the game's warm aesthetic doesn't need dark mode

### State Management (Phase 3)

**7. Save failure warning**
- Empty `catch` in `save()` replaced with `showSaveWarning()`
- Red toast at bottom center: "Save failed — localStorage may be full or unavailable"
- Auto-dismisses after 5 seconds

**8. State versioning + migration**
- Added `_version: 3` to initial state
- `migrateState(s)` patches missing fields: `eventAffectedCells`, `carryForward`, `beatTokenAvailable`
- Called on every `load()` — handles saves from any prior version
- Replaced ad-hoc migration patches

**9. Epilogue duplicate guard**
- `if(!CAM.completedChapters.includes(12))` before pushing chapter 12
- Prevents duplicate epilogue entries in campaign history

### Accessibility (Phase 4)

**10. Focus management on dialog open**
- All overlay activations now call `requestAnimationFrame(() => el.cbox.querySelector('button')?.focus())`
- First button receives focus when dialog appears

**11. Crop button aria-labels**
- Each crop button: `aria-label="Cherry Tomato"` or `aria-label="Cherry Tomato (locked)"`
- Screen readers can identify crops and lock status

**12. Color-blind score indicators**
- Score pips prepend text indicator alongside color:
  - Good (≥7): ✓
  - Medium (≥4.5): ~
  - Low (<4.5): !

### Content Wiring (Phase 5)

**13. Orphaned keepsake wiring**
- `onion_scorecard` — awarded on first cell with adjacency score ≥ 1.5
- `first_frost_marker` — awarded on surviving a frost/freeze event
- `block_party_plate` — awarded when all 4 recipes completed

**14. Harvest yield dialogue**
- `harvest_good_yield` fires when `bedAverage >= 7.5`
- `harvest_poor_yield` fires when `bedAverage < 4.0`
- 500ms delay after harvest phase, deterministic character selection

### Performance (Phase 6)

**15. bedScore caching**
- `renderBoard()` stores result as `S._cachedBedScore`
- `renderRes()` uses cache before recomputing
- Cache invalidated on crop placement, event application, and commit
- Avoids redundant O(n) scoring during stable phases

---

## Right Sidebar Tab Inventory

| Tab | Feature | Phase |
|-----|---------|-------|
| Score | Bed score summary + factor averages | Original |
| Inspect | Per-cell score breakdown | Phase 1 |
| Companions | Crop relationship reference | Phase 1 |
| Calendar | Planting timeline by zone | Phase 2 |
| Harvest | Yield logging + summary | Phase 3 |
| Notes | (if present) | Original |

---

## Design Tokens (garden-os-theme.css)

### Surface

| Token | Value | Usage |
|-------|-------|-------|
| `--cream` | `#f7f2ea` | Page background |
| `--cream-mid` | `#ede5d8` | Secondary surfaces |
| `--panel` | `#fffdf8` | Card backgrounds |
| `--soil` | `#5c3d1e` | Header, nav, deep accents |
| `--border` | `#c8b090` | Card borders |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| `--text` | `#1e110a` | Primary (espresso) |
| `--text-mid` | `#5a3e2b` | Secondary (bark) |
| `--text-muted` | `#8a7b6b` | Tertiary (driftwood) |

### Accents

| Token | Value | Usage |
|-------|-------|-------|
| `--sun` | `#e8c84a` | Active, scoring, interactive |
| `--leaf` | `#3d7a4f` | Nature, growth |
| `--leaf-bright` | `#5aab6b` | Success, health |
| `--danger` | `#c0392b` | Pest events, warnings |
| `--rain` | `#5b9bd5` | Water, irrigation, info |

### Seasons

| Token | Value | Usage |
|-------|-------|-------|
| `--spring` | `#7cc576` | Calendar indoor start |
| `--summer` | `#e8c84a` | Calendar transplant |
| `--fall` | `#d4854a` | Calendar harvest |
| `--winter` | `#8fa3b8` | Frost markers |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-display` | Fraunces | Headings, titles |
| `--font-body` | DM Sans | Body text, labels |
| `--font-mono` | DM Mono | Scores, data, badges |
