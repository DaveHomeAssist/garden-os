# Garden OS — Phase 2 Build Instructions

> **Prerequisite:** Phase 1 smoke tested and committed
> **Features:** Planting Calendar (#3), Garden Plan Print Layout (#4)
> **Estimated agents:** 2 (parallel)

---

## Agent A: Planting Calendar with Frost Date Awareness

### Owns

- Modifications to: `garden-planner-v4.html` (inline JS + CSS + HTML)

### What to build

A new tab or panel showing a per-crop planting calendar based on the user's USDA hardiness zone. Given a frost date, generate a Gantt-style timeline showing indoor start, transplant, direct sow, and harvest windows for every crop currently on the grid.

### Critical architecture notes

- All code goes inline in `garden-planner-v4.html`
- No external JS files
- No module imports
- Crop data is in `const CROPS` — you will need to add timing properties
- CSS variables are in `garden-os-theme.css`
- Read the current file state carefully — Phase 1 added an Inspect tool and Companions tab

### Data: Frost date table

Hardcoded USDA zone → average last frost date mapping (no API call):

```js
const FROST_DATES = {
  3:  { lastFrost: "May 15",  firstFrost: "Sep 15" },
  4:  { lastFrost: "May 10",  firstFrost: "Sep 25" },
  5:  { lastFrost: "Apr 25",  firstFrost: "Oct 10" },
  6:  { lastFrost: "Apr 15",  firstFrost: "Oct 20" },
  7:  { lastFrost: "Apr 5",   firstFrost: "Nov 1" },
  8:  { lastFrost: "Mar 20",  firstFrost: "Nov 10" },
  9:  { lastFrost: "Feb 15",  firstFrost: "Dec 1" },
  10: { lastFrost: "Jan 30",  firstFrost: "Dec 15" }
};
```

### Data: Crop timing offsets

Add to each crop in `CROPS` (or as a parallel lookup table):

```js
const CROP_TIMING = {
  cherry_tom:   { indoorWeeks: -8, transplantWeeks: 0, directSow: false, harvestWeeks: 10 },
  basil:        { indoorWeeks: -6, transplantWeeks: 0, directSow: true,  harvestWeeks: 8 },
  leaf_lettuce: { indoorWeeks: -4, transplantWeeks: -2, directSow: true, harvestWeeks: 6 },
  carrot:       { indoorWeeks: null, transplantWeeks: null, directSow: true, harvestWeeks: 10 },
  // ... all 20 crops
};
```

Weeks are relative to last frost date. Negative = before, positive = after.

### UI: Where it lives

Add a "Calendar" tab to the right sidebar (alongside Score, Inspect, Companions).

Or add it as a panel below the grid in the center column if sidebar space is tight.

### UI: Calendar rendering

Gantt-style horizontal timeline using pure CSS grid (not canvas):

```
         Feb    Mar    Apr    May    Jun    Jul    Aug    Sep
         ┊      ┊      ┊  ❄   ┊      ┊      ┊      ┊      ┊
Tomato   ░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓████████████████
Basil              ░░░░░▓▓▓▓▓▓████████████████
Lettuce       ░░░░▓▓▓▓██████████
Carrot                  ▓▓▓▓▓▓▓▓▓▓████████████████

░ = indoor start (--spring)
▓ = transplant/direct sow window (--sun)
█ = harvest period (--fall)
❄ = last frost date marker (--winter)
```

Each crop that is currently on the grid gets a row. Crops not on the grid are not shown (this is a plan-specific calendar, not a reference).

### UI: Zone selector

At the top of the calendar panel:

```html
<label>USDA Zone:
  <select id="zoneSelect">
    <option value="3">Zone 3</option>
    <!-- ... through 10 -->
  </select>
</label>
```

Persist selected zone in the workspace settings (`_workspace.workspaceSettings.zone`).

Changing zone recomputes all calendar bars.

### CSS classes to add (inline)

```css
.calendar-panel { }
.calendar-zone-select { }
.calendar-grid { display: grid; grid-template-columns: 100px repeat(8, 1fr); }
.calendar-header { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); text-align: center; }
.calendar-row { display: contents; }
.calendar-crop-label { font-family: var(--font-body); font-size: 12px; padding: 4px 0; }
.calendar-bar { height: 16px; border-radius: 3px; }
.calendar-bar-indoor { background: var(--spring); opacity: 0.6; }
.calendar-bar-transplant { background: var(--sun); }
.calendar-bar-harvest { background: var(--fall); }
.calendar-frost-marker { border-left: 2px dashed var(--winter); }
```

### Rules

- Only show crops currently on the grid
- Frost dates are approximate — label as "estimated"
- No API calls — all data is static/local
- Calendar must be printable (important for Phase 2 feature B)
- Use CSS grid for layout — no canvas, no SVG
- If no crops on grid, show "Place crops to see calendar"
- If no zone selected, default to Zone 6 (most common US zone)
- Persist zone selection in workspace settings

---

## Agent B: Garden Plan Print Layout

### Owns

- Modifications to: `garden-planner-v4.html` (inline CSS + small JS for print trigger)
- Modifications to: `garden-os-theme.css` (print media query additions)

### What to build

A "Print plan" button that triggers `window.print()` with a clean, single-page print layout of the current garden grid.

### Print layout contents

```
┌──────────────────────────────────────────────┐
│  GARDEN OS                                    │
│  Mom's Sanctuary · Spring 2026               │
│  Grid Score: 7.8 avg                         │
│                                              │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┐   │
│  │ 🍅 │ 🌿 │ 🫑 │ 🍅 │ 🥒 │ 🥒 │ 🫘 │ 🫘 │   │
│  │ CT │ BA │ PE │ CT │ CU │ CU │ PB │ PB │   │
│  │ 8.5│ 7.2│ 6.8│ 8.1│ 5.4│ 5.4│ 7.9│ 7.9│   │
│  ├────┼────┼────┼────┼────┼────┼────┼────┤   │
│  │ 🥬 │ 🥬 │ 🌿 │ 🌿 │ 🫑 │ 🫑 │ 🍅 │ 🍅 │   │
│  │ LL │ LL │ BA │ BA │ PE │ PE │ CT │ CT │   │
│  │ 6.2│ 6.2│ 7.0│ 7.0│ 6.5│ 6.5│ 8.3│ 8.3│   │
│  ├────┼────┼────┼────┼────┼────┼────┼────┤   │
│  │    │    │    │    │    │    │    │    │   │
│  └────┴────┴────┴────┴────┴────┴────┴────┘   │
│                                              │
│  Legend                                      │
│  CT Cherry Tomato  BA Basil  PE Pepper       │
│  LL Leaf Lettuce   CU Cucumber  PB Pole Bean │
│                                              │
│  Bed Settings                                │
│  8×4 ft · Trellis: North · Cage: Yes        │
│                                              │
│  Notes: ___________________________________  │
│                                              │
│  Generated: Mar 16, 2026                     │
└──────────────────────────────────────────────┘
```

### Typography in print

- Title: Fraunces SemiBold, soil brown
- Cell labels: DM Mono, 10px
- Scores: DM Mono, 9px
- Legend: DM Sans, 11px
- Background: cream (not white)
- Borders: soil brown
- Crop cells: light background tint matching crop color

### Print CSS (`@media print`)

Add to `garden-os-theme.css` or inline in the planner:

```css
@media print {
  /* Hide everything except the grid and print layout */
  body > *:not(.print-layout) { display: none !important; }
  .print-layout { display: block !important; }

  /* Grid sizing */
  .print-grid { width: 100%; max-width: 7in; }
  .print-cell { width: 0.85in; height: 0.85in; border: 1px solid var(--soil); }

  /* Typography */
  .print-title { font-family: 'Fraunces', Georgia, serif; font-weight: 600; }
  .print-score { font-family: 'DM Mono', monospace; font-size: 9pt; }

  /* Page setup */
  @page { margin: 0.5in; size: landscape; }
}
```

### Print trigger

Add a "Print plan" button to the toolbar or header area:

```html
<button id="printPlanBtn" class="btn-print" onclick="printGardenPlan()">Print plan</button>
```

`printGardenPlan()` function:
1. Build a `.print-layout` div with the formatted grid
2. Append it to body
3. Call `window.print()`
4. Remove the `.print-layout` div after printing

This avoids modifying the main app DOM. The print layout is generated on demand, printed, then cleaned up.

### What to include in print layout

Read from current workspace state:
- `_workspace.name` → garden name
- `_workspace.beds[currentBedIndex]` → current bed
- `bed` array → cell data with crops and scores
- `CROPS` → emoji, short name, full name for legend
- Bed settings (orientation, wall side, trellis, cage)
- Current date

### CSS classes (inline or in theme file)

```
.btn-print
.print-layout
.print-header
.print-grid
.print-cell
.print-cell-emoji
.print-cell-label
.print-cell-score
.print-legend
.print-settings
.print-notes
.print-footer
```

### Rules

- Print layout is landscape, single page
- Grid cells should be roughly 1 inch (fits 8×4 on landscape letter)
- Use crop background colors at low opacity (20%) in cells
- Include empty cells (show as blank, bordered)
- The legend only shows crops that are actually on the grid
- Notes area is a blank line for handwritten notes
- No interactive elements in print layout
- Watercolor grain texture at 2-3% opacity (optional, nice-to-have)
- The print button should be visible but not dominant
- If the planting calendar (Feature 3) is built, optionally include it on a second page

---

## Execution Plan

```
Phase 2:
  Agent A (Planting Calendar)  ──────────►  parallel
  Agent B (Print Layout)       ──────────►  parallel

  Smoke test Phase 2
  Commit + push
```

### Dependencies

- Neither feature depends on the other directly
- If both are built, the print layout can optionally include the calendar on page 2
- Both read from the same workspace state — no conflicts
- Both modify `garden-planner-v4.html` inline — agents must not overwrite each other's additions
  - Agent A: adds to right sidebar tabs + JS functions
  - Agent B: adds print button + print layout generator + `@media print` CSS
  - These are non-overlapping areas of the file

### Post-Phase 2

Remaining features:

| Project | Feature | Effort |
|---------|---------|--------|
| Trailkeeper | Offline PWA (#5) | Medium |
| Garden OS | Harvest Tracker (#5) | Medium |
| Both | Inspector Panel (shared) | Medium |

Phase 3 recommendation: Harvest Tracker + PWA in parallel (both are the final stateful features before the shared Inspector Panel becomes worthwhile).
