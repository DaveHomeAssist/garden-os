# Garden OS — Feature Roadmap

> **Superseded:** This roadmap is superseded by IMPLEMENTATION_PLAN.md (System A).
> **Status detail:** Feature 1 (Scoring Explainer) shipped as Phase 1B. Feature 4 (Print Layout) partially covered by Phase 3C retrospective export. Features 2, 3, 5 remain open.
> **Updated:** 2026-03-16 original; superseded notice added 2026-04-20
> **Architecture:** Static web app, vanilla JS, GitHub Pages, zero backend
> **Namespace:** `window.GOS`

---

## Strategic Direction

Planner → Teaching Tool → Seasonal Record

Garden OS has a deterministic scoring engine, 8x4 grid layout, companion planting logic, and a Season Engine game. The next layer makes the existing intelligence visible and builds toward seasonal memory.

---

## Recommended Build Order

| Order | Feature | Effort | Impact | Rationale |
|-------|---------|--------|--------|-----------|
| 1 | Scoring Explainer | Low | High | Exposes existing logic — zero new data |
| 2 | Companion Planting Reference | Low | Medium | Same adjacency data, new surface |
| 3 | Planting Calendar | Medium | High | Adds temporal layer to spatial planner |
| 4 | Garden Plan Print Layout | Low | High | Bridge from digital to potting bench |
| 5 | Harvest Tracker | Medium | High | Largest data footprint — build last |

---

## Feature 1: Scoring Explainer — "Why This Score?"

**Difficulty:** Low | **Impact:** High | **Priority:** 1

### Description

Tap any cell's score to see a breakdown: base crop value, adjacency bonuses/penalties, sunlight modifier, edge effects, and drainage factor — each as a labeled line item that sums to the final score.

### User Value

The scoring engine is the heart of Garden OS, but it's currently a black box. Making it transparent teaches the gardener *why* certain placements work.

### Technical Impact

- New module `js/scoreExplainer.js` on `window.GOS.scoreExplainer`
- Reads existing scoring function internals, exposes per-factor breakdown
- Popover or inline expand UI on cell tap
- CSS for `.score-breakdown`, `.score-factor`, `.score-factor-positive`, `.score-factor-negative`
- No storage changes — computed on demand from current grid state

### Breakdown Shape

```js
{
  total: 8.5,
  factors: [
    { label: "Base (tomato)", value: 5.0, type: "base" },
    { label: "Adjacency (basil)", value: +2.0, type: "bonus" },
    { label: "Sunlight (south face)", value: +1.5, type: "bonus" },
    { label: "Shade penalty (north edge)", value: -0.5, type: "penalty" },
    { label: "Drainage", value: +0.5, type: "bonus" }
  ]
}
```

### Character Voices

- Garden GURL narrates bonuses: "Your tomatoes scored a 9.2 — that's the best adjacency bonus I've seen all season!"
- Onion Man narrates penalties: "Look, I'm not saying your cucumber placement is bad. I'm saying the drainage coefficient says what it says."

### Implementation Notes

The scoring engine already computes these factors internally. The work is exposing intermediate values, not computing new ones. Keep the popover dismissible and non-blocking.

---

## Feature 2: Companion Planting Quick Reference

**Difficulty:** Low | **Impact:** Medium | **Priority:** 2

### Description

A searchable reference panel showing companion planting relationships — which crops help each other, which compete, and why. Linked directly to the scoring engine's adjacency rules.

### User Value

Demystifies adjacency scoring. Instead of trial-and-error placement, the gardener looks up "what grows well next to tomatoes?" and gets a trustworthy answer grounded in the same logic the engine uses.

### Technical Impact

- New module `js/companionRef.js` on `window.GOS.companionRef`
- Static data extracted from existing adjacency bonus/penalty table
- Searchable panel UI with crop filter
- CSS for `.companion-panel`, `.companion-row`, `.companion-good`, `.companion-bad`

### Data Shape

```js
{
  pair: ["tomato", "basil"],
  type: "companion",     // companion | antagonist | neutral
  bonus: +2,
  reason: "Root exudates improve nutrient uptake"
}
```

### UX

- Two-column lookup: select a crop, see all its relationships
- Green checkmark for companions, red X for antagonists, dash for neutral
- Vegeman's voice for the "why" explanations
- Search by crop name with instant filter
- Links to scoring explainer when both crops are on the grid

### Implementation Notes

This is primarily a UI over existing data, not new logic. The adjacency table already exists in the scoring engine — extract it into a standalone reference object.

---

## Feature 3: Planting Calendar with Frost Date Awareness

**Difficulty:** Medium | **Impact:** High | **Priority:** 3

### Description

Given the user's ZIP code, calculate last/first frost dates and generate a per-crop planting calendar showing indoor start, transplant, and direct sow windows for every crop in the current grid.

### User Value

The most common gardening mistake is planting at the wrong time. This turns Garden OS from a spatial planner into a temporal one — "what goes where" becomes "what goes where and when."

### Technical Impact

- New module `js/plantingCalendar.js` on `window.GOS.plantingCalendar`
- Static frost date table by USDA zone (zones 3-10)
- Per-crop timing offsets stored as static data
- New UI panel: horizontal timeline (CSS grid, not canvas)
- CSS for `.calendar-panel`, `.calendar-row`, `.calendar-bar`

### Crop Timing Data

```js
{
  crop: "tomato",
  indoorStartWeeks: -8,    // weeks before last frost
  transplantWeeks: 0,       // at last frost
  directSowWeeks: null,     // not applicable
  harvestWeeks: 10           // weeks after transplant
}
```

### Calendar Rendering

Gantt-style horizontal bar chart using pure CSS grid:

```
.calendar
  .calendar-header     (week columns)
  .calendar-row        (one per crop)
    .calendar-bar      (colored by phase)
```

Phase colors:
- Seed start: `--spring` (sprout green)
- Transplant: `--sun` (golden yellow)
- Harvest: `--fall` (harvest orange)
- Frost dates: `--winter` (frost blue) vertical markers

### Implementation Notes

Static frost date table by USDA zone is simpler and more reliable than an API call. CSS grid (not canvas) for print support and accessibility. Print-friendly — mom should be able to tape this to the fridge.

---

## Feature 4: Garden Plan Print Layout

**Difficulty:** Low | **Impact:** High | **Priority:** 4

### Description

Export the current garden grid as a printable plan — showing the 8x4 layout with crop names, color coding, scores, and planting notes. Formatted for a single page.

### User Value

Mom tapes this to the potting bench wall. It becomes the physical reference that survives dirt, water, and a full growing season.

### Technical Impact

- Print-specific CSS in `@media print`
- "Print plan" button in grid view
- Grid rendered as clean table with crop colors, names, scores
- Legend, date, and notes area
- No new storage, no export library

### Print Layout

```
┌──────────────────────────────────────────┐
│  GARDEN OS — Mom's Sanctuary             │
│  Season: Spring 2026                     │
│  Grid Score: 7.8 avg                     │
│                                          │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┤
│  │ Tom│ Bas│ Pep│ Tom│ Cuc│ Cuc│ Bea│ Bea│
│  │ 8.5│ 7.2│ 6.8│ 8.1│ 5.4│ 5.4│ 7.9│ 7.9│
│  ├────┼────┼────┼────┼────┼────┼────┼────┤
│  │ Let│ Let│ Bas│ Bas│ Pep│ Pep│ Tom│ Tom│
│  │ 6.2│ 6.2│ 7.0│ 7.0│ 6.5│ 6.5│ 8.3│ 8.3│
│  ├────┼────┼────┼────┼────┼────┼────┼────┤
│  │ ...│    │    │    │    │    │    │ ...│
│  └────┴────┴────┴────┴────┴────┴────┴────┘
│                                          │
│  Legend: [Tom] Tomato [Bas] Basil ...     │
│                                          │
│  Notes: ________________________________ │
│                                          │
│  Generated: Mar 16, 2026                 │
└──────────────────────────────────────────┘
```

### Typography

- Title: Fraunces SemiBold
- Scores: DM Mono
- Cell labels: DM Sans
- Background: cream (`--cream`)
- Borders: soil brown (`--soil`)
- Watercolor grain: 2-3% opacity in print

### Implementation Notes

Use `window.print()` triggered by a button. No export library needed. Grid cells sized to ~1 inch each on paper. Include garden name, season, date, total score, and notes area.

---

## Feature 5: Harvest Tracker

**Difficulty:** Medium | **Impact:** High | **Priority:** 5

### Description

Log actual harvests per cell: date, crop, amount, and a note. Over the season, accumulate yield data per crop and per cell position.

### User Value

Closes the feedback loop. Next season, the gardener can see "cell B3 produced 14 lbs of tomatoes" and make data-informed placement decisions.

### Technical Impact

- New module `js/harvestTracker.js` on `window.GOS.harvestTracker`
- Separate localStorage collection (not embedded in grid)
- Inline form per cell: date, crop, amount, note
- Summary view: totals per crop, per cell, per week
- CSS for `.harvest-entry`, `.harvest-form`, `.harvest-summary`

### Storage Shape

Introduce "Season" as a first-class concept:

```js
// localStorage key: "gos-seasons"
{
  "2026": {
    grid: { /* current grid state snapshot */ },
    harvests: [
      {
        cellId: "B3",
        crop: "tomato",
        date: "2026-08-12",
        amount: 3,
        unit: "lb",
        quality: "excellent",    // excellent | good | fair | poor
        note: "Best plant this year"
      }
    ],
    notes: ""
  }
}
```

### Why Season-First Storage

- Year-to-year comparison
- Easier resets between seasons
- Historical analytics
- Grid snapshots per season

### UX

- Harvest count badge on cell in grid view
- Inline form: date (default today), crop (pre-filled), amount + unit, quality pill-select, note
- Season-end summary: printable report
- Photo support deferred to v2 (would need IndexedDB for blobs)

### Implementation Notes

Build last because it introduces historical state management. The season container shape should be established before any stateful feature ships, even if only harvest tracking uses it initially.

---

## Prioritization Summary

| Feature | User Value | Effort | ROI | Priority |
|---------|-----------|--------|-----|----------|
| Scoring Explainer | High | Low | **9** | 1 |
| Companion Reference | Medium | Low | **7** | 2 |
| Planting Calendar | High | Medium | **7** | 3 |
| Garden Plan Print | High | Low | **9** | 4 |
| Harvest Tracker | High | Medium | **6** | 5 |

---

## Architectural Notes

### Data Growth Warning

Trailkeeper remains stateless/lightweight. Garden OS becomes stateful over time (harvests, calendars, seasonal history). Plan storage carefully:

- Trails = immutable reference objects
- Seasons = append-only containers
- Harvests = append-only within seasons
- Grid state = snapshot per season

### Shared Pattern with Trailkeeper

Both projects are evolving toward the same architectural shape:

| Layer | Trailkeeper | Garden OS |
|-------|-------------|-----------|
| Entities | trails | crops |
| Planner | day plan | garden grid |
| Conditions | weather | sunlight / soil |
| History | hike logs | harvest logs |
| Export | trip plan | garden plan |

---

## Rules

- No backend
- No breaking existing grid CRUD or scoring
- All failures degrade gracefully
- Local garden data is authoritative
- External data (frost dates, companions) is advisory
- Preserve `window.GOS` namespace pattern
- Keep feature additive
- Warm watercolor aesthetic in all new UI
