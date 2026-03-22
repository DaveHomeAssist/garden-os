# Codex Prompt — Phase 5G: Expanded Grid (8×6, 8×8)

## Task

Modify `src/game/state.js` and `src/scene/bed-model.js` to support configurable grid sizes beyond the fixed 8×4.

## Current State

- `state.js`: grid is always 32 cells (8×4), hardcoded
- `bed-model.js`: cedar bed dimensions, cell positions, labels all hardcoded for 8×4

## Deliverable

### Modify state.js

```js
// Change grid initialization to accept dimensions
export function createGrid(cols = 8, rows = 4) {
  const cells = [];
  for (let i = 0; i < cols * rows; i++) {
    cells.push({ cropId: null, soilHealth: 0, damageState: null, protection: false, interventionBonus: 0, carryForward: null });
  }
  return { cells, cols, rows };
}

// Add grid dimension to season state
// SeasonState.grid: { cells: [...], cols: 8, rows: 4 }
```

### Modify bed-model.js

```js
// Accept dimensions parameter
export function createBedModel(tracker, cols = 8, rows = 4) {
  // Scale bed dimensions proportionally:
  // Width = cols * cellWidth + padding
  // Depth = rows * cellWidth + padding
  // cellWidth remains ~0.25 units

  // Generate cells dynamically based on cols × rows
  // Position trellis along back row (last row)
  // Scale critter guard to new dimensions
  // Update row/column labels
}
```

### Grid Size Unlocks

| Size | Unlock Condition | Total Cells |
|------|-----------------|-------------|
| 8×4 | Default | 32 |
| 8×6 | Chapter 6 or Gardening L5 | 48 |
| 8×8 | Chapter 10 or Gardening L8 | 64 |

### Scoring Compatibility

Update `cell-score.js` and `bed-score.js` to handle variable grid sizes:
- Cell score: no changes needed (per-cell calculation)
- Bed score: `fillRatio` uses `planted / (cols * rows)` instead of `planted / 32`
- Access fit: row position calculation uses `rows` instead of hardcoded 4

### Save Compatibility

Old saves with 32-cell grids load normally. New saves store grid dimensions:
```js
seasonState.grid = { cells: [...], cols: 8, rows: 4 }
// vs old format: seasonState.grid = [...] (array of 32)
```

Migration in save.js loadCampaign:
```js
if (Array.isArray(raw.grid)) {
  // Old format — convert
  return { cells: raw.grid, cols: 8, rows: 4 };
}
// New format — use as-is
```

## Constraints

- 8×4 must remain the default — no existing behavior changes
- All scoring formulas work with variable grid sizes
- Bed model scales visually (larger bed for more cells, not smaller cells)
- Camera presets may need wider zoom for larger beds
- Trellis always on back row, critter guard always on front
- No external dependencies

## Testing

- Unit test: createGrid(8, 4) — 32 cells
- Unit test: createGrid(8, 6) — 48 cells
- Unit test: createGrid(8, 8) — 64 cells
- Unit test: bed score with 48-cell grid
- Unit test: old save format migration
- Manual: render 8×6 and 8×8 beds — visual appearance correct
- Manual: all scoring works with larger grids
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: support configurable grid sizes (8×6, 8×8) with dynamic bed model`
- Do NOT push
